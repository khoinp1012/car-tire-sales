# RxDB Dexie Storage Analysis & Fix

## Investigation Summary

After reading the RxDB Dexie storage source code in `node_modules/rxdb/dist/esm/plugins/storage-dexie/`, I discovered the root cause of why database clearing wasn't working.

## Key Findings

### 1. **Database Naming Convention**

From `dexie-helper.js` line 11:
```javascript
var dexieDbName = 'rxdb-dexie-' + databaseName + '--' + schema.version + '--' + collectionName;
```

**This means:**
- Each RxDB collection creates a **separate IndexedDB database**
- Database name format: `rxdb-dexie-{dbName}--{schemaVersion}--{collectionName}`
- For your app with 5 collections, there are **5 separate IndexedDB databases**:
  - `rxdb-dexie-car_tire_sales_db--0--inventory`
  - `rxdb-dexie-car_tire_sales_db--0--customers`
  - `rxdb-dexie-car_tire_sales_db--0--user_roles`
  - `rxdb-dexie-car_tire_sales_db--0--permission_config`
  - `rxdb-dexie-car_tire_sales_db--0--audit_logs`

### 2. **Why Previous Attempts Failed**

**Emergency Clear (AsyncStorage):**
- ❌ Found 0 keys because Dexie doesn't use AsyncStorage
- ❌ Dexie uses IndexedDB (or a polyfill in React Native)

**Force Clear (Generic Names):**
- ❌ Tried to delete `car_tire_sales_db` but actual names include schema version and collection
- ❌ Didn't know the exact naming convention

### 3. **Storage Location**

**On Web/Expo Web:**
- ✅ Uses browser's IndexedDB
- ✅ Can be deleted programmatically

**On React Native (Android):**
- ⚠️ Uses a polyfill (likely SQLite-based or file-based)
- ⚠️ `indexedDB` API might not be available
- ⚠️ Requires manual app data clearing

## The Solution

### `properClearDB.ts`

Based on the source code analysis, I created a proper clear function that:

1. **Checks for IndexedDB availability**
   - If available (web): proceeds with deletion
   - If not available (React Native): instructs user to clear manually

2. **Generates correct database names**
   - Uses the exact naming convention from RxDB source
   - Tries multiple schema versions (0, 1, 2) to be safe

3. **Deletes all collection databases**
   - Iterates through all 5 collections
   - Deletes each IndexedDB database individually

4. **Provides detailed logging**
   - Shows which databases were found
   - Shows which were deleted
   - Explains if deletion fails

## Testing the Fix

### Expected Behavior (Web/Expo Web):

```
[ProperClear] Starting proper database clear...
[ProperClear] IndexedDB is available
[ProperClear] Found IndexedDB databases: [...]
[ProperClear] Will attempt to delete these databases: [...]
[ProperClear] Deleting: rxdb-dexie-car_tire_sales_db--0--inventory
[ProperClear] ✅ Deleted: rxdb-dexie-car_tire_sales_db--0--inventory
[ProperClear] Deleting: rxdb-dexie-car_tire_sales_db--0--customers
[ProperClear] ✅ Deleted: rxdb-dexie-car_tire_sales_db--0--customers
... (repeat for all collections)
[ProperClear] ✅ Deletion complete: 5 deleted, 0 errors
[ProperClear] ✅ Database clear successful!
```

### Expected Behavior (React Native):

```
[ProperClear] Starting proper database clear...
[ProperClear] IndexedDB not available - this is React Native
[ProperClear] Dexie storage in React Native uses a polyfill
[ProperClear] You must clear app data manually in Android Settings
Error: IndexedDB not available - please clear app data manually
```

## Why React Native is Different

From the Dexie documentation and RxDB implementation:
- Dexie.js can run in React Native using a polyfill
- The polyfill typically uses SQLite or file-based storage
- The `indexedDB` global API is not available
- Data is stored in app's private storage
- Only way to clear: Android Settings > Apps > Your App > Storage > Clear Data

## Recommendation

### For Web/Expo Web:
✅ Use the "Clear Database & Retry" button

### For React Native (Android):
1. Close the app
2. Go to Settings > Apps > Your App
3. Tap Storage > Clear Data
4. Reopen the app

## Long-term Fix

To prevent DVM1 errors in the future:

1. **Always increment schema version when making changes:**
   ```typescript
   const userRolesSchema: RxJsonSchema<any> = {
       title: 'user_roles schema',
       version: 1, // ← Increment this!
       // ...
   };
   ```

2. **Provide migration strategies:**
   ```typescript
   await db.addCollections({
       user_roles: {
           schema: userRolesSchema,
           migrationStrategies: {
               1: function(oldDoc) {
                   // Transform old data to new schema
                   return oldDoc;
               }
           }
       }
   });
   ```

3. **Test schema changes in development first**

## Files Created

1. `utils/properClearDB.ts` - Correct implementation based on source code
2. `utils/forceClearDB.ts` - Previous attempt (can be deleted)
3. `utils/emergencyClear.ts` - Previous attempt (can be deleted)
4. `.agent/RXDB_DEXIE_ANALYSIS.md` - This document

## Next Steps

1. **Try the updated clear button** - It should now work on web
2. **If on React Native** - Clear app data manually
3. **After clearing** - Restart app and data will sync from Appwrite
