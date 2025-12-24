# Database Storage Options for React Native

## Current Problem

You're using `getRxStorageDexie()` which requires IndexedDB. IndexedDB doesn't exist in React Native, only in web browsers.

## Solution: Switch to LokiJS Storage

### Step 1: Install LokiJS

```bash
npm install lokijs
```

### Step 2: Update databaseService.ts

Change ONE line:

```typescript
// OLD:
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

// NEW:
import { getRxStorageLoki } from 'rxdb/plugins/storage-lokijs';

// In getDatabase():
const db = await createRxDatabase<DatabaseCollections>({
    name: 'car_tire_sales_db',
    storage: getRxStorageLoki(),  // ← Changed from getRxStorageDexie()
    multiInstance: false,
    ignoreDuplicate: true
});
```

### Step 3: Clear Old Data

Since you're changing storage engines, you need to clear the old corrupted Dexie data:

1. **On Android**: Settings > Apps > Your App > Storage > Clear Data
2. **Restart the app**
3. Data will sync from Appwrite

### Step 4: Update Clear Database Function

```typescript
// utils/clearLokiDB.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function clearLokiDatabase(): Promise<void> {
    try {
        console.log('[ClearLoki] Starting database clear...');
        
        const dbName = 'car_tire_sales_db';
        
        // LokiJS stores data in AsyncStorage with this key pattern
        const allKeys = await AsyncStorage.getAllKeys();
        const dbKeys = allKeys.filter(key => 
            key.includes(dbName) ||
            key.includes('loki') ||
            key.includes('rxdb')
        );
        
        if (dbKeys.length > 0) {
            console.log(`[ClearLoki] Found ${dbKeys.length} database keys`);
            await AsyncStorage.multiRemove(dbKeys);
            console.log('[ClearLoki] ✅ Database cleared!');
        } else {
            console.log('[ClearLoki] No database keys found');
        }
        
        console.log('[ClearLoki] ⚠️ Please restart the app');
    } catch (error) {
        console.error('[ClearLoki] Error:', error);
        throw error;
    }
}
```

## Why LokiJS?

### Pros:
- ✅ **FREE** - No premium license
- ✅ **Works on React Native** - Uses AsyncStorage
- ✅ **Minimal changes** - Just swap storage engine
- ✅ **Keep all your code** - Schemas, hooks, audit system stay the same
- ✅ **Easy to clear** - Just delete AsyncStorage keys

### Cons:
- ⚠️ **Performance** - Slower than SQLite for very large datasets
- ⚠️ **Storage limits** - AsyncStorage has size limits (usually 6MB)
- ⚠️ **Not as robust** - Less battle-tested than SQLite

## Alternative: WatermelonDB (If you want to rewrite)

If you're willing to rewrite your database layer, WatermelonDB is the best option:

### Pros:
- ✅ Built for React Native
- ✅ Uses native SQLite (very fast)
- ✅ Excellent for large datasets
- ✅ Production-ready

### Cons:
- ⚠️ Requires rewriting all database code
- ⚠️ Different API than RxDB
- ⚠️ More complex setup

## My Recommendation

**Start with LokiJS** because:
1. Minimal code changes (literally one line)
2. You can test if it solves your problem immediately
3. If performance is an issue later, THEN consider WatermelonDB

## Next Steps

1. Install lokijs: `npm install lokijs`
2. Change `getRxStorageDexie()` to `getRxStorageLoki()`
3. Clear app data on Android
4. Restart app
5. Test if DVM1 errors are gone

If you want me to implement this, just say "switch to LokiJS" and I'll update your code!
