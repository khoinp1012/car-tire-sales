#!/bin/bash

# Load environments
clean_env() {
    grep "$1" .env | head -n 1 | cut -d '=' -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | tr -d '\r'
}

DB_ID=$(clean_env "EXPO_PUBLIC_APPWRITE_DATABASE_ID")
CLI="./node_modules/.bin/appwrite"

collections=(
  "687ca1ac00054b181ab0:inventory"
  "687ca1b00024526eedc2:customers"
  "687ca1b5000adbbf16bd:sales"
  "user_roles:user_roles"
  "permission_config:permission_config"
  "stacks:stacks"
  "audit_logs:audit_logs"
)

echo "Checking Sync Readiness for Appwrite Collections..."
echo "----------------------------------------------------"

for coll_pair in "${collections[@]}"; do
    COLL_ID="${coll_pair%%:*}"
    COLL_NAME="${coll_pair##*:}"
    
    echo "📦 Collection: $COLL_NAME ($COLL_ID)"
    
    # Check attributes
    ATTRS=$($CLI databases list-attributes --database-id "$DB_ID" --collection-id "$COLL_ID" --json 2>/dev/null)
    
    DELETED_ATTR=$(echo "$ATTRS" | jq -r '.attributes[] | select(.key == "deleted")')
    VERSION_ATTR=$(echo "$ATTRS" | jq -r '.attributes[] | select(.key == "version")')
    
    if [ -n "$DELETED_ATTR" ]; then
        echo "  ✅ 'deleted' attribute found"
    else
        echo "  ❌ 'deleted' attribute MISSING"
    fi
    
    if [ -n "$VERSION_ATTR" ]; then
        echo "  ✅ 'version' attribute found"
    else
        echo "  ❌ 'version' attribute MISSING"
    fi
    
    # Check indexes
    INDEXES=$($CLI databases list-indexes --database-id "$DB_ID" --collection-id "$COLL_ID" --json 2>/dev/null)
    
    DELETED_INDEX=$(echo "$INDEXES" | jq -r '.indexes[] | select(.attributes[] == "deleted")')
    UPDATED_AT_INDEX=$(echo "$INDEXES" | jq -r '.indexes[] | select(.attributes[] == "$updatedAt")')
    
    if [ -n "$DELETED_INDEX" ]; then
        echo "  ✅ 'deleted' index found"
    else
        echo "  ❌ 'deleted' index MISSING"
    fi
    
    if [ -n "$UPDATED_AT_INDEX" ]; then
        echo "  ✅ '\$updatedAt' index found"
    else
        echo "  ❌ '\$updatedAt' index MISSING"
    fi
    
    echo ""
done
