#!/bin/bash

# Script to add required indexes for Sync to work

CLI="./node_modules/.bin/appwrite"

# Load and Clean .env
clean_env() {
    grep "$1" .env | head -n 1 | cut -d '=' -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | tr -d '\r'
}

export APPWRITE_ENDPOINT=$(clean_env "EXPO_PUBLIC_APPWRITE_ENDPOINT")
export APPWRITE_PROJECT_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_PROJECT_ID")
DB_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_DATABASE_ID")
USER_ROLES_COLL=$(clean_env "EXPO_PUBLIC_COLLECTION_USER_ROLES")

echo "🏗️  ADDING SYNC INDEXES"
echo "-----------------------"

# 1. Indexes for permission_config
echo "📋 Adding indexes to 'permission_config'..."
$CLI databases create-index \
    --database-id "$DB_ID" \
    --collection-id "permission_config" \
    --key "sync_index" \
    --type "key" \
    --attributes "isActive" "deleted" 2>/dev/null || echo "   Index already exists or failed."

# 2. Indexes for user_roles
echo "🔐 Adding indexes to 'user_roles'..."
$CLI databases create-index \
    --database-id "$DB_ID" \
    --collection-id "$USER_ROLES_COLL" \
    --key "sync_index" \
    --type "key" \
    --attributes "userId" "deleted" 2>/dev/null || echo "   Index already exists or failed."

# 3. Indexes for other collections (Inventory, Customers, etc.)
# Tier 2/3 sync also needs these
COLS=("$USER_ROLES_COLL" "permission_config" $(clean_env "EXPO_PUBLIC_COLLECTION_INVENTORY") $(clean_env "EXPO_PUBLIC_COLLECTION_CUSTOMERS") $(clean_env "EXPO_PUBLIC_COLLECTION_SALES") "stacks" "audit_logs")

for COLL in "${COLS[@]}"; do
    if [ ! -z "$COLL" ]; then
        echo "📦 processing $COLL..."
        
        # 1. Deleted Index
        echo "   Adding 'deleted' index..."
        $CLI databases create-index \
            --database-id "$DB_ID" \
            --collection-id "$COLL" \
            --key "deleted_index" \
            --type "key" \
            --attributes "deleted" 2>/dev/null || echo "   Index 'deleted_index' already exists or skipped."
            
        # 2. UpdatedAt Index (Critical for RxDB-style pull)
        echo "   Adding '\$updatedAt' index..."
        $CLI databases create-index \
            --database-id "$DB_ID" \
            --collection-id "$COLL" \
            --key "updated_at_index" \
            --type "key" \
            --attributes "\$updatedAt" 2>/dev/null || echo "   Index 'updated_at_index' already exists or skipped."
    fi
done

echo "-----------------------"
echo "✅ INDEXING STARTED"
echo "Wait about 30 seconds for Appwrite to build the indexes."
