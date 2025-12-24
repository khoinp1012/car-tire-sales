#!/bin/bash

# Seed Permission Configuration Script
# This script creates the initial permission configuration in the database

CLI="./node_modules/.bin/appwrite"

# Load environment variables
clean_env() {
    grep "$1" .env | head -n 1 | cut -d '=' -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^\"//' -e 's/\"$//' -e "s/^'//\" -e "s/'$//\" | tr -d '\r'
}

export APPWRITE_ENDPOINT=$(clean_env "EXPO_PUBLIC_APPWRITE_ENDPOINT")
export APPWRITE_PROJECT_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_PROJECT_ID")
DB_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_DATABASE_ID")

echo "🚀 Seeding Permission Configuration..."

# Verify session
if ! $CLI whoami &> /dev/null; then
    echo "❌ Error: Session not found. Please run: $CLI login"
    exit 1
fi

# Create permission_config collection if it doesn't exist
echo "📦 Creating permission_config collection..."
$CLI databases create-collection \
  --database-id "$DB_ID" \
  --collection-id "permission_config" \
  --name "Permission Config" \
  --permissions 'read("any")' 'create("any")' 'update("any")' 'delete("any")' &> /dev/null

# Create attributes
echo "📝 Creating collection attributes..."
$CLI databases create-string-attribute \
  --database-id "$DB_ID" \
  --collection-id "permission_config" \
  --key "version" \
  --size 50 \
  --required true &> /dev/null

$CLI databases create-boolean-attribute \
  --database-id "$DB_ID" \
  --collection-id "permission_config" \
  --key "isActive" \
  --required true &> /dev/null

$CLI databases create-string-attribute \
  --database-id "$DB_ID" \
  --collection-id "permission_config" \
  --key "roles" \
  --size 1000000 \
  --required true &> /dev/null

$CLI databases create-string-attribute \
  --database-id "$DB_ID" \
  --collection-id "permission_config" \
  --key "collectionPermissions" \
  --size 1000000 \
  --required true &> /dev/null

$CLI databases create-string-attribute \
  --database-id "$DB_ID" \
  --collection-id "permission_config" \
  --key "rowPermissions" \
  --size 1000000 \
  --required true &> /dev/null

echo "✅ Permission configuration collection created!"
echo ""
echo "⚠️  IMPORTANT: You need to manually insert the permission configuration document."
echo "    Use the Appwrite Console to create a document in the 'permission_config' collection"
echo "    with the data from: config/permissions.config.ts"
echo ""
echo "    Or use the app's admin UI to upload the configuration."
