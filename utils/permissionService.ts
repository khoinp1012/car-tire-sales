/**
 * Permission Service
 * 
 * Handles all permission-related operations.
 * ALWAYS fetches from database - NO CACHING!
 * 
 * Single Source of Truth: permission_config collection in Appwrite
 */

import { databases, DATABASE_ID, account } from '@/constants/appwrite';
import { Query, Permission, Role } from 'react-native-appwrite';
import {
    PermissionConfig,
    PermissionAction,
    CollectionName,
    UserPermissionContext,
    PermissionCheckResult,
    RowPermissionRule
} from '@/types/permissions';
import { getUserRole } from './userRoleService';

const PERMISSION_CONFIG_COLLECTION_ID = 'permission_config';

/**
 * Get the active permission configuration from database
 * ALWAYS fetches fresh data - no caching
 */
export async function getActivePermissionConfig(): Promise<PermissionConfig | null> {
    try {
        console.log('[PermissionService] Fetching active permission config from database...');

        const result = await databases.listDocuments(
            DATABASE_ID,
            PERMISSION_CONFIG_COLLECTION_ID,
            [
                Query.equal('isActive', true),
                Query.orderDesc('$createdAt'),
                Query.limit(1)
            ]
        );

        if (result.documents.length === 0) {
            console.warn('[PermissionService] No active permission config found!');
            return null;
        }

        const doc = result.documents[0] as any;
        console.log('[PermissionService] Loaded config version:', doc.version);

        // Parse JSON fields if they are strings
        const config: PermissionConfig = {
            version: doc.version,
            isActive: doc.isActive,
            roles: typeof doc.roles === 'string' ? JSON.parse(doc.roles) : doc.roles,
            collectionPermissions: typeof doc.collectionPermissions === 'string'
                ? JSON.parse(doc.collectionPermissions)
                : doc.collectionPermissions,
            rowPermissions: typeof doc.rowPermissions === 'string'
                ? JSON.parse(doc.rowPermissions)
                : doc.rowPermissions,
        };

        return config;
    } catch (error) {
        console.error('[PermissionService] Error fetching permission config:', error);
        return null;
    }
}

/**
 * Get user's permission context
 * Fetches fresh data from database every time
 */
export async function getUserPermissionContext(userId: string): Promise<UserPermissionContext | null> {
    try {
        console.log('[PermissionService] Getting permission context for user:', userId);

        // Get user's role
        const userRole = await getUserRole(userId);
        if (!userRole) {
            console.warn('[PermissionService] User has no role assigned');
            return null;
        }

        // Get active permission config
        const config = await getActivePermissionConfig();
        if (!config) {
            console.error('[PermissionService] No active permission config found');
            return null;
        }

        // Get role definition
        const roleDefinition = config.roles[userRole];
        if (!roleDefinition) {
            console.error('[PermissionService] Role definition not found:', userRole);
            return null;
        }

        // Build permission context with inheritance
        const allowedCollections: { [key: string]: PermissionAction[] } = {};
        const allowedRoutes: string[] = [];
        const features: string[] = [];

        // Apply inheritance - collect permissions from inherited roles
        const rolesToProcess = [userRole, ...roleDefinition.inheritsFrom];

        for (const roleId of rolesToProcess) {
            const role = config.roles[roleId];
            if (!role) continue;

            // Merge collection permissions
            for (const [collection, actions] of Object.entries(role.permissions.collections)) {
                if (!allowedCollections[collection]) {
                    allowedCollections[collection] = [];
                }
                for (const action of actions) {
                    if (!allowedCollections[collection].includes(action as PermissionAction)) {
                        allowedCollections[collection].push(action as PermissionAction);
                    }
                }
            }

            // Merge routes
            if (role.permissions.routes.includes('*')) {
                allowedRoutes.push('*');
            } else {
                for (const route of role.permissions.routes) {
                    if (!allowedRoutes.includes(route)) {
                        allowedRoutes.push(route);
                    }
                }
            }

            // Merge features
            for (const feature of role.permissions.features) {
                if (!features.includes(feature)) {
                    features.push(feature);
                }
            }
        }

        const context: UserPermissionContext = {
            userId,
            role: userRole,
            roleDefinition,
            allowedCollections,
            allowedRoutes,
            features,
        };

        console.log('[PermissionService] User permission context:', context);

        return context;
    } catch (error) {
        console.error('[PermissionService] Error getting user permission context:', error);
        return null;
    }
}

/**
 * Check if user can perform action on collection
 * Fetches fresh permission data every time
 */
export async function canAccessCollection(
    userId: string,
    collection: CollectionName,
    action: PermissionAction
): Promise<PermissionCheckResult> {
    try {
        const context = await getUserPermissionContext(userId);

        if (!context) {
            return {
                allowed: false,
                reason: 'User has no permissions configured',
            };
        }

        const collectionPermissions = context.allowedCollections[collection];

        if (!collectionPermissions || !collectionPermissions.includes(action)) {
            return {
                allowed: false,
                reason: `Role '${context.role}' does not have '${action}' permission for collection '${collection}'`,
                requiredRole: 'admin',
            };
        }

        return { allowed: true };
    } catch (error) {
        console.error('[PermissionService] Error checking collection access:', error);
        return {
            allowed: false,
            reason: 'Error checking permissions',
        };
    }
}

/**
 * Check if user can access a route
 */
export async function canAccessRoute(userId: string, routeName: string): Promise<boolean> {
    try {
        const context = await getUserPermissionContext(userId);

        if (!context) {
            return false;
        }

        // Check for wildcard access
        if (context.allowedRoutes.includes('*')) {
            return true;
        }

        return context.allowedRoutes.includes(routeName);
    } catch (error) {
        console.error('[PermissionService] Error checking route access:', error);
        return false;
    }
}

/**
 * Check if user has a specific feature enabled
 */
export async function hasFeature(userId: string, featureName: string): Promise<boolean> {
    try {
        const context = await getUserPermissionContext(userId);

        if (!context) {
            return false;
        }

        return context.features.includes(featureName);
    } catch (error) {
        console.error('[PermissionService] Error checking feature:', error);
        return false;
    }
}

/**
 * Get row-level permission rules for a collection and role
 */
export async function getRowPermissionRules(
    collection: CollectionName,
    role: string,
    action: PermissionAction
): Promise<RowPermissionRule | null> {
    try {
        const config = await getActivePermissionConfig();

        if (!config) {
            return null;
        }

        const rule = config.rowPermissions.find(
            r => r.collection === collection && r.role === role && r.action === action
        );

        return rule || null;
    } catch (error) {
        console.error('[PermissionService] Error getting row permission rules:', error);
        return null;
    }
}

/**
 * Build Appwrite query filters based on row-level permissions
 * Returns additional Query filters to apply to database queries
 */
export async function buildRowPermissionFilters(
    userId: string,
    collection: CollectionName,
    action: PermissionAction
): Promise<any[]> {
    try {
        const userRole = await getUserRole(userId);
        if (!userRole) {
            return [];
        }

        const rule = await getRowPermissionRules(collection, userRole, action);

        if (!rule) {
            // No specific row-level rule, allow all (collection-level permissions still apply)
            return [];
        }

        const filters: any[] = [];

        switch (rule.condition) {
            case 'own_documents':
                if (rule.ownershipField) {
                    filters.push(Query.equal(rule.ownershipField, userId));
                }
                break;

            case 'all_documents':
                // No additional filters needed
                break;

            case 'custom':
                // Custom query would be parsed here
                // For now, we'll skip this
                break;
        }

        return filters;
    } catch (error) {
        console.error('[PermissionService] Error building row permission filters:', error);
        return [];
    }
}

/**
 * Generate Appwrite Permission objects for a document
 * Used when creating/updating documents to set proper permissions
 */
export async function generateDocumentPermissions(
    collection: CollectionName,
    ownerId?: string
): Promise<string[]> {
    try {
        const config = await getActivePermissionConfig();
        if (!config) {
            return [];
        }

        const permissions: string[] = [];
        const collectionPerms = config.collectionPermissions[collection];

        if (!collectionPerms) {
            return [];
        }

        // Add permissions for each role and action
        for (const [action, roles] of Object.entries(collectionPerms)) {
            for (const role of roles) {
                switch (action) {
                    case 'read':
                        permissions.push(Permission.read(Role.label(`role:${role}`)));
                        break;
                    case 'create':
                        // Create is not a document-level permission in Appwrite
                        break;
                    case 'update':
                        permissions.push(Permission.update(Role.label(`role:${role}`)));
                        break;
                    case 'delete':
                        permissions.push(Permission.delete(Role.label(`role:${role}`)));
                        break;
                }
            }
        }

        // Add owner permissions if ownerId is provided
        if (ownerId) {
            permissions.push(Permission.read(Role.user(ownerId)));
            permissions.push(Permission.update(Role.user(ownerId)));
            permissions.push(Permission.delete(Role.user(ownerId)));
        }

        return permissions;
    } catch (error) {
        console.error('[PermissionService] Error generating document permissions:', error);
        return [];
    }
}

/**
 * Save permission configuration to database
 * Used by admin UI to update permissions
 */
export async function savePermissionConfig(config: PermissionConfig): Promise<boolean> {
    try {
        console.log('[PermissionService] Saving new permission config...');

        // Get current user
        const user = await account.get();

        // Deactivate all existing configs
        const existingConfigs = await databases.listDocuments(
            DATABASE_ID,
            PERMISSION_CONFIG_COLLECTION_ID,
            [Query.equal('isActive', true)]
        );

        for (const doc of existingConfigs.documents) {
            await databases.updateDocument(
                DATABASE_ID,
                PERMISSION_CONFIG_COLLECTION_ID,
                doc.$id,
                { isActive: false }
            );
        }

        // Create new config
        const newConfig = {
            ...config,
            isActive: true,
            lastModifiedBy: user.$id,
            lastModifiedAt: new Date().toISOString(),
        };

        const createdDoc = await databases.createDocument(
            DATABASE_ID,
            PERMISSION_CONFIG_COLLECTION_ID,
            'unique()',
            newConfig
        );

        console.log('[PermissionService] Permission config saved successfully');

        // Trigger Appwrite function to sync permissions to collections
        try {
            console.log('[PermissionService] Triggering permission sync to Appwrite collections...');
            const { functions } = await import('@/constants/appwrite');

            await functions.createExecution(
                'permission-sync',
                JSON.stringify({ configId: createdDoc.$id }),
                false // Wait for completion
            );

            console.log('[PermissionService] Permission sync triggered successfully');
        } catch (syncError) {
            console.warn('[PermissionService] Permission sync failed (non-critical):', syncError);
            // Don't fail the save if sync fails - permissions are still in database
        }

        return true;
    } catch (error) {
        console.error('[PermissionService] Error saving permission config:', error);
        return false;
    }
}

/**
 * Get all permission config versions (for history/rollback)
 */
export async function getPermissionConfigHistory(): Promise<PermissionConfig[]> {
    try {
        const result = await databases.listDocuments(
            DATABASE_ID,
            PERMISSION_CONFIG_COLLECTION_ID,
            [Query.orderDesc('$createdAt'), Query.limit(50)]
        );

        return result.documents as unknown as PermissionConfig[];
    } catch (error) {
        console.error('[PermissionService] Error fetching config history:', error);
        return [];
    }
}

/**
 * Activate a specific permission config version
 */
export async function activatePermissionConfig(configId: string): Promise<boolean> {
    try {
        // Deactivate all configs
        const allConfigs = await databases.listDocuments(
            DATABASE_ID,
            PERMISSION_CONFIG_COLLECTION_ID,
            [Query.equal('isActive', true)]
        );

        for (const doc of allConfigs.documents) {
            await databases.updateDocument(
                DATABASE_ID,
                PERMISSION_CONFIG_COLLECTION_ID,
                doc.$id,
                { isActive: false }
            );
        }

        // Activate the specified config
        await databases.updateDocument(
            DATABASE_ID,
            PERMISSION_CONFIG_COLLECTION_ID,
            configId,
            { isActive: true }
        );

        console.log('[PermissionService] Activated config:', configId);

        // Trigger Appwrite function to sync permissions to collections
        try {
            console.log('[PermissionService] Triggering permission sync to Appwrite collections...');
            const { functions } = await import('@/constants/appwrite');

            await functions.createExecution(
                'permission-sync',
                JSON.stringify({ configId }),
                false // Wait for completion
            );

            console.log('[PermissionService] Permission sync triggered successfully');
        } catch (syncError) {
            console.warn('[PermissionService] Permission sync failed (non-critical):', syncError);
            // Don't fail the activation if sync fails
        }

        return true;
    } catch (error) {
        console.error('[PermissionService] Error activating config:', error);
        return false;
    }
}
