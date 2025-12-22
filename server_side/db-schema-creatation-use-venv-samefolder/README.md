# Server-side Database Scripts

## Adding radius_size to Autofill Collection

To populate the autofill collection with radius_size values for the find_inventory feature:

### Option 1: Run the local script (Recommended)

1. Install the Python Appwrite SDK:
   ```bash
   pip install appwrite
   ```

2. Update the API key in `add_radius_to_autofill.py`:
   - Replace `YOUR_API_KEY_HERE` with your actual Appwrite API key
   - Verify the endpoint and project ID are correct

3. Run the script:
   ```bash
   python3 add_radius_to_autofill.py
   ```

### Option 2: Update the server function

The main autofill update function `appwrite_update_autofill_from_inventory.py` has been updated to include `radius_size` in the fields list. Deploy this function to your Appwrite server and run it to populate the autofill collection.

## What this does

- Extracts all unique `radius_size` values from the `inventory_items` collection
- Adds them to the `autofill` collection with:
  - `field_name`: "radius_size"
  - `collection_name`: "inventory_items"
  - `field_value`: the actual radius value
- Avoids duplicates by checking existing values first

This enables the find_inventory screen to use proper autofill for radius selection while keeping the insert_inventory screen using auto-generated radius from size.
