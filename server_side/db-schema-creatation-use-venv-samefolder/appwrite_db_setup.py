"""
Appwrite Database Setup Script for Car Tire Sales

This script creates the database schema as described in the 'database schema' file, using Appwrite's Python SDK.
"""
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.id import ID
from appwrite.permission import Permission
from appwrite.role import Role
from time import sleep

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
client.set_self_signed()

databases = Databases(client)

def create_database():
    resp = databases.create(database_id=ID.unique(), name=DB_NAME)
    print(f"Database created: {resp['$id']}")
    return resp['$id']

def create_tire_models_collection(database_id):
    resp = databases.create_collection(
        database_id,
        collection_id=ID.unique(),
        name="tire_models",
        document_security=False,
        permissions=[Permission.read(Role.any())],
    )
    collection_id = resp["$id"]
    print(f"tire_models collection: {collection_id}")
    # Attributes
    databases.create_string_attribute(database_id, collection_id, key="full_description", size=2000, required=True)
    databases.create_string_attribute(database_id, collection_id, key="brand", size=100, required=False)
    databases.create_string_attribute(database_id, collection_id, key="size", size=50, required=False)
    sleep(2)
    return collection_id

def create_inventory_items_collection(database_id):
    resp = databases.create_collection(
        database_id,
        collection_id=ID.unique(),
        name="inventory_items",
        document_security=False,
        permissions=[Permission.read(Role.any())],
    )
    collection_id = resp["$id"]
    print(f"inventory_items collection: {collection_id}")
    # Attributes
    databases.create_string_attribute(database_id, collection_id, key="full_description", size=2000, required=True)
    databases.create_string_attribute(database_id, collection_id, key="brand", size=100, required=False)
    databases.create_string_attribute(database_id, collection_id, key="size", size=50, required=False)
    databases.create_float_attribute(database_id, collection_id, key="unit_price", required=True)
    # Add sequence field to store the auto-increment value
    databases.create_integer_attribute(database_id, collection_id, key="sequence", required=False)
    sleep(2)
    return collection_id

def create_customers_collection(database_id):
    resp = databases.create_collection(
        database_id,
        collection_id=ID.unique(),
        name="customers",
        document_security=False,
        permissions=[Permission.read(Role.any())],
    )
    collection_id = resp["$id"]
    print(f"customers collection: {collection_id}")
    # Attributes
    databases.create_string_attribute(database_id, collection_id, key="full_description", size=2000, required=False)
    databases.create_string_attribute(database_id, collection_id, key="name", size=100, required=True)
    databases.create_string_attribute(database_id, collection_id, key="phone_number", size=30, required=False)
    databases.create_float_attribute(database_id, collection_id, key="discount_percent", required=False)
    databases.create_string_attribute(database_id, collection_id, key="who_got_discount", size=100, required=False)
    sleep(2)
    return collection_id

def create_sales_orders_collection(database_id):
    resp = databases.create_collection(
        database_id,
        collection_id=ID.unique(),
        name="sales_orders",
        document_security=False,
        permissions=[Permission.read(Role.any())],
    )
    collection_id = resp["$id"]
    print(f"sales_orders collection: {collection_id}")
    # Attributes
    databases.create_string_attribute(database_id, collection_id, key="customer_id", size=64, required=True)
    databases.create_datetime_attribute(database_id, collection_id, key="order_date", required=True)
    # lineItems: store as array of objects (JSON)
    databases.create_string_attribute(database_id, collection_id, key="lineItems", size=8000, required=True, array=True)
    sleep(2)
    return collection_id

def create_autofill_collection(database_id):
    resp = databases.create_collection(
        database_id,
        collection_id=ID.unique(),
        name="autofill",
        document_security=False,
        permissions=[Permission.read(Role.any())],
    )
    collection_id = resp["$id"]
    print(f"autofill collection: {collection_id}")
    # Attributes
    databases.create_string_attribute(database_id, collection_id, key="field_name", size=100, required=True)
    databases.create_string_attribute(database_id, collection_id, key="collection_name", size=100, required=True)
    databases.create_string_attribute(database_id, collection_id, key="field_value", size=100, required=True)
    sleep(2)
    return collection_id

def get_or_create_database():
    # List databases and use the one with matching name, else create
    dbs = databases.list()
    print(f"Available databases: {[db['name'] for db in dbs['databases']]}")
    for db in dbs['databases']:
        if db['name'] == DB_NAME:
            print(f"Using existing database: {db['$id']}")
            return db['$id']
    return create_database()

def main():
    print("Starting Appwrite database schema setup...")
    
    db_id = get_or_create_database()
    #create_tire_models_collection(db_id)
    #create_inventory_items_collection(db_id)
    #create_customers_collection(db_id)
    #create_sales_orders_collection(db_id)
    create_autofill_collection(db_id)
    print("Appwrite database schema setup complete.")

if __name__ == "__main__":
    main()
