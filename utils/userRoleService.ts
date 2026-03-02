/**
 * User Role Service - Local Database Version
 * 
 * OFFLINE-FIRST: All reads come from WatermelonDB.
 * Writes go to local DB and sync to Appwrite via syncService.
 */

import { getDatabase } from './databaseService';
import { UserRole } from '@/models';
import { Q } from '@nozbe/watermelondb';
import { ID, account } from '@/constants/appwrite';

/**
 * Available roles in the system
 */
export const AVAILABLE_ROLES = [
    { id: 'admin', name: 'admin' },
    { id: 'inventory_manager', name: 'inventory_manager' },
    { id: 'seller', name: 'seller' },
];

/**
 * Get user's current role from LOCAL database
 * Returns the role name or null if not found
 * OFFLINE-FIRST
 */
export async function getUserRole(userId: string): Promise<string | null> {
    try {
        console.log('[getUserRole] Fetching role for user from LOCAL DB:', userId);

        const db = getDatabase();
        const userRoles = await db.get<UserRole>('user_roles')
            .query(
                Q.where('user_id', userId),
                Q.where('deleted', false)
            )
            .fetch();

        if (userRoles.length > 0) {
            // Sort to pick the record with a role first if multiple exist
            const sorted = [...userRoles].sort((a, b) => (b.role?.length || 0) - (a.role?.length || 0));
            const roleDoc = sorted[0];

            if (roleDoc.role) {
                console.log('[getUserRole] Found role in LOCAL DB:', roleDoc.role);
                return roleDoc.role;
            }
        }

        console.log('[getUserRole] No role found in LOCAL DB for user (or role is empty)');
        return null;
    } catch (error) {
        console.error('[getUserRole] Error fetching user role from LOCAL DB:', error);
        return null;
    }
}

/**
 * Set user's role in LOCAL database
 * Creates a new document if user doesn't have a role, updates if they do
 * Also stores user's name and email for easy identification
 * Changes will sync to Appwrite automatically
 */
export async function setUserRole(userId: string, role: string): Promise<boolean> {
    try {
        console.log('[setUserRole] Setting role in LOCAL DB for user:', userId, 'to:', role);

        // Fetch user info to get name and email
        let userName = '';
        let userEmail = '';
        try {
            const user = await account.get();
            if (user.$id === userId) {
                // Current user
                userName = user.name || '';
                userEmail = user.email || '';
            } else {
                // Different user - we can't fetch their info without admin API
                // Leave empty for now
                userName = '';
                userEmail = '';
            }
        } catch (err) {
            console.warn('[setUserRole] Could not fetch user info:', err);
        }

        const db = getDatabase();

        // Check if user already has a role document
        const existingRoles = await db.get<UserRole>('user_roles')
            .query(
                Q.where('user_id', userId),
                Q.where('deleted', false)
            )
            .fetch();

        await db.write(async () => {
            if (existingRoles.length > 0) {
                // Update existing document
                const roleDoc = existingRoles[0];
                await roleDoc.update(record => {
                    record.role = role;
                    record.name = userName;
                    record.email = userEmail;
                    record.version = (record.version || 0) + 1;
                    record.lastModifiedBy = userId;
                });
                console.log('[setUserRole] Updated existing role document in LOCAL DB with name/email');
            } else {
                // Create new document
                await db.get<UserRole>('user_roles').create(record => {
                    record.appwriteId = ID.unique();
                    record.userId = userId;
                    record.role = role;
                    record.name = userName;
                    record.email = userEmail;
                    record.version = 1;
                    record.deleted = false;
                    record.lastModifiedBy = userId;
                });
                console.log('[setUserRole] Created new role document in LOCAL DB with name/email');
            }
        });

        return true;
    } catch (error) {
        console.error('[setUserRole] Error setting user role in LOCAL DB:', error);
        return false;
    }
}

/**
 * Get all available roles with translated names
 */
export function getAllAvailableRoles(): { id: string; name: string }[] {
    // Import here to avoid circular dependencies
    const { getTranslatedRoles } = require('./roleTranslation');
    return getTranslatedRoles();
}

/**
 * Initialize user record (create user entry with name and email, but NO role assigned)
 * This allows admins to see all users and assign roles later
 * OFFLINE-FIRST: Writes to local DB, syncs automatically
 */
export async function initializeUserRecord(userId: string): Promise<void> {
    try {
        const db = getDatabase();

        // Check if user already has any record (synced or local)
        const existingRoles = await db.get<UserRole>('user_roles')
            .query(
                Q.where('user_id', userId)
            )
            .fetch();

        if (existingRoles.length > 0) {
            const hasRole = existingRoles.some(r => r.role && r.role.length > 0);
            console.log('[initializeUserRecord] User record exists. Has role:', hasRole);
            return;
        }

        // Fetch user info to get name and email
        let userName = '';
        let userEmail = '';
        try {
            const user = await account.get();
            if (user.$id === userId) {
                userName = user.name || '';
                userEmail = user.email || '';
            }
        } catch (err) {
            console.warn('[initializeUserRecord] Could not fetch user info:', err);
        }

        // Create new user record with NO role assigned (empty string)
        // We use the same ID as userId to avoid conflicts if possible, 
        // but sync usually uses Appwrite $id. For now, just logging.
        await db.write(async () => {
            await db.get<UserRole>('user_roles').create(record => {
                record.appwriteId = ''; // Leave blank, will be updated by sync if exists
                record.userId = userId;
                record.role = '';
                record.name = userName;
                record.email = userEmail;
                record.version = 1;
                record.deleted = false;
                record.lastModifiedBy = userId;
            });
        });

        console.log('[initializeUserRecord] Created initial blank record for user:', userId);
    } catch (error) {
        console.error('[initializeUserRecord] Error:', error);
    }
}

/**
 * @deprecated Use initializeUserRecord instead to create users with blank roles
 * Initialize user role (create default role if user doesn't have one)
 * Default role is 'seller'
 */
export async function initializeUserRole(userId: string, defaultRole: string = 'seller'): Promise<void> {
    try {
        const currentRole = await getUserRole(userId);

        if (!currentRole) {
            console.log('[initializeUserRole] User has no role, setting default:', defaultRole);
            await setUserRole(userId, defaultRole);
        } else {
            console.log('[initializeUserRole] User already has role:', currentRole);
        }
    } catch (error) {
        console.error('[initializeUserRole] Error initializing user role:', error);
    }
}
