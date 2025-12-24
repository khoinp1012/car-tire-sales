import { databases, DATABASE_ID, USER_ROLES_COLLECTION_ID, ID, account } from '@/constants/appwrite';
import { Query } from 'react-native-appwrite';

/**
 * Available roles in the system
 */
export const AVAILABLE_ROLES = [
    { id: 'admin', name: 'admin' },
    { id: 'inventory_manager', name: 'inventory_manager' },
    { id: 'seller', name: 'seller' },
];

/**
 * User role document structure
 */
export interface UserRoleDocument {
    $id: string;
    userId: string;
    role: string;
    $createdAt: string;
    $updatedAt: string;
}

/**
 * Get user's current role from database
 * Returns the role name or null if not found
 */
export async function getUserRole(userId: string): Promise<string | null> {
    try {
        console.log('[getUserRole] Fetching role for user:', userId);

        const response = await databases.listDocuments(
            DATABASE_ID,
            USER_ROLES_COLLECTION_ID,
            [Query.equal('userId', userId)]
        );

        if (response.documents.length > 0) {
            const roleDoc = response.documents[0] as unknown as UserRoleDocument;
            console.log('[getUserRole] Found role:', roleDoc.role);
            return roleDoc.role;
        }

        console.log('[getUserRole] No role found for user');
        return null;
    } catch (error) {
        console.error('[getUserRole] Error fetching user role:', error);
        return null;
    }
}

/**
 * Set user's role in database
 * Creates a new document if user doesn't have a role, updates if they do
 * Also stores user's name and email for easy identification
 */
export async function setUserRole(userId: string, role: string): Promise<boolean> {
    try {
        console.log('[setUserRole] Setting role for user:', userId, 'to:', role);

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

        // Check if user already has a role document
        const response = await databases.listDocuments(
            DATABASE_ID,
            USER_ROLES_COLLECTION_ID,
            [Query.equal('userId', userId)]
        );

        const roleData = {
            role,
            name: userName,
            email: userEmail,
        };

        if (response.documents.length > 0) {
            // Update existing document
            const docId = response.documents[0].$id;
            await databases.updateDocument(
                DATABASE_ID,
                USER_ROLES_COLLECTION_ID,
                docId,
                roleData
            );
            console.log('[setUserRole] Updated existing role document with name/email');
        } else {
            // Create new document
            await databases.createDocument(
                DATABASE_ID,
                USER_ROLES_COLLECTION_ID,
                ID.unique(),
                {
                    userId,
                    ...roleData
                }
            );
            console.log('[setUserRole] Created new role document with name/email');
        }

        return true;
    } catch (error) {
        console.error('[setUserRole] Error setting user role:', error);
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
 */
export async function initializeUserRecord(userId: string): Promise<void> {
    try {
        // Check if user already has a record
        const response = await databases.listDocuments(
            DATABASE_ID,
            USER_ROLES_COLLECTION_ID,
            [Query.equal('userId', userId)]
        );

        if (response.documents.length > 0) {
            console.log('[initializeUserRecord] User record already exists');
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
        await databases.createDocument(
            DATABASE_ID,
            USER_ROLES_COLLECTION_ID,
            ID.unique(),
            {
                userId,
                role: '', // Blank role - admin must assign later
                name: userName,
                email: userEmail,
            }
        );
        console.log('[initializeUserRecord] Created new user record with blank role, name:', userName, 'email:', userEmail);
    } catch (error) {
        console.error('[initializeUserRecord] Error initializing user record:', error);
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
