jest.mock('@/constants/appwrite', () => ({
    databases: {
        listDocuments: jest.fn(),
        createDocument: jest.fn(),
        updateDocument: jest.fn(),
        deleteDocument: jest.fn(),
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
    },
}));

// Mock Database Service
jest.mock('@/utils/databaseService', () => ({
    getDatabase: jest.fn(),
}));

import { getUserRole, setUserRole, initializeUserRecord, getAllAvailableRoles } from '@/utils/userRoleService';
import { getDatabase } from '@/utils/databaseService';
import { account } from '@/constants/appwrite';

describe('userRoleService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getUserRole', () => {
        it('should return role when user has a role document', async () => {
            const mockRecord = {
                role: 'admin',
                deleted: false,
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

            const role = await getUserRole('user123');
            expect(role).toBe('admin');
        });

        it('should return null when user has no role document', async () => {
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

            const role = await getUserRole('user123');
            expect(role).toBeNull();
        });
    });

    describe('setUserRole', () => {
        it('should update existing role document', async () => {
            (account.get as jest.Mock).mockResolvedValue({ $id: 'user123', name: 'Test User', email: 'test@example.com' });

            const mockRecord = {
                role: 'seller',
                update: jest.fn().mockImplementation((fn) => {
                    const rec = { role: '', name: '', email: '', version: 0, lastModifiedBy: '' };
                    fn(rec);
                    return Promise.resolve(rec);
                }),
            };

            const mockQuery = {
                fetch: jest.fn().mockResolvedValue([mockRecord]),
            };

            const mockCollection = {
                query: jest.fn().mockReturnValue(mockQuery),
            };

            const mockDb = {
                get: jest.fn().mockReturnValue(mockCollection),
                write: jest.fn().mockImplementation((fn) => fn()),
            };

            (getDatabase as jest.Mock).mockReturnValue(mockDb);

            const result = await setUserRole('user123', 'admin');
            expect(result).toBe(true);
            expect(mockRecord.update).toHaveBeenCalled();
        });

        it('should create new role document if none exists', async () => {
            (account.get as jest.Mock).mockResolvedValue({ $id: 'user123', name: 'New User', email: 'new@example.com' });

            const mockQuery = {
                fetch: jest.fn().mockResolvedValue([]),
            };



            const mockCollection = {
                query: jest.fn().mockReturnValue(mockQuery),
                create: jest.fn().mockImplementation((fn) => {
                    const rec = {};
                    fn(rec);
                    return Promise.resolve(rec);
                }),
            };

            const mockDb = {
                get: jest.fn().mockReturnValue(mockCollection),
                write: jest.fn().mockImplementation((fn) => fn()),
            };

            (getDatabase as jest.Mock).mockReturnValue(mockDb);

            const result = await setUserRole('user123', 'seller');
            expect(result).toBe(true);
            expect(mockCollection.create).toHaveBeenCalled();
        });
    });

    describe('initializeUserRecord', () => {
        it('should do nothing if record already exists', async () => {
            const mockQuery = {
                fetch: jest.fn().mockResolvedValue([{ $id: 'doc123', role: 'seller' }]),
            };

            const mockCollection = {
                query: jest.fn().mockReturnValue(mockQuery),
                create: jest.fn(),
            };

            const mockDb = {
                get: jest.fn().mockReturnValue(mockCollection),
                write: jest.fn(),
            };

            (getDatabase as jest.Mock).mockReturnValue(mockDb);

            await initializeUserRecord('user123');
            expect(mockDb.write).not.toHaveBeenCalled();
        });

        it('should create new record with blank role if none exists', async () => {
            (account.get as jest.Mock).mockResolvedValue({ $id: 'user123', name: 'New User', email: 'new@example.com' });

            const mockQuery = {
                fetch: jest.fn().mockResolvedValue([]),
            };

            const mockCollection = {
                query: jest.fn().mockReturnValue(mockQuery),
                create: jest.fn().mockImplementation((fn) => {
                    const rec = {};
                    fn(rec);
                    return Promise.resolve(rec);
                }),
            };

            const mockDb = {
                get: jest.fn().mockReturnValue(mockCollection),
                write: jest.fn().mockImplementation((fn) => fn()),
            };

            (getDatabase as jest.Mock).mockReturnValue(mockDb);

            await initializeUserRecord('user123');
            expect(mockCollection.create).toHaveBeenCalled();
        });
    });

    describe('getAllAvailableRoles', () => {
        it('should return list of roles with translations', () => {
            const roles = getAllAvailableRoles();
            expect(roles).toHaveLength(3);
            expect(roles.map(r => r.id)).toContain('admin');
            expect(roles.map(r => r.id)).toContain('inventory_manager');
            expect(roles.map(r => r.id)).toContain('seller');
            expect(roles.every(r => r.name.length > 0)).toBe(true);
        });
    });
});
