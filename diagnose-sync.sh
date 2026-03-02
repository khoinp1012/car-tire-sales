#!/bin/bash

# Diagnostic script to check Appwrite data with JSON output

CLI="./node_modules/.bin/appwrite"

# Load and Clean .env
clean_env() {
    grep "$1" .env | head -n 1 | cut -d '=' -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | tr -d '\r'
}

export APPWRITE_ENDPOINT=$(clean_env "EXPO_PUBLIC_APPWRITE_ENDPOINT")
export APPWRITE_PROJECT_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_PROJECT_ID")
DB_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_DATABASE_ID")
USER_ROLES_COLL=$(clean_env "EXPO_PUBLIC_COLLECTION_USER_ROLES")

echo "🔍 RAW DATA DUMP"
echo "----------------"

# 1. User
USER_DATA=$($CLI account get --json)
CURRENT_USER_ID=$(echo "$USER_DATA" | grep -o '"$id": "[^"]*"' | head -n 1 | cut -d'"' -f4)
echo "👤 Current User: $CURRENT_USER_ID"
echo ""

# 2. permission_config
echo "📋 Contents of 'permission_config':"
$CLI databases list-documents \
    --database-id "$DB_ID" \
    --collection-id "permission_config" \
    --json | head -n 50

echo ""
# 3. user_roles
echo "🔐 Contents of 'user_roles':"
$CLI databases list-documents \
    --database-id "$DB_ID" \
    --collection-id "$USER_ROLES_COLL" \
    --json | head -n 50

echo "-------------------"
echo "🔍 DUMP COMPLETE"
