# Future Action: Backend Autofill Cleanup

## Context
The frontend has been refactored to use **Offline-First Dynamic Autofill**. Suggestions are now extracted directly from local WatermelonDB (Inventory and Customers tables). The dedicated `autofill` collection in Appwrite is no longer required.

## TODO List

### 1. Appwrite Console / Database
- [ ] **Delete Collection**: Remove the `autofill` collection (ID: `autofill_collection_id` or equivalent) from the Appwrite database.
- [ ] **Data Cleanup**: Ensure all legacy records in the `autofill` collection are purged (automatic upon collection deletion).

### 2. Frontend Configuration Cleanup
- [ ] **`constants/appwrite.ts`**: Remove `AUTOFILL_COLLECTION_ID` export.
- [ ] **`.env` and `.env.example`**: Remove `EXPO_PUBLIC_APPWRITE_COLLECTION_AUTOFILL`.
- [ ] **`constants/env.ts`**: Remove the autofill mapping.

### 3. Server-Side Scripts Removal
- [ ] **Delete Python Scripts**:
    - `server_side/db-schema-creatation-use-venv-samefolder/add_specific_tire_data_to_autofill.py`
    - `server_side/db-schema-creatation-use-venv-samefolder/add_radius_to_autofill.py`
- [ ] **Update CI/CD**: If any automated tasks populate this collection, disable them.

### 4. Documentation Update
- [ ] **`docs/DATABASE_SYNC_PLAN.md`**: Update the architecture section to explicitly state that autofill is a client-side derivation from local indices, not a separate server collection.

---
**Status**: Pending (Awaiting Backend Modification)
**Target Date**: Next Session
