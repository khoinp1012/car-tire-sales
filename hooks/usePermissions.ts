/**
 * usePermissions Hook
 * 
 * React hook for checking permissions in components.
 * Uses TanStack Query for efficient caching and background updates.
 * 
 * Usage:
 *   const { canAccess, loading, userRole } = usePermissions();
 */

import { account } from '@/constants/appwrite';
import { Logger } from '../utils/logger';
import {
    getUserPermissionContext,
    canAccessCollection,
    canAccessRoute as canAccessRouteService,
    hasFeature,
} from '@/utils/permissionService';
import { getUserRole, initializeUserRecord } from '@/utils/userRoleService';
import { PermissionAction, CollectionName, UserPermissionContext } from '@/types/permissions';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Query Keys
export const PERMISSION_KEYS = {
    all: ['permissions'] as const,
    user: (userId: string) => [...PERMISSION_KEYS.all, 'user', userId] as const,
    context: (userId: string) => [...PERMISSION_KEYS.all, 'context', userId] as const,
    role: (userId: string) => [...PERMISSION_KEYS.all, 'role', userId] as const,
    session: () => [...PERMISSION_KEYS.all, 'session'] as const,
};

export function usePermissions() {
    const queryClient = useQueryClient();

    // 1. Fetch User Session
    const sessionQuery = useQuery({
        queryKey: PERMISSION_KEYS.session(),
        queryFn: async () => {
            try {
                const user = await account.get();
                // Initialize user record if they don't have one
                await initializeUserRecord(user.$id);
                return user;
            } catch (err) {
                Logger.error('[usePermissions] Session error:', err);
                throw err;
            }
        },
        staleTime: 1000 * 60 * 30, // Session is stable for 30 mins
    });

    const userId = sessionQuery.data?.$id || null;

    // 2. Fetch User Role
    const roleQuery = useQuery({
        queryKey: PERMISSION_KEYS.role(userId || ''),
        queryFn: () => getUserRole(userId!),
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // Role is fresh for 5 mins
    });

    // 3. Fetch Permission Context
    const contextQuery = useQuery({
        queryKey: PERMISSION_KEYS.context(userId || ''),
        queryFn: () => getUserPermissionContext(userId!),
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // Context is fresh for 5 mins
    });

    const userRole = roleQuery.data || null;
    const permissionContext = contextQuery.data || null;
    const loading = sessionQuery.isLoading || roleQuery.isLoading || contextQuery.isLoading;
    const error = sessionQuery.error || roleQuery.error || contextQuery.error ? 'Failed to load user information' : null;

    /**
     * Check if user can access a collection with specific action
     * Uses cache if available, otherwise fetches
     */
    const canAccess = async (
        collection: CollectionName,
        action: PermissionAction
    ): Promise<boolean> => {
        if (!userId) return false;

        // We can check local context first for speed
        if (permissionContext) {
            const collectionPerms = permissionContext.allowedCollections[collection];
            if (collectionPerms && collectionPerms.includes(action)) {
                return true;
            }
        }

        // Fallback to fresh check if not in context or context is missing
        const result = await canAccessCollection(userId, collection, action);
        return result.allowed;
    };

    /**
     * Check if user can access a route
     */
    const canRoute = async (routeName: string): Promise<boolean> => {
        if (!userId) return false;

        if (permissionContext) {
            if (permissionContext.allowedRoutes.includes(routeName) || permissionContext.allowedRoutes.includes('*')) {
                return true;
            }
        }

        return await canAccessRouteService(userId, routeName);
    };

    /**
     * Check if user has a feature enabled
     */
    const hasPermissionFeature = async (featureName: string): Promise<boolean> => {
        if (!userId) return false;

        if (permissionContext) {
            if (permissionContext.features.includes(featureName) || permissionContext.features.includes('*')) {
                return true;
            }
        }

        return await hasFeature(userId, featureName);
    };

    /**
     * Get full permission context for user
     */
    const getContext = async (): Promise<UserPermissionContext | null> => {
        if (!userId) return null;
        return permissionContext || await getUserPermissionContext(userId);
    };

    /**
     * Refresh user info - invalidates the cache to force a background refetch
     */
    const refresh = async () => {
        Logger.info('[usePermissions] Refreshing permissions cache...');
        await queryClient.invalidateQueries({ queryKey: PERMISSION_KEYS.all });
    };

    /**
     * Synchronous route access check using cached permission context
     */
    const canAccessRoute = (routeName: string): boolean => {
        if (!permissionContext) return false;
        return permissionContext.allowedRoutes.includes(routeName) ||
            permissionContext.allowedRoutes.includes('*');
    };

    /**
     * Get access denied message for a route
     */
    const getAccessDeniedMessage = (routeName: string): string => {
        if (!userRole) {
            return 'You do not have a role assigned. Please contact an administrator.';
        }
        return `Your role (${userRole}) does not have permission to access ${routeName}. Please contact an administrator if you believe this is an error.`;
    };

    return {
        loading,
        error,
        userId,
        userRole,
        canAccess,
        canRoute,
        canAccessRoute,
        getAccessDeniedMessage,
        hasFeature: hasPermissionFeature,
        getContext,
        refresh,

        // Convenience flags
        isAdmin: userRole === 'admin',
        isInventoryManager: userRole === 'inventory_manager',
        isSeller: userRole === 'seller',

        // Properties for welcome.tsx compatibility
        permissions: permissionContext ? {
            accessiblePages: permissionContext.allowedRoutes,
            userGroups: userRole ? [userRole] : [],
        } : null,
        userGroups: userRole ? [userRole] : [],
        roleDescription: userRole,
        refreshPermissions: refresh,
    };
}
