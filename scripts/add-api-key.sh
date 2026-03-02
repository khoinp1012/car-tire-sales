#!/bin/bash

# Helper script to add APPWRITE_API_KEY to .env.appwrite file
# This API key is needed for the sync-collection-permissions function
# to actually update collection-level permissions in Appwrite

echo "🔑 Appwrite API Key Setup"
echo "=========================="
echo ""
echo "This script will help you add an API key to your .env.appwrite file."
echo "The API key is required for the permission sync function to"
echo "update collection-level permissions automatically."
echo ""
echo "To create an API key:"
echo "1. Go to your Appwrite Console"
echo "2. Navigate to your project"
echo "3. Go to Settings → API Keys"
echo "4. Create a new API key with the following scopes:"
echo "   - databases.read"
echo "   - databases.write"
echo "   - collections.read"
echo "   - collections.write"
echo ""

read -p "Enter your Appwrite API Key: " API_KEY

if [ -z "$API_KEY" ]; then
    echo "❌ No API key provided. Exiting."
    exit 1
fi

# Check if .env.appwrite file exists
if [ ! -f .env.appwrite ]; then
    echo "⚠️  .env.appwrite file not found!"
    echo "Creating .env.appwrite file..."
    cat > .env.appwrite << 'EOF'
# 🔑 Appwrite Function Credentials
# Fill these in and run the command provided in the chat.

# 1. Your Google Web Client ID (from Google Cloud Console)
GOOGLE_CLIENT_ID=

# 2. Your Appwrite API Key (from Appwrite Console -> Settings -> API Keys)
# Needs 'databases' and 'collections' scopes
APPWRITE_API_KEY=
EOF
fi

# Check if APPWRITE_API_KEY already exists
if grep -q "APPWRITE_API_KEY" .env.appwrite; then
    echo "⚠️  APPWRITE_API_KEY already exists in .env.appwrite"
    read -p "Do you want to replace it? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Replace the value (keep the line structure)
        sed -i.bak "s|^APPWRITE_API_KEY=.*|APPWRITE_API_KEY=$API_KEY|" .env.appwrite
        echo "✅ API key updated in .env.appwrite"
    else
        echo "❌ Cancelled. API key not updated."
        exit 0
    fi
else
    # Add new entry
    echo "APPWRITE_API_KEY=$API_KEY" >> .env.appwrite
    echo "✅ API key added to .env.appwrite"
fi

echo ""
echo "Next steps:"
echo "1. Run: ./setup-permissions.sh"
echo "2. This will deploy the function with the API key"
echo "3. Permission changes from the UI will now sync automatically!"
