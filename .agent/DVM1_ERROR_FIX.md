# DVM1 Error Fix Guide

## What is DVM1?

DVM1 is a **Data Validation Mismatch** error in RxDB. It means the data stored in your local database doesn't match the current schema definition.

## Why Does This Happen?

1. **Schema Changes**: You modified the RxDB schema but old data still exists
2. **Corrupted Data**: Data was written incorrectly or partially
3. **Version Mismatch**: Different versions of the app wrote incompatible data

## Current Situation

You're getting DVM1 errors when trying to access `user_roles` collection:
```
ERROR [getUserRole] Error fetching user role: [RxError (DVM1)]
```

This means the `user_roles` data in your local database doesn't match the current schema.

## Solution: Clear the Database

### Step 1: Click "Clear Database & Retry" Button

On the welcome screen, you should see a button that says "Clear Database & Retry" (or similar based on your language).

### Step 2: Confirm the Action

A confirmation dialog will appear. Click "Confirm" to proceed.

### Step 3: Restart the App

After the database is cleared:
1. **Close the app completely** (swipe it away from recent apps)
2. **Reopen the app**
3. The database will be recreated with the correct schema
4. Data will sync from Appwrite server

## What Gets Deleted?

- ✅ **Local RxDB data** (inventory, customers, user_roles, permission_config, audit_logs)
- ❌ **Server data is safe** (everything in Appwrite is preserved)
- ❌ **Your login session** (you stay logged in)

## What Happens After Clearing?

1. App restarts with empty local database
2. Sync service automatically pulls data from Appwrite
3. All your data comes back from the server
4. Everything works normally again

## Technical Details

The emergency clear function:
- Clears all AsyncStorage keys related to RxDB
- Doesn't try to access the corrupted database
- Avoids triggering more DVM1 errors during cleanup

## Prevention

To avoid DVM1 errors in the future:

1. **Increment schema version** when making schema changes:
   ```typescript
   const inventorySchema: RxJsonSchema<any> = {
       title: 'inventory schema',
       version: 1, // Increment this!
       // ...
   };
   ```

2. **Provide migration strategies** for schema changes:
   ```typescript
   migrationStrategies: {
       1: function(oldDoc) {
           // Transform old data to new schema
           return oldDoc;
       }
   }
   ```

3. **Test schema changes** in development before deploying

## If Clear Doesn't Work

If the "Clear Database & Retry" button doesn't work, you can manually clear:

1. Go to Android Settings > Apps > Your App > Storage
2. Click "Clear Data" or "Clear Storage"
3. Restart the app

This will clear everything including your login session, so you'll need to log in again.

---

## Next Steps

**Right now:** Click the "Clear Database & Retry" button and restart your app. The DVM1 errors should be gone!
