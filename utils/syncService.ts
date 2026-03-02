import { synchronize } from '@nozbe/watermelondb/sync';
import { Q } from '@nozbe/watermelondb';
import { getDatabase } from './databaseService';
import appwrite, { databases, DATABASE_ID, INVENTORY_COLLECTION_ID, CUSTOMERS_COLLECTION_ID, SALES_COLLECTION_ID, USER_ROLES_COLLECTION_ID, PERMISSION_CONFIG_COLLECTION_ID, STACKS_COLLECTION_ID } from '@/constants/appwrite';
import { Query } from 'react-native-appwrite';
import NetInfo from '@react-native-community/netinfo';
import { getCurrentUserId } from './sessionContext';

let isOfflineMode = false;
let isSyncing = false;
let isSyncLocked = false; // Global lock to prevent concurrent WatermelonDB sync calls
let syncInterval: any = null;
let realtimeSubscription: any = null;
let netInfoUnsubscribe: any = null;

const TABLE_TO_COLLECTION: Record<string, string> = {
    inventory: INVENTORY_COLLECTION_ID,
    customers: CUSTOMERS_COLLECTION_ID,
    sales: SALES_COLLECTION_ID,
    user_roles: USER_ROLES_COLLECTION_ID,
    permission_config: PERMISSION_CONFIG_COLLECTION_ID,
    stacks: STACKS_COLLECTION_ID
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
        [STACKS_COLLECTION_ID]: 'stacks'
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

    // Field name mapping: Appwrite (camelCase) -> WatermelonDB (snake_case)
    const fieldMapping: Record<string, string> = {
        'userId': 'user_id',
        'lastModifiedBy': 'last_modified_by',
        'isActive': 'is_active',
        'configVersion': 'config_version',
        'lastModifiedAt': 'last_modified_at',
        'stackId': 'stack_id',
        'inventoryIds': 'inventory_ids',
        'entityId': 'entity_id',
        'entityType': 'entity_type',
        'deviceId': 'device_id',
        'unitPrice': 'unit_price',
        'radiusSize': 'radius_size',
        'fullDescription': 'full_description',
        'pendingSale': 'pending_sale',
        'phoneNumber': 'phone_number',
        'discountPercent': 'discount_percent',
        'customerId': 'customer_id',
        'orderDate': 'order_date',
        'inventoryItemsList': 'inventory_items_list',
        'totalAmount': 'total_amount',
        'customerDiscount': 'customer_discount',
        'referenceId': 'reference_id',
        'collectionPermissions': 'collection_permissions',
        'rowPermissions': 'row_permissions',
    };

    // Special handling for permission_config
    if (tableName === 'permission_config' && rest.version && typeof rest.version === 'string') {
        // Appwrite has 'version' as STRING (e.g., "1.0.1") for config versioning
        // WatermelonDB expects 'config_version' (string) and 'version' (integer) for sync
        mapped.config_version = rest.version; // Map string version to config_version
        mapped.version = 1; // Set integer version for sync

        // Copy all other fields except the original version, with field name mapping
        Object.keys(rest).forEach(key => {
            if (key !== 'version') {
                const mappedKey = fieldMapping[key] || key;
                mapped[mappedKey] = rest[key];
            }
        });
    } else {
        // Copy all other fields with field name mapping
        Object.keys(rest).forEach(key => {
            const mappedKey = fieldMapping[key] || key;
            mapped[mappedKey] = rest[key];
        });
    }

    // Ensure WatermelonDB required sync fields have defaults if missing in Appwrite
    if (mapped.version === undefined) mapped.version = 1;
    if (mapped.deleted === undefined) mapped.deleted = false;

    // Coerce numeric fields to ensure they are actually numbers
    if (mapped.unit_price !== undefined) mapped.unit_price = parseFloat(String(mapped.unit_price)) || 0;
    if (mapped.radius_size !== undefined) mapped.radius_size = parseInt(String(mapped.radius_size)) || 0;
    if (mapped.sequence !== undefined) mapped.sequence = parseInt(String(mapped.sequence)) || 0;

    return mapped;
}

/**
 * Map field names from WatermelonDB to Appwrite
 */
function mapLocalToAppwrite(record: any): any {
    const data: any = {};
    const raw = record._raw;
    const tableName = record.table.name;

    // Internal fields to skip
    const skipFields = ['id', 'appwrite_id', 'created_at', 'updated_at', '_status', '_changed'];

    // Reverse field name mapping: WatermelonDB (snake_case) -> Appwrite (camelCase)
    const reverseFieldMapping: Record<string, string> = {
        'user_id': 'userId',
        'last_modified_by': 'lastModifiedBy',
        'is_active': 'isActive',
        'config_version': 'configVersion',
        'last_modified_at': 'lastModifiedAt',
        'stack_id': 'stackId',
        'inventory_ids': 'inventoryIds',
        'entity_id': 'entityId',
        'entity_type': 'entityType',
        'device_id': 'deviceId',
        'unit_price': 'unitPrice',
        'radius_size': 'radiusSize',
        'full_description': 'fullDescription',
        'pending_sale': 'pendingSale',
        'phone_number': 'phoneNumber',
        'discount_percent': 'discountPercent',
        'customer_id': 'customerId',
        'order_date': 'orderDate',
        'inventory_items_list': 'inventoryItemsList',
        'total_amount': 'totalAmount',
        'customer_discount': 'customerDiscount',
        'reference_id': 'referenceId',
        'collection_permissions': 'collectionPermissions',
        'row_permissions': 'rowPermissions',
    };

    // Special handling for permission_config
    if (tableName === 'permission_config') {
        // Map config_version (string) back to version for Appwrite
        Object.keys(raw).forEach(key => {
            if (!skipFields.includes(key)) {
                if (key === 'config_version') {
                    data['version'] = raw[key]; // Map config_version back to version (string)
                } else if (key === 'version') {
                    // Skip the integer version field (it's only for sync)
                } else {
                    const mappedKey = reverseFieldMapping[key] || key;
                    data[mappedKey] = raw[key];
                }
            }
        });
    } else {
        Object.keys(raw).forEach(key => {
            if (!skipFields.includes(key)) {
                const mappedKey = reverseFieldMapping[key] || key;
                data[mappedKey] = raw[key];
            }
        });
    }

    return data;
}

/**
 * Helper to distinguish between created and updated records for WatermelonDB sync
 * Prevents "Record already exists" diagnostic errors
 */
async function categorizePullChanges(db: any, table: string, docs: any[]) {
    if (docs.length === 0) return { created: [], updated: [], deleted: [] };

    const ids = docs.map(d => d.$id).filter(id => id); // Filter out undefined IDs

    if (ids.length === 0) {
        console.warn('[SyncService] No valid document IDs found in batch');
        return { created: [], updated: [], deleted: [] };
    }

    const existingRecords = await db.get(table).query(Q.where('id', Q.oneOf(ids))).fetch();
    const existingIds = new Set(existingRecords.map((r: any) => r.id));

    const created: any[] = [];
    const updated: any[] = [];
    let skippedCount = 0;

    docs.forEach(doc => {
        try {
            // Validate required fields
            if (!doc.$id) {
                console.warn('[SyncService] Document missing $id, skipping:', doc);
                skippedCount++;
                return;
            }

            const mapped = mapAppwriteToLocal(doc, table);

            // Validate mapped document has required sync fields
            if (!mapped.id || mapped.version === undefined) {
                console.warn('[SyncService] Mapped document missing required fields (id or version), skipping:', {
                    original: doc.$id,
                    mapped: mapped
                });
                skippedCount++;
                return;
            }

            if (existingIds.has(doc.$id)) {
                updated.push(mapped);
            } else {
                created.push(mapped);
            }
        } catch (error) {
            console.error('[SyncService] Error mapping document, skipping:', {
                docId: doc.$id,
                table,
                error
            });
            skippedCount++;
        }
    });

    if (skippedCount > 0) {
        console.warn(`[SyncService] Skipped ${skippedCount} documents due to errors in ${table}`);
    }

    return { created, updated, deleted: [] };
}

/**
 * TIER 1: Sync only CRITICAL data (Blocking)
 * - Active permission config (1 doc)
 * - Current user's role (1 doc)
 * Total: ~2 docs, <10KB, <500ms on 3G
 */
export async function performCriticalSync(): Promise<boolean> {
    // Wait for any ongoing sync to complete
    while (isSyncLocked) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
        isSyncLocked = true;
        console.log('[SyncService] 🔴 TIER 1: Starting CRITICAL sync...');
        const db = getDatabase();
        const userId = await getCurrentUserId();

        await synchronize({
            database: db,
            pullChanges: async ({ lastPulledAt }) => {
                const changes: any = {};

                // 1. Sync ONLY active permission_config
                try {
                    const permissionDocs = await databases.listDocuments(
                        DATABASE_ID,
                        PERMISSION_CONFIG_COLLECTION_ID,
                        [
                            Query.equal('isActive', true),
                            Query.equal('deleted', false),
                            Query.limit(1)
                        ]
                    );

                    changes.permission_config = await categorizePullChanges(db, 'permission_config', permissionDocs.documents);
                    console.log('[SyncService] ✓ Synced permission_config:', permissionDocs.documents.length);
                } catch (error) {
                    console.error('[SyncService] ✗ Failed to sync permission_config:', error);
                    changes.permission_config = { created: [], updated: [], deleted: [] };
                }

                // 2. Sync ONLY current user's role
                try {
                    const roleDocs = await databases.listDocuments(
                        DATABASE_ID,
                        USER_ROLES_COLLECTION_ID,
                        [
                            Query.equal('userId', userId),
                            Query.equal('deleted', false),
                            Query.limit(1)
                        ]
                    );

                    changes.user_roles = await categorizePullChanges(db, 'user_roles', roleDocs.documents);
                    console.log('[SyncService] ✓ Synced user_roles:', roleDocs.documents.length);
                } catch (error) {
                    console.error('[SyncService] ✗ Failed to sync user_roles:', error);
                    changes.user_roles = { created: [], updated: [], deleted: [] };
                }

                // IMPORTANT: Return input timestamp so partial sync doesn't "claim" full sync status
                // WatermelonDB requires a non-zero timestamp, so we use 1 if it's the first sync
                return { changes, timestamp: lastPulledAt || 1 };
            },
            pushChanges: async () => { } // No push during critical sync
        });

        console.log('[SyncService] 🔴 TIER 1: CRITICAL sync completed');
        return true;
    } catch (error) {
        console.error('[SyncService] 🔴 TIER 1: CRITICAL sync failed:', error);
        return false;
    } finally {
        isSyncLocked = false;
    }
}

/**
 * TIER 2: Sync HIGH PRIORITY data (Background, non-blocking)
 * - Unsold inventory from last 30 days
 * - Customers with activity in last 90 days
 */
/**
 * TIER 2: Sync HIGH PRIORITY data (Background, non-blocking)
 * - UNSOLD inventory from last 30 days
 * - CUSTOMERS with activity in last 90 days
 */
export async function performHighPrioritySync(): Promise<void> {
    // Wait for any ongoing sync to complete
    while (isSyncLocked) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
        isSyncLocked = true;
        console.log('[SyncService] 🟡 TIER 2: Starting HIGH PRIORITY sync (Recent data)...');
        const db = getDatabase();

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        await synchronize({
            database: db,
            pullChanges: async ({ lastPulledAt }) => {
                const changes: any = {};

                // 1. Sync RECENT unsold inventory
                try {
                    const inventoryDocs = await databases.listDocuments(
                        DATABASE_ID,
                        INVENTORY_COLLECTION_ID,
                        [
                            // Pull all non-deleted, unsold or recently updated items
                            // Initially relaxing filters to debug why 0 docs are found
                            Query.limit(1000)
                        ]
                    );

                    changes.inventory = await categorizePullChanges(db, 'inventory', inventoryDocs.documents);
                    console.log('[SyncService] ✓ Synced inventory (recent/unsold):', inventoryDocs.documents.length);
                } catch (error) {
                    console.error('[SyncService] ✗ Failed to sync inventory:', error);
                    changes.inventory = { created: [], updated: [], deleted: [] };
                }

                // 2. Sync RECENT customers
                try {
                    const customerDocs = await databases.listDocuments(
                        DATABASE_ID,
                        CUSTOMERS_COLLECTION_ID,
                        [
                            Query.equal('deleted', false),
                            Query.greaterThan('$updatedAt', ninetyDaysAgo.toISOString()),
                            Query.limit(500)
                        ]
                    );

                    changes.customers = await categorizePullChanges(db, 'customers', customerDocs.documents);
                    console.log('[SyncService] ✓ Synced customers (recent):', customerDocs.documents.length);
                } catch (error) {
                    console.error('[SyncService] ✗ Failed to sync customers:', error);
                    changes.customers = { created: [], updated: [], deleted: [] };
                }

                // IMPORTANT: Return input timestamp so partial sync doesn't "claim" full sync status
                // WatermelonDB requires a non-zero timestamp, so we use 1 if it's the first sync
                return { changes, timestamp: lastPulledAt || 1 };
            },
            pushChanges: async () => { } // No push during high priority sync
        });

        console.log('[SyncService] 🟡 TIER 2: HIGH PRIORITY sync completed');
    } catch (error) {
        console.error('[SyncService] 🟡 TIER 2: HIGH PRIORITY sync failed:', error);
    } finally {
        isSyncLocked = false;
    }
}

/**
 * TIER 3: Sync MEDIUM PRIORITY data (Background, after Tier 2)
 * - Sales from last 30 days
 * - All active stacks
 */
export async function performMediumPrioritySync(): Promise<void> {
    // Wait for any ongoing sync to complete
    while (isSyncLocked) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
        isSyncLocked = true;
        console.log('[SyncService] 🟢 TIER 3: Starting MEDIUM PRIORITY sync...');
        const db = getDatabase();

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        await synchronize({
            database: db,
            pullChanges: async ({ lastPulledAt }) => {
                const changes: any = {};

                // 1. Sync RECENT sales (30 days)
                try {
                    const salesDocs = await databases.listDocuments(
                        DATABASE_ID,
                        SALES_COLLECTION_ID,
                        [
                            Query.equal('deleted', false),
                            Query.greaterThan('$createdAt', thirtyDaysAgo.toISOString()),
                            Query.limit(500)
                        ]
                    );

                    changes.sales = await categorizePullChanges(db, 'sales', salesDocs.documents);
                    console.log('[SyncService] ✓ Synced sales (recent):', salesDocs.documents.length);
                } catch (error) {
                    console.error('[SyncService] ✗ Failed to sync sales:', error);
                    changes.sales = { created: [], updated: [], deleted: [] };
                }

                // 2. Sync all stacks
                try {
                    const stackDocs = await databases.listDocuments(
                        DATABASE_ID,
                        STACKS_COLLECTION_ID,
                        [
                            Query.equal('deleted', false),
                            Query.limit(100)
                        ]
                    );

                    changes.stacks = await categorizePullChanges(db, 'stacks', stackDocs.documents);
                    console.log('[SyncService] ✓ Synced stacks:', stackDocs.documents.length);
                } catch (error) {
                    console.error('[SyncService] ✗ Failed to sync stacks:', error);
                    changes.stacks = { created: [], updated: [], deleted: [] };
                }

                // IMPORTANT: Return input timestamp so partial sync doesn't "claim" full sync status
                // WatermelonDB requires a non-zero timestamp, so we use 1 if it's the first sync
                return { changes, timestamp: lastPulledAt || 1 };
            },
            pushChanges: async () => { } // No push during medium priority sync
        });

        console.log('[SyncService] 🟢 TIER 3: MEDIUM PRIORITY sync completed');
    } catch (error) {
        console.error('[SyncService] 🟢 TIER 3: MEDIUM PRIORITY sync failed:', error);
    } finally {
        isSyncLocked = false;
    }
}

/**
 * TIER 4: LOW PRIORITY Sync (Background, catch-up)
 * - Full bidirectional sync for ALL data
 * - Pulls remaining history that wasn't included in Tier 2/3
 */
export async function performFullSync(): Promise<void> {
    if (isOfflineMode || isSyncing || isSyncLocked) return;

    console.log('[SyncService] ⚪ TIER 4: Starting FULL history sync...');
    await performSync();
    console.log('[SyncService] ⚪ TIER 4: FULL history sync completed');
}

/**
 * Full bidirectional synchronization with Appwrite
 * This is the comprehensive sync used by realtime updates and periodic sync
 */
export async function performSync(): Promise<void> {
    if (isOfflineMode || isSyncing || isSyncLocked) return;

    isSyncing = true;
    isSyncLocked = true;
    console.log('[SyncService] Starting synchronization...');

    try {
        const db = getDatabase();

        await synchronize({
            database: db,
            pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
                const timestamp = lastPulledAt || 0;
                // If this is the first sync, we pull everything from the beginning of time
                const lastPulledDate = timestamp === 0 ? '1970-01-01T00:00:00.000Z' : new Date(timestamp).toISOString();

                console.log(`[SyncService] Recursive Pull: Starting from ${lastPulledDate}`);

                const changes: any = {};
                const collections = [
                    { id: INVENTORY_COLLECTION_ID, table: 'inventory' },
                    { id: CUSTOMERS_COLLECTION_ID, table: 'customers' },
                    { id: SALES_COLLECTION_ID, table: 'sales' },
                    { id: USER_ROLES_COLLECTION_ID, table: 'user_roles' },
                    { id: PERMISSION_CONFIG_COLLECTION_ID, table: 'permission_config' },
                    { id: STACKS_COLLECTION_ID, table: 'stacks' }
                ];

                for (const { id, table } of collections) {
                    const tableChanges: any = { created: [], updated: [], deleted: [] };
                    let hasMore = true;
                    let checkpointUpdatedAt = lastPulledDate;
                    let checkpointId = null;

                    console.log(`[SyncService] Fetching ${table}...`);

                    while (hasMore) {
                        const queries = [
                            Query.orderAsc('$updatedAt'),
                            Query.orderAsc('$id'),
                            Query.limit(500)
                        ];

                        // Composite Checkpoint Logic (RxDB Style)
                        // prevents missing records that have the exact same updatedAt
                        if (checkpointId) {
                            queries.push(
                                Query.or([
                                    Query.greaterThan('$updatedAt', checkpointUpdatedAt),
                                    Query.and([
                                        Query.equal('$updatedAt', checkpointUpdatedAt),
                                        Query.greaterThan('$id', checkpointId)
                                    ])
                                ])
                            );
                        } else {
                            queries.push(Query.greaterThan('$updatedAt', checkpointUpdatedAt));
                        }

                        const response = await databases.listDocuments(DATABASE_ID, id, queries);
                        console.log(`[SyncService] PULL PAGE: Received ${response.documents.length} docs for ${table}`);

                        if (response.documents.length === 0) {
                            hasMore = false;
                            break;
                        }

                        const { created, updated } = await categorizePullChanges(db, table, response.documents);

                        for (const mapped of created) {
                            if (mapped.deleted === true) {
                                tableChanges.deleted.push(mapped.id);
                            } else {
                                tableChanges.created.push(mapped);
                            }
                        }

                        for (const mapped of updated) {
                            if (mapped.deleted === true) {
                                tableChanges.deleted.push(mapped.id);
                            } else {
                                tableChanges.updated.push(mapped);
                            }
                        }

                        // Prepare for next page
                        const lastDoc = response.documents[response.documents.length - 1];
                        checkpointUpdatedAt = lastDoc.$updatedAt;
                        checkpointId = lastDoc.$id;

                        if (response.documents.length < 500) {
                            hasMore = false;
                        }
                    }

                    changes[table] = tableChanges;
                    console.log(`[SyncService] ${table}: Pulled ${tableChanges.created.length + tableChanges.updated.length} changes, ${tableChanges.deleted.length} deletions`);
                }

                // Return the current time as the new sync checkpoint
                // Note: We use the local time but Appwrite's $updatedAt will be verified against it next sync
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

                            // Create audit log - Offloaded to server
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

                            // Create audit log - Offloaded to server
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
        isSyncLocked = false;
    }
}

/**
 * Subscribe to Appwrite Realtime events for all collections
 */
function subscribeToRealtime() {
    if (realtimeSubscription) return;

    console.log('[SyncService] Subscribing to Realtime events...');

    // Subscribe to all document events in the database
    // Pattern: databases.[dbId].collections.[collId].documents
    // Pattern: databases.[dbId].collections.documents (for all collections in DB)
    realtimeSubscription = appwrite.subscribe(
        `databases.${DATABASE_ID}.collections.documents`,
        (response) => {
            // Trigger a sync when any remote change occurs
            console.log('[SyncService] Realtime Event Received:', response.events[0]);

            // Debounce or directly call performSync? 
            // performSync already has an 'isSyncing' guard.
            performSync().catch(console.error);
        }
    );
}

/**
 * Listen for network connectivity changes
 */
function setupNetworkListener() {
    if (netInfoUnsubscribe) return;

    netInfoUnsubscribe = NetInfo.addEventListener(state => {
        // isOfflineMode is our manual toggle, but we also respect device state
        const isDeviceConnected = state.isConnected && state.isInternetReachable !== false;

        console.log(`[SyncService] Network Status: ${isDeviceConnected ? 'ONLINE' : 'OFFLINE'}`);

        if (isDeviceConnected && !isSyncing) {
            // Auto-trigger sync when connection returns
            performSync().catch(console.error);
        }
    });
}

/**
 * Start automatic sync with tiered priority strategy
 * - Tier 1 (Critical) is handled separately during app launch
 * - This starts Tier 2 (High) and Tier 3 (Medium) in background
 * - Then sets up realtime and periodic full sync
 */
export async function startSync() {
    if (isOfflineMode || syncInterval) return;

    console.log('[SyncService] Starting tiered background sync \u0026 realtime listeners...');

    // 1. Background Tier 2 (High Priority) - Non-blocking
    performHighPrioritySync().catch(error => {
        console.error('[SyncService] High priority sync failed:', error);
    }).then(() => {
        // 2. After Tier 2, start Tier 3 (Medium Priority)
        performMediumPrioritySync().catch(error => {
            console.error('[SyncService] Medium priority sync failed:', error);
        }).then(() => {
            // 3. Finally, start Tier 4 (Low Priority - Full History)
            performFullSync().catch(error => {
                console.error('[SyncService] Full history sync failed:', error);
            });
        });
    });

    // 3. Setup Realtime (The "Live" part)
    subscribeToRealtime();

    // 4. Setup Network Monitoring (The "Resilient" part)
    setupNetworkListener();

    // 5. Setup Fallback Interval (The "Reliability" part)
    // Every 5 minutes, do a full sync to catch any missed updates
    syncInterval = setInterval(() => {
        performSync().catch(error => {
            console.error('[SyncService] Periodic sync failed:', error);
        });
    }, 300000);
}

/**
 * Stop automatic sync
 */
export function stopSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }

    if (realtimeSubscription) {
        realtimeSubscription(); // Unsubscribe
        realtimeSubscription = null;
        console.log('[SyncService] Realtime unsubscribed');
    }

    if (netInfoUnsubscribe) {
        netInfoUnsubscribe();
        netInfoUnsubscribe = null;
        console.log('[SyncService] Network listener removed');
    }

    console.log('[SyncService] Automatic sync stopped');
}
