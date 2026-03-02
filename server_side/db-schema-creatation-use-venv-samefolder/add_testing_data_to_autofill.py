"""
Add sample data to autofill collection for frontend testing
"""
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.id import ID

APPWRITE_ENDPOINT = "https://syd.cloud.appwrite.io/v1"
APPWRITE_PROJECT_ID = "YOUR_PROJECT_ID_HERE"
APPWRITE_API_KEY = "YOUR_API_KEY_HERE"
DB_ID = "YOUR_PROJECT_ID_HERE"  # Use your actual DB ID
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
