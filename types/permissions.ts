/**
 * Permission System Type Definitions
 * 
 * This file defines the schema for the entire permission system.
 * All permissions are managed through the admin UI and stored in Appwrite.
 */

/**
 * Available permission actions for collections
 */
export type PermissionAction = 'read' | 'create' | 'update' | 'delete';

/**
 * Collection names in the database
 */
export type CollectionName =
    | 'inventory'
    | 'customers'
    | 'sales'
    | 'autofill'
    | 'user_roles'
    | 'permission_config';

/**
 * Role definition with hierarchy and permissions
 */
export interface RoleDefinition {
    /** Unique role identifier */
    id: string;

    /** Display name for UI */
    displayName: string;

    /** Hierarchy level (higher = more permissions) */
    hierarchy: number;

    /** Roles this role inherits permissions from */
    inheritsFrom: string[];

    /** Permissions for this role */
    permissions: {
        /** Collection-level permissions */
        collections: {
            [collectionName: string]: PermissionAction[];
        };

        /** Route access permissions */
        routes: string[];

        /** Feature flags */
        features: string[];
    };
}

/**
 * Collection permission mapping
 * Maps each collection to which roles can perform which actions
 */
export interface CollectionPermissions {
    [collectionName: string]: {
        [action in PermissionAction]?: string[]; // Array of role IDs
    };
}

/**
 * Row-level permission rule
 * Defines conditions for accessing specific documents
 */
export interface RowPermissionRule {
    /** Collection this rule applies to */
    collection: CollectionName;

    /** Role this rule applies to */
    role: string;

    /** Action this rule applies to */
    action: PermissionAction;

    /** Condition type */
    condition: 'own_documents' | 'all_documents' | 'custom';

    /** Field to check for ownership (e.g., 'userId') */
    ownershipField?: string;

    /** Custom filter query (Appwrite Query format) */
    customQuery?: string;
}

/**
 * Complete permission configuration
 * This is the single source of truth stored in the database
 */
export interface PermissionConfig {
    /** Document ID */
    $id?: string;

    /** Configuration version */
    version: string;

    /** All role definitions */
    roles: {
        [roleId: string]: RoleDefinition;
    };

    /** Collection permission mappings */
    collectionPermissions: CollectionPermissions;

    /** Row-level permission rules */
    rowPermissions: RowPermissionRule[];

    /** Metadata */
    lastModifiedBy?: string;
    lastModifiedAt?: string;
    isActive: boolean;

    /** Timestamps */
    $createdAt?: string;
    $updatedAt?: string;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
    allowed: boolean;
    reason?: string;
    requiredRole?: string;
    context?: UserPermissionContext;
}

/**
 * User permission context
 * Contains all permission info for a specific user
 */
export interface UserPermissionContext {
    userId: string;
    role: string;
    roleDefinition: RoleDefinition;
    allowedCollections: {
        [collectionName: string]: PermissionAction[];
    };
    allowedRoutes: string[];
    features: string[];
}
