#!/bin/bash

# Local project binary
CLI="./node_modules/.bin/appwrite"

# Load and Clean .env
clean_env() {
    grep "$1" .env | head -n 1 | cut -d '=' -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | tr -d '\r'
}

# Load from .env.appwrite (for API key)
clean_env_appwrite() {
    grep "$1" .env.appwrite 2>/dev/null | head -n 1 | cut -d '=' -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | tr -d '\r'
}

export APPWRITE_ENDPOINT=$(clean_env "EXPO_PUBLIC_APPWRITE_ENDPOINT")
export APPWRITE_PROJECT_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_PROJECT_ID")
DB_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_DATABASE_ID")
COLL_AUDIT=$(clean_env "EXPO_PUBLIC_COLLECTION_AUDIT_LOGS")
COLL_AUDIT=${COLL_AUDIT:-audit_logs}

# Get API key
API_KEY=$(clean_env_appwrite "APPWRITE_API_KEY")
if [ -z "$API_KEY" ]; then
    API_KEY=$(clean_env "APPWRITE_API_KEY")
fi

echo "🚀 Setting up Autonomous Auditing Function..."

# Verify Session
if ! $CLI whoami &> /dev/null; then
    echo "❌ Error: Session not found. Please run: $CLI login"
    exit 1
fi

FUNC_ID="autonomous-auditing"

# Step 1: Create/Verify Function
echo "⚡ Verifying Function..."
$CLI functions create \
  --function-id "$FUNC_ID" \
  --name "Autonomous Auditing" \
  --runtime "node-18.0" \
  --entrypoint "src/index.js" \
  --commands "npm install" &> /dev/null

# Step 2: Update Function Config (Events and Scopes)
echo "🔧 Updating function configuration..."
$CLI functions update \
  --function-id "$FUNC_ID" \
  --name "Autonomous Auditing" \
  --events "databases.*.collections.*.documents.*" \
  --scopes "databases.read" "databases.write" &> /dev/null

# Step 3: Set Variables
echo "📝 Updating environment variables..."

set_var() {
    local KEY=$1
    local VAL=$2
    
    # Check if variable exists
    local VAR_ID=$($CLI functions list-variables --function-id "$FUNC_ID" --json | jq -r ".variables[] | select(.key == \"$KEY\") | .[\"\$id\"]" 2>/dev/null)
    
    if [ -z "$VAR_ID" ]; then
        echo "  ➕ Creating $KEY..."
        $CLI functions create-variable --function-id "$FUNC_ID" --key "$KEY" --value "$VAL" &> /dev/null
    else
        echo "  🔄 Updating $KEY..."
        $CLI functions update-variable --function-id "$FUNC_ID" --variable-id "$VAR_ID" --key "$KEY" --value "$VAL" &> /dev/null
    fi
}

if [ ! -z "$DB_ID" ]; then
    set_var "DATABASE_ID" "$DB_ID"
else
    echo "⚠️  DATABASE_ID not found in .env"
fi

set_var "COLLECTION_AUDIT_LOGS" "$COLL_AUDIT"
set_var "APPWRITE_ENDPOINT" "$APPWRITE_ENDPOINT"

if [ ! -z "$API_KEY" ]; then
    set_var "APPWRITE_API_KEY" "$API_KEY"
else
    echo "⚠️  APPWRITE_API_KEY not found"
fi

# Step 4: Deploy
echo "📦 Deploying function code..."
$CLI functions create-deployment \
  --function-id "$FUNC_ID" \
  --entrypoint "src/index.js" \
  --code "functions/autonomous-auditing" \
  --commands "npm install" \
  --activate true

echo "✅ Autonomous Auditing Setup complete!"
echo "Note: The function will now automatically log all document changes to the $COLL_AUDIT collection."
