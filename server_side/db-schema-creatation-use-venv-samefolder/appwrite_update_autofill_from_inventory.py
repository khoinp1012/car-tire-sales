"""
Appwrite Function: Update autofill table from last n rows of inventory_items. No duplicates will be inserted.
"""
import os
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.id import ID

def main(context):
    from appwrite.query import Query
    # Use Appwrite Function environment variables and context
    context.log("Initializing Appwrite client...")
    client = (
        Client()
        .set_endpoint(os.environ["APPWRITE_FUNCTION_API_ENDPOINT"])
        .set_project(os.environ["APPWRITE_FUNCTION_PROJECT_ID"])
        .set_key(context.req.headers.get("x-appwrite-key"))
    )
    databases = Databases(client)
    context.log("Appwrite client and Databases initialized.")

    DB_ID = "YOUR_PROJECT_ID_HERE"
    INVENTORY_COLLECTION_ID = "687ca1ac00054b181ab0"
    AUTOFILL_COLLECTION_NAME = "autofill"
    N_ROWS = int(os.environ.get("N_ROWS", "50"))
    context.log(f"DB_ID: {DB_ID}, INVENTORY_COLLECTION_ID: {INVENTORY_COLLECTION_ID}, AUTOFILL_COLLECTION_NAME: {AUTOFILL_COLLECTION_NAME}, N_ROWS: {N_ROWS}")

    if not all([DB_ID, INVENTORY_COLLECTION_ID]):
        context.error("Missing required environment variables.")
        return context.res.json({"error": "Missing required environment variables."}, 500)


    def get_autofill_collection_id():
        collections = databases.list_collections(DB_ID)
        for col in collections["collections"]:
            if col["name"] == AUTOFILL_COLLECTION_NAME:
                return col["$id"]
        raise Exception("Autofill collection not found")


    def get_last_n_inventory_rows(n):
        docs = databases.list_documents(DB_ID, INVENTORY_COLLECTION_ID, queries=[
            Query.order_desc("sequence"),
            Query.limit(n)
        ])
        return docs["documents"]


    def get_existing_autofill_values(collection_id, field_name):
        docs = databases.list_documents(DB_ID, collection_id, queries=[Query.equal("field_name", field_name)])
        return set(doc["field_value"] for doc in docs["documents"])


    def update_autofill_from_inventory(n=N_ROWS):
        autofill_collection_id = get_autofill_collection_id()
        inventory_docs = get_last_n_inventory_rows(n)
        fields = ["brand", "size", "unit_price", "radius_size"]
        inserted = []
        skipped = []
        for field in fields:
            values = set(doc.get(field) for doc in inventory_docs if doc.get(field))
            existing = get_existing_autofill_values(autofill_collection_id, field)
            for value in values:
                value_str = str(value)
                context.log(f"Trying to insert field: {field}, value: '{value_str}', length: {len(value_str)}")
                if value_str and len(value_str) <= 100:
                    if value_str not in existing:
                        doc = {
                            "field_name": field,
                            "collection_name": "inventory_items",
                            "field_value": value_str
                        }
                        databases.create_document(DB_ID, autofill_collection_id, ID.unique(), doc)
                        inserted.append({"field": field, "value": value_str})
                    else:
                        skipped.append({"field": field, "value": value_str})
                else:
                    skipped.append({"field": field, "value": value_str, "reason": "invalid length/type"})
        return {"inserted": inserted, "skipped": skipped}

    try:
        context.log("Starting autofill update from inventory...")
        result = update_autofill_from_inventory(N_ROWS)
        context.log(f"Autofill update result: {result}")
        return context.res.json({"success": True, "result": result})
    except Exception as e:
        context.error("Autofill update error: " + repr(e))
        import traceback
        context.error(traceback.format_exc())
        return context.res.json({"success": False, "error": str(e)}, 500)
