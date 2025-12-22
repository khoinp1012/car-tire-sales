import { useState, useEffect } from 'react';
import { PermissionManager, UIPermissions } from '@/utils/PermissionManager';
import { fetchUserTeams } from '@/utils/fetchUserTeams';
import { account } from '@/constants/appwrite';

/**
 * Custom hook that provides centralized permission management
 * Returns loading state and comprehensive permission object
 */
export function usePermissions() {
  const [permissions, setPermissions] = useState<UIPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPermissions() {
      try {
        setLoading(true);
        setError(null);

        // Check if user is authenticated
        let isAuthenticated = false;
        try {
          await account.get();
          isAuthenticated = true;
        } catch (authError) {
          // User is not authenticated
          isAuthenticated = false;
        }

        // Get user groups
        const groups = isAuthenticated ? await fetchUserTeams() : [];

        // Get permissions from PermissionManager
        const userPermissions = PermissionManager.getUIPermissions(groups, isAuthenticated);

        if (isMounted) {
          setPermissions(userPermissions);
          console.log('[usePermissions] Loaded permissions:', {
            isAuthenticated,
            groups,
            permissions: userPermissions
          });
        }
      } catch (err) {
        console.error('[usePermissions] Error loading permissions:', err);
        if (isMounted) {
          setError('Failed to load permissions');
          // Set default no-permission state
          setPermissions(PermissionManager.getUIPermissions([], false));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadPermissions();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Refresh permissions (useful after login/logout or group changes)
   */
  const refreshPermissions = async () => {
    setLoading(true);
    try {
      let isAuthenticated = false;
      try {
        await account.get();
        isAuthenticated = true;
      } catch (authError) {
        isAuthenticated = false;
      }

      const groups = isAuthenticated ? await fetchUserTeams() : [];
      const userPermissions = PermissionManager.getUIPermissions(groups, isAuthenticated);
      
      setPermissions(userPermissions);
      setError(null);
    } catch (err) {
      console.error('[usePermissions] Error refreshing permissions:', err);
      setError('Failed to refresh permissions');
      setPermissions(PermissionManager.getUIPermissions([], false));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if user can access a specific route
   */
  const canAccessRoute = (routeName: string): boolean => {
    if (!permissions) return false;
    return PermissionManager.canAccessRoute(
      routeName, 
      permissions.userGroups, 
      permissions.isAuthenticated
    );
  };

  /**
   * Get error message for unauthorized route access
   */
  const getAccessDeniedMessage = (routeName: string): string => {
    if (!permissions) return 'Loading permissions...';
    return PermissionManager.getAccessDeniedMessage(
      routeName,
      permissions.userGroups,
      permissions.isAuthenticated
    );
  };

  return {
    permissions,
    loading,
    error,
    refreshPermissions,
    canAccessRoute,
    getAccessDeniedMessage,
    
    // Convenience flags for common checks
    isAuthenticated: permissions?.isAuthenticated ?? false,
    isAdmin: permissions?.isAdmin ?? false,
    isInventoryManager: permissions?.isInventoryManager ?? false,
    isSeller: permissions?.isSeller ?? false,
    userGroups: permissions?.userGroups ?? [],
    roleDescription: permissions ? PermissionManager.getUserRoleDescription(permissions.userGroups) : 'Unknown',
  };
}
