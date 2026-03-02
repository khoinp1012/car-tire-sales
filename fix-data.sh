#!/bin/bash

# Improved Repair Script (Fixing CLI permission syntax)

CLI="./node_modules/.bin/appwrite"

# Load and Clean .env
clean_env() {
    grep "$1" .env | head -n 1 | cut -d '=' -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | tr -d '\r'
}

export APPWRITE_ENDPOINT=$(clean_env "EXPO_PUBLIC_APPWRITE_ENDPOINT")
export APPWRITE_PROJECT_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_PROJECT_ID")
DB_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_DATABASE_ID")
USER_ROLES_COLL=$(clean_env "EXPO_PUBLIC_COLLECTION_USER_ROLES")

# THE USER'S ACTUAL ID
APP_USER_ID="687b530272232f79501e"

echo "🛠️ STARTING DATA REPAIR (Target User: $APP_USER_ID)"
echo "----------------------------------------------------"

# 1. Repair permission_config
CONFIG_DOC_ID="694b60563c0a7b153ee2"
echo "📋 Activating 'permission_config' ($CONFIG_DOC_ID)..."
$CLI databases update-document \
    --database-id "$DB_ID" \
    --collection-id "permission_config" \
    --document-id "$CONFIG_DOC_ID" \
    --data "{
        \"isActive\": true,
        \"deleted\": false,
        \"version\": 1,
        \"configVersion\": \"1.0.1\"
    }" \
    --permissions 'read("any")'

# 2. Repair user_roles
ROLE_DOC_ID="694a24d709bce65c6ef1"
echo "🔐 Repairing 'user_role' ($ROLE_DOC_ID) for user $APP_USER_ID..."
$CLI databases update-document \
    --database-id "$DB_ID" \
    --collection-id "$USER_ROLES_COLL" \
    --document-id "$ROLE_DOC_ID" \
    --data "{
        \"userId\": \"$APP_USER_ID\",
        \"deleted\": false,
        \"version\": 1,
        \"lastModifiedBy\": \"system\"
    }" \
    --permissions "read(\"user:$APP_USER_ID\")" \
    --permissions "update(\"user:$APP_USER_ID\")"

echo "----------------------------------------------------"
echo "✅ REPAIR COMPLETE"
