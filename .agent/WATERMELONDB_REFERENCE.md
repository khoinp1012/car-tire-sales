# WatermelonDB Quick Reference

## Common Imports

```typescript
import { Q } from '@nozbe/watermelondb';
import { getDatabase } from '@/utils/databaseService';
import { Inventory, Customer, UserRole, PermissionConfig } from '@/models';
```

## Basic Operations

### Get Database
```typescript
const db = getDatabase();
```

### Get Collection
```typescript
const inventoryCollection = db.get<Inventory>('inventory');
const customersCollection = db.get<Customer>('customers');
```

### Fetch All Records
```typescript
const allInventory = await inventoryCollection.query().fetch();
```

### Fetch with Filter
```typescript
// Single condition
const activeItems = await inventoryCollection
  .query(Q.where('deleted', false))
  .fetch();

// Multiple conditions (AND)
const filtered = await inventoryCollection
  .query(
    Q.where('deleted', false),
    Q.where('brand', 'Michelin')
  )
  .fetch();

// OR conditions
const filtered = await inventoryCollection
  .query(
    Q.or(
      Q.where('brand', 'Michelin'),
      Q.where('brand', 'Bridgestone')
    )
  )
  .fetch();
```

### Sorting
```typescript
const sorted = await inventoryCollection
  .query(
    Q.where('deleted', false),
    Q.sortBy('sequence', Q.asc)
  )
  .fetch();
```

### Limit & Offset
```typescript
const paginated = await inventoryCollection
  .query(
    Q.where('deleted', false),
    Q.take(10), // Limit
    Q.skip(20)  // Offset
  )
  .fetch();
```

### Find by ID
```typescript
const item = await inventoryCollection.find('record_id');
```

### Find by Appwrite ID
```typescript
const item = await inventoryCollection
  .query(Q.where('appwrite_id', appwriteId))
  .fetch();
const record = item[0]; // Get first result
```

## Create, Update, Delete

### Create Record
```typescript
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
```

### Update Record
```typescript
await db.write(async () => {
  await item.update((i) => {
    i.unitPrice = 2600000;
    i.version = i.version + 1;
    i.lastModifiedBy = userId;
  });
});
```

### Soft Delete
```typescript
await db.write(async () => {
  await item.update((i) => {
    i.deleted = true;
    i.lastModifiedBy = userId;
  });
});
```

### Hard Delete (Permanent)
```typescript
await db.write(async () => {
  await item.markAsDeleted(); // Marks for deletion
  await item.destroyPermanently(); // Actually deletes
});
```

### Batch Operations
```typescript
await db.write(async () => {
  await db.batch(
    item1.prepareUpdate((i) => { i.unitPrice = 2500000; }),
    item2.prepareUpdate((i) => { i.unitPrice = 2600000; }),
    item3.prepareMarkAsDeleted()
  );
});
```

## Reactive Queries (Observables)

### Observe Query Results
```typescript
import { useEffect, useState } from 'react';

function MyComponent() {
  const [items, setItems] = useState<Inventory[]>([]);
  
  useEffect(() => {
    const db = getDatabase();
    const subscription = db.get<Inventory>('inventory')
      .query(Q.where('deleted', false))
      .observe()
      .subscribe((newItems) => {
        setItems(newItems);
      });
    
    return () => subscription.unsubscribe();
  }, []);
  
  return <View>{/* Render items */}</View>;
}
```

### Observe Single Record
```typescript
useEffect(() => {
  const subscription = item.observe().subscribe((updatedItem) => {
    console.log('Item updated:', updatedItem);
  });
  
  return () => subscription.unsubscribe();
}, [item]);
```

## Advanced Queries

### Text Search (Contains)
```typescript
const results = await inventoryCollection
  .query(
    Q.where('brand', Q.like(`%${searchTerm}%`))
  )
  .fetch();
```

### Greater Than / Less Than
```typescript
const expensive = await inventoryCollection
  .query(
    Q.where('unit_price', Q.gt(3000000))
  )
  .fetch();

const cheap = await inventoryCollection
  .query(
    Q.where('unit_price', Q.lte(2000000))
  )
  .fetch();
```

### Between
```typescript
const midRange = await inventoryCollection
  .query(
    Q.where('unit_price', Q.between(2000000, 3000000))
  )
  .fetch();
```

### Count
```typescript
const count = await inventoryCollection
  .query(Q.where('deleted', false))
  .fetchCount();
```

## Sync Operations

### Manual Sync
```typescript
import { performSync } from '@/utils/syncService';

await performSync();
```

### Toggle Offline Mode
```typescript
import { setOfflineMode, getOfflineMode } from '@/utils/syncService';

setOfflineMode(true);  // Go offline
setOfflineMode(false); // Go online

const isOffline = getOfflineMode();
```

### Start/Stop Auto Sync
```typescript
import { startSync, stopSync } from '@/utils/syncService';

startSync();  // Start automatic sync (every 30s)
stopSync();   // Stop automatic sync
```

## Accessing Raw Data

```typescript
// Get raw database record
const raw = item._raw;
console.log(raw.brand);
console.log(raw.unit_price);

// Get WatermelonDB ID
const id = item.id;

// Get Appwrite ID
const appwriteId = item.appwriteId;
```

## Common Patterns

### Load Data on Component Mount
```typescript
useEffect(() => {
  const loadData = async () => {
    const db = getDatabase();
    const items = await db.get<Inventory>('inventory')
      .query(Q.where('deleted', false))
      .fetch();
    setItems(items);
  };
  
  loadData();
}, []);
```

### Search with Debounce
```typescript
const [searchTerm, setSearchTerm] = useState('');
const [results, setResults] = useState<Inventory[]>([]);

useEffect(() => {
  const timer = setTimeout(async () => {
    if (searchTerm) {
      const db = getDatabase();
      const items = await db.get<Inventory>('inventory')
        .query(
          Q.where('deleted', false),
          Q.where('brand', Q.like(`%${searchTerm}%`))
        )
        .fetch();
      setResults(items);
    }
  }, 300);
  
  return () => clearTimeout(timer);
}, [searchTerm]);
```

### Pagination
```typescript
const [page, setPage] = useState(0);
const pageSize = 20;

const loadPage = async (pageNum: number) => {
  const db = getDatabase();
  const items = await db.get<Inventory>('inventory')
    .query(
      Q.where('deleted', false),
      Q.sortBy('sequence', Q.asc),
      Q.skip(pageNum * pageSize),
      Q.take(pageSize)
    )
    .fetch();
  return items;
};
```

## Tips & Best Practices

1. **Always wrap writes in `db.write()`** - WatermelonDB requires all mutations to be in a write block
2. **Use observables for reactive UI** - `.observe()` automatically updates when data changes
3. **Batch operations** - Use `db.batch()` for multiple operations to improve performance
4. **Soft deletes** - Use `deleted` flag instead of hard deletes for sync compatibility
5. **Index frequently queried fields** - Add `isIndexed: true` in schema for better performance
6. **Use prepared updates for batch** - `prepareUpdate()` instead of `update()` in batch operations

## Debugging

### Log all records
```typescript
const items = await inventoryCollection.query().fetch();
console.log('All items:', items.map(i => i._raw));
```

### Check sync status
```typescript
import { getOfflineMode } from '@/utils/syncService';
console.log('Offline mode:', getOfflineMode());
```

### Reset database (DANGER!)
```typescript
import { resetDatabase } from '@/utils/databaseService';
await resetDatabase(); // Deletes ALL local data!
```
