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

import { getUserRole, setUserRole, initializeUserRecord, getAllAvailableRoles } from '@/utils/userRoleService';
import { databases, account } from '@/constants/appwrite';

describe('userRoleService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getUserRole', () => {
        it('should return role when user has a role document', async () => {
            (databases.listDocuments as jest.Mock).mockResolvedValueOnce({
                documents: [{ role: 'admin' }]
            });

            const role = await getUserRole('user123');
            expect(role).toBe('admin');
            expect(databases.listDocuments).toHaveBeenCalled();
        });

        it('should return null when user has no role document', async () => {
            (databases.listDocuments as jest.Mock).mockResolvedValueOnce({
                documents: []
            });

            const role = await getUserRole('user123');
            expect(role).toBeNull();
        });

        it('should return null and log error on failure', async () => {
            (databases.listDocuments as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const role = await getUserRole('user123');
            expect(role).toBeNull();
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('setUserRole', () => {
        it('should update existing role document', async () => {
            (account.get as jest.Mock).mockResolvedValue({ $id: 'user123', name: 'Test User', email: 'test@example.com' });
            (databases.listDocuments as jest.Mock).mockResolvedValueOnce({
                documents: [{ $id: 'doc123', role: 'seller' }]
            });
            (databases.updateDocument as jest.Mock).mockResolvedValueOnce({});

            const result = await setUserRole('user123', 'admin');
            expect(result).toBe(true);
            expect(databases.updateDocument).toHaveBeenCalledWith(
                'test_db',
                'test_roles_collection',
                'doc123',
                expect.objectContaining({ role: 'admin', name: 'Test User' })
            );
        });

        it('should create new role document if none exists', async () => {
            (account.get as jest.Mock).mockResolvedValue({ $id: 'user123', name: 'New User', email: 'new@example.com' });
            (databases.listDocuments as jest.Mock).mockResolvedValueOnce({
                documents: []
            });
            (databases.createDocument as jest.Mock).mockResolvedValueOnce({});

            const result = await setUserRole('user123', 'seller');
            expect(result).toBe(true);
            expect(databases.createDocument).toHaveBeenCalledWith(
                'test_db',
                'test_roles_collection',
                'unique_id',
                expect.objectContaining({ userId: 'user123', role: 'seller', name: 'New User' })
            );
        });
    });

    describe('initializeUserRecord', () => {
        it('should do nothing if record already exists', async () => {
            (databases.listDocuments as jest.Mock).mockResolvedValueOnce({
                documents: [{ $id: 'doc123' }]
            });

            await initializeUserRecord('user123');
            expect(databases.createDocument).not.toHaveBeenCalled();
        });

        it('should create new record with blank role if none exists', async () => {
            (databases.listDocuments as jest.Mock).mockResolvedValueOnce({
                documents: []
            });
            (account.get as jest.Mock).mockResolvedValue({ $id: 'user123', name: 'New User', email: 'new@example.com' });
            (databases.createDocument as jest.Mock).mockResolvedValueOnce({});

            await initializeUserRecord('user123');
            expect(databases.createDocument).toHaveBeenCalledWith(
                'test_db',
                'test_roles_collection',
                'unique_id',
                expect.objectContaining({ userId: 'user123', role: '', name: 'New User' })
            );
        });
    });

    describe('getAllAvailableRoles', () => {
        it('should return list of roles with translations', () => {
            const roles = getAllAvailableRoles();
            expect(roles).toHaveLength(3);
            expect(roles.map(r => r.id)).toContain('admin');
            expect(roles.map(r => r.id)).toContain('inventory_manager');
            expect(roles.map(r => r.id)).toContain('seller');
            // Names should be translated (Vietnamese by default in test environment)
            expect(roles.every(r => r.name.length > 0)).toBe(true);
        });
    });
});
