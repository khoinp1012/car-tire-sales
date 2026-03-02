# Commercial-Grade Offline-First Sync Implementation Plan

## 1. Vision & Architecture
This plan implements a high-performance, bidirectional synchronization between **WatermelonDB** (Client) and **Appwrite** (Server). It adopts the **RxDB Replication Protocol** for data integrity and the **Tombstone Pattern** for deletion management.

### Key Principles:
*   **Lean Client:** NO JSON snapshots on the client. Local SQLite remains small and fast.
*   **Source of Truth:** WatermelonDB is the *only* source of truth for the UI.
*   **Sync Logic:** Composite checkpoints (`$updatedAt` + `$id`) to prevent data gaps during millisecond collisions.
*   **Realtime:** Sub-second updates via Appwrite WebSockets.

---

## 2. Step-by-Step Roadmap

### Step 1: Appwrite Server Readiness (The Foundation) [COMPLETED]
*   ✅ **Metadata Evolution:** Added `deleted` and `version` attributes to all collections.
*   ✅ **Server Performance:** Indexed `$updatedAt` and `deleted` for all collections.
*   ✅ **Audit Backend:** Ensured `audit_logs` collection is ready on server with `snapshot` field for JSON tracking.

### Step 2: Database Schema & Engine Hardening [COMPLETED]
*   ✅ **Remove Audits from Client:** Completely removed `audit_logs` from WatermelonDB to keep the client lean. Auditing is now a server-side responsibility.
*   ✅ **Standardize Fields:** Ensured all local models have `appwrite_id`, `version`, and `deleted`. Added `stacks` table.
*   ✅ **Sync Table:** WatermelonDB handles `last_pulled_at` internally; the schema is now ready for composite checkpoints.

### Step 3: Implementing the "RxDB-Style" Pull Engine [COMPLETED]
*   ✅ **The Composite Query:** Implemented RxDB logic: `($updatedAt > checkpoint) OR ($updatedAt == checkpoint AND $id > lastId)`.
*   ✅ **Recursive Paging:** `pullChanges` now loops in batches of 100 until all remote changes are fetched.
*   ✅ **Tombstone Processing:** Correctly handles `deleted: true` flags, converting them to local WatermelonDB purges.

### Step 4: Live Replication & Connectivity [COMPLETED]
*   ✅ **Realtime Bridge:** Implemented `appwrite.subscribe` to listen for remote changes instantly via WebSockets.
*   ✅ **Event Handling:** Any server-side create/update/delete now triggers an immediate local `performSync()`.
*   ✅ **NetInfo Resilience:** Integrated `@react-native-community/netinfo`. The app now auto-syncs the moment it recovers from "Airplane Mode" or poor signal.

### Step 5: Service Layer Migration (De-coupling the Cloud) [COMPLETED]
*   ✅ **Permission Service:** Completely rewritten to read from local `permission_config` table via WatermelonDB.
*   ✅ **User Role Service:** Completely rewritten to read from local `user_roles` table via WatermelonDB.
*   ✅ **Inventory Service:** Enhanced with comprehensive search methods for offline-first queries.
*   ✅ **UI Components:** Refactored `find_inventory.tsx` to use local inventoryService instead of direct Appwrite calls.

### Step 6: Smart Tiered Sync Strategy (Intelligent Initial Sync) [COMPLETED]
Instead of syncing the entire database, implemented a 4-tier priority system:

**TIER 1 - CRITICAL (Blocking <500ms)** ✅:
*   ✅ `permission_config`: Only active config (1 document)
*   ✅ `user_roles`: Only current user's role (1 document)
*   ✅ **Result**: App starts in <500ms with minimal blocking

**TIER 2 - HIGH PRIORITY (Background, immediate)** ✅:
*   ✅ `inventory`: Only unsold items from last 30 days
*   ✅ `customers`: Only customers with activity in last 90 days
*   ✅ **Result**: Core business data available within 2-5 seconds

**TIER 3 - MEDIUM PRIORITY (Background, after Tier 2)** ✅:
*   ✅ `sales`: Only sales from last 30 days
*   ✅ `stacks`: All active stacks (small dataset)
*   ✅ **Result**: Full functionality within 8 seconds

**TIER 4 - FULL HISTORY (Background Catch-up)** ✅:
*   ✅ `pullChanges` with full dataset (Inventory history, all customers)
*   ✅ **Result**: Complete offline database reliability

### Step 7: Server-Side Autonomous Auditing (The Safeguard) [COMPLETED]
*   **Mechanism**: Appwrite Function triggered by `databases.*.collections.*.documents.*.*` events.
*   **Responsibility**: Offloads the creation of `audit_logs` from the mobile app to the server.
*   **Data Integrity**: Captures full JSON snapshots and actor metadata automatically upon successful sync.
*   **Benefit**: Guaranteed audit trail that cannot be bypassed by client-side errors or battery loss.

**Implementation** ✅:
*   ✅ Blocking sync gate in `_layout.tsx` for Tier 1 only
*   ✅ Background sync service handles Tier 2-3 progressively
*   ✅ Loading screen with "Preparing your workspace..." message
*   ✅ Error handling for failed critical sync

---

## 3. Data Flow Diagram

1. **User Change** -> WatermelonDB (`db.write`) -> **Local State UI Update** (Instant)
2. **Background Sync** -> `pushChanges` -> Appwrite Server -> **Snapshot Created on Server**
3. **Remote Change** -> Appwrite Realtime Event -> **Client Received Notification**
4. **Resync** -> `pullChanges` -> WatermelonDB Update -> **UI Refresh via Observables** (Automatic)

---

## 4. Conflict Resolution Strategy
We will implement "Last Write Wins" (LWW) based on the `$updatedAt` field. Since multiple users typically don't edit the same *specific* tire record at the exact same time, this is the most efficient and user-friendly approach for car tire sales.

---

## 5. Step 8: Bug Fixes & Testing (December 25-26, 2024) [IN PROGRESS]

### ✅ Completed (December 25, 2024):
*   ✅ **Comprehensive Test Suite Created**: 50+ test cases covering sync, audit, and integration
*   ✅ **Bug Analysis Complete**: Identified 9 bugs (3 critical, 3 medium, 3 low)
*   ✅ **Critical Bug #1 FIXED**: Audit function now handles both `lastModifiedBy` and `last_modified_by`
*   ✅ **Critical Bug #2 FIXED**: Added error handling to `categorizePullChanges` with validation
*   ✅ **Test Results**: 20/20 tests passing for sync service

### 🔧 TODO for Tomorrow (December 26, 2024):

#### High Priority:
1. **Fix Critical Bug #3: Critical Sync Timestamp Issue**
   - **File**: `utils/syncService.ts:304`
   - **Problem**: Returns `lastPulledAt || 1` which doesn't update timestamp
   - **Solution**: Implement separate timestamp tracking for critical vs. full sync
   - **Code**:
   ```typescript
   // In performCriticalSync, after sync completes:
   import AsyncStorage from '@react-native-async-storage/async-storage';
   
   // Store critical sync timestamp separately
   await AsyncStorage.setItem('lastCriticalSyncAt', Date.now().toString());
   
   // Return the preserved timestamp for WatermelonDB
   return { changes, timestamp: lastPulledAt || 1 };
   ```

2. **Fix Medium Bug #4: Permission Config Version Handling**
   - **File**: `utils/syncService.ts:116-128`
   - **Problem**: Assumes `version` field is always a string
   - **Solution**:
   ```typescript
   if (tableName === 'permission_config') {
       if (rest.version) {
           // Convert to string if it's not already
           mapped.config_version = String(rest.version);
           mapped.version = 1; // Integer version for sync
           // ... rest of code
       } else {
           // No version field - log warning and use defaults
           console.warn('[SyncService] permission_config missing version field:', doc);
           mapped.config_version = '0.0.0';
           mapped.version = 1;
       }
   }
   ```

3. **Fix Medium Bug #5: First Sync Historical Data Overload**
   - **File**: `utils/syncService.ts:511`
   - **Problem**: Uses `1970-01-01` which pulls ALL historical data
   - **Solution**:
   ```typescript
   // For first sync, start from a reasonable date (e.g., 1 year ago)
   const oneYearAgo = new Date();
   oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
   
   const lastPulledDate = timestamp === 0 
       ? oneYearAgo.toISOString() 
       : new Date(timestamp).toISOString();
   
   console.log(`[SyncService] Recursive Pull: Starting from ${lastPulledDate} (${timestamp === 0 ? 'first sync' : 'incremental'})`);
   ```

#### Medium Priority:
4. **Improve Numeric Field Coercion**
   - **File**: `utils/syncService.ts:142-144`
   - **Make it more explicit**:
   ```typescript
   if (mapped.unit_price !== undefined) {
       const parsed = parseFloat(String(mapped.unit_price));
       mapped.unit_price = isNaN(parsed) ? 0 : parsed;
   }
   ```

5. **Add Missing lastModifiedBy Fallback**
   - **File**: `utils/syncService.ts:79+`
   - **Add after field mapping**:
   ```typescript
   // Add fallback for critical fields
   if (!mapped.last_modified_by) {
       mapped.last_modified_by = 'system';
   }
   ```

#### Low Priority (Nice to Have):
6. **Improve Audit Function Logging**
   - **File**: `functions/autonomous-auditing/src/index.js:84-86`
   - **Add warning for missing deviceId**:
   ```javascript
   if (document.deviceId) {
       auditData.deviceId = document.deviceId;
   } else {
       log(`Warning: Document ${document.$id} missing deviceId`);
       auditData.deviceId = 'unknown';
   }
   ```

7. **Add Audit Log Validation**
   - **File**: `functions/autonomous-auditing/src/index.js:90-95`
   - **Validate created document**:
   ```javascript
   const result = await databases.createDocument(...);
   
   // Validate the result
   if (!result.$id || !result.entityId || !result.snapshot) {
       error(`Audit entry created but missing required fields: ${JSON.stringify(result)}`);
       return res.json({ success: false, error: 'Audit entry validation failed' }, 500);
   }
   ```

### 📋 Testing Checklist:
- [ ] Run full test suite: `npm test`
- [ ] Test field mapping bug manually (create record with `last_modified_by`)
- [ ] Test critical sync timestamp (force close app, relaunch)
- [ ] Test permission config with numeric version
- [ ] Test first sync with large dataset
- [ ] Monitor audit logs for completeness

### 📊 Success Metrics:
- All tests passing (50+/50+)
- No sync failures in logs
- Audit logs capture 100% of synced records
- App launch time < 500ms (Tier 1 sync)
- Full sync completes in < 30 seconds

### 📚 Documentation:
- [x] Bug Report: `docs/BUG_REPORT_SYNC_AUDIT.md`
- [x] Test Summary: `docs/TEST_SUITE_SUMMARY.md`
- [x] Test Files: `__tests__/utils/syncService.test.ts`, `__tests__/utils/auditService.test.ts`, `__tests__/integration/syncAuditIntegration.test.ts`

---

## 6. Next Steps After Bug Fixes

### Performance Optimization:
- Add metrics tracking (sync duration, record counts, error rates)
- Implement retry logic for failed syncs
- Add sync health dashboard

### Monitoring:
- Set up alerts for sync failures
- Track audit log completeness
- Monitor memory usage during sync

### Long-term Improvements:
- Implement audit log cleanup (archive >1 year old)
- Add schema validation for documents
- Create unified field mapping layer
- Add performance tests with 1000+ records

