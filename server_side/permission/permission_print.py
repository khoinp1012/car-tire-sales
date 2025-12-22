from appwrite.client import Client
from appwrite.services.databases import Databases

APPWRITE_ENDPOINT = "https://syd.cloud.appwrite.io/v1"
APPWRITE_PROJECT_ID = "687b358f00367ce271e0"
APPWRITE_API_KEY = "standard_fc341e4e67a647ec4a1901c1b9e74fa0f8101aed67295da7dae235c6a15775ed114d842236818f3e74e87fe5c1a34f11d35bdafc99e74e1759f7ce62a05ee63e852d15204e19f14b7abcec36c214b00a2fb0a62a022ca67b49d26e1cb56f7dcb58269559b54b92dc1cef638d5fed1677f95f67d346eaa3b58ce98f165a4bd536"
DB_ID = "687ca1a800338d2b13ae"

COLLECTIONS = {
    "tire_models": "687ca1a900218b17ed05",
    "inventory_items": "687ca1ac00054b181ab0",
    "customers": "687ca1b00024526eedc2",
    "sales_orders": "687ca1b5000adbbf16bd"
}

client = Client()
client.set_endpoint(APPWRITE_ENDPOINT)
client.set_project(APPWRITE_PROJECT_ID)
client.set_key(APPWRITE_API_KEY)

databases = Databases(client)

def print_permissions():
    # Map team IDs to names
    from appwrite.services.teams import Teams
    teams = Teams(client)
    team_map = {team['$id']: team['name'] for team in teams.list()['teams']}

    def team_id_to_name(perm):
        import re
        match = re.search(r'team:([a-zA-Z0-9]+)', perm)
        if match:
            team_id = match.group(1)
            name = team_map.get(team_id, team_id)
            return perm.replace(f'team:{team_id}', f'team:{name}')
        return perm

    for name, col_id in COLLECTIONS.items():
        col = databases.get_collection(DB_ID, col_id)
        print(f"Collection: {name}")
        print("Permissions:")
        for perm in col.get("$permissions", []):
            print(f"  {team_id_to_name(perm)}")
        print("---")

if __name__ == "__main__":
    print_permissions()
