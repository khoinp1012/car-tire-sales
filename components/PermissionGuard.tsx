/**
 * PermissionGuard Component
 * 
 * Wrapper component that shows/hides children based on permissions.
 * Always checks fresh permissions from database.
 * 
 * Usage:
 *   <PermissionGuard collection="inventory" action="create">
 *     <Button title="Create Inventory" />
 *   </PermissionGuard>
 * 
 *   <PermissionGuard route="manage_permissions">
 *     <Button title="Manage Permissions" />
 *   </PermissionGuard>
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { account } from '@/constants/appwrite';
import { canAccessCollection, canAccessRoute } from '@/utils/permissionService';
import { PermissionAction, CollectionName } from '@/types/permissions';

interface PermissionGuardProps {
    children: React.ReactNode;
    collection?: CollectionName;
    action?: PermissionAction;
    route?: string;
    fallback?: React.ReactNode;
    showLoading?: boolean;
}

export function PermissionGuard({
    children,
    collection,
    action,
    route,
    fallback = null,
    showLoading = false,
}: PermissionGuardProps) {
    const [allowed, setAllowed] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkPermission();
    }, [collection, action, route]);

    const checkPermission = async () => {
        try {
            setLoading(true);

            const user = await account.get();
            const userId = user.$id;

            let hasPermission = false;

            if (collection && action) {
                const result = await canAccessCollection(userId, collection, action);
                hasPermission = result.allowed;
            } else if (route) {
                hasPermission = await canAccessRoute(userId, route);
            } else {
                // No permission check specified, allow by default
                hasPermission = true;
            }

            setAllowed(hasPermission);
        } catch (error) {
            console.error('[PermissionGuard] Error checking permission:', error);
            setAllowed(false);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        if (showLoading) {
            return (
                <View style={{ padding: 10, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#007AFF" />
                </View>
            );
        }
        return null;
    }

    if (!allowed) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
