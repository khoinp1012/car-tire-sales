from appwrite.client import Client
from appwrite.services.teams import Teams
from appwrite.services.databases import Databases
from appwrite.permission import Permission
from appwrite.role import Role
from appwrite.id import ID

# Load config from database-connection-info
APPWRITE_ENDPOINT = "https://syd.cloud.appwrite.io/v1"
APPWRITE_PROJECT_ID = "YOUR_PROJECT_ID_HERE"
APPWRITE_API_KEY = "YOUR_API_KEY_HERE"
DB_ID = "YOUR_DATABASE_ID_HERE"

client = Client()
client.set_endpoint(APPWRITE_ENDPOINT)
client.set_project(APPWRITE_PROJECT_ID)
client.set_key(APPWRITE_API_KEY)

teams = Teams(client)
databases = Databases(client)

# Note: Teams are no longer used. The app now uses database-based roles (user_roles collection)
# Permissions are granted to all authenticated users at the collection level
# Access control is handled by the application layer (ProtectedRoute, PermissionManager)


# Collection IDs
COL_TIRE_MODELS = "687ca1a900218b17ed05"
COL_INVENTORY_ITEMS = "687ca1ac00054b181ab0"
COL_CUSTOMERS = "687ca1b00024526eedc2"
COL_SALES_ORDERS = "687ca1b5000adbbf16bd"

# Set permissions for each collection
def set_permissions():
    # Since we now use database-based roles instead of Appwrite Teams,
    # we grant permissions to all authenticated users at the collection level.
    # Access control is handled by the application layer (ProtectedRoute, PermissionManager)
    
    # All authenticated users get full CRUD access
    # The app's permission system controls what users can actually do
    authenticated_perms = [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
    ]
    
    # Helper to update collection with all required fields
    def update_collection_with_all_fields(col_id, name, permissions):
        col = databases.get_collection(DB_ID, col_id)
        enabled = col.get("enabled", True)
        # Force document_security to False for collection-level permissions
        databases.update_collection(DB_ID, col_id, name=name, permissions=permissions, document_security=False, enabled=enabled)

    # All collections: authenticated users get full CRUD
    # Application-level permissions (ProtectedRoute + PermissionManager) control actual access
    update_collection_with_all_fields(COL_TIRE_MODELS, "tire_models", authenticated_perms)
    update_collection_with_all_fields(COL_INVENTORY_ITEMS, "inventory_items", authenticated_perms)
    update_collection_with_all_fields(COL_CUSTOMERS, "customers", authenticated_perms)
    update_collection_with_all_fields(COL_SALES_ORDERS, "sales_orders", authenticated_perms)

if __name__ == "__main__":
    set_permissions()
    print("Permissions set for all collections.")
