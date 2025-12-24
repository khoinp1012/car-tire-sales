/**
 * Default Permission Configuration
 * 
 * This is the initial/default permission setup.
 * It can be deployed via CLI or used as a template in the admin UI.
 * 
 * IMPORTANT: This is NOT the single source of truth!
 * The database (permission_config collection) is the single source of truth.
 * This file is only used for:
 * 1. Initial setup/deployment
 * 2. Template/reference for admins
 * 3. CLI deployment script
 */

import { PermissionConfig } from '@/types/permissions';

export const DEFAULT_PERMISSION_CONFIG: PermissionConfig = {
    version: '1.0.0',
    isActive: true,

    roles: {
        admin: {
            id: 'admin',
            displayName: 'Administrator',
            hierarchy: 3,
            inheritsFrom: ['inventory_manager', 'seller'],
            permissions: {
                collections: {
                    inventory: ['read', 'create', 'update', 'delete'],
                    customers: ['read', 'create', 'update', 'delete'],
                    sales: ['read', 'create', 'update', 'delete'],
                    autofill: ['read', 'create', 'update', 'delete'],
                    stacks: ['read', 'create', 'update', 'delete'],
                    user_roles: ['read', 'create', 'update', 'delete'],
                    permission_config: ['read', 'create', 'update', 'delete'],
                },
                routes: [
                    '*', // All routes
                    'manage_roles',
                    'manage_users',
                    'permission_history',
                ],
                features: [
                    'manage_users',
                    'modify_permissions',
                    'view_analytics',
                    'manage_inventory',
                    'create_sales',
                    'print_labels',
                ],
            },
        },

        inventory_manager: {
            id: 'inventory_manager',
            displayName: 'Inventory Manager',
            hierarchy: 2,
            inheritsFrom: ['seller'],
            permissions: {
                collections: {
                    inventory: ['read', 'create', 'update', 'delete'],
                    customers: ['read'],
                    sales: ['read'],
                    autofill: ['read', 'create', 'update', 'delete'],
                    stacks: ['read', 'create', 'update', 'delete'],
                    user_roles: ['read'], // Can only read own role
                    permission_config: ['read'], // Can view but not modify
                },
                routes: [
                    'welcome',
                    'insert_inventory',
                    'modify_inventory',
                    'scan_modify_inventory',
                    'find_inventory',
                    'reprint_inventory',
                    'location_tracking',
                    'create_sales',
                    'pending_sale',
                    'scan_pending_sale',
                    'add_customer',
                    'print_order',
                ],
                features: [
                    'manage_inventory',
                    'print_labels',
                    'create_sales',
                ],
            },
        },

        seller: {
            id: 'seller',
            displayName: 'Seller',
            hierarchy: 1,
            inheritsFrom: [],
            permissions: {
                collections: {
                    inventory: ['read'],
                    customers: ['read', 'create', 'update'],
                    sales: ['read', 'create', 'update'],
                    autofill: ['read'],
                    user_roles: ['read'], // Can only read own role
                    permission_config: [], // No access
                },
                routes: [
                    'welcome',
                    'create_sales',
                    'pending_sale',
                    'scan_pending_sale',
                    'add_customer',
                    'modify_customer',
                    'print_order',
                    'find_inventory',
                ],
                features: [
                    'create_sales',
                    'view_customers',
                ],
            },
        },
    },

    collectionPermissions: {
        inventory: {
            read: ['admin', 'inventory_manager', 'seller'],
            create: ['admin', 'inventory_manager'],
            update: ['admin', 'inventory_manager'],
            delete: ['admin'],
        },
        customers: {
            read: ['admin', 'inventory_manager', 'seller'],
            create: ['admin', 'seller'],
            update: ['admin', 'seller'],
            delete: ['admin'],
        },
        sales: {
            read: ['admin', 'inventory_manager', 'seller'],
            create: ['admin', 'seller'],
            update: ['admin', 'seller'],
            delete: ['admin'],
        },
        autofill: {
            read: ['admin', 'inventory_manager', 'seller'],
            create: ['admin', 'inventory_manager'],
            update: ['admin', 'inventory_manager'],
            delete: ['admin'],
        },
        stacks: {
            read: ['admin', 'inventory_manager'],
            create: ['admin', 'inventory_manager'],
            update: ['admin', 'inventory_manager'],
            delete: ['admin'],
        },
        user_roles: {
            read: ['admin', 'inventory_manager', 'seller'], // Users can read own role
            create: ['admin'],
            update: ['admin'],
            delete: ['admin'],
        },
        permission_config: {
            read: ['admin'],
            create: ['admin'],
            update: ['admin'],
            delete: ['admin'],
        },
    },

    rowPermissions: [
        // User roles: Users can only read their own role document
        {
            collection: 'user_roles',
            role: 'seller',
            action: 'read',
            condition: 'own_documents',
            ownershipField: 'userId',
        },
        {
            collection: 'user_roles',
            role: 'inventory_manager',
            action: 'read',
            condition: 'own_documents',
            ownershipField: 'userId',
        },
        {
            collection: 'user_roles',
            role: 'admin',
            action: 'read',
            condition: 'all_documents', // Admin can read all roles
        },

        // Sales: Sellers can only modify sales they created
        {
            collection: 'sales',
            role: 'seller',
            action: 'update',
            condition: 'own_documents',
            ownershipField: 'createdBy',
        },

        // Customers: All roles can read all customers
        {
            collection: 'customers',
            role: 'seller',
            action: 'read',
            condition: 'all_documents',
        },
        {
            collection: 'customers',
            role: 'inventory_manager',
            action: 'read',
            condition: 'all_documents',
        },
        {
            collection: 'customers',
            role: 'admin',
            action: 'read',
            condition: 'all_documents',
        },

        // Inventory: All roles can read all inventory
        {
            collection: 'inventory',
            role: 'seller',
            action: 'read',
            condition: 'all_documents',
        },
        {
            collection: 'inventory',
            role: 'inventory_manager',
            action: 'read',
            condition: 'all_documents',
        },
        {
            collection: 'inventory',
            role: 'admin',
            action: 'read',
            condition: 'all_documents',
        },
    ],
};
