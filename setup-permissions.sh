#!/bin/bash

# 1. Local project binary
CLI="./node_modules/.bin/appwrite"

# 2. Load and Clean .env
clean_env() {
    grep "$1" .env | head -n 1 | cut -d '=' -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | tr -d '\r'
}

# 3. Load from .env.appwrite (for API key)
clean_env_appwrite() {
    grep "$1" .env.appwrite 2>/dev/null | head -n 1 | cut -d '=' -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | tr -d '\r'
}

export APPWRITE_ENDPOINT=$(clean_env "EXPO_PUBLIC_APPWRITE_ENDPOINT")
export APPWRITE_PROJECT_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_PROJECT_ID")
DB_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_DATABASE_ID")

COLL_INV=$(clean_env "EXPO_PUBLIC_COLLECTION_INVENTORY")
COLL_CUS=$(clean_env "EXPO_PUBLIC_COLLECTION_CUSTOMERS")
COLL_SAL=$(clean_env "EXPO_PUBLIC_COLLECTION_SALES")
COLL_AUT=$(clean_env "EXPO_PUBLIC_COLLECTION_AUTOFILL")
COLL_ROL=$(clean_env "EXPO_PUBLIC_COLLECTION_USER_ROLES")
COLL_ROL=${COLL_ROL:-user_roles}
COLL_STK=$(clean_env "EXPO_PUBLIC_COLLECTION_STACKS")
COLL_STK=${COLL_STK:-stacks}

# Get API key from .env.appwrite (fallback to .env)
API_KEY=$(clean_env_appwrite "APPWRITE_API_KEY")
if [ -z "$API_KEY" ]; then
    API_KEY=$(clean_env "APPWRITE_API_KEY")
fi

echo "🚀 Starting Permission System Setup with Backend Sync..."

# 3. Verify Session
if ! $CLI whoami &> /dev/null; then
    echo "❌ Error: Session not found. Please run: $CLI login"
    exit 1
fi

# Check if API key is set
if [ -z "$API_KEY" ]; then
    echo "⚠️  Warning: APPWRITE_API_KEY not found in .env"
    echo "    The function will not be able to sync collection permissions."
    echo "    Please add APPWRITE_API_KEY to your .env file."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 1: Create/Verify Function with build command
echo "⚡ Verifying Function..."
$CLI functions create \
  --function-id "sync-collection-permissions" \
  --name "Sync Permissions" \
  --runtime "node-18.0" \
  --execute 'any' \
  --entrypoint "src/index.js" \
  --commands "npm install" &> /dev/null

# Step 2: Set Variables (Smart Update)
echo "📝 Updating environment variables..."

set_var() {
    local KEY=$1
    local VAL=$2
    local FUNC_ID="sync-collection-permissions"
    
    # Try to find if variable already exists and get its internal ID
    local VAR_ID=$($CLI functions list-variables --function-id "$FUNC_ID" --json | grep -B 1 "\"key\": \"$KEY\"" | grep "\"\\$id\"" | cut -d '"' -f 4)
    
    if [ -z "$VAR_ID" ]; then
        # Create new
        echo "  ➕ Creating $KEY..."
        $CLI functions create-variable --function-id "$FUNC_ID" --key "$KEY" --value "$VAL" &> /dev/null
    else
        # Update existing
        echo "  🔄 Updating $KEY (ID: $VAR_ID)..."
        $CLI functions update-variable --function-id "$FUNC_ID" --variable-id "$VAR_ID" --key "$KEY" --value "$VAL" &> /dev/null
    fi
}

set_var "DATABASE_ID" "$DB_ID"
set_var "COLLECTION_INVENTORY" "$COLL_INV"
set_var "COLLECTION_CUSTOMERS" "$COLL_CUS"
set_var "COLLECTION_SALES" "$COLL_SAL"
set_var "COLLECTION_AUTOFILL" "$COLL_AUT"
set_var "COLLECTION_USER_ROLES" "$COLL_ROL"
set_var "COLLECTION_STACKS" "$COLL_STK"
set_var "APPWRITE_ENDPOINT" "$APPWRITE_ENDPOINT"

# Set API key if available
if [ -n "$API_KEY" ]; then
    echo "  🔑 Setting APPWRITE_API_KEY..."
    set_var "APPWRITE_API_KEY" "$API_KEY"
else
    echo "  ⚠️  Skipping APPWRITE_API_KEY (not set)"
fi

# Step 3: Deploy
echo "📦 Deploying function code..."
$CLI functions create-deployment \
  --function-id "sync-collection-permissions" \
  --entrypoint "src/index.js" \
  --code "functions/sync-collection-permissions" \
  --commands "npm install" \
  --activate true

echo "✅ Setup complete! Function deployed with backend sync capability."
if [ -n "$API_KEY" ]; then
    echo "✅ API key configured - collection permissions will be synced automatically."
else
    echo "⚠️  API key not configured - collection permissions must be set manually."
fi