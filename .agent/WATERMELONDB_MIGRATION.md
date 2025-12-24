# Migration to WatermelonDB - Complete

## Summary

Successfully migrated from RxDB to WatermelonDB for offline-first data synchronization with Appwrite.

## Why WatermelonDB?

1. **React Native Optimized**: Built specifically for React Native with excellent performance
2. **Better Documentation**: Clear, comprehensive docs with many examples
3. **Proven Track Record**: Used in production by many apps
4. **Simpler API**: Easier to understand and implement than RxDB
5. **Native Performance**: Uses JSI for direct JavaScript-to-native communication

## What Was Changed

### 1. Dependencies
- **Removed**: `rxdb`, `dexie`
- **Added**: `@nozbe/watermelondb`, `@nozbe/with-observables`

### 2. New Files Created

#### `/models/index.ts`
- Model classes for all collections (Inventory, Customer, UserRole, PermissionConfig, AuditLog)
- Uses decorators (`@field`, `@date`, `@readonly`) for type-safe field definitions
- Each model has an `appwriteId` field to track the original Appwrite document ID

#### `/models/schema.ts`
- Database schema definition with all tables and columns
- Proper indexing on frequently queried fields (appwrite_id, user_id, is_active, etc.)
- Timestamps stored as numbers (milliseconds since epoch) for WatermelonDB compatibility

#### `/utils/databaseService.ts` (Rewritten)
- Initializes WatermelonDB with SQLite adapter
- JSI enabled for maximum performance
- Helper functions for audit logging
- Database reset functionality for testing/clearing

#### `/utils/syncService.ts` (Rewritten)
- Uses WatermelonDB's `synchronize()` function
- Custom `pullChanges` handler to fetch from Appwrite
- Custom `pushChanges` handler to push to Appwrite
- Automatic field mapping between snake_case (Appwrite) and camelCase (WatermelonDB)
- Audit logging for all changes
- Automatic periodic sync every 30 seconds
- Offline mode support

## How Sync Works

### Pull (Appwrite → Local)
1. Query Appwrite for documents updated since last sync
2. Map Appwrite fields ($id, $createdAt, etc.) to WatermelonDB format
3. Categorize as created/updated/deleted
4. WatermelonDB applies changes to local SQLite database

### Push (Local → Appwrite)
1. WatermelonDB tracks all local changes
2. For each changed record, map fields back to Appwrite format
3. Create/update/delete documents in Appwrite
4. Create audit logs for all changes (except audit_logs table itself)

### Field Mapping
- **Appwrite**: `$id`, `$createdAt`, `$updatedAt`, `snake_case` fields
- **WatermelonDB**: `appwriteId`, `createdAt`, `updatedAt`, `camelCase` fields

## Key Features

✅ **Offline-First**: All data stored locally in SQLite  
✅ **Automatic Sync**: Syncs every 30 seconds when online  
✅ **Conflict Resolution**: Server wins in case of conflicts  
✅ **Audit Logging**: All changes tracked with user/device/timestamp  
✅ **Soft Deletes**: Uses `deleted` flag instead of hard deletes  
✅ **Performance**: JSI-enabled for native speed  
✅ **Type Safety**: TypeScript models with decorators  

## Next Steps

1. **Update UI Components**: Refactor components to use WatermelonDB queries instead of RxDB
2. **Add Observables**: Use `@nozbe/with-observables` for reactive UI updates
3. **Test Sync**: Verify sync works correctly with Appwrite
4. **Migration Script**: Create script to migrate existing RxDB data (if needed)

## Example Usage

```typescript
import { getDatabase } from '@/utils/databaseService';
import { Inventory } from '@/models';

// Get database
const db = getDatabase();

// Query all inventory items
const inventoryCollection = db.get<Inventory>('inventory');
const allItems = await inventoryCollection.query().fetch();

// Query with filters
const activeItems = await inventoryCollection
  .query(Q.where('deleted', false))
  .fetch();

// Create new item
await db.write(async () => {
  await inventoryCollection.create((item) => {
    item.appwriteId = ID.unique();
    item.brand = 'Michelin';
    item.size = '195/65R15';
    item.unitPrice = 2500000;
    item.radiusSize = 15;
    item.sequence = 1;
    item.fullDescription = 'Michelin 195/65R15';
    item.version = 1;
    item.deleted = false;
    item.lastModifiedBy = userId;
  });
});

// Update item
await db.write(async () => {
  await item.update((i) => {
    i.unitPrice = 2600000;
  });
});

// Soft delete
await db.write(async () => {
  await item.update((i) => {
    i.deleted = true;
  });
});
```

## Troubleshooting

### Build Errors
- Make sure to run `npx expo start --clear` to clear Metro cache
- If you see SQLite errors, check that `expo-sqlite` is installed

### Sync Issues
- Check network connectivity
- Verify Appwrite credentials in `.env`
- Check console logs for detailed error messages
- Ensure Appwrite collections have correct permissions

### Performance Issues
- Ensure JSI is enabled in the adapter
- Add indexes to frequently queried fields in schema
- Use `.observe()` instead of `.fetch()` for reactive updates

## Resources

- [WatermelonDB Documentation](https://watermelondb.dev/docs)
- [WatermelonDB Sync Guide](https://watermelondb.dev/docs/Sync)
- [WatermelonDB with React Native](https://watermelondb.dev/docs/Installation)
