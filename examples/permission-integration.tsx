/**
 * Example: Integrating New Permission System
 * 
 * This file shows how to update existing components to use the new permission system.
 * Copy these patterns to your actual components.
 */

import React from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { databases, DATABASE_ID, INVENTORY_COLLECTION_ID, ID } from '@/constants/appwrite';
import { buildRowPermissionFilters, generateDocumentPermissions } from '@/utils/permissionService';

/**
 * Example 1: Using PermissionGuard for UI Elements
 */
export function ExampleUIPermissions() {
    const router = useRouter();

    return (
        <View>
            {/* Only show this button to users who can create inventory */}
            <PermissionGuard collection="inventory" action="create">
                <Button
                    title="Create Inventory"
                    onPress={() => router.push('/insert_inventory')}
                />
            </PermissionGuard>

            {/* Only show this button to users who can access the route */}
            <PermissionGuard route="manage_permissions">
                <Button
                    title="Manage Permissions"
                    onPress={() => router.push('/manage_permissions')}
                />
            </PermissionGuard>

            {/* Show fallback if user doesn't have permission */}
            <PermissionGuard
                collection="sales"
                action="delete"
                fallback={<Text>You don't have permission to delete sales</Text>}
            >
                <Button title="Delete Sale" onPress={() => { }} />
            </PermissionGuard>
        </View>
    );
}

/**
 * Example 2: Using usePermissions Hook
 */
export function ExampleHookPermissions() {
    const { canAccess, userRole, isAdmin, loading } = usePermissions();

    const handleCreateInventory = async () => {
        // Check permission before action
        if (await canAccess('inventory', 'create')) {
            // User has permission, proceed
            createInventoryItem();
        } else {
            Alert.alert('Permission Denied', 'You cannot create inventory items');
        }
    };

    if (loading) {
        return <Text>Loading permissions...</Text>;
    }

    return (
        <View>
            <Text>Your role: {userRole}</Text>

            {isAdmin && (
                <Button title="Admin Only Feature" onPress={() => { }} />
            )}

            <Button title="Create Inventory" onPress={handleCreateInventory} />
        </View>
    );
}

/**
 * Example 3: Fetching Data with Row-Level Permissions
 */
export async function fetchInventoryWithPermissions(userId: string) {
    try {
        // Get row-level permission filters for this user
        const permissionFilters = await buildRowPermissionFilters(
            userId,
            'inventory',
            'read'
        );

        // Combine with your query filters
        const result = await databases.listDocuments(
            DATABASE_ID,
            INVENTORY_COLLECTION_ID,
            [
                ...permissionFilters, // Apply permission filters first
                // Then add your custom filters
                // Query.equal('status', 'active'),
                // Query.orderDesc('$createdAt'),
            ]
        );

        return result.documents;
    } catch (error) {
        console.error('Error fetching inventory:', error);
        return [];
    }
}

/**
 * Example 4: Creating Documents with Proper Permissions
 */
export async function createSaleWithPermissions(userId: string, saleData: any) {
    try {
        // Generate proper Appwrite permissions for this document
        const permissions = await generateDocumentPermissions('sales', userId);

        const result = await databases.createDocument(
            DATABASE_ID,
            'sales_collection_id',
            ID.unique(),
            {
                ...saleData,
                createdBy: userId, // Important for row-level permissions
            },
            permissions // Apply generated permissions
        );

        return result;
    } catch (error) {
        console.error('Error creating sale:', error);
        throw error;
    }
}

/**
 * Example 5: Checking Multiple Permissions
 */
export function ExampleMultiplePermissions() {
    const { canAccess, canRoute } = usePermissions();

    const checkAllPermissions = async () => {
        const canCreateInventory = await canAccess('inventory', 'create');
        const canUpdateCustomers = await canAccess('customers', 'update');
        const canAccessAdmin = await canRoute('manage_permissions');

        console.log('Permissions:', {
            canCreateInventory,
            canUpdateCustomers,
            canAccessAdmin,
        });
    };

    return (
        <View>
            <Button title="Check Permissions" onPress={checkAllPermissions} />
        </View>
    );
}

/**
 * Example 6: Getting Full Permission Context
 */
export function ExamplePermissionContext() {
    const { getContext } = usePermissions();

    const showPermissions = async () => {
        const context = await getContext();

        if (context) {
            console.log('User Role:', context.role);
            console.log('Role Display Name:', context.roleDefinition.displayName);
            console.log('Hierarchy Level:', context.roleDefinition.hierarchy);
            console.log('Allowed Collections:', context.allowedCollections);
            console.log('Allowed Routes:', context.allowedRoutes);
            console.log('Features:', context.features);
        }
    };

    return (
        <View>
            <Button title="Show My Permissions" onPress={showPermissions} />
        </View>
    );
}

/**
 * Example 7: Updating Welcome Screen
 * 
 * Replace the old permission checks in welcome.tsx with:
 */
export function ExampleWelcomeScreen() {
    const router = useRouter();

    return (
        <View>
            {/* Inventory Section */}
            <PermissionGuard route="find_inventory">
                <Button
                    title="Find Inventory"
                    onPress={() => router.push('/find_inventory')}
                />
            </PermissionGuard>

            <PermissionGuard route="insert_inventory">
                <Button
                    title="Insert Inventory"
                    onPress={() => router.push('/insert_inventory')}
                />
            </PermissionGuard>

            {/* Sales Section */}
            <PermissionGuard route="create_sales">
                <Button
                    title="Create Sales"
                    onPress={() => router.push('/create_sales')}
                />
            </PermissionGuard>

            {/* Admin Section */}
            <PermissionGuard route="manage_permissions">
                <Button
                    title="Manage Permissions"
                    onPress={() => router.push('/manage_permissions')}
                />
            </PermissionGuard>
        </View>
    );
}
