# Architecture: Unified NoSQL Audit & Sync System

This document outlines the implementation of a robust, offline-first audit system using **RxDB** as a client-side mirror of **Appwrite**.

## 1. Core Principles
- **NoSQL Snapshot as Single Source of Truth**: All changes are recorded as full JSON snapshots.
- **Client-Side Mirroring**: RxDB mirrors Appwrite collections locally for offline availability and consistent logic.
- **Scalar Versioning**: Every document has a `version` (Integer) to track changes chronologically across devices.
- **Middle Function Logic**: A centralized hook-based system that captures data *before* it is persisted.

## 2. Technical Stack
- **Client DB**: RxDB (Reactive Database).
- **Storage**: Dexie (via `rxdb/plugins/storage-dexie`).
- **Sync Engine**: `rxdb-appwrite` replication plugin.
- **Backend**: Appwrite (Database + Functions).

## 3. Data Schema Enhancements

### All Syncable Collections
Every document in primary collections (Inventory, Customers, Stacks) must include:
- `version`: (INT) Incremented on every change.
- `deleted`: (BOOL) Used for soft-deletion (RxDB synchronization requirement).
- `lastModifiedBy`: (STRING) User ID.

### Audit Collection (`audit_logs`)
- `entityId`: (STRING) ID of the target document.
- `entityType`: (STRING) Name of the collection.
- `version`: (INT) Version of the document at snapshot time.
- `action`: (STRING) `CREATE` | `UPDATE` | `DELETE`.
- `snapshot`: (STRING/TEXT) `JSON.stringify` of the document state.
- `userId`: (STRING) Maker of the change.
- `timestamp`: (DATETIME) Creation time.
- `deviceId`: (STRING) Source device identification.

## 4. Implementation Roadmap

### Phase 1: Infrastructure & Dependencies (COMPLETED)
- [x] Install libraries and initialize RxDB provider.
- [x] Setup Appwrite `audit_logs` collection and updated schemas.

### Phase 2: The "Middle Function" (Hooks) (COMPLETED)
- [x] Implement RxDB `preSave` / `preInsert` hooks.
- [x] Logic for automatic `version` incrementing.
- [x] Logic for automatic Snapshot generation and insertion into `audit_logs`.

### Phase 3: Service Layer Migration
- [ ] Refactor `inventoryService.ts` to use RxDB instead of direct Appwrite calls.
- [ ] Implement RxDB-Appwrite replication (The "Sync Engine").

### Phase 4: Backend Integrity (Protection)
- [ ] Implement Appwrite Function (Event-Triggered).
- [ ] Logic: If DB change detected without a client-side audit log, generate a server-side snapshot.

### Phase 5: UI & Version Control
- [ ] Create History View UI (Replaying snapshots).
- [ ] Implement Conflict Resolution strategy (Version-based).
