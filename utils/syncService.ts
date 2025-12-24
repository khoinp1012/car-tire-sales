import { synchronize } from '@nozbe/watermelondb/sync';
import { getDatabase, createAuditLog } from './databaseService';
import { databases, DATABASE_ID, INVENTORY_COLLECTION_ID, CUSTOMERS_COLLECTION_ID, SALES_COLLECTION_ID, USER_ROLES_COLLECTION_ID, PERMISSION_CONFIG_COLLECTION_ID, AUDIT_LOGS_COLLECTION_ID } from '@/constants/appwrite';
import { Query } from 'appwrite';
import { getCurrentUserId } from './sessionContext';

let isOfflineMode = false;
let isSyncing = false;
let syncInterval: any = null;

const TABLE_TO_COLLECTION: Record<string, string> = {
    inventory: INVENTORY_COLLECTION_ID,
    customers: CUSTOMERS_COLLECTION_ID,
    sales: SALES_COLLECTION_ID,
    user_roles: USER_ROLES_COLLECTION_ID,
    permission_config: PERMISSION_CONFIG_COLLECTION_ID,
    audit_logs: AUDIT_LOGS_COLLECTION_ID
};

/**
 * Toggle Offline Mode
 */
export function setOfflineMode(offline: boolean) {
    isOfflineMode = offline;
    if (offline) {
        stopSync();
    } else {
        startSync();
    }
}

export function getOfflineMode() {
    return isOfflineMode;
}

/**
 * Check if permission config is synced and available
 */
export async function hasPermissionConfig(): Promise<boolean> {
    try {
        const db = getDatabase();
        const configs = await db.get('permission_config')
            .query()
            .fetch();

        return configs.some((config: any) => config.isActive && !config.deleted);
    } catch (error) {
        console.error('[SyncService] Error checking permission config:', error);
        return false;
    }
}

/**
 * Map Appwrite collection ID to WatermelonDB table name
 */
function getTableName(appwriteCollectionId: string): string {
    const mapping: Record<string, string> = {
        [INVENTORY_COLLECTION_ID]: 'inventory',
        [CUSTOMERS_COLLECTION_ID]: 'customers',
        [SALES_COLLECTION_ID]: 'sales',
        [USER_ROLES_COLLECTION_ID]: 'user_roles',
        [PERMISSION_CONFIG_COLLECTION_ID]: 'permission_config',
        [AUDIT_LOGS_COLLECTION_ID]: 'audit_logs'
    };
    return mapping[appwriteCollectionId] || '';
}

/**
 * Map field names from Appwrite to WatermelonDB
 * WatermelonDB sync expects raw records with column names
 */
function mapAppwriteToLocal(doc: any, tableName: string): any {
    const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...rest } = doc;

    const mapped: any = {
        id: $id, // WatermelonDB ID MUST be provided for sync
        appwrite_id: $id,
        created_at: new Date($createdAt).getTime(),
        updated_at: new Date($updatedAt).getTime()
    };

    // Copy all other fields as is (assuming they match column names)
    Object.keys(rest).forEach(key => {
        mapped[key] = rest[key];
    });

    return mapped;
}

/**
 * Map field names from WatermelonDB to Appwrite
 */
function mapLocalToAppwrite(record: any): any {
    const data: any = {};
    const raw = record._raw;

    // Internal fields to skip
    const skipFields = ['id', 'appwrite_id', 'created_at', 'updated_at', '_status', '_changed'];

    Object.keys(raw).forEach(key => {
        if (!skipFields.includes(key)) {
            data[key] = raw[key];
        }
    });

    return data;
}

/**
 * Perform synchronization with Appwrite
 */
export async function performSync(): Promise<void> {
    if (isOfflineMode || isSyncing) return;

    isSyncing = true;
    console.log('[SyncService] Starting synchronization...');

    try {
        const db = getDatabase();

        await synchronize({
            database: db,
            pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
                const timestamp = lastPulledAt || 0;
                const lastPulledDate = new Date(timestamp).toISOString();

                console.log('[SyncService] Pulling changes since:', lastPulledDate);

                const changes: any = {};

                // Pull changes for each collection
                const collections = [
                    { id: INVENTORY_COLLECTION_ID, table: 'inventory' },
                    { id: CUSTOMERS_COLLECTION_ID, table: 'customers' },
                    { id: SALES_COLLECTION_ID, table: 'sales' },
                    { id: USER_ROLES_COLLECTION_ID, table: 'user_roles' },
                    { id: PERMISSION_CONFIG_COLLECTION_ID, table: 'permission_config' },
                    { id: AUDIT_LOGS_COLLECTION_ID, table: 'audit_logs' }
                ];

                for (const { id, table } of collections) {
                    try {
                        const queries = [
                            Query.greaterThan('$updatedAt', lastPulledDate),
                            Query.orderAsc('$updatedAt'),
                            Query.limit(100)
                        ];

                        const response = await databases.listDocuments(DATABASE_ID, id, queries);

                        const created = response.documents
                            .filter((doc: any) => new Date(doc.$createdAt).getTime() > timestamp)
                            .map((doc: any) => mapAppwriteToLocal(doc, table));

                        const updated = response.documents
                            .filter((doc: any) => new Date(doc.$createdAt).getTime() <= timestamp)
                            .map((doc: any) => mapAppwriteToLocal(doc, table));

                        const deleted = response.documents
                            .filter((doc: any) => doc.deleted === true)
                            .map((doc: any) => doc.$id);

                        changes[table] = {
                            created,
                            updated,
                            deleted
                        };

                        console.log(`[SyncService] ${table}: ${created.length} created, ${updated.length} updated, ${deleted.length} deleted`);
                    } catch (error) {
                        console.error(`[SyncService] Error pulling ${table}:`, error);
                        changes[table] = { created: [], updated: [], deleted: [] };
                    }
                }

                return {
                    changes,
                    timestamp: Date.now()
                };
            },

            pushChanges: async ({ changes }) => {
                console.log('[SyncService] Pushing local changes...');

                for (const [tableName, tableChanges] of Object.entries(changes)) {
                    const { created, updated, deleted } = tableChanges as any;

                    // Find corresponding Appwrite collection ID
                    const collectionId = TABLE_TO_COLLECTION[tableName];
                    if (!collectionId) {
                        console.warn(`[SyncService] No collection ID found for table: ${tableName}`);
                        continue;
                    }

                    // Push created records
                    for (const record of created) {
                        try {
                            const data = mapLocalToAppwrite(record);
                            await databases.createDocument(
                                DATABASE_ID,
                                collectionId,
                                record.id || record.appwrite_id,
                                data
                            );

                            // Create audit log
                            if (tableName !== 'audit_logs') {
                                await createAuditLog(
                                    record.id || record.appwrite_id,
                                    tableName,
                                    record.version || 1,
                                    'CREATE',
                                    data
                                );
                            }
                        } catch (error: any) {
                            if (error?.code === 409) {
                                // Already exists, try updating instead
                                try {
                                    const data = mapLocalToAppwrite(record);
                                    await databases.updateDocument(
                                        DATABASE_ID,
                                        collectionId,
                                        record.id || record.appwrite_id,
                                        data
                                    );
                                } catch (updateError) {
                                    console.error(`[SyncService] Error updating existing ${tableName}:`, updateError);
                                }
                            } else {
                                console.error(`[SyncService] Error creating ${tableName}:`, error);
                            }
                        }
                    }

                    // Push updated records
                    for (const record of updated) {
                        try {
                            const data = mapLocalToAppwrite(record);
                            await databases.updateDocument(
                                DATABASE_ID,
                                collectionId,
                                record.id || record.appwrite_id,
                                data
                            );

                            // Create audit log
                            if (tableName !== 'audit_logs') {
                                await createAuditLog(
                                    record.id || record.appwrite_id,
                                    tableName,
                                    record.version || 1,
                                    record.deleted ? 'DELETE' : 'UPDATE',
                                    data
                                );
                            }
                        } catch (error) {
                            console.error(`[SyncService] Error updating ${tableName}:`, error);
                        }
                    }

                    // Push deleted records (soft delete)
                    for (const recordId of deleted) {
                        try {
                            await databases.updateDocument(
                                DATABASE_ID,
                                collectionId,
                                recordId,
                                { deleted: true }
                            );
                        } catch (error) {
                            console.error(`[SyncService] Error deleting ${tableName}:`, error);
                        }
                    }

                    console.log(`[SyncService] ${tableName}: ${created.length} pushed created, ${updated.length} pushed updated, ${deleted.length} pushed deleted`);
                }
            }
        });

        console.log('[SyncService] Synchronization completed successfully');
    } catch (error) {
        console.error('[SyncService] Synchronization failed:', error);
        throw error;
    } finally {
        isSyncing = false;
    }
}

/**
 * Start automatic sync (every 30 seconds)
 */
export async function startSync() {
    if (isOfflineMode || syncInterval) return;

    console.log('[SyncService] Starting automatic sync...');

    // Initial sync
    await performSync().catch(error => {
        console.error('[SyncService] Initial sync failed:', error);
    });

    // Periodic sync every 30 seconds
    syncInterval = setInterval(() => {
        performSync().catch(error => {
            console.error('[SyncService] Periodic sync failed:', error);
        });
    }, 30000);
}

/**
 * Stop automatic sync
 */
export function stopSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
        console.log('[SyncService] Automatic sync stopped');
    }
}
