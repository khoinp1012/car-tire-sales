import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from '@/models/schema';
import { Inventory, Customer, Sales, UserRole, PermissionConfig, Stack } from '@/models';
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
        modelClasses: [Inventory, Customer, Sales, UserRole, PermissionConfig, Stack]
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
 * Helper to get collection by name
 */
export function getCollection(collectionName: string) {
    const db = getDatabase();
    return db.get(collectionName);
}
