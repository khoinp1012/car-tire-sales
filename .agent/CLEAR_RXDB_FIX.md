# Clear RxDB Database Fix

## Problem
The `clearRxDB.ts` utility was trying to import Dexie from RxDB's internal plugin structure:
```typescript
const { getDexieStoreSchema } = await import('rxdb/plugins/storage-dexie');
const Dexie = (await import('dexie')).default;
```

This caused a bundling error in React Native:
```
Unable to resolve module ../../dist/types/plugins/storage-dexie/index
```

## Root Cause
- RxDB's plugin exports reference TypeScript definition files that don't exist in the bundled package
- React Native's Metro bundler cannot resolve these internal TypeScript paths
- Dexie is not a direct dependency - it's bundled with RxDB

## Solution

### 1. **Avoid Direct Dexie Import**
Instead of trying to import Dexie directly, we now use platform-specific storage APIs:

- **Web/Expo Web**: Use the global `indexedDB` API
- **React Native**: Use `AsyncStorage` to clear RxDB-related keys

### 2. **Database Singleton Reset**
Added a `resetDatabase()` function in `databaseService.ts` to clear the singleton:

```typescript
export function resetDatabase(): void {
    dbPromise = null;
    console.log('[DatabaseService] Database singleton reset');
}
```

This ensures that after clearing the database, `getDatabase()` will create a fresh instance.

### 3. **Updated Clear Logic**

```typescript
// For Web (IndexedDB)
if (typeof indexedDB !== 'undefined') {
    const request = indexedDB.deleteDatabase(dbName);
    // Handle success/error/blocked events
}

// For React Native (AsyncStorage)
else {
    const allKeys = await AsyncStorage.getAllKeys();
    const dbKeys = allKeys.filter(key =>
        key.includes(dbName) ||
        key.includes('rxdb') ||
        key.includes('dexie') ||
        key.startsWith('_pouch_')
    );
    await AsyncStorage.multiRemove(dbKeys);
}

// Reset singleton
resetDatabase();
```

## Testing

To test the fix:

1. Run the app: `npm run android`
2. Trigger the clear database function
3. Check logs for:
   - `[ClearRxDB] Found X database-related keys`
   - `[ClearRxDB] ✅ Cleared X database keys from AsyncStorage`
   - `[ClearRxDB] Database singleton reset`
4. Restart the app - database should be recreated fresh

## Files Modified

1. **`utils/clearRxDB.ts`**
   - Removed Dexie import
   - Added platform-specific clearing logic
   - Added `resetDatabase()` call

2. **`utils/databaseService.ts`**
   - Added `resetDatabase()` export function

## Benefits

✅ No more bundling errors
✅ Works on both web and React Native
✅ Properly resets database singleton
✅ More robust error handling
✅ Better logging for debugging
