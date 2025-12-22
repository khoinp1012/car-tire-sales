"""
Add sample data to autofill collection for frontend testing
"""
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.id import ID

APPWRITE_ENDPOINT = "https://syd.cloud.appwrite.io/v1"
APPWRITE_PROJECT_ID = "687b358f00367ce271e0"
APPWRITE_API_KEY = "standard_fc341e4e67a647ec4a1901c1b9e74fa0f8101aed67295da7dae235c6a15775ed114d842236818f3e74e87fe5c1a34f11d35bdafc99e74e1759f7ce62a05ee63e852d15204e19f14b7abcec36c214b00a2fb0a62a022ca67b49d26e1cb56f7dcb58269559b54b92dc1cef638d5fed1677f95f67d346eaa3b58ce98f165a4bd536"
DB_ID = "687ca1a800338d2b13ae"  # Use your actual DB ID
COLLECTION_ID = None  # Will be found by name

client = Client()
client.set_endpoint(APPWRITE_ENDPOINT)
client.set_project(APPWRITE_PROJECT_ID)
client.set_key(APPWRITE_API_KEY)
client.set_self_signed()

databases = Databases(client)

def get_autofill_collection_id():
    collections = databases.list_collections(DB_ID)
    for col in collections["collections"]:
        if col["name"] == "autofill":
            return col["$id"]
    raise Exception("Autofill collection not found")


def add_sample_data():
    global COLLECTION_ID
    COLLECTION_ID = get_autofill_collection_id()
    samples = [
        {"field_name": "brand", "collection_name": "inventory_items", "field_value": "Michelin"},
        {"field_name": "brand", "collection_name": "inventory_items", "field_value": "Honda"},
        {"field_name": "brand", "collection_name": "inventory_items", "field_value": "Bridgestone"},
        {"field_name": "size", "collection_name": "inventory_items", "field_value": "2055516"},
        {"field_name": "size", "collection_name": "inventory_items", "field_value": "1956515"},
        {"field_name": "unit_price", "collection_name": "inventory_items", "field_value": "1200000"},
        {"field_name": "unit_price", "collection_name": "inventory_items", "field_value": "1500000"},
    ]
    for sample in samples:
        doc = databases.create_document(DB_ID, COLLECTION_ID, ID.unique(), sample)
        print(f"Inserted: {sample}")

if __name__ == "__main__":
    add_sample_data()
