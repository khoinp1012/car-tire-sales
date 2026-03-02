"""
Script to fetch and print Appwrite database schema (collections and their attributes).
"""
from appwrite.client import Client
from appwrite.services.databases import Databases

# --- CONFIGURE THESE ---
APPWRITE_ENDPOINT = "https://syd.cloud.appwrite.io/v1"  # Change to your Appwrite endpoint
APPWRITE_PROJECT_ID = "YOUR_PROJECT_ID_HERE"    # Change to your Appwrite project ID
APPWRITE_API_KEY = "YOUR_API_KEY_HERE"          # Change to your Appwrite API key
DB_NAME = "CarTireSales"

# --- SETUP CLIENT ---
client = Client()
client.set_endpoint(APPWRITE_ENDPOINT)
client.set_project(APPWRITE_PROJECT_ID)
client.set_key(APPWRITE_API_KEY)

databases = Databases(client)

def get_database_id_by_name(name):
    dbs = databases.list()["databases"]
    for db in dbs:
        if db["name"] == name:
            return db["$id"]
    raise Exception(f"Database '{name}' not found.")

def print_schema(database_id):
    collections = databases.list_collections(database_id)["collections"]
    for col in collections:
        print(f"Collection: {col['name']} (ID: {col['$id']})")
        attributes = databases.list_attributes(database_id, col["$id"])["attributes"]
        for attr in attributes:
            print(f"  - {attr['key']} ({attr['type']})")
        print()

def main():
    db_id = get_database_id_by_name(DB_NAME)
    print(f"Database: {DB_NAME} (ID: {db_id})\n")
    print_schema(db_id)

if __name__ == "__main__":
    main()
