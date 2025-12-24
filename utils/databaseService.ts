import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from '@/models/schema';
import { Inventory, Customer, Sales, UserRole, PermissionConfig, AuditLog } from '@/models';
import { ID } from '@/constants/appwrite';
import { getCurrentUserId, getDeviceId } from './sessionContext';

let database: Database | null = null;

/**
 * Initialize and get the WatermelonDB database instance
 */
export function getDatabase(): Database {
    if (database) return database;

    const adapter = new SQLiteAdapter({
        schema,
        dbName: 'car_tire_sales_db',
        jsi: true, // Use JSI for better performance
        onSetUpError: (error) => {
            console.error('[DatabaseService] Setup error:', error);
        }
    });

    database = new Database({
        adapter,
        modelClasses: [Inventory, Customer, Sales, UserRole, PermissionConfig, AuditLog]
    });

    console.log('[DatabaseService] WatermelonDB initialized');
    return database;
}

/**
 * Reset the database (for clearing/testing)
 */
export async function resetDatabase(): Promise<void> {
    if (database) {
        await database.write(async () => {
            await database!.unsafeResetDatabase();
        });
        console.log('[DatabaseService] Database reset');
    }
}

/**
 * Create an audit log entry
 * This is called automatically by the sync service when changes are made
 */
export async function createAuditLog(
    entityId: string,
    entityType: string,
    version: number,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    snapshot: any
): Promise<void> {
    try {
        const db = getDatabase();
        const userId = await getCurrentUserId();
        const deviceId = await getDeviceId();
        const timestamp = new Date().toISOString();

        await db.write(async () => {
            await db.get<AuditLog>('audit_logs').create((auditLog) => {
                auditLog.appwriteId = ID.unique();
                auditLog.entityId = entityId;
                auditLog.entityType = entityType;
                auditLog.version = version;
                auditLog.action = action;
                auditLog.snapshot = JSON.stringify(snapshot);
                auditLog.userId = userId;
                auditLog.timestamp = timestamp;
                auditLog.deviceId = deviceId;
            });
        });

        console.log(`[Audit] ✓ Recorded ${action} snapshot for ${entityType}:${entityId} (v${version})`);
    } catch (error) {
        console.error(`[Audit] ⚠️ CRITICAL: Failed to create audit log for ${entityType}:${entityId}`, error);
        console.error('[Audit] ⚠️ AUDIT LOG MISSING - DATA CHANGE NOT TRACKED ⚠️');
    }
}

/**
 * Helper to get collection by name
 */
export function getCollection(collectionName: string) {
    const db = getDatabase();
    return db.get(collectionName);
}
