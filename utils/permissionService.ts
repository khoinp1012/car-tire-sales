/**
 * Permission Service - Local Database Version
 * 
 * Handles all permission-related operations using WatermelonDB.
 * OFFLINE-FIRST: All reads come from local database.
 * Writes go to local DB and sync to Appwrite via syncService.
 */

import { Logger } from "./logger";
import { getDatabase } from './databaseService';
import { PermissionConfig as PermissionConfigModel } from '@/models';
import { Q } from '@nozbe/watermelondb';
import {
    PermissionConfig,
    PermissionAction,
    CollectionName,
    UserPermissionContext,
    PermissionCheckResult
} from '@/types/permissions';
import { getUserRole } from './userRoleService';

/**
 * Get the active permission configuration from local database
 * OFFLINE-FIRST: Reads from WatermelonDB
 */
export async function getActivePermissionConfig(): Promise<PermissionConfig | null> {
    try {
        Logger.info('[PermissionService] Fetching active permission config from LOCAL database...');

        const db = getDatabase();
        const configs = await db.get<PermissionConfigModel>('permission_config')
            .query(
                Q.where('is_active', true),
                Q.where('deleted', false),
                Q.sortBy('created_at', Q.desc),
                Q.take(1)
            )
            .fetch();

        if (configs.length === 0) {
            Logger.warn('[PermissionService] No active permission config found in local DB!');
            return null;
        }

        const doc = configs[0];
        Logger.info('[PermissionService] Loaded config version from LOCAL DB:', doc.version);

        // Parse JSON fields with safety checks
        const parseJsonField = (field: any, defaultValue: any) => {
            if (!field || typeof field !== 'string' || field.trim() === '') {
                return defaultValue;
            }
            try {
                return JSON.parse(field);
            } catch (e) {
                Logger.error(`[PermissionService] Failed to parse JSON field:`, e);
                return defaultValue;
            }
        };

        const config: PermissionConfig = {
            version: doc.configVersion,
            isActive: doc.isActive,
            roles: typeof doc.roles === 'string' ? parseJsonField(doc.roles, {}) : doc.roles,
            collectionPermissions: typeof doc.collectionPermissions === 'string'
                ? parseJsonField(doc.collectionPermissions, {})
                : doc.collectionPermissions,
            rowPermissions: typeof doc.rowPermissions === 'string'
                ? parseJsonField(doc.rowPermissions, [])
                : doc.rowPermissions,
        };

        return config;
    } catch (error) {
        Logger.error('[PermissionService] Error fetching permission config from LOCAL DB:', error);
        return null;
    }
}

/**
 * Get user's permission context
 * OFFLINE-FIRST: Reads from local database
 */
export async function getUserPermissionContext(userId: string): Promise<UserPermissionContext | null> {
    try {
        Logger.info('[PermissionService] Getting permission context for user from LOCAL DB:', userId);

        // Get user's role from local DB
        const userRole = await getUserRole(userId);
        if (!userRole) {
            Logger.warn('[PermissionService] User has no role assigned');
            return null;
        }

        // Get active permission config from local DB
        const config = await getActivePermissionConfig();
        if (!config) {
            Logger.error('[PermissionService] No active permission config found in LOCAL DB');
            return null;
        }

        // Get role definition
        const roleDefinition = config.roles[userRole];
        if (!roleDefinition) {
            Logger.error('[PermissionService] Role definition not found:', userRole);
            return null;
        }

        // Build permission context with inheritance
        const allowedCollections: { [key: string]: PermissionAction[] } = {};
        const allowedRoutes: string[] = [];
        const features: string[] = [];

        // Process role inheritance
        const rolesToProcess = [userRole];
        const processedRoles = new Set<string>();

        while (rolesToProcess.length > 0) {
            const currentRole = rolesToProcess.shift()!;
            if (processedRoles.has(currentRole)) continue;
            processedRoles.add(currentRole);

            const currentRoleDef = config.roles[currentRole];
            if (!currentRoleDef) continue;

            // Add inherited roles to process
            if (currentRoleDef.inheritsFrom && Array.isArray(currentRoleDef.inheritsFrom)) {
                currentRoleDef.inheritsFrom.forEach(inheritedRole => {
                    if (!processedRoles.has(inheritedRole)) {
                        rolesToProcess.push(inheritedRole);
                    }
                });
            }

            // Merge routes, features, and collections from nested permissions object
            const perms = currentRoleDef.permissions;
            if (perms) {
                // Merge routes
                if (perms.routes) {
                    perms.routes.forEach(route => {
                        if (!allowedRoutes.includes(route)) {
                            allowedRoutes.push(route);
                        }
                    });
                }

                // Merge features
                if (perms.features) {
                    perms.features.forEach(feature => {
                        if (!features.includes(feature)) {
                            features.push(feature);
                        }
                    });
                }

                // Merge collections
                if (perms.collections) {
                    Object.entries(perms.collections).forEach(([collection, actions]) => {
                        if (!allowedCollections[collection]) {
                            allowedCollections[collection] = [];
                        }
                        (actions as PermissionAction[]).forEach(action => {
                            if (!allowedCollections[collection].includes(action)) {
                                allowedCollections[collection].push(action);
                            }
                        });
                    });
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

        Logger.info('[PermissionService] Built permission context from LOCAL DB:', {
            role: userRole,
            collections: Object.keys(allowedCollections),
            routes: allowedRoutes.length,
        });

        return context;
    } catch (error) {
        Logger.error('[PermissionService] Error getting user permission context from LOCAL DB:', error);
        return null;
    }
}

/**
 * Check if user has permission for a specific action on a collection
 * OFFLINE-FIRST: Uses local database
 */
export async function checkPermission(
    userId: string,
    collection: CollectionName,
    action: PermissionAction
): Promise<PermissionCheckResult> {
    try {
        const context = await getUserPermissionContext(userId);

        if (!context) {
            return {
                allowed: false,
                reason: 'No permission context found',
            };
        }

        const collectionPermissions = context.allowedCollections[collection];

        if (!collectionPermissions || !collectionPermissions.includes(action)) {
            return {
                allowed: false,
                reason: `Role '${context.role}' does not have '${action}' permission for '${collection}'`,
            };
        }

        return {
            allowed: true,
            context,
        };
    } catch (error) {
        Logger.error('[PermissionService] Error checking permission:', error);
        return {
            allowed: false,
            reason: 'Error checking permission',
        };
    }
}

/**
 * Check if user can access a specific route
 * OFFLINE-FIRST: Uses local database
 */
export async function checkRoutePermission(userId: string, routeName: string): Promise<boolean> {
    try {
        const context = await getUserPermissionContext(userId);
        if (!context) {
            Logger.warn('[PermissionService] No permission context for route check');
            return false;
        }

        // Admin has access to everything
        if (context.role === 'admin') return true;

        // Check if route is in allowed routes (including wildcard)
        const isAllowed = context.allowedRoutes.includes('*') || context.allowedRoutes.includes(routeName);

        Logger.info('[PermissionService] Route permission check from LOCAL DB:', {
            route: routeName,
            role: context.role,
            allowed: isAllowed,
        });

        return isAllowed;
    } catch (error) {
        Logger.error('[PermissionService] Error checking route permission:', error);
        return false;
    }
}

/**
 * Check if user has a specific feature enabled
 * OFFLINE-FIRST: Uses local database
 */
export async function hasFeature(userId: string, featureName: string): Promise<boolean> {
    try {
        const context = await getUserPermissionContext(userId);
        if (!context) return false;

        // Admin has access to everything
        if (context.role === 'admin') return true;

        return context.features.includes('*') || context.features.includes(featureName);
    } catch (error) {
        Logger.error('[PermissionService] Error checking feature:', error);
        return false;
    }
}

/**
 * Generate Appwrite permission strings for a document based on collection settings
 */
export async function generateDocumentPermissions(
    collection: CollectionName,
    ownerId?: string
): Promise<string[]> {
    try {
        const config = await getActivePermissionConfig();
        if (!config) return [];

        const permissions = config.collectionPermissions[collection];
        if (!permissions) return ownerId ? [`read(user:${ownerId})`, `update(user:${ownerId})`, `delete(user:${ownerId})`] : [];

        const result: string[] = [];

        // Add role-based permissions
        Object.entries(permissions).forEach(([action, roles]) => {
            if (Array.isArray(roles)) {
                roles.forEach(role => {
                    result.push(`${action}(label:role:${role})`);
                });
            }
        });

        // Add owner permissions if ownerId is provided
        if (ownerId) {
            result.push(`read(user:${ownerId})`);
            result.push(`update(user:${ownerId})`);
            result.push(`delete(user:${ownerId})`);
        }

        return result;
    } catch (error) {
        Logger.error('[PermissionService] Error generating document permissions:', error);
        return [];
    }
}

// Aliases for compatibility with other parts of the app
export const canAccessCollection = checkPermission;
export const canAccessRoute = checkRoutePermission;

/**
 * Save permission configuration to local database
 * OFFLINE-FIRST: Updates local DB, syncs later
 */
export async function savePermissionConfig(config: PermissionConfig): Promise<boolean> {
    try {
        Logger.info('[PermissionService] Saving permission config to LOCAL DB...');
        const db = getDatabase();

        // 1. Deactivate current config
        const activeConfigs = await db.get<PermissionConfigModel>('permission_config')
            .query(Q.where('is_active', true))
            .fetch();

        await db.write(async () => {
            const updates = activeConfigs.map(c =>
                c.prepareUpdate(record => {
                    record.isActive = false;
                })
            );
            await db.batch(...updates);

            // 2. Create new config or update existing
            // For now, we'll create a new one to maintain history
            await db.get<PermissionConfigModel>('permission_config').create(record => {
                record.configVersion = config.version;
                record.isActive = true;
                record.roles = JSON.stringify(config.roles);
                record.collectionPermissions = JSON.stringify(config.collectionPermissions);
                record.rowPermissions = JSON.stringify(config.rowPermissions);
                record.appwriteId = config.$id || '';
                record.version = 1;
                record.deleted = false;
            });
        });

        Logger.info('[PermissionService] Successfully saved config to LOCAL DB');
        return true;
    } catch (error) {
        Logger.error('[PermissionService] Error saving permission config:', error);
        return false;
    }
}

/**
 * Build Appwrite query filters for row-level permissions
 */
export async function buildRowPermissionFilters(
    userId: string,
    collection: CollectionName,
    action: PermissionAction
): Promise<string[]> {
    try {
        const context = await getUserPermissionContext(userId);
        if (!context) return [];

        // Admin sees everything
        if (context.role === 'admin') return [];

        const config = await getActivePermissionConfig();
        if (!config) return [];

        // Find applicable row permission rules
        const rules = config.rowPermissions.filter(
            r => r.collection === collection && r.role === context.role && r.action === action
        );

        if (rules.length === 0) return [];

        const filters: string[] = [];
        rules.forEach(rule => {
            if (rule.condition === 'own_documents' && rule.ownershipField) {
                filters.push(`equal(${rule.ownershipField}, ${userId})`);
            } else if (rule.condition === 'custom' && rule.customQuery) {
                filters.push(rule.customQuery);
            }
        });

        return filters;
    } catch (error) {
        Logger.error('[PermissionService] Error building row permission filters:', error);
        return [];
    }
}


/**
 * Get permission configuration history from local database
 * OFFLINE-FIRST: Reads from WatermelonDB
 */
export async function getPermissionConfigHistory(): Promise<PermissionConfig[]> {
    try {
        Logger.info('[PermissionService] Fetching permission config history from LOCAL DB...');
        const db = getDatabase();
        const records = await db.get<PermissionConfigModel>('permission_config')
            .query(Q.sortBy('created_at', Q.desc))
            .fetch();

        return records.map(doc => ({
            $id: doc.appwriteId,
            version: doc.configVersion,
            isActive: doc.isActive,
            roles: typeof doc.roles === 'string' ? JSON.parse(doc.roles) : doc.roles,
            collectionPermissions: typeof doc.collectionPermissions === 'string'
                ? JSON.parse(doc.collectionPermissions)
                : doc.collectionPermissions,
            rowPermissions: typeof doc.rowPermissions === 'string'
                ? JSON.parse(doc.rowPermissions)
                : doc.rowPermissions,
            $createdAt: doc.createdAt.toISOString(),
            $updatedAt: doc.updatedAt.toISOString(),
        }));
    } catch (error) {
        Logger.error('[PermissionService] Error getting permission history:', error);
        return [];
    }
}

/**
 * Activate a specific permission configuration
 * OFFLINE-FIRST: Updates local DB
 */
export async function activatePermissionConfig(configId: string): Promise<boolean> {
    try {
        Logger.info('[PermissionService] Activating permission config in LOCAL DB:', configId);
        const db = getDatabase();

        // 1. Deactivate current config
        const activeConfigs = await db.get<PermissionConfigModel>('permission_config')
            .query(Q.where('is_active', true))
            .fetch();

        // 2. Find target config
        const targetConfigs = await db.get<PermissionConfigModel>('permission_config')
            .query(Q.where('appwrite_id', configId))
            .fetch();

        if (targetConfigs.length === 0) {
            Logger.warn('[PermissionService] Target config not found:', configId);
            return false;
        }

        await db.write(async () => {
            const updates = [
                ...activeConfigs.map(c => c.prepareUpdate(record => { record.isActive = false; })),
                ...targetConfigs.map(c => c.prepareUpdate(record => { record.isActive = true; }))
            ];
            await db.batch(...updates);
        });

        Logger.info('[PermissionService] Successfully activated config:', configId);
        return true;
    } catch (error) {
        Logger.error('[PermissionService] Error activating config:', error);
        return false;
    }
}

// Export all other utility functions that don't need database access
export * from '@/types/permissions';
