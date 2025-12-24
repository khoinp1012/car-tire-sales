/**
 * Appwrite Function: Sync Collection Permissions
 * 
 * This function syncs permission configurations to Appwrite collection-level permissions.
 * It uses BOTH user session (for authorization) AND API key (for collection updates).
 * 
 * Environment Variables Required:
 * - APPWRITE_FUNCTION_PROJECT_ID (auto-provided)
 * - APPWRITE_FUNCTION_JWT (auto-provided - user's session token)
 * - APPWRITE_API_KEY (required - admin API key for collection updates)
 * - APPWRITE_ENDPOINT (optional - defaults to cloud.appwrite.io)
 * - DATABASE_ID
 * - COLLECTION_* (collection IDs)
 */

const sdk = require('node-appwrite');

/**
 * Main function handler
 */
module.exports = async ({ req, res, log, error }) => {
    try {
        log('Starting permission sync...');

        // Get user's JWT token for authorization
        const userJWT = req.headers['x-appwrite-jwt'] || process.env.APPWRITE_FUNCTION_JWT;

        if (!userJWT) {
            return res.json({
                success: false,
                error: 'Unauthorized: No user session found',
            }, 401);
        }

        // Check if API key is configured
        const apiKey = process.env.APPWRITE_API_KEY;
        if (!apiKey) {
            return res.json({
                success: false,
                error: 'Server configuration error: APPWRITE_API_KEY not set',
            }, 500);
        }

        const endpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
        const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
        const DATABASE_ID = process.env.DATABASE_ID;

        // Initialize client with USER'S session token for authorization check
        const userClient = new sdk.Client()
            .setEndpoint(endpoint)
            .setProject(projectId)
            .setJWT(userJWT);

        const userAccount = new sdk.Account(userClient);
        const userDatabases = new sdk.Databases(userClient);

        // Verify user is admin
        log('Verifying user permissions...');
        const user = await userAccount.get();
        log(`User: ${user.email} (${user.$id})`);

        // Check if user has admin role
        const hasAdminLabel = user.labels && user.labels.includes('admin');

        if (!hasAdminLabel) {
            // Also check user_roles collection as fallback
            try {
                const userRoleDoc = await userDatabases.listDocuments(
                    DATABASE_ID,
                    process.env.COLLECTION_USER_ROLES || 'user_roles',
                    [sdk.Query.equal('userId', user.$id)]
                );

                const isAdmin = userRoleDoc.documents.length > 0 &&
                    userRoleDoc.documents[0].role === 'admin';

                if (!isAdmin) {
                    return res.json({
                        success: false,
                        error: 'Forbidden: Only admins can sync permissions',
                    }, 403);
                }
            } catch (e) {
                return res.json({
                    success: false,
                    error: 'Forbidden: Only admins can sync permissions',
                }, 403);
            }
        }

        log('✓ User is admin, proceeding with sync...');

        // Initialize ADMIN client with API key for collection updates
        const adminClient = new sdk.Client()
            .setEndpoint(endpoint)
            .setProject(projectId)
            .setKey(apiKey);

        const databases = new sdk.Databases(adminClient);

        // Parse request body
        let configId = null;
        try {
            const body = JSON.parse(req.body || '{}');
            configId = body.configId;
        } catch (e) {
            error('Failed to parse request body:', e);
        }

        // Get active permission config
        log('Fetching active permission configuration...');
        let config;

        if (configId) {
            const doc = await databases.getDocument(
                DATABASE_ID,
                'permission_config',
                configId
            );
            config = doc;
        } else {
            const result = await databases.listDocuments(
                DATABASE_ID,
                'permission_config',
                [
                    sdk.Query.equal('isActive', true),
                    sdk.Query.orderDesc('$createdAt'),
                    sdk.Query.limit(1)
                ]
            );

            if (result.documents.length === 0) {
                throw new Error('No active permission configuration found');
            }

            config = result.documents[0];
        }

        log(`Loaded config version: ${config.version}`);

        // Parse the configuration
        const roles = typeof config.roles === 'string' ? JSON.parse(config.roles) : config.roles;
        const collectionPermissions = typeof config.collectionPermissions === 'string'
            ? JSON.parse(config.collectionPermissions)
            : config.collectionPermissions;

        log('Configuration parsed successfully');

        // Map of collection names to their IDs
        const collectionIdMap = {
            'inventory': process.env.COLLECTION_INVENTORY || 'inventory',
            'customers': process.env.COLLECTION_CUSTOMERS || 'customers',
            'sales': process.env.COLLECTION_SALES || 'sales',
            'autofill': process.env.COLLECTION_AUTOFILL || 'autofill',
            'user_roles': process.env.COLLECTION_USER_ROLES || 'user_roles',
            'stacks': process.env.COLLECTION_STACKS || 'stacks',
            'permission_config': 'permission_config',
        };

        // Sync permissions for each collection
        const syncResults = [];

        for (const [collectionName, perms] of Object.entries(collectionPermissions)) {
            try {
                const collectionId = collectionIdMap[collectionName];

                if (!collectionId) {
                    log(`Skipping unknown collection: ${collectionName}`);
                    continue;
                }

                log(`Syncing permissions for collection: ${collectionName} (${collectionId})`);

                // Build Appwrite permission array
                const permissions = [];

                // Add read permissions
                if (perms.read && Array.isArray(perms.read)) {
                    for (const role of perms.read) {
                        permissions.push(sdk.Permission.read(sdk.Role.label(`role:${role}`)));
                    }
                }

                // Add create permissions
                if (perms.create && Array.isArray(perms.create)) {
                    for (const role of perms.create) {
                        permissions.push(sdk.Permission.create(sdk.Role.label(`role:${role}`)));
                    }
                }

                // Add update permissions
                if (perms.update && Array.isArray(perms.update)) {
                    for (const role of perms.update) {
                        permissions.push(sdk.Permission.update(sdk.Role.label(`role:${role}`)));
                    }
                }

                // Add delete permissions
                if (perms.delete && Array.isArray(perms.delete)) {
                    for (const role of perms.delete) {
                        permissions.push(sdk.Permission.delete(sdk.Role.label(`role:${role}`)));
                    }
                }

                log(`Generated ${permissions.length} permission rules for ${collectionName}`);

                // ACTUALLY UPDATE COLLECTION PERMISSIONS using admin client
                try {
                    await databases.updateCollection(
                        DATABASE_ID,
                        collectionId,
                        undefined, // name (keep existing)
                        permissions, // NEW: Actually set the permissions!
                        undefined, // documentSecurity (keep existing)
                        undefined  // enabled (keep existing)
                    );

                    log(`✅ Successfully updated permissions for ${collectionName}`);

                    syncResults.push({
                        collection: collectionName,
                        collectionId: collectionId,
                        permissions: permissions.length,
                        status: 'synced',
                        permissionRules: permissions.map(p => p.toString()),
                    });
                } catch (updateError) {
                    error(`Failed to update collection ${collectionName}:`, updateError);
                    syncResults.push({
                        collection: collectionName,
                        collectionId: collectionId,
                        status: 'error',
                        error: updateError.message,
                    });
                }

            } catch (err) {
                error(`Error processing ${collectionName}:`, err);
                syncResults.push({
                    collection: collectionName,
                    status: 'error',
                    error: err.message,
                });
            }
        }

        // Return success response
        const response = {
            success: true,
            message: 'Permission sync completed',
            user: user.email,
            configVersion: config.version,
            syncResults: syncResults,
            timestamp: new Date().toISOString(),
        };

        log('Permission sync completed successfully');
        log(JSON.stringify(response, null, 2));

        return res.json(response);

    } catch (err) {
        error('Permission sync failed:', err);

        return res.json({
            success: false,
            error: err.message,
            timestamp: new Date().toISOString(),
        }, 500);
    }
};
