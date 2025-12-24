#!/bin/bash

# Setup script for Stacks collection
# This script creates the stacks collection with necessary attributes

# 1. Local project binary
CLI="./node_modules/.bin/appwrite"

# 2. Load and Clean .env
clean_env() {
    grep "$1" .env | head -n 1 | cut -d '=' -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | tr -d '\r'
}

export APPWRITE_ENDPOINT=$(clean_env "EXPO_PUBLIC_APPWRITE_ENDPOINT")
export APPWRITE_PROJECT_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_PROJECT_ID")
DB_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_DATABASE_ID")
COLL_STK=$(clean_env "EXPO_PUBLIC_COLLECTION_STACKS")
COLL_STK=${COLL_STK:-stacks}

echo "🚀 Setting up Stacks Collection..."

# 3. Verify Session
if ! $CLI whoami &> /dev/null; then
    echo "❌ Error: Session not found. Please run: $CLI login"
    exit 1
fi

# Step 1: Create Collection
echo "📦 Creating stacks collection..."
$CLI databases create-collection \
    --database-id "$DB_ID" \
    --collection-id "$COLL_STK" \
    --name "Stacks" \
    --permissions "read(\"any\")" "create(\"any\")" "update(\"any\")" "delete(\"any\")" \
    --document-security false

if [ $? -eq 0 ]; then
    echo "✅ Collection created successfully"
else
    # Check if the error is because it already exists
    echo "⚠️  Failed to create collection. It might already exist or there was a connection error."
    echo "Checking if collection exists..."
    $CLI databases get-collection --database-id "$DB_ID" --collection-id "$COLL_STK" &> /dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Collection confirmed to exist. Proceeding to update attributes..."
    else
        echo "❌ Collection does not exist and creation failed. Please check the error above."
        exit 1
    fi
fi

# Step 2: Create Attributes
echo "📝 Creating attributes..."

# stackId - unique identifier for the stack (e.g., "A1", "B2")
$CLI databases create-string-attribute \
    --database-id "$DB_ID" \
    --collection-id "$COLL_STK" \
    --key "stackId" \
    --size 50 \
    --required true
echo "  ✓ stackId attribute"

# location - physical location description
$CLI databases create-string-attribute \
    --database-id "$DB_ID" \
    --collection-id "$COLL_STK" \
    --key "location" \
    --size 255 \
    --required true
echo "  ✓ location attribute"

# description - optional description of the stack
$CLI databases create-string-attribute \
    --database-id "$DB_ID" \
    --collection-id "$COLL_STK" \
    --key "description" \
    --size 500 \
    --required false
echo "  ✓ description attribute"

# capacity - optional maximum capacity
$CLI databases create-integer-attribute \
    --database-id "$DB_ID" \
    --collection-id "$COLL_STK" \
    --key "capacity" \
    --required false
echo "  ✓ capacity attribute"

# Step 3: Create Indexes
echo "🔍 Creating indexes..."

# Index on stackId for fast lookups
$CLI databases create-index \
    --database-id "$DB_ID" \
    --collection-id "$COLL_STK" \
    --key "stackId_index" \
    --type "key" \
    --attributes "stackId"
echo "  ✓ stackId index"

# Index on location for searching
$CLI databases create-index \
    --database-id "$DB_ID" \
    --collection-id "$COLL_STK" \
    --key "location_index" \
    --type "key" \
    --attributes "location"
echo "  ✓ location index"

echo ""
echo "✅ Stacks collection setup complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Add some stack records to the collection"
echo "  2. Generate QR codes with prefix STACK_ for each stack"
echo "  3. Use the location tracking page to assign tires to stacks"
echo ""
echo "Example stack record:"
echo "  stackId: \"A1\""
echo "  location: \"Warehouse Section A, Row 1\""
echo "  description: \"Premium tire storage\""
echo "  capacity: 100"
