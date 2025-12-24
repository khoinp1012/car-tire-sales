#!/bin/bash

# Setup script for Audit Logs collection and schema updates
# This script creates the audit_logs collection and adds versioning to existing collections

CLI="./node_modules/.bin/appwrite"

# Load and Clean .env
clean_env() {
    grep "$1" .env | head -n 1 | cut -d '=' -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | tr -d '\r'
}

export APPWRITE_ENDPOINT=$(clean_env "EXPO_PUBLIC_APPWRITE_ENDPOINT")
export APPWRITE_PROJECT_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_PROJECT_ID")
DB_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_DATABASE_ID")

COLL_AUDIT=${EXPO_PUBLIC_COLLECTION_AUDIT_LOGS:-audit_logs}
COLL_INV=$(clean_env "EXPO_PUBLIC_COLLECTION_INVENTORY")
COLL_CUST=$(clean_env "EXPO_PUBLIC_COLLECTION_CUSTOMERS")

echo "🚀 Setting up Audit System in Appwrite..."

# Verify Session
if ! $CLI whoami &> /dev/null; then
    echo "❌ Error: Session not found. Please run: $CLI login"
    exit 1
fi

# 1. Create audit_logs Collection
echo "📦 Creating $COLL_AUDIT collection..."
$CLI databases create-collection \
    --database-id "$DB_ID" \
    --collection-id "$COLL_AUDIT" \
    --name "Audit Logs" \
    --permissions "read(\"any\")" "create(\"any\")" \
    --document-security false

if [ $? -eq 0 ] || $CLI databases get-collection --database-id "$DB_ID" --collection-id "$COLL_AUDIT" &> /dev/null; then
    echo "✅ Audit Logs collection ready."
    
    # Create attributes for audit_logs
    echo "📝 Creating audit_logs attributes..."
    $CLI databases create-string-attribute --database-id "$DB_ID" --collection-id "$COLL_AUDIT" --key "entityId" --size 100 --required true
    $CLI databases create-string-attribute --database-id "$DB_ID" --collection-id "$COLL_AUDIT" --key "entityType" --size 50 --required true
    $CLI databases create-integer-attribute --database-id "$DB_ID" --collection-id "$COLL_AUDIT" --key "version" --required true
    $CLI databases create-string-attribute --database-id "$DB_ID" --collection-id "$COLL_AUDIT" --key "action" --size 20 --required true
    $CLI databases create-string-attribute --database-id "$DB_ID" --collection-id "$COLL_AUDIT" --key "snapshot" --size 65535 --required true
    $CLI databases create-string-attribute --database-id "$DB_ID" --collection-id "$COLL_AUDIT" --key "userId" --size 100 --required true
    $CLI databases create-datetime-attribute --database-id "$DB_ID" --collection-id "$COLL_AUDIT" --key "timestamp" --required true
    $CLI databases create-string-attribute --database-id "$DB_ID" --collection-id "$COLL_AUDIT" --key "deviceId" --size 100 --required false

    # Create indexes for audit_logs
    echo "🔍 Creating audit_logs indexes..."
    $CLI databases create-index --database-id "$DB_ID" --collection-id "$COLL_AUDIT" --key "entity_timestamp" --type "key" --attributes "entityId" "timestamp"
fi

# 2. Update All Collections with Sync Attributes
echo "🔄 Updating collection schemas with sync attributes (version, deleted, lastModifiedBy)..."

COLLECTIONS=(
    $(clean_env "EXPO_PUBLIC_COLLECTION_INVENTORY")
    $(clean_env "EXPO_PUBLIC_COLLECTION_CUSTOMERS")
    $(clean_env "EXPO_PUBLIC_COLLECTION_USER_ROLES")
    $(clean_env "EXPO_PUBLIC_COLLECTION_STACKS")
    $(clean_env "EXPO_PUBLIC_COLLECTION_SALES")
    $(clean_env "EXPO_PUBLIC_COLLECTION_AUTOFILL")
    "permission_config"
)

for COLL in "${COLLECTIONS[@]}"; do
    if [ ! -z "$COLL" ]; then
        echo "  - Updating $COLL..."
        $CLI databases create-integer-attribute --database-id "$DB_ID" --collection-id "$COLL" --key "version" --required false --default 1 2>/dev/null
        $CLI databases create-boolean-attribute --database-id "$DB_ID" --collection-id "$COLL" --key "deleted" --required false --default false 2>/dev/null
        $CLI databases create-string-attribute --database-id "$DB_ID" --collection-id "$COLL" --key "lastModifiedBy" --size 100 --required false 2>/dev/null
    fi
done

echo ""
echo "✅ Audit System Backend setup complete!"
echo "Note: Attributes may take a few seconds to become 'available' in Appwrite."
