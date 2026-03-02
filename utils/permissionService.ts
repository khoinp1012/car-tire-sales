/**
 * Permission Service - Local Database Version
 * 
 * Handles all permission-related operations using WatermelonDB.
 * OFFLINE-FIRST: All reads come from local database.
 * Writes go to local DB and sync to Appwrite via syncService.
 */

import { getDatabase } from './databaseService';
import { PermissionConfig as PermissionConfigModel } from '@/models';
import { Q } from '@nozbe/watermelondb';
import {
    PermissionConfig,
    PermissionAction,
    CollectionName,
    UserPermissionContext,
    PermissionCheckResult,
    RowPermissionRule
} from '@/types/permissions';
import { getUserRole } from './userRoleService';

/**
 * Get the active permission configuration from local database
 * OFFLINE-FIRST: Reads from WatermelonDB
 */
export async function getActivePermissionConfig(): Promise<PermissionConfig | null> {
    try {
        console.log('[PermissionService] Fetching active permission config from LOCAL database...');

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
            console.warn('[PermissionService] No active permission config found in local DB!');
            return null;
        }

        const doc = configs[0];
        console.log('[PermissionService] Loaded config version from LOCAL DB:', doc.version);

        // Parse JSON fields with safety checks
        const parseJsonField = (field: any, defaultValue: any) => {
            if (!field || typeof field !== 'string' || field.trim() === '') {
                return defaultValue;
            }
            try {
                return JSON.parse(field);
            } catch (e) {
                console.error(`[PermissionService] Failed to parse JSON field:`, e);
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
        console.error('[PermissionService] Error fetching permission config from LOCAL DB:', error);
        return null;
    }
}

/**
 * Get user's permission context
 * OFFLINE-FIRST: Reads from local database
 */
export async function getUserPermissionContext(userId: string): Promise<UserPermissionContext | null> {
    try {
        console.log('[PermissionService] Getting permission context for user from LOCAL DB:', userId);

        // Get user's role from local DB
        const userRole = await getUserRole(userId);
        if (!userRole) {
            console.warn('[PermissionService] User has no role assigned');
            return null;
        }

        // Get active permission config from local DB
        const config = await getActivePermissionConfig();
        if (!config) {
            console.error('[PermissionService] No active permission config found in LOCAL DB');
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

        console.log('[PermissionService] Built permission context from LOCAL DB:', {
            role: userRole,
            collections: Object.keys(allowedCollections),
            routes: allowedRoutes.length,
        });

        return context;
    } catch (error) {
        console.error('[PermissionService] Error getting user permission context from LOCAL DB:', error);
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
        console.error('[PermissionService] Error checking permission:', error);
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
            console.warn('[PermissionService] No permission context for route check');
            return false;
        }

        // Admin has access to everything
        if (context.role === 'admin') return true;

        // Check if route is in allowed routes (including wildcard)
        const isAllowed = context.allowedRoutes.includes('*') || context.allowedRoutes.includes(routeName);

        console.log('[PermissionService] Route permission check from LOCAL DB:', {
            route: routeName,
            role: context.role,
            allowed: isAllowed,
        });

        return isAllowed;
    } catch (error) {
        console.error('[PermissionService] Error checking route permission:', error);
        return false;
    }
}

// Export all other utility functions that don't need database access
export * from '@/types/permissions';
