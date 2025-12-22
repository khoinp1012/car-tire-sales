#!/usr/bin/env python3
"""
Script to add specific tire sizes and brands to autofill collection.
This script processes the exact tire sizes provided by the user and popular tire brands.
"""

import json
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.id import ID
from appwrite.query import Query

# Configuration
APPWRITE_ENDPOINT = "https://syd.cloud.appwrite.io/v1"  # Replace with your Appwrite endpoint
APPWRITE_PROJECT_ID = "687b358f00367ce271e0"  # Your project ID
APPWRITE_API_KEY = "standard_fc341e4e67a647ec4a1901c1b9e74fa0f8101aed67295da7dae235c6a15775ed114d842236818f3e74e87fe5c1a34f11d35bdafc99e74e1759f7ce62a05ee63e852d15204e19f14b7abcec36c214b00a2fb0a62a022ca67b49d26e1cb56f7dcb58269559b54b92dc1cef638d5fed1677f95f67d346eaa3b58ce98f165a4bd536"

DB_ID = "687ca1a800338d2b13ae"  # Replace with your database ID
AUTOFILL_COLLECTION_ID = None  # Will be found by name

def parse_tire_size(raw_size):
    """
    Convert raw tire size format to standard format.
    Examples: 
    - "1856015" -> "185/60/15"
    - "2055516" -> "205/55/16"
    - "2755520" -> "275/55/20"
    """
    if len(raw_size) == 7:
        # Format: WWWAARR (3+2+2 digits)
        width = raw_size[:3]
        aspect = raw_size[3:5]
        rim = raw_size[5:7]
        return f"{width}/{aspect}/{rim}"
    elif len(raw_size) == 6:
        # Format: WWAARR (2+2+2 digits)
        width = raw_size[:2]
        aspect = raw_size[2:4]
        rim = raw_size[4:6]
        return f"{width}/{aspect}/{rim}"
    else:
        # Return as-is if format doesn't match expected patterns
        return raw_size

# Raw tire sizes from user input
RAW_TIRE_SIZES = [
    "1856015",
    "1955516", 
    "2055017",
    "2154517",
    "2255018",
    "2355519",
    "2454018",
    "2555019",
    "2654022",
    "2754520",
    "2056515",
    "2156516",
    "2257016",
    "2357515",
    "2457016",
    "2055516",
    "2254517",
    "2156016",
    "2356018",
    "1956515",
    "2454518",
    "2657017",
    "2755520",
    "2857516",
    "2155517",
    "2256017",
    "2356517",
    "2456517",
    "2557016",
    "2656517",
    "1756514",
    "1856514",
    "1955015",
    "1955515",
    "2054516",
    "2057015",
    "2155017",
    "2253518",
    "2254018",
    "2354018",
    "2354517",
    "2453519",
    "2454019",
    "2553519",
    "2554019",
    "2653520",
    "2753520",
    "2853522",
    "2953521",
    "3054022"
]

# Convert raw sizes to standard format
TIRE_SIZES = [parse_tire_size(size) for size in RAW_TIRE_SIZES]

# Tire brands from user input
TIRE_BRANDS = [
    "Michelin",
    "Goodyear",
    "Continental", 
    "BF Goodrich",
    "Bridgestone",
    "Cooper",
    "Falken",
    "Pirelli",
    "Dunlop",
    "Hankook",
    "Yokohama",
    "Toyo",
    "Maxxis",
    "Kumho",
    "Firestone",
    "General Tire",
    "Nitto",
    "Giti",
    "Sumitomo",
    "Uniroyal",
    "Apollo Tyres",
    "Kenda"
]

def get_autofill_collection_id(databases):
    """Find the autofill collection ID by name"""
    try:
        collections = databases.list_collections(DB_ID)
        for col in collections["collections"]:
            if col["name"] == "autofill":
                return col["$id"]
        raise Exception("Autofill collection not found")
    except Exception as e:
        print(f"Error finding autofill collection: {e}")
        return None

def check_existing_values(databases, field_name):
    """Check what values already exist for a given field"""
    try:
        existing_docs = databases.list_documents(DB_ID, AUTOFILL_COLLECTION_ID, [
            Query.equal("field_name", field_name),
            Query.limit(1000)  # Increase limit to get all values
        ])
        return set(doc["field_value"] for doc in existing_docs['documents'])
    except Exception as e:
        print(f"Error checking existing values for {field_name}: {e}")
        return set()

def add_autofill_values(databases, field_name, collection_name, values):
    """Add values to autofill collection, avoiding duplicates"""
    print(f"\nProcessing {field_name} values...")
    
    # Check existing values
    existing_values = check_existing_values(databases, field_name)
    print(f"Found {len(existing_values)} existing {field_name} values")
    
    inserted = []
    skipped = []
    errors = []
    
    for value in values:
        if value not in existing_values:
            try:
                doc = {
                    "field_name": field_name,
                    "collection_name": collection_name,
                    "field_value": value
                }
                result = databases.create_document(DB_ID, AUTOFILL_COLLECTION_ID, ID.unique(), doc)
                inserted.append(value)
                print(f"✓ Inserted {field_name}: {value}")
            except Exception as e:
                errors.append((value, str(e)))
                print(f"✗ Failed to insert {field_name} {value}: {e}")
        else:
            skipped.append(value)
            print(f"- Skipped existing {field_name}: {value}")
    
    return inserted, skipped, errors

def main():
    print("=== Specific Tire Data Autofill Script ===")
    print("Initializing Appwrite client...")
    
    client = (
        Client()
        .set_endpoint(APPWRITE_ENDPOINT)
        .set_project(APPWRITE_PROJECT_ID)
        .set_key(APPWRITE_API_KEY)
        .set_self_signed()
    )
    databases = Databases(client)
    print("Appwrite client initialized.")

    # Get autofill collection ID
    global AUTOFILL_COLLECTION_ID
    AUTOFILL_COLLECTION_ID = get_autofill_collection_id(databases)
    if not AUTOFILL_COLLECTION_ID:
        print("Error: Could not find autofill collection")
        return 1
    
    print(f"Using autofill collection ID: {AUTOFILL_COLLECTION_ID}")

    total_inserted = 0
    total_skipped = 0
    total_errors = 0

    try:
        # Add tire sizes
        print(f"\n{'='*50}")
        print("ADDING TIRE SIZES")
        print(f"{'='*50}")
        sizes_inserted, sizes_skipped, sizes_errors = add_autofill_values(
            databases, "size", "inventory_items", RAW_TIRE_SIZES
        )
        total_inserted += len(sizes_inserted)
        total_skipped += len(sizes_skipped)
        total_errors += len(sizes_errors)

        # Add tire brands
        print(f"\n{'='*50}")
        print("ADDING TIRE BRANDS")
        print(f"{'='*50}")
        brands_inserted, brands_skipped, brands_errors = add_autofill_values(
            databases, "brand", "inventory_items", TIRE_BRANDS
        )
        total_inserted += len(brands_inserted)
        total_skipped += len(brands_skipped)
        total_errors += len(brands_errors)

        # Print detailed summary
        print(f"\n{'='*50}")
        print("DETAILED SUMMARY")
        print(f"{'='*50}")
        print(f"Total values processed: {len(RAW_TIRE_SIZES) + len(TIRE_BRANDS)}")
        print(f"Total values inserted: {total_inserted}")
        print(f"Total values skipped (already exist): {total_skipped}")
        print(f"Total errors: {total_errors}")
        
        print(f"\nTire Sizes ({len(RAW_TIRE_SIZES)} total):")
        print(f"  - Inserted: {len(sizes_inserted)}")
        print(f"  - Skipped: {len(sizes_skipped)}")
        print(f"  - Errors: {len(sizes_errors)}")
        if sizes_inserted:
            print(f"  - New sizes added: {sorted(sizes_inserted)}")
        
        print(f"\nTire Brands ({len(TIRE_BRANDS)} total):")
        print(f"  - Inserted: {len(brands_inserted)}")
        print(f"  - Skipped: {len(brands_skipped)}")
        print(f"  - Errors: {len(brands_errors)}")
        if brands_inserted:
            print(f"  - New brands added: {sorted(brands_inserted)}")

        if sizes_errors or brands_errors:
            print(f"\nErrors encountered:")
            for value, error in sizes_errors + brands_errors:
                print(f"  - {value}: {error}")

        print(f"\n{'='*50}")
        print("OPERATION COMPLETED SUCCESSFULLY")
        print(f"{'='*50}")
        
    except Exception as e:
        print(f"Fatal error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
