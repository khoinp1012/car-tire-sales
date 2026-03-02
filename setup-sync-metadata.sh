#!/bin/bash

# setup-sync-metadata.sh
# This script prepares Appwrite collections for the commercial-grade sync protocol.
# It adds 'deleted' and 'version' attributes and ensures indexing for performance.

# 1. Local project binary
CLI="./node_modules/.bin/appwrite"

# 2. Load and Clean .env
clean_env() {
    grep "$1" .env | head -n 1 | cut -d '=' -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | tr -d '\r'
}

DB_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_DATABASE_ID")
COLL_INV=$(clean_env "EXPO_PUBLIC_COLLECTION_INVENTORY")
COLL_CUS=$(clean_env "EXPO_PUBLIC_COLLECTION_CUSTOMERS")
COLL_SAL=$(clean_env "EXPO_PUBLIC_COLLECTION_SALES")
COLL_ROL=$(clean_env "EXPO_PUBLIC_COLLECTION_USER_ROLES")
COLL_ROL=${COLL_ROL:-user_roles}
COLL_PER="permission_config"
COLL_AUD=$(clean_env "EXPO_PUBLIC_COLLECTION_AUDIT_LOGS")
COLL_AUD=${COLL_AUD:-audit_logs}
COLL_STK=$(clean_env "EXPO_PUBLIC_COLLECTION_STACKS")
COLL_STK=${COLL_STK:-stacks}

COLLECTIONS=("$COLL_INV" "$COLL_CUS" "$COLL_SAL" "$COLL_ROL" "$COLL_PER" "$COLL_AUD" "$COLL_STK")

echo "🚀 Starting Appwrite Sync Metadata Setup..."

# Verify Session
if ! $CLI whoami &> /dev/null; then
    echo "❌ Error: Session not found. Please run: $CLI login"
    exit 1
fi

setup_collection() {
    local COLL_ID=$1
    if [ -z "$COLL_ID" ]; then return; fi
    
    echo "📦 Processing Collection: $COLL_ID"
    
    # 1. Add deleted attribute (Boolean)
    echo "  ➕ Adding 'deleted' attribute..."
    $CLI databases createBooleanAttribute \
        --database-id "$DB_ID" \
        --collection-id "$COLL_ID" \
        --key "deleted" \
        --required false \
        --default false &> /dev/null
    
    # 2. Add version attribute (Integer)
    echo "  ➕ Adding 'version' attribute..."
    $CLI databases createIntegerAttribute \
        --database-id "$DB_ID" \
        --collection-id "$COLL_ID" \
        --key "version" \
        --required false \
        --default 1 &> /dev/null

    # 3. Add Index for deleted
    echo "  ⚡ Creating index for 'deleted'..."
    $CLI databases createIndex \
        --database-id "$DB_ID" \
        --collection-id "$COLL_ID" \
        --key "index_deleted" \
        --type "key" \
        --attributes "deleted" &> /dev/null

    # 4. Add Index for $updatedAt
    echo "  ⚡ Creating index for '\$updatedAt'..."
    $CLI databases createIndex \
        --database-id "$DB_ID" \
        --collection-id "$COLL_ID" \
        --key "index_updated_at" \
        --type "key" \
        --attributes "\$updatedAt" &> /dev/null
}

for COLL in "${COLLECTIONS[@]}"; do
    setup_collection "$COLL"
done

echo "✅ Appwrite Sync Metadata Setup Complete!"
echo "Note: It may take a few moments for attributes to reach 'available' status on the server."
