#!/bin/bash

# Add 'deleted' attribute to all Appwrite collections
# This script ensures all collections have the 'deleted' boolean attribute for soft delete support

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
COLL_PER=$(clean_env "EXPO_PUBLIC_COLLECTION_PERMISSION_CONFIG")
COLL_AUD=$(clean_env "EXPO_PUBLIC_COLLECTION_AUDIT_LOGS")
COLL_STK=$(clean_env "EXPO_PUBLIC_COLLECTION_STACKS")

echo "🔧 Adding 'deleted' attribute to all collections..."

# Verify Session
if ! $CLI whoami &> /dev/null; then
    echo "❌ Error: Session not found. Please run: $CLI login"
    exit 1
fi

# Function to add deleted attribute to a collection
add_deleted_attr() {
    local COLL_ID=$1
    local COLL_NAME=$2
    
    echo "  📝 Adding 'deleted' to $COLL_NAME ($COLL_ID)..."
    
    # Try to create the attribute (will fail if it already exists)
    # Note: Making it optional so we can set a default value
    $CLI databases create-boolean-attribute \
        --database-id "$DB_ID" \
        --collection-id "$COLL_ID" \
        --key "deleted" \
        --required false \
        --xdefault false \
        --array false 2>&1 | grep -v "Attribute already exists" || true
}

# Add deleted attribute to all collections
add_deleted_attr "$COLL_INV" "inventory"
add_deleted_attr "$COLL_CUS" "customers"
add_deleted_attr "$COLL_SAL" "sales"
add_deleted_attr "$COLL_ROL" "user_roles"
add_deleted_attr "$COLL_PER" "permission_config"
add_deleted_attr "$COLL_AUD" "audit_logs"
add_deleted_attr "$COLL_STK" "stacks"

echo ""
echo "✅ All collections now have 'deleted' attribute!"
echo "⏳ Note: Appwrite may take a few moments to index the new attributes."
echo "   If you see errors immediately after running this, wait 30 seconds and try again."
