#!/bin/bash

# Make user an admin - 100% Session-Based!

CLI="./node_modules/.bin/appwrite"

# Load .env
clean_env() {
    grep "$1" .env | head -n 1 | cut -d '=' -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | tr -d '\r'
}

export APPWRITE_ENDPOINT=$(clean_env "EXPO_PUBLIC_APPWRITE_ENDPOINT")
export APPWRITE_PROJECT_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_PROJECT_ID")
DB_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_DATABASE_ID")

USER_ID="687b530272232f79501e"
USER_EMAIL="khoinp1012@gmail.com"

echo "🔐 Making $USER_EMAIL an admin..."

# Step 1: Add admin label to user
echo "📝 Adding 'admin' label..."
$CLI users update-labels \
  --user-id "$USER_ID" \
  --labels "admin"

# Step 2: Create user_roles document
echo "💾 Creating user_roles document..."
$CLI databases create-document \
  --database-id "$DB_ID" \
  --collection-id "user_roles" \
  --document-id "unique()" \
  --data "{\"userId\":\"$USER_ID\",\"role\":\"admin\"}"

echo "✅ Done! $USER_EMAIL is now an admin."
echo "👉 Restart your app to see the changes."
