# Permission System Offline Analysis

## 🚨 Critical Issue: Permissions Are Online-Only

### Current State

Your application has **TWO SEPARATE DATA SYSTEMS**:

#### 1. **Offline-First Data (RxDB + Appwrite Sync)**
- ✅ `inventory` collection - Fully offline with RxDB + audit logs
- ✅ `customers` collection - Fully offline with RxDB + audit logs
- ✅ `audit_logs` collection - Tracks all changes to inventory/customers
- ✅ Syncs bidirectionally with Appwrite when online

#### 2. **Online-Only Data (Direct Appwrite API)**
- ❌ `user_roles` collection - **NO RxDB, NO offline support**
- ❌ `permission_config` collection - **NO RxDB, NO offline support**
- ❌ **NO audit logging for permission changes**

---

## 🔍 What Happens When You're Offline

### Scenario: User Goes Offline and Role Changes Occur

```
User State: Logged in as admin
Network: OFFLINE
Action: Admin tries to change a user's role from "seller" to "inventory_manager"
```

#### Step-by-Step Breakdown:

1. **Initial Load (While Online)**
   - ✅ TanStack Query caches session for 30 minutes
   - ✅ User role cached for 5 minutes
   - ✅ Permission context cached for 5 minutes
   - User sees: `permissions: {...}`, `userRole: "admin"`

2. **Network Goes Offline**
   - ✅ App continues to work with cached data
   - ✅ Inventory and customer data still accessible via RxDB
   - ⚠️ Permissions still show from cache (for 5 minutes)

3. **Cache Expires (After 5 Minutes)**
   - ❌ TanStack Query tries to refetch from Appwrite
   - ❌ API call fails (network offline)
   - ❌ `permissions: null` (as shown in your logs)
   - ❌ `userRole: "admin"` (might still show from stale cache)
   - ❌ **User loses access to all protected routes**

4. **Admin Tries to Change Roles Offline**
   - ❌ `setUserRole()` calls `databases.updateDocument()` → **FAILS**
   - ❌ No local RxDB fallback
   - ❌ No audit log created
   - ❌ Change is **completely lost**

5. **Network Comes Back Online**
   - ✅ TanStack Query refetches permissions
   - ✅ Inventory/customer changes sync via RxDB
   - ❌ **Role changes never happened** (they failed offline)
   - ❌ **No conflict resolution needed** (because nothing was stored)

---

## 📊 Comparison: Inventory vs Permissions

| Feature | Inventory/Customers | User Roles/Permissions |
|---------|-------------------|----------------------|
| **Local Storage** | ✅ RxDB (Dexie) | ❌ None |
| **Offline Access** | ✅ Full CRUD | ❌ Read-only (cached) |
| **Offline Writes** | ✅ Queued in RxDB | ❌ Fail immediately |
| **Audit Logging** | ✅ Every change tracked | ❌ No audit trail |
| **Sync Strategy** | ✅ Bidirectional | ❌ N/A |
| **Conflict Resolution** | ✅ RxDB handles it | ❌ N/A |
| **Cache Duration** | ✅ Permanent (RxDB) | ⚠️ 5 minutes (TanStack) |

---

## 🐛 The Bug You're Seeing

```javascript
LOG  [Welcome] Screen loaded with email: khoinp1012@gmail.com
LOG  [Welcome] Current permissions: null  // ❌ Cache expired, API failed
LOG  [Welcome] User role: admin           // ⚠️ Stale cache or different query key
```

**Why `permissions: null` but `userRole: "admin"`?**

Looking at `usePermissions.ts`:

```typescript
// Line 62-67: Permission context query
const contextQuery = useQuery({
    queryKey: PERMISSION_KEYS.context(userId || ''),
    queryFn: () => getUserPermissionContext(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
});

// Line 54-59: Role query (separate cache key)
const roleQuery = useQuery({
    queryKey: PERMISSION_KEYS.role(userId || ''),
    queryFn: () => getUserRole(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
});
```

**These are TWO SEPARATE queries with different cache keys!**

- `roleQuery` might have succeeded before going offline
- `contextQuery` failed when cache expired offline
- Result: `userRole: "admin"` but `permissions: null`

---

## ⚠️ Security Implications

### 1. **Inconsistent Permission State**
```typescript
// This is possible:
userRole: "admin"           // From cache
permissions: null           // API failed
canAccessRoute('manage_roles'): false  // Denied due to null permissions
```

**Impact**: Admin user is locked out of admin features when offline!

### 2. **No Audit Trail for Permission Changes**
- Inventory changes: ✅ Tracked in `audit_logs` with version history
- Permission changes: ❌ **NO AUDIT TRAIL AT ALL**
- You cannot see:
  - Who changed what role
  - When it was changed
  - What the previous value was
  - Device/session that made the change

### 3. **Potential for Data Loss**
If an admin tries to change roles while offline:
- Change fails silently (or with error)
- No local queue
- Change is **permanently lost**
- Admin might think it succeeded

---

## 🔧 Recommended Solutions

### Option 1: **Add RxDB Support for Permissions** (Recommended)

Make permissions offline-first like inventory/customers:

1. **Add RxDB Schemas**
   ```typescript
   // In databaseService.ts
   const userRolesSchema: RxJsonSchema<any> = {
       title: 'user_roles schema',
       version: 0,
       primaryKey: '_id',
       type: 'object',
       properties: {
           _id: { type: 'string', maxLength: 100 },
           userId: { type: 'string' },
           role: { type: 'string' },
           name: { type: 'string' },
           email: { type: 'string' },
           ...commonFields
       },
       required: ['_id', 'userId', 'role']
   };

   const permissionConfigSchema: RxJsonSchema<any> = {
       title: 'permission_config schema',
       version: 0,
       primaryKey: '_id',
       type: 'object',
       properties: {
           _id: { type: 'string', maxLength: 100 },
           version: { type: 'string' },
           isActive: { type: 'boolean' },
           roles: { type: 'string' }, // JSON string
           collectionPermissions: { type: 'string' }, // JSON string
           rowPermissions: { type: 'string' }, // JSON string
           ...commonFields
       },
       required: ['_id', 'version', 'isActive']
   };
   ```

2. **Add to Database Collections**
   ```typescript
   await db.addCollections({
       inventory: { schema: inventorySchema },
       customers: { schema: customersSchema },
       audit_logs: { schema: auditLogsSchema },
       user_roles: { schema: userRolesSchema },        // NEW
       permission_config: { schema: permissionConfigSchema }  // NEW
   });
   ```

3. **Add Audit Hooks**
   ```typescript
   const collectionsToAudit = [
       db.inventory, 
       db.customers,
       db.user_roles,        // NEW - Track role changes
       db.permission_config  // NEW - Track permission changes
   ];
   ```

4. **Update Sync Service**
   ```typescript
   // In syncService.ts - Add replication for new collections
   const userRolesRep = replicateAppwrite({
       collection: db.user_roles,
       client: client as any,
       databaseId: DATABASE_ID,
       collectionId: USER_ROLES_COLLECTION_ID,
       deletedField: 'deleted',
       pull: {},
       push: {},
       replicationIdentifier: `user-roles-sync-${db.name}`
   });

   const permConfigRep = replicateAppwrite({
       collection: db.permission_config,
       client: client as any,
       databaseId: DATABASE_ID,
       collectionId: PERMISSION_CONFIG_COLLECTION_ID,
       deletedField: 'deleted',
       pull: {},
       push: {},
       replicationIdentifier: `permission-config-sync-${db.name}`
   });
   ```

5. **Update Services to Use RxDB**
   ```typescript
   // In userRoleService.ts
   export async function getUserRole(userId: string): Promise<string | null> {
       try {
           const db = await getDatabase();
           const doc = await db.user_roles
               .findOne({ selector: { userId } })
               .exec();
           
           return doc ? doc.role : null;
       } catch (error) {
           console.error('[getUserRole] Error:', error);
           return null;
       }
   }
   ```

**Benefits:**
- ✅ Full offline support for permissions
- ✅ Audit trail for all permission changes
- ✅ Consistent with inventory/customer data model
- ✅ Automatic conflict resolution via RxDB
- ✅ No more `permissions: null` errors

---

### Option 2: **Improve Cache Strategy** (Quick Fix)

Keep online-only but make caching more robust:

1. **Increase Cache Duration**
   ```typescript
   staleTime: 1000 * 60 * 60 * 24, // 24 hours instead of 5 minutes
   cacheTime: 1000 * 60 * 60 * 24 * 7, // Keep in cache for 7 days
   ```

2. **Add Fallback Values**
   ```typescript
   const permissionContext = contextQuery.data || 
       queryClient.getQueryData(PERMISSION_KEYS.context(userId || '')) || 
       null;
   ```

3. **Show Warning When Offline**
   ```typescript
   if (!navigator.onLine && !permissionContext) {
       return {
           ...defaultPermissions,
           warning: "Offline - using cached permissions"
       };
   }
   ```

**Benefits:**
- ✅ Quick to implement
- ✅ Reduces `permissions: null` errors
- ❌ Still no offline writes
- ❌ Still no audit trail
- ❌ Not a true offline-first solution

---

### Option 3: **Make Permissions Read-Only Offline** (Current State + Warning)

Accept that permissions are online-only, but handle it gracefully:

1. **Detect Offline State**
   ```typescript
   const isOnline = useNetworkState();
   
   if (!isOnline && !permissionContext) {
       return {
           error: "Permissions require internet connection",
           canAccessRoute: () => false,
           // ... all permission checks return false
       };
   }
   ```

2. **Disable Admin Features Offline**
   ```typescript
   // In manage_roles.tsx and manage_users.tsx
   if (!isOnline) {
       return <OfflineWarning message="Role management requires internet" />;
   }
   ```

3. **Keep Audit Logs Online-Only**
   - Accept that permission changes are not audited
   - Document this limitation

**Benefits:**
- ✅ Very simple
- ✅ Clear user expectations
- ❌ Admin features unavailable offline
- ❌ No audit trail
- ❌ Inconsistent with inventory/customer model

---

## 📝 Summary

### Current Behavior (Offline):
1. ✅ Inventory/Customers: Full offline CRUD + audit logs
2. ❌ Permissions: Read-only (cached for 5 min) + NO audit logs
3. ❌ Role changes offline: **FAIL and are LOST**
4. ⚠️ After 5 min offline: `permissions: null`, user locked out

### Recommended Action:
**Option 1** - Add RxDB support for permissions to match your inventory/customer model. This provides:
- Consistent offline-first architecture
- Full audit trail for compliance
- Better user experience
- No data loss

### Quick Fix:
**Option 2** - Increase cache duration and add fallbacks to reduce errors while online-only.

---

## 🎯 Next Steps

1. **Decide on approach** (Option 1, 2, or 3)
2. **If Option 1**: I can implement the RxDB schemas and migration
3. **If Option 2**: I can update the cache configuration
4. **If Option 3**: I can add offline detection and warnings

Let me know which approach you prefer!
