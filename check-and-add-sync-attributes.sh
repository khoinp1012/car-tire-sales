#!/bin/bash

# Check and add missing sync attributes (deleted, version, lastModifiedBy) to all Appwrite collections
# This ensures all collections are ready for the offline-first sync implementation

CLI="./node_modules/.bin/appwrite"

# Load and Clean .env
clean_env() {
    grep "$1" .env | head -n 1 | cut -d '=' -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | tr -d '\r'
}

export APPWRITE_ENDPOINT=$(clean_env "EXPO_PUBLIC_APPWRITE_ENDPOINT")
export APPWRITE_PROJECT_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_PROJECT_ID")
DB_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_DATABASE_ID")

COLL_INV=$(clean_env "EXPO_PUBLIC_COLLECTION_INVENTORY")
COLL_CUS=$(clean_env "EXPO_PUBLIC_COLLECTION_CUSTOMERS")
COLL_SAL=$(clean_env "EXPO_PUBLIC_COLLECTION_SALES")
COLL_ROL=$(clean_env "EXPO_PUBLIC_COLLECTION_USER_ROLES")

echo "🔍 Checking and adding missing sync attributes to all collections..."
echo ""

# Verify Session
if ! $CLI whoami &> /dev/null; then
    echo "❌ Error: Session not found. Please run: $CLI login"
    exit 1
fi

# Function to check if an attribute exists
attribute_exists() {
    local COLL_ID=$1
    local ATTR_NAME=$2
    
    # Get the list of attributes and check if our attribute name appears in the first column
    local ATTRS=$($CLI databases list-attributes \
        --database-id "$DB_ID" \
        --collection-id "$COLL_ID" 2>/dev/null)
    
    echo "$ATTRS" | awk '{print $1}' | grep -q "^${ATTR_NAME}$"
    
    return $?
}

# Function to add version attribute (integer, default 1)
add_version_attr() {
    local COLL_ID=$1
    local COLL_NAME=$2
    
    if attribute_exists "$COLL_ID" "version"; then
        echo "  ✓ version already exists in $COLL_NAME"
    else
        echo "  ➕ Adding 'version' to $COLL_NAME..."
        $CLI databases create-integer-attribute \
            --database-id "$DB_ID" \
            --collection-id "$COLL_ID" \
            --key "version" \
            --required false \
            --xdefault 1 \
            --array false 2>&1 | tail -n 5
    fi
}

# Function to add deleted attribute (boolean, default false)
add_deleted_attr() {
    local COLL_ID=$1
    local COLL_NAME=$2
    
    if attribute_exists "$COLL_ID" "deleted"; then
        echo "  ✓ deleted already exists in $COLL_NAME"
    else
        echo "  ➕ Adding 'deleted' to $COLL_NAME..."
        $CLI databases create-boolean-attribute \
            --database-id "$DB_ID" \
            --collection-id "$COLL_ID" \
            --key "deleted" \
            --required false \
            --xdefault false \
            --array false 2>&1 | tail -n 5
    fi
}

# Function to add lastModifiedBy attribute (string)
add_last_modified_by_attr() {
    local COLL_ID=$1
    local COLL_NAME=$2
    
    if attribute_exists "$COLL_ID" "lastModifiedBy"; then
        echo "  ✓ lastModifiedBy already exists in $COLL_NAME"
    else
        echo "  ➕ Adding 'lastModifiedBy' to $COLL_NAME..."
        $CLI databases create-string-attribute \
            --database-id "$DB_ID" \
            --collection-id "$COLL_ID" \
            --key "lastModifiedBy" \
            --size 100 \
            --required false \
            --array false 2>&1 | tail -n 5
    fi
}

# Function to process a collection
process_collection() {
    local COLL_ID=$1
    local COLL_NAME=$2
    
    echo "📦 Processing $COLL_NAME ($COLL_ID)..."
    add_deleted_attr "$COLL_ID" "$COLL_NAME"
    add_version_attr "$COLL_ID" "$COLL_NAME"
    add_last_modified_by_attr "$COLL_ID" "$COLL_NAME"
    echo ""
}

# Process all collections
process_collection "$COLL_INV" "inventory"
process_collection "$COLL_CUS" "customers"
process_collection "$COLL_SAL" "sales"
process_collection "$COLL_ROL" "user_roles"
process_collection "permission_config" "permission_config"
process_collection "audit_logs" "audit_logs"
process_collection "stacks" "stacks"


echo "All collections have been checked and updated!"
echo ""
echo "Summary of required attributes for sync:"
echo "  - deleted (boolean, default: false) - For soft delete/tombstone pattern"
echo "  - version (integer, default: 1) - For optimistic locking"
echo "  - lastModifiedBy (string) - For audit trail"
echo ""
echo "Note: Appwrite may take a few moments to index new attributes."
echo "   Wait 30 seconds before running the app if you see sync errors."
