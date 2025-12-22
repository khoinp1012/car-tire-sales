from appwrite.client import Client
from appwrite.services.teams import Teams
from appwrite.services.databases import Databases
from appwrite.permission import Permission
from appwrite.role import Role
from appwrite.id import ID

# Load config from database-connection-info
APPWRITE_ENDPOINT = "https://syd.cloud.appwrite.io/v1"
APPWRITE_PROJECT_ID = "687b358f00367ce271e0"
APPWRITE_API_KEY = "standard_fc341e4e67a647ec4a1901c1b9e74fa0f8101aed67295da7dae235c6a15775ed114d842236818f3e74e87fe5c1a34f11d35bdafc99e74e1759f7ce62a05ee63e852d15204e19f14b7abcec36c214b00a2fb0a62a022ca67b49d26e1cb56f7dcb58269559b54b92dc1cef638d5fed1677f95f67d346eaa3b58ce98f165a4bd536"
DB_ID = "687ca1a800338d2b13ae"

client = Client()
client.set_endpoint(APPWRITE_ENDPOINT)
client.set_project(APPWRITE_PROJECT_ID)
client.set_key(APPWRITE_API_KEY)

teams = Teams(client)
databases = Databases(client)

# Team names
TEAM_ADMIN = "admin"
TEAM_INVENTORY = "inventory_manager"
TEAM_SELLER = "seller"

# Create teams if not exist
def ensure_team(name):
    result = teams.list(search=name)
    for team in result["teams"]:
        if team["name"] == name:
            return team["$id"]
    team = teams.create(ID.unique(), name)
    return team["$id"]

admin_team_id = ensure_team(TEAM_ADMIN)
inventory_team_id = ensure_team(TEAM_INVENTORY)
seller_team_id = ensure_team(TEAM_SELLER)

# Collection IDs
COL_TIRE_MODELS = "687ca1a900218b17ed05"
COL_INVENTORY_ITEMS = "687ca1ac00054b181ab0"
COL_CUSTOMERS = "687ca1b00024526eedc2"
COL_SALES_ORDERS = "687ca1b5000adbbf16bd"

# Set permissions for each collection
def set_permissions():
    # Admin: full CRUD
    admin_perms = [
        Permission.read(Role.team(admin_team_id)),
        Permission.create(Role.team(admin_team_id)),
        Permission.update(Role.team(admin_team_id)),
        Permission.delete(Role.team(admin_team_id)),
    ]
    # Inventory Manager
    inventory_perms = [
        Permission.read(Role.team(inventory_team_id)),
        Permission.create(Role.team(inventory_team_id)),
        Permission.update(Role.team(inventory_team_id)),
        Permission.delete(Role.team(inventory_team_id)),
    ]
    # Seller
    seller_perms = [
        Permission.read(Role.team(seller_team_id)),
        Permission.create(Role.team(seller_team_id)),
        Permission.update(Role.team(seller_team_id)),
    ]
    # Helper to update collection with all required fields
    def update_collection_with_all_fields(col_id, name, permissions):
        col = databases.get_collection(DB_ID, col_id)
        enabled = col.get("enabled", True)
        # Force document_security to False for collection-level permissions
        databases.update_collection(DB_ID, col_id, name=name, permissions=permissions, document_security=False, enabled=enabled)

    # tire_models: admin CRUD, inventory manager read, seller read
    update_collection_with_all_fields(COL_TIRE_MODELS, "tire_models",
        admin_perms + [Permission.read(Role.team(inventory_team_id)), Permission.read(Role.team(seller_team_id))])
    # inventory_items: admin CRUD, inventory manager CRUD, seller read
    update_collection_with_all_fields(COL_INVENTORY_ITEMS, "inventory_items",
        admin_perms + inventory_perms + [Permission.read(Role.team(seller_team_id))])
    # customers: admin CRUD, inventory manager read, seller read/update
    update_collection_with_all_fields(COL_CUSTOMERS, "customers",
        admin_perms + [Permission.read(Role.team(inventory_team_id))] + seller_perms)
    # sales_orders: admin CRUD, inventory manager read, seller create/read
    update_collection_with_all_fields(COL_SALES_ORDERS, "sales_orders",
        admin_perms + [Permission.read(Role.team(inventory_team_id))] + [Permission.create(Role.team(seller_team_id)), Permission.read(Role.team(seller_team_id))])

if __name__ == "__main__":
    set_permissions()
    print("Permissions set for all collections.")
