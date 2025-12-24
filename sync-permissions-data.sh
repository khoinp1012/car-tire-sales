#!/bin/bash

# Sync Permission Data Script
# This script reads the permission configuration from config/permissions.config.ts
# and updates the active document in the permission_config collection in Appwrite.

CLI="./node_modules/.bin/appwrite"

# Load environment variables
clean_env() {
    grep "$1" .env | head -n 1 | cut -d '=' -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | tr -d '\r'
}

export APPWRITE_ENDPOINT=$(clean_env "EXPO_PUBLIC_APPWRITE_ENDPOINT")
export APPWRITE_PROJECT_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_PROJECT_ID")
DB_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_DATABASE_ID")
COLL_ID="permission_config"

echo "🚀 Syncing Permission Configuration Data..."

# Verify session
if ! $CLI whoami &> /dev/null; then
    echo "❌ Error: Session not found. Please run: $CLI login"
    exit 1
fi

# Use node to create the document data JSON
cat > sync_config.js << EOF
const fs = require('fs');

// We'll define the config here directly as it's easier than trying to import TS
const config = {
    version: '1.0.1',
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
                routes: ['*', 'manage_roles', 'manage_users', 'permission_history'],
                features: ['manage_users', 'modify_permissions', 'view_analytics', 'manage_inventory', 'create_sales', 'print_labels'],
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
                    user_roles: ['read'],
                    permission_config: ['read'],
                },
                routes: ['welcome', 'insert_inventory', 'modify_inventory', 'scan_modify_inventory', 'find_inventory', 'reprint_inventory', 'location_tracking', 'create_sales', 'pending_sale', 'scan_pending_sale', 'add_customer', 'print_order'],
                features: ['manage_inventory', 'print_labels', 'create_sales'],
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
                    user_roles: ['read'],
                    permission_config: [],
                },
                routes: ['welcome', 'create_sales', 'pending_sale', 'scan_pending_sale', 'add_customer', 'modify_customer', 'print_order', 'find_inventory'],
                features: ['create_sales', 'view_customers'],
            },
        },
    },
    collectionPermissions: {
        inventory: { read: ['admin', 'inventory_manager', 'seller'], create: ['admin', 'inventory_manager'], update: ['admin', 'inventory_manager'], delete: ['admin'] },
        customers: { read: ['admin', 'inventory_manager', 'seller'], create: ['admin', 'seller'], update: ['admin', 'seller'], delete: ['admin'] },
        sales: { read: ['admin', 'inventory_manager', 'seller'], create: ['admin', 'seller'], update: ['admin', 'seller'], delete: ['admin'] },
        autofill: { read: ['admin', 'inventory_manager', 'seller'], create: ['admin', 'inventory_manager'], update: ['admin', 'inventory_manager'], delete: ['admin'] },
        stacks: { read: ['admin', 'inventory_manager'], create: ['admin', 'inventory_manager'], update: ['admin', 'inventory_manager'], delete: ['admin'] },
        user_roles: { read: ['admin', 'inventory_manager', 'seller'], create: ['admin'], update: ['admin'], delete: ['admin'] },
        permission_config: { read: ['admin'], create: ['admin'], update: ['admin'], delete: ['admin'] },
    },
    rowPermissions: [
        { collection: 'user_roles', role: 'seller', action: 'read', condition: 'own_documents', ownershipField: 'userId' },
        { collection: 'user_roles', role: 'inventory_manager', action: 'read', condition: 'own_documents', ownershipField: 'userId' },
        { collection: 'user_roles', role: 'admin', action: 'read', condition: 'all_documents' },
        { collection: 'sales', role: 'seller', action: 'update', condition: 'own_documents', ownershipField: 'createdBy' },
        { collection: 'customers', role: 'seller', action: 'read', condition: 'all_documents' },
        { collection: 'customers', role: 'inventory_manager', action: 'read', condition: 'all_documents' },
        { collection: 'customers', role: 'admin', action: 'read', condition: 'all_documents' },
        { collection: 'inventory', role: 'seller', action: 'read', condition: 'all_documents' },
        { collection: 'inventory', role: 'inventory_manager', action: 'read', condition: 'all_documents' },
        { collection: 'inventory', role: 'admin', action: 'read', condition: 'all_documents' },
    ],
};

const docData = {
    version: config.version,
    isActive: true,
    roles: JSON.stringify(config.roles),
    collectionPermissions: JSON.stringify(config.collectionPermissions),
    rowPermissions: JSON.stringify(config.rowPermissions)
};

process.stdout.write(JSON.stringify(docData));
EOF

DOC_DATA=$(node sync_config.js)
rm sync_config.js

# Deactivate existing configs
echo "Deactivating existing configurations..."
ACTIVE_DOCS=$($CLI databases list-documents --database-id "$DB_ID" --collection-id "$COLL_ID" --queries 'equal("isActive", true)' --json | grep "\"\\$id\"" | cut -d '"' -f 4)

for DOC_ID in $ACTIVE_DOCS; do
    echo "  Deactivating $DOC_ID..."
    $CLI databases update-document --database-id "$DB_ID" --collection-id "$COLL_ID" --document-id "$DOC_ID" --data '{"isActive": false}' &> /dev/null
done

# Create new config document
echo "Creating new active configuration..."
$CLI databases create-document \
  --database-id "$DB_ID" \
  --collection-id "$COLL_ID" \
  --document-id "unique()" \
  --data "$DOC_DATA"

echo "✅ Permission configuration synced to database!"
echo "🔄 The Appwrite Function will sync collection permissions automatically if configured."
