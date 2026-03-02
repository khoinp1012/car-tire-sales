#!/bin/bash

# Setup script for Audit Logs collection and schema updates
# This script ensures the audit_logs collection exists and has all correct attributes

CLI="./node_modules/.bin/appwrite"

# Load and Clean .env
clean_env() {
    grep "$1" .env | head -n 1 | cut -d '=' -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | tr -d '\r'
}

export APPWRITE_ENDPOINT=$(clean_env "EXPO_PUBLIC_APPWRITE_ENDPOINT")
export APPWRITE_PROJECT_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_PROJECT_ID")
DB_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_DATABASE_ID")

COLL_AUDIT=${EXPO_PUBLIC_COLLECTION_AUDIT_LOGS:-audit_logs}

echo "🚀 Ensuring Audit System Backend is correctly configured..."

# Verify Session
if ! $CLI whoami &> /dev/null; then
    echo "❌ Error: Session not found. Please run: $CLI login"
    exit 1
fi

# 1. Create/Verify audit_logs Collection
echo "📦 Checking $COLL_AUDIT collection..."
if ! $CLI databases get-collection --database-id "$DB_ID" --collection-id "$COLL_AUDIT" &> /dev/null; then
    echo "Creating $COLL_AUDIT collection..."
    $CLI databases create-collection \
        --database-id "$DB_ID" \
        --collection-id "$COLL_AUDIT" \
        --name "Audit Logs" \
        --permissions "read(\"any\")" "create(\"any\")" \
        --document-security false
else
    echo "✅ Audit Logs collection exists."
fi

# Helper function to ensure attribute exists and is correct
ensure_attribute() {
    local TYPE=$1
    local KEY=$2
    local REQUIRED=$3
    local EXTRA_ARGS=$4

    echo "  - Checking attribute: $KEY ($TYPE)..."
    
    # Try to get attribute
    ATTR_INFO=$($CLI databases get-attribute --database-id "$DB_ID" --collection-id "$COLL_AUDIT" --key "$KEY" 2>&1)
    
    if echo "$ATTR_INFO" | grep -q "Attribute not found"; then
        echo "    Creating $KEY..."
        case $TYPE in
            "string")
                $CLI databases create-string-attribute --database-id "$DB_ID" --collection-id "$COLL_AUDIT" --key "$KEY" --required "$REQUIRED" $EXTRA_ARGS
                ;;
            "integer")
                $CLI databases create-integer-attribute --database-id "$DB_ID" --collection-id "$COLL_AUDIT" --key "$KEY" --required "$REQUIRED" $EXTRA_ARGS
                ;;
            "datetime")
                $CLI databases create-datetime-attribute --database-id "$DB_ID" --collection-id "$COLL_AUDIT" --key "$KEY" --required "$REQUIRED" $EXTRA_ARGS
                ;;
            "boolean")
                $CLI databases create-boolean-attribute --database-id "$DB_ID" --collection-id "$COLL_AUDIT" --key "$KEY" --required "$REQUIRED" $EXTRA_ARGS
                ;;
        esac
        
        # Verify after creation
        echo "    Verifying $KEY creation..."
        sleep 1
        if $CLI databases get-attribute --database-id "$DB_ID" --collection-id "$COLL_AUDIT" --key "$KEY" &> /dev/null; then
            echo "    ✅ $KEY created successfully."
        else
            echo "    ❌ Failed to create $KEY."
        fi
    else
        echo "    ✅ $KEY exists."
    fi
}

# 2. Ensure attributes for audit_logs
ensure_attribute "string" "entityId" "true" "--size 100"
ensure_attribute "string" "entityType" "true" "--size 50"
ensure_attribute "integer" "version" "true" ""
ensure_attribute "string" "action" "true" "--size 20"
ensure_attribute "string" "snapshot" "false" "--size 65535" # Snapshot is now optional on server
ensure_attribute "string" "userId" "true" "--size 100"
ensure_attribute "datetime" "timestamp" "true" ""
ensure_attribute "string" "deviceId" "false" "--size 100"

# 3. Ensure indexes
echo "🔍 Checking audit_logs indexes..."
INDEX_INFO=$($CLI databases get-index --database-id "$DB_ID" --collection-id "$COLL_AUDIT" --key "entity_timestamp" 2>&1)
if echo "$INDEX_INFO" | grep -q "Index not found"; then
    echo "Creating entity_timestamp index..."
    $CLI databases create-index --database-id "$DB_ID" --collection-id "$COLL_AUDIT" --key "entity_timestamp" --type "key" --attributes "entityId" "timestamp"
else
    echo "✅ Index entity_timestamp exists."
fi

echo ""
echo "✅ Audit System Backend verification complete!"
