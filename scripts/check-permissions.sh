#!/bin/bash

# Quick check script to verify permission_config collection exists

# Load environment variables
clean_env() {
    grep "$1" .env | head -n 1 | cut -d '=' -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | tr -d '\r'
}

DB_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_DATABASE_ID")

echo "🔍 Checking for permission_config collection..."
echo "Database ID: $DB_ID"
echo ""

./node_modules/.bin/appwrite databases list-collections \
  --database-id "$DB_ID" \
  --json | grep -q "permission_config"

if [ $? -eq 0 ]; then
    echo "✅ permission_config collection EXISTS"
    echo ""
    echo "Checking for documents..."
    ./node_modules/.bin/appwrite databases list-documents \
      --database-id "$DB_ID" \
      --collection-id "permission_config"
else
    echo "❌ permission_config collection DOES NOT EXIST"
    echo ""
    echo "Run ./seed-permissions.sh to create it"
fi
