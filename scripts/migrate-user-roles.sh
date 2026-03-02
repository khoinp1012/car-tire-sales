#!/bin/bash

# Migration Script: Add name and email to user_roles collection
# This script adds two new attributes to the user_roles collection

CLI="./node_modules/.bin/appwrite"

# Load environment variables
clean_env() {
    grep "$1" .env | head -n 1 | cut -d '=' -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^\"//' -e 's/\"$//' -e "s/^'//" -e "s/'$//" | tr -d '\r'
}

export APPWRITE_ENDPOINT=$(clean_env "EXPO_PUBLIC_APPWRITE_ENDPOINT")
export APPWRITE_PROJECT_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_PROJECT_ID")
DB_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_DATABASE_ID")
COLL_ROL=$(clean_env "EXPO_PUBLIC_COLLECTION_USER_ROLES")
COLL_ROL=${COLL_ROL:-user_roles}

echo "🔄 Migrating user_roles collection..."
echo "   Database: $DB_ID"
echo "   Collection: $COLL_ROL"
echo ""

# Verify session
if ! $CLI whoami &> /dev/null; then
    echo "❌ Error: Session not found. Please run: $CLI login"
    exit 1
fi

# Add name attribute
echo "📝 Adding 'name' attribute..."
$CLI databases create-string-attribute \
  --database-id "$DB_ID" \
  --collection-id "$COLL_ROL" \
  --key "name" \
  --size 255 \
  --required false 2>&1 | grep -v "Attribute already exists" || echo "  ✅ Name attribute added (or already exists)"

# Add email attribute
echo "📝 Adding 'email' attribute..."
$CLI databases create-string-attribute \
  --database-id "$DB_ID" \
  --collection-id "$COLL_ROL" \
  --key "email" \
  --size 255 \
  --required false 2>&1 | grep -v "Attribute already exists" || echo "  ✅ Email attribute added (or already exists)"

echo ""
echo "✅ Migration complete!"
echo ""
echo "📋 Next steps:"
echo "   1. The attributes are now available in the user_roles collection"
echo "   2. Existing documents will have empty name/email fields"
echo "   3. New role assignments will automatically populate these fields"
echo "   4. You can manually update existing documents via Appwrite Console"
echo ""
echo "💡 Tip: Run './sync-user-roles-metadata.sh' to populate existing documents"
