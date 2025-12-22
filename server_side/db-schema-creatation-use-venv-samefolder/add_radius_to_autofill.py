#!/usr/bin/env python3
"""
Local script to add radius_size values to autofill collection.
This script should be run once to populate the autofill collection with radius_size values.
"""

import json
import requests
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.id import ID
from appwrite.query import Query

# Configuration
APPWRITE_ENDPOINT = "https://cloud.appwrite.io/v1"  # Replace with your Appwrite endpoint
APPWRITE_PROJECT_ID = "687ca1a800338d2b13ae"  # Your project ID
APPWRITE_API_KEY = "standard_fc341e4e67a647ec4a1901c1b9e74fa0f8101aed67295da7dae235c6a15775ed114d842236818f3e74e87fe5c1a34f11d35bdafc99e74e1759f7ce62a05ee63e852d15204e19f14b7abcec36c214b00a2fb0a62a022ca67b49d26e1cb56f7dcb58269559b54b92dc1cef638d5fed1677f95f67d346eaa3b58ce98f165a4bd536"

DB_ID = "687ca1a800338d2b13ae"
INVENTORY_COLLECTION_ID = "687ca1ac00054b181ab0"
AUTOFILL_COLLECTION_ID = "687f92b50025e9c821f6"

def main():
    print("Initializing Appwrite client...")
    client = (
        Client()
        .set_endpoint(APPWRITE_ENDPOINT)
        .set_project(APPWRITE_PROJECT_ID)
        .set_key(APPWRITE_API_KEY)
    )
    databases = Databases(client)
    print("Appwrite client initialized.")

    try:
        # Get all inventory items with radius_size
        print("Fetching inventory items with radius_size...")
        inventory_docs = databases.list_documents(DB_ID, INVENTORY_COLLECTION_ID, [
            Query.is_not_null("radius_size"),
            Query.limit(1000)  # Adjust as needed
        ])
        
        print(f"Found {len(inventory_docs['documents'])} inventory items with radius_size")
        
        # Extract unique radius_size values
        radius_values = set()
        for doc in inventory_docs['documents']:
            radius_size = doc.get('radius_size')
            if radius_size is not None and radius_size != '':
                radius_values.add(str(radius_size))
        
        print(f"Found {len(radius_values)} unique radius values: {sorted(radius_values)}")
        
        # Check existing autofill values for radius_size
        print("Checking existing radius_size autofill values...")
        existing_docs = databases.list_documents(DB_ID, AUTOFILL_COLLECTION_ID, [
            Query.equal("field_name", "radius_size")
        ])
        
        existing_values = set(doc["field_value"] for doc in existing_docs['documents'])
        print(f"Found {len(existing_values)} existing radius_size autofill values")
        
        # Insert new values
        inserted = []
        skipped = []
        
        for radius_value in radius_values:
            if radius_value not in existing_values:
                try:
                    doc = {
                        "field_name": "radius_size",
                        "collection_name": "inventory_items",
                        "field_value": radius_value
                    }
                    result = databases.create_document(DB_ID, AUTOFILL_COLLECTION_ID, ID.unique(), doc)
                    inserted.append(radius_value)
                    print(f"✓ Inserted radius_size: {radius_value}")
                except Exception as e:
                    print(f"✗ Failed to insert radius_size {radius_value}: {e}")
                    skipped.append(radius_value)
            else:
                skipped.append(radius_value)
                print(f"- Skipped existing radius_size: {radius_value}")
        
        print(f"\nSummary:")
        print(f"Inserted: {len(inserted)} values")
        print(f"Skipped: {len(skipped)} values")
        print(f"Total unique radius values processed: {len(radius_values)}")
        
        if inserted:
            print(f"New radius_size values added: {sorted(inserted)}")
        
    except Exception as e:
        print(f"Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
