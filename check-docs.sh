#!/bin/bash

# Diagnostic script to check Appwrite sync status (Simplified)

CLI="./node_modules/.bin/appwrite"

# Load and Clean .env
clean_env() {
    grep "$1" .env | head -n 1 | cut -d '=' -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | tr -d '\r'
}

export APPWRITE_ENDPOINT=$(clean_env "EXPO_PUBLIC_APPWRITE_ENDPOINT")
export APPWRITE_PROJECT_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_PROJECT_ID")
DB_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_DATABASE_ID")
USER_ROLES_COLL=$(clean_env "EXPO_PUBLIC_COLLECTION_USER_ROLES")

echo "🔍 FINAL CHECK"
echo "----------------"

echo "🔐 user_roles:"
$CLI databases list-documents --database-id "$DB_ID" --collection-id "$USER_ROLES_COLL" --json

echo ""
echo "📋 permission_config:"
$CLI databases list-documents --database-id "$DB_ID" --collection-id "permission_config" --json

echo "-------------------"
