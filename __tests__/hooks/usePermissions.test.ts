jest.mock('@/constants/appwrite', () => ({
    account: {
        get: jest.fn(),
    },
    databases: {
        listDocuments: jest.fn(),
        createDocument: jest.fn(),
        updateDocument: jest.fn(),
    },
    DATABASE_ID: 'test_db',
    USER_ROLES_COLLECTION_ID: 'test_roles_collection',
    PERMISSION_CONFIG_COLLECTION_ID: 'permission_config',
    ID: {
        unique: () => 'unique_id',
    },
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePermissions } from '@/hooks/usePermissions';
import { account } from '@/constants/appwrite';

// Mock the services used by the hook
jest.mock('@/utils/permissionService', () => ({
    getUserPermissionContext: jest.fn(),
    canAccessCollection: jest.fn(),
    canAccessRoute: jest.fn(),
    hasFeature: jest.fn(),
}));

jest.mock('@/utils/userRoleService', () => ({
    getUserRole: jest.fn(),
    initializeUserRecord: jest.fn(),
}));

import { getUserPermissionContext, canAccessCollection } from '@/utils/permissionService';
import { getUserRole, initializeUserRecord } from '@/utils/userRoleService';

describe('usePermissions hook', () => {
    const mockUser = { $id: 'user123', name: 'Test User' };
    const mockContext = {
        userId: 'user123',
        role: 'admin',
        allowedCollections: { inventory: ['read', 'create'] },
        allowedRoutes: ['dashboard', 'inventory'],
        features: ['admin_panel']
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (account.get as jest.Mock).mockResolvedValue(mockUser);
        (initializeUserRecord as jest.Mock).mockResolvedValue(undefined);
        (getUserRole as jest.Mock).mockResolvedValue('admin');
        (getUserPermissionContext as jest.Mock).mockResolvedValue(mockContext);

        // Debug: verify mocks are assigned
        console.log('Mock setup complete');
    });

    it('should initialize with user info and permissions', async () => {
        const { result } = renderHook(() => usePermissions());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.userId).toBe('user123');
        expect(result.current.userRole).toBe('admin');
        expect(result.current.isAdmin).toBe(true);
        expect(initializeUserRecord).toHaveBeenCalledWith('user123');
    });

    it('should handle errors during initialization', async () => {
        (account.get as jest.Mock).mockRejectedValue(new Error('Auth error'));

        const { result } = renderHook(() => usePermissions());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.error).toBe('Failed to load user information');
    });

    it('should check collection access', async () => {
        (canAccessCollection as jest.Mock).mockResolvedValue({ allowed: true });

        const { result } = renderHook(() => usePermissions());
        await waitFor(() => expect(result.current.loading).toBe(false));

        const allowed = await result.current.canAccess('inventory', 'create');
        expect(allowed).toBe(true);
        expect(canAccessCollection).toHaveBeenCalledWith('user123', 'inventory', 'create');
    });

    it('should provide synchronous route check after loading', async () => {
        const { result } = renderHook(() => usePermissions());
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.canAccessRoute('inventory')).toBe(true);
        expect(result.current.canAccessRoute('forbidden')).toBe(false);
    });

    it('should allow access to all routes when wildcard * is present', async () => {
        const wildcardContext = {
            ...mockContext,
            allowedRoutes: ['*']
        };
        (getUserPermissionContext as jest.Mock).mockResolvedValue(wildcardContext);

        const { result } = renderHook(() => usePermissions());
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.canAccessRoute('any_route')).toBe(true);
        expect(result.current.canAccessRoute('other_route')).toBe(true);
    });

    it('should refresh permissions when requested', async () => {
        const { result } = renderHook(() => usePermissions());
        await waitFor(() => expect(result.current.loading).toBe(false));

        jest.clearAllMocks();

        await act(async () => {
            await result.current.refresh();
        });

        expect(account.get).toHaveBeenCalled();
        expect(getUserRole).toHaveBeenCalled();
        expect(getUserPermissionContext).toHaveBeenCalled();
    });
});
