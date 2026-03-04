jest.mock('@/constants/appwrite', () => ({
    databases: {
        listDocuments: jest.fn(),
        createDocument: jest.fn(),
        updateDocument: jest.fn(),
        deleteDocument: jest.fn(),
    },
    functions: {
        createExecution: jest.fn(),
    },
    account: {
        get: jest.fn(),
    },
    DATABASE_ID: 'test_db',
    USER_ROLES_COLLECTION_ID: 'test_roles_collection',
    PERMISSION_CONFIG_COLLECTION_ID: 'permission_config',
    ID: {
        unique: () => 'unique_id',
    },
}));

jest.mock('react-native-appwrite', () => ({
    Query: {
        equal: (field: string, value: any) => `equal(${field}, ${value})`,
        orderDesc: (field: string) => `orderDesc(${field})`,
        limit: (value: number) => `limit(${value})`,
    },
    Permission: {
        read: (role: string) => `read(${role})`,
        update: (role: string) => `update(${role})`,
        delete: (role: string) => `delete(${role})`,
    },
    Role: {
        label: (label: string) => `label:${label}`,
        user: (userId: string) => `user:${userId}`,
    }
}));

// Mock Database Service
jest.mock('@/utils/databaseService', () => ({
    getDatabase: jest.fn(),
}));

// Mock User Role Service
jest.mock('@/utils/userRoleService', () => ({
    getUserRole: jest.fn(),
}));

import {
    getActivePermissionConfig,
    getUserPermissionContext,
    canAccessCollection,
    canAccessRoute,
    hasFeature,
    generateDocumentPermissions
} from '@/utils/permissionService';
import { getDatabase } from '@/utils/databaseService';
import { getUserRole } from '@/utils/userRoleService';
import { PermissionConfig } from '@/types/permissions';

const mockConfig: PermissionConfig = {
    version: '1.0.0',
    isActive: true,
    roles: {
        admin: {
            id: 'admin',
            displayName: 'Admin',
            hierarchy: 100,
            inheritsFrom: ['inventory_manager'],
            permissions: {
                collections: {
                    user_roles: ['read', 'create', 'update', 'delete']
                },
                routes: ['*'],
                features: ['admin_panel']
            }
        },
        inventory_manager: {
            id: 'inventory_manager',
            displayName: 'Inventory Manager',
            hierarchy: 50,
            inheritsFrom: ['seller'],
            permissions: {
                collections: {
                    inventory: ['read', 'create', 'update', 'delete']
                },
                routes: ['inventory_list', 'inventory_form'],
                features: ['export_excel']
            }
        },
        seller: {
            id: 'seller',
            displayName: 'Seller',
            hierarchy: 10,
            inheritsFrom: [],
            permissions: {
                collections: {
                    sales: ['read', 'create'],
                    customers: ['read', 'create', 'update']
                },
                routes: ['sales_list', 'customer_list'],
                features: []
            }
        }
    },
    collectionPermissions: {
        inventory: {
            read: ['admin', 'inventory_manager', 'seller'],
            create: ['admin', 'inventory_manager'],
            update: ['admin', 'inventory_manager'],
            delete: ['admin']
        }
    },
    rowPermissions: []
};

describe('permissionService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getActivePermissionConfig', () => {
        it('should return parsed config from database', async () => {
            const mockRecord = {
                configVersion: '1.0.0',
                isActive: true,
                roles: JSON.stringify(mockConfig.roles),
                collectionPermissions: JSON.stringify(mockConfig.collectionPermissions),
                rowPermissions: JSON.stringify([]),
                createdAt: { build: () => { }, toISOString: () => new Date().toISOString() },
                updatedAt: { build: () => { }, toISOString: () => new Date().toISOString() },
            };

            const mockQuery = {
                fetch: jest.fn().mockResolvedValue([mockRecord]),
            };

            const mockCollection = {
                query: jest.fn().mockReturnValue(mockQuery),
            };

            const mockDb = {
                get: jest.fn().mockReturnValue(mockCollection),
            };

            (getDatabase as jest.Mock).mockReturnValue(mockDb);

            const config = await getActivePermissionConfig();
            expect(config?.version).toBe('1.0.0');
            expect(config?.roles.admin.id).toBe('admin');
        });

        it('should return null if no active config found', async () => {
            const mockQuery = {
                fetch: jest.fn().mockResolvedValue([]),
            };

            const mockCollection = {
                query: jest.fn().mockReturnValue(mockQuery),
            };

            const mockDb = {
                get: jest.fn().mockReturnValue(mockCollection),
            };

            (getDatabase as jest.Mock).mockReturnValue(mockDb);

            const config = await getActivePermissionConfig();
            expect(config).toBeNull();
        });
    });

    describe('getUserPermissionContext', () => {
        it('should build context with inherited permissions', async () => {
            const mockRecord = {
                configVersion: '1.0.0',
                isActive: true,
                roles: JSON.stringify(mockConfig.roles),
                collectionPermissions: JSON.stringify(mockConfig.collectionPermissions),
                rowPermissions: JSON.stringify([]),
                createdAt: { build: () => { }, toISOString: () => new Date().toISOString() },
                updatedAt: { build: () => { }, toISOString: () => new Date().toISOString() },
            };

            const mockQuery = {
                fetch: jest.fn().mockResolvedValue([mockRecord]),
            };

            const mockCollection = {
                query: jest.fn().mockReturnValue(mockQuery),
            };

            const mockDb = {
                get: jest.fn().mockReturnValue(mockCollection),
            };

            (getDatabase as jest.Mock).mockReturnValue(mockDb);
            (getUserRole as jest.Mock).mockResolvedValue('inventory_manager');

            const context = await getUserPermissionContext('user123');

            expect(context?.role).toBe('inventory_manager');
            // Check inheritance (inventory_manager inherits from seller)
            expect(context?.allowedCollections.sales).toContain('read'); // From seller
            expect(context?.allowedCollections.inventory).toContain('create'); // From inventory_manager
            expect(context?.allowedRoutes).toContain('sales_list'); // From seller
            expect(context?.allowedRoutes).toContain('inventory_list'); // From inventory_manager
            expect(context?.features).toContain('export_excel'); // From inventory_manager
        });
    });

    describe('canAccessCollection', () => {
        it('should allow access if role has permission', async () => {
            const mockRecord = {
                roles: JSON.stringify(mockConfig.roles),
                collectionPermissions: JSON.stringify(mockConfig.collectionPermissions),
                rowPermissions: JSON.stringify([]),
                isActive: true,
                configVersion: '1.0.0',
                createdAt: { build: () => { }, toISOString: () => new Date().toISOString() },
                updatedAt: { build: () => { }, toISOString: () => new Date().toISOString() },
            };

            const mockQuery = {
                fetch: jest.fn().mockResolvedValue([mockRecord]),
            };

            const mockCollection = {
                query: jest.fn().mockReturnValue(mockQuery),
            };

            const mockDb = {
                get: jest.fn().mockReturnValue(mockCollection),
            };

            (getDatabase as jest.Mock).mockReturnValue(mockDb);
            (getUserRole as jest.Mock).mockResolvedValue('seller');

            const result = await canAccessCollection('user123', 'sales' as any, 'read');
            expect(result.allowed).toBe(true);
        });

        it('should deny access if role lacks permission', async () => {
            const mockRecord = {
                roles: JSON.stringify(mockConfig.roles),
                collectionPermissions: JSON.stringify(mockConfig.collectionPermissions),
                rowPermissions: JSON.stringify([]),
                isActive: true,
                configVersion: '1.0.0',
                createdAt: { build: () => { }, toISOString: () => new Date().toISOString() },
                updatedAt: { build: () => { }, toISOString: () => new Date().toISOString() },
            };

            const mockQuery = {
                fetch: jest.fn().mockResolvedValue([mockRecord]),
            };

            const mockCollection = {
                query: jest.fn().mockReturnValue(mockQuery),
            };

            const mockDb = {
                get: jest.fn().mockReturnValue(mockCollection),
            };

            (getDatabase as jest.Mock).mockReturnValue(mockDb);
            (getUserRole as jest.Mock).mockResolvedValue('seller');

            const result = await canAccessCollection('user123', 'inventory' as any, 'delete');
            expect(result.allowed).toBe(false);
        });
    });

    describe('canAccessRoute', () => {
        it('should allow access for wildcard routes', async () => {
            const mockRecord = {
                roles: JSON.stringify(mockConfig.roles),
                collectionPermissions: JSON.stringify(mockConfig.collectionPermissions),
                rowPermissions: JSON.stringify([]),
                isActive: true,
                configVersion: '1.0.0',
                createdAt: { build: () => { }, toISOString: () => new Date().toISOString() },
                updatedAt: { build: () => { }, toISOString: () => new Date().toISOString() },
            };

            const mockQuery = {
                fetch: jest.fn().mockResolvedValue([mockRecord]),
            };

            const mockCollection = {
                query: jest.fn().mockReturnValue(mockQuery),
            };

            const mockDb = {
                get: jest.fn().mockReturnValue(mockCollection),
            };

            (getDatabase as jest.Mock).mockReturnValue(mockDb);
            (getUserRole as jest.Mock).mockResolvedValue('admin');

            const allowed = await canAccessRoute('user123', 'any_random_route');
            expect(allowed).toBe(true);
        });
    });

    describe('generateDocumentPermissions', () => {
        it('should generate correct Appwrite permission strings', async () => {
            const mockRecord = {
                roles: JSON.stringify(mockConfig.roles),
                collectionPermissions: JSON.stringify(mockConfig.collectionPermissions),
                rowPermissions: JSON.stringify([]),
                isActive: true,
                configVersion: '1.0.0',
                createdAt: { build: () => { }, toISOString: () => new Date().toISOString() },
                updatedAt: { build: () => { }, toISOString: () => new Date().toISOString() },
            };

            const mockQuery = {
                fetch: jest.fn().mockResolvedValue([mockRecord]),
            };

            const mockCollection = {
                query: jest.fn().mockReturnValue(mockQuery),
            };

            const mockDb = {
                get: jest.fn().mockReturnValue(mockCollection),
            };

            (getDatabase as jest.Mock).mockReturnValue(mockDb);

            const perms = await generateDocumentPermissions('inventory' as any, 'owner123');

            // Should have permissions for admin (read, update, delete)
            expect(perms).toContain('read(label:role:admin)');
            expect(perms).toContain('update(label:role:admin)');
            expect(perms).toContain('delete(label:role:admin)');

            // Should have permissions for seller (read only)
            expect(perms).toContain('read(label:role:seller)');
            expect(perms).not.toContain('update(label:role:seller)');

            // Should have owner permissions
            expect(perms).toContain('read(user:owner123)');
            expect(perms).toContain('update(user:owner123)');
            expect(perms).toContain('delete(user:owner123)');
        });
    });
});
