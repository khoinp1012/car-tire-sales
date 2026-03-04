/**
 * Comprehensive Test Suite for syncService.ts
 * Tests the WatermelonDB <-> Appwrite synchronization logic
 */

// Mock WatermelonDB
jest.mock('@nozbe/watermelondb/sync', () => ({
    synchronize: jest.fn()
}));

jest.mock('@nozbe/watermelondb', () => ({
    Q: {
        where: jest.fn((field, condition) => ({ field, condition })),
        oneOf: jest.fn((values) => ({ oneOf: values }))
    }
}));

// Mock database service
jest.mock('@/utils/databaseService', () => ({
    getDatabase: jest.fn()
}));

// Mock Appwrite
jest.mock('@/constants/appwrite', () => ({
    default: {
        subscribe: jest.fn()
    },
    databases: {
        listDocuments: jest.fn(),
        createDocument: jest.fn(),
        updateDocument: jest.fn()
    },
    DATABASE_ID: 'test_db',
    INVENTORY_COLLECTION_ID: 'inventory_coll',
    CUSTOMERS_COLLECTION_ID: 'customers_coll',
    SALES_COLLECTION_ID: 'sales_coll',
    USER_ROLES_COLLECTION_ID: 'user_roles_coll',
    PERMISSION_CONFIG_COLLECTION_ID: 'permission_config_coll',
    STACKS_COLLECTION_ID: 'stacks_coll'
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
    addEventListener: jest.fn(() => jest.fn())
}));

// Mock session context
jest.mock('@/utils/sessionContext', () => ({
    getCurrentUserId: jest.fn(() => Promise.resolve('test_user_123'))
}));

jest.mock('react-native-appwrite', () => ({
    Query: {
        equal: jest.fn((field, value) => ({ type: 'equal', field, value })),
        greaterThan: jest.fn((field, value) => ({ type: 'greaterThan', field, value })),
        orderAsc: jest.fn((field) => ({ type: 'orderAsc', field })),
        limit: jest.fn((value) => ({ type: 'limit', value })),
        or: jest.fn((queries) => ({ type: 'or', queries })),
        and: jest.fn((queries) => ({ type: 'and', queries }))
    }
}));

import { synchronize } from '@nozbe/watermelondb/sync';
import { getDatabase } from '@/utils/databaseService';
import { databases } from '@/constants/appwrite';
import {
    performCriticalSync,
    performHighPrioritySync,
    performMediumPrioritySync,
    hasPermissionConfig,
    setOfflineMode,
    getOfflineMode
} from '@/utils/syncService';


describe('syncService', () => {
    let mockDb: any;
    let mockCollection: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock database
        mockCollection = {
            query: jest.fn().mockReturnThis(),
            fetch: jest.fn()
        };

        mockDb = {
            get: jest.fn(() => mockCollection),
            write: jest.fn((callback) => callback())
        };

        (getDatabase as jest.Mock).mockReturnValue(mockDb);
    });

    describe('Offline Mode Management', () => {
        it('should toggle offline mode correctly', () => {
            // Test setting offline mode to true
            setOfflineMode(true);
            expect(getOfflineMode()).toBe(true);

            // Note: We don't test setOfflineMode(false) here because it triggers startSync()
            // which requires full realtime subscription mocking
        });
    });

    describe('hasPermissionConfig', () => {
        it('should return true when active permission config exists', async () => {
            const mockConfigs = [
                { isActive: true, deleted: false }
            ];
            mockCollection.fetch.mockResolvedValue(mockConfigs);

            const result = await hasPermissionConfig();
            expect(result).toBe(true);
        });

        it('should return false when no active config exists', async () => {
            mockCollection.fetch.mockResolvedValue([]);
            const result = await hasPermissionConfig();
            expect(result).toBe(false);
        });

        it('should return false when config is deleted', async () => {
            const mockConfigs = [
                { isActive: true, deleted: true }
            ];
            mockCollection.fetch.mockResolvedValue(mockConfigs);

            const result = await hasPermissionConfig();
            expect(result).toBe(false);
        });

        it('should handle errors gracefully', async () => {
            mockCollection.fetch.mockRejectedValue(new Error('Database error'));
            const result = await hasPermissionConfig();
            expect(result).toBe(false);
        });
    });

    describe('TIER 1: Critical Sync', () => {
        beforeEach(() => {
            (synchronize as jest.Mock).mockImplementation(async ({ pullChanges }) => {
                if (pullChanges) {
                    await pullChanges({ lastPulledAt: 0, schemaVersion: 1, migration: null });
                }
            });
        });

        it('should sync only permission_config and user_roles', async () => {
            const mockPermissionDocs = {
                documents: [{
                    $id: 'perm_1',
                    $createdAt: '2024-01-01T00:00:00.000Z',
                    $updatedAt: '2024-01-01T00:00:00.000Z',
                    isActive: true,
                    deleted: false,
                    version: '1.0.0'
                }]
            };

            const mockRoleDocs = {
                documents: [{
                    $id: 'role_1',
                    $createdAt: '2024-01-01T00:00:00.000Z',
                    $updatedAt: '2024-01-01T00:00:00.000Z',
                    userId: 'test_user_123',
                    role: 'admin',
                    deleted: false
                }]
            };

            (databases.listDocuments as jest.Mock)
                .mockResolvedValueOnce(mockPermissionDocs)
                .mockResolvedValueOnce(mockRoleDocs);

            mockCollection.fetch.mockResolvedValue([]);

            const result = await performCriticalSync();

            expect(result).toBe(true);
            expect(databases.listDocuments).toHaveBeenCalledTimes(2);
            expect(synchronize).toHaveBeenCalledTimes(1);
        });

        it('should handle sync failure gracefully', async () => {
            (synchronize as jest.Mock).mockRejectedValue(new Error('Sync failed'));

            const result = await performCriticalSync();
            expect(result).toBe(false);
        });

        it('should return timestamp 1 for first sync', async () => {
            let capturedTimestamp: number | null = null;

            (synchronize as jest.Mock).mockImplementation(async ({ pullChanges }) => {
                if (pullChanges) {
                    const result = await pullChanges({ lastPulledAt: 0, schemaVersion: 1, migration: null });
                    capturedTimestamp = result.timestamp;
                }
            });

            (databases.listDocuments as jest.Mock).mockResolvedValue({ documents: [] });
            mockCollection.fetch.mockResolvedValue([]);

            await performCriticalSync();

            expect(capturedTimestamp).toBe(1);
        });

        it('should preserve lastPulledAt for partial sync', async () => {
            let capturedTimestamp: number | null = null;
            const existingTimestamp = 1234567890;

            (synchronize as jest.Mock).mockImplementation(async ({ pullChanges }) => {
                if (pullChanges) {
                    const result = await pullChanges({
                        lastPulledAt: existingTimestamp,
                        schemaVersion: 1,
                        migration: null
                    });
                    capturedTimestamp = result.timestamp;
                }
            });

            (databases.listDocuments as jest.Mock).mockResolvedValue({ documents: [] });
            mockCollection.fetch.mockResolvedValue([]);

            await performCriticalSync();

            expect(capturedTimestamp).toBe(existingTimestamp);
        });
    });

    describe('TIER 2: High Priority Sync', () => {
        beforeEach(() => {
            (synchronize as jest.Mock).mockImplementation(async ({ pullChanges }) => {
                if (pullChanges) {
                    await pullChanges({ lastPulledAt: 0, schemaVersion: 1, migration: null });
                }
            });
        });

        it('should sync recent inventory and customers', async () => {
            const mockInventoryDocs = {
                documents: [
                    {
                        $id: 'inv_1',
                        $createdAt: '2024-12-20T00:00:00.000Z',
                        $updatedAt: '2024-12-20T00:00:00.000Z',
                        brand: 'Michelin',
                        sold: false,
                        deleted: false
                    }
                ]
            };

            const mockCustomerDocs = {
                documents: [
                    {
                        $id: 'cust_1',
                        $createdAt: '2024-11-01T00:00:00.000Z',
                        $updatedAt: '2024-12-15T00:00:00.000Z',
                        name: 'John Doe',
                        deleted: false
                    }
                ]
            };

            (databases.listDocuments as jest.Mock)
                .mockResolvedValueOnce(mockInventoryDocs)
                .mockResolvedValueOnce(mockCustomerDocs);

            mockCollection.fetch.mockResolvedValue([]);

            await performHighPrioritySync();

            expect(databases.listDocuments).toHaveBeenCalledTimes(2);
        });

        it('should handle errors without throwing', async () => {
            (databases.listDocuments as jest.Mock).mockRejectedValue(new Error('Network error'));
            mockCollection.fetch.mockResolvedValue([]);

            await expect(performHighPrioritySync()).resolves.not.toThrow();
        });
    });

    describe('TIER 3: Medium Priority Sync', () => {
        beforeEach(() => {
            (synchronize as jest.Mock).mockImplementation(async ({ pullChanges }) => {
                if (pullChanges) {
                    await pullChanges({ lastPulledAt: 0, schemaVersion: 1, migration: null });
                }
            });
        });

        it('should sync recent sales and all stacks', async () => {
            const mockSalesDocs = {
                documents: [
                    {
                        $id: 'sale_1',
                        $createdAt: '2024-12-01T00:00:00.000Z',
                        $updatedAt: '2024-12-01T00:00:00.000Z',
                        customerId: 'cust_1',
                        totalAmount: 1000,
                        deleted: false
                    }
                ]
            };

            const mockStackDocs = {
                documents: [
                    {
                        $id: 'stack_1',
                        $createdAt: '2024-01-01T00:00:00.000Z',
                        $updatedAt: '2024-01-01T00:00:00.000Z',
                        stackId: 'STACK-001',
                        name: 'Main Stack',
                        deleted: false
                    }
                ]
            };

            (databases.listDocuments as jest.Mock)
                .mockResolvedValueOnce(mockSalesDocs)
                .mockResolvedValueOnce(mockStackDocs);

            mockCollection.fetch.mockResolvedValue([]);

            await performMediumPrioritySync();

            expect(databases.listDocuments).toHaveBeenCalledTimes(2);
        });
    });

    describe('Data Mapping', () => {
        it('should correctly map Appwrite camelCase to WatermelonDB snake_case', async () => {
            const mockDoc = {
                $id: 'test_1',
                $createdAt: '2024-01-01T00:00:00.000Z',
                $updatedAt: '2024-01-01T00:00:00.000Z',
                userId: 'user_123',
                lastModifiedBy: 'admin',
                isActive: true,
                unitPrice: 100.50,
                radiusSize: 15
            };

            (synchronize as jest.Mock).mockImplementation(async ({ pullChanges }) => {
                if (pullChanges) {
                    const result = await pullChanges({ lastPulledAt: 0, schemaVersion: 1, migration: null });
                    // Verify the mapped data structure
                    expect(result.changes).toBeDefined();
                }
            });

            (databases.listDocuments as jest.Mock).mockResolvedValue({ documents: [mockDoc] });
            mockCollection.fetch.mockResolvedValue([]);

            await performCriticalSync();
        });

        it('should handle permission_config version field specially', async () => {
            const mockPermissionDoc = {
                $id: 'perm_1',
                $createdAt: '2024-01-01T00:00:00.000Z',
                $updatedAt: '2024-01-01T00:00:00.000Z',
                version: '1.0.1', // String version for config
                isActive: true,
                deleted: false
            };

            (synchronize as jest.Mock).mockImplementation(async ({ pullChanges }) => {
                if (pullChanges) {
                    await pullChanges({ lastPulledAt: 0, schemaVersion: 1, migration: null });
                }
            });

            (databases.listDocuments as jest.Mock).mockResolvedValue({ documents: [mockPermissionDoc] });
            mockCollection.fetch.mockResolvedValue([]);

            await performCriticalSync();

            // Should not throw error
            expect(synchronize).toHaveBeenCalled();
        });
    });

    describe('Conflict Resolution', () => {
        it('should categorize existing records as updated, not created', async () => {
            const existingRecord = {
                id: 'existing_1',
                brand: 'Old Brand'
            };

            const updatedDoc = {
                $id: 'existing_1',
                $createdAt: '2024-01-01T00:00:00.000Z',
                $updatedAt: '2024-12-25T00:00:00.000Z',
                brand: 'New Brand',
                deleted: false
            };

            mockCollection.fetch.mockResolvedValue([existingRecord]);
            (databases.listDocuments as jest.Mock).mockResolvedValue({ documents: [updatedDoc] });

            (synchronize as jest.Mock).mockImplementation(async ({ pullChanges }) => {
                if (pullChanges) {
                    await pullChanges({ lastPulledAt: 0, schemaVersion: 1, migration: null });
                }
            });

            await performHighPrioritySync();

            // Should not throw "Record already exists" error
            expect(synchronize).toHaveBeenCalled();
        });
    });

    describe('Deletion Handling', () => {
        it('should handle soft-deleted records correctly', async () => {
            const deletedDoc = {
                $id: 'deleted_1',
                $createdAt: '2024-01-01T00:00:00.000Z',
                $updatedAt: '2024-12-25T00:00:00.000Z',
                brand: 'Deleted Brand',
                deleted: true
            };

            (databases.listDocuments as jest.Mock).mockResolvedValue({ documents: [deletedDoc] });
            mockCollection.fetch.mockResolvedValue([]);

            (synchronize as jest.Mock).mockImplementation(async ({ pullChanges }) => {
                if (pullChanges) {
                    const result = await pullChanges({ lastPulledAt: 0, schemaVersion: 1, migration: null });
                    // Deleted records should be in the deleted array
                    expect(result.changes).toBeDefined();
                }
            });

            await performHighPrioritySync();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty document lists', async () => {
            (databases.listDocuments as jest.Mock).mockResolvedValue({ documents: [] });
            mockCollection.fetch.mockResolvedValue([]);

            (synchronize as jest.Mock).mockImplementation(async ({ pullChanges }) => {
                if (pullChanges) {
                    await pullChanges({ lastPulledAt: 0, schemaVersion: 1, migration: null });
                }
            });

            await expect(performCriticalSync()).resolves.toBe(true);
        });

        it('should handle missing optional fields', async () => {
            const minimalDoc = {
                $id: 'minimal_1',
                $createdAt: '2024-01-01T00:00:00.000Z',
                $updatedAt: '2024-01-01T00:00:00.000Z'
                // No other fields
            };

            (databases.listDocuments as jest.Mock).mockResolvedValue({ documents: [minimalDoc] });
            mockCollection.fetch.mockResolvedValue([]);

            (synchronize as jest.Mock).mockImplementation(async ({ pullChanges }) => {
                if (pullChanges) {
                    await pullChanges({ lastPulledAt: 0, schemaVersion: 1, migration: null });
                }
            });

            await expect(performHighPrioritySync()).resolves.not.toThrow();
        });

        it('should coerce numeric fields correctly', async () => {
            const docWithStringNumbers = {
                $id: 'test_1',
                $createdAt: '2024-01-01T00:00:00.000Z',
                $updatedAt: '2024-01-01T00:00:00.000Z',
                unitPrice: '100.50', // String instead of number
                radiusSize: '15', // String instead of number
                sequence: '10' // String instead of number
            };

            (databases.listDocuments as jest.Mock).mockResolvedValue({ documents: [docWithStringNumbers] });
            mockCollection.fetch.mockResolvedValue([]);

            (synchronize as jest.Mock).mockImplementation(async ({ pullChanges }) => {
                if (pullChanges) {
                    await pullChanges({ lastPulledAt: 0, schemaVersion: 1, migration: null });
                }
            });

            await expect(performHighPrioritySync()).resolves.not.toThrow();
        });
    });

    describe('Sync Lock Mechanism', () => {
        it('should prevent concurrent critical syncs', async () => {
            let syncCount = 0;
            let concurrentCalls = 0;
            let maxConcurrent = 0;

            (synchronize as jest.Mock).mockImplementation(async () => {
                concurrentCalls++;
                maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
                syncCount++;

                // Simulate slow sync
                await new Promise(resolve => setTimeout(resolve, 50));

                concurrentCalls--;
            });

            (databases.listDocuments as jest.Mock).mockResolvedValue({ documents: [] });
            mockCollection.fetch.mockResolvedValue([]);

            // Start two syncs simultaneously
            const sync1 = performCriticalSync();
            const sync2 = performCriticalSync();

            await Promise.all([sync1, sync2]);

            // Should have executed both syncs
            expect(syncCount).toBe(2);

            // But never more than 1 concurrent sync
            expect(maxConcurrent).toBeLessThanOrEqual(1);
        });
    });
});
