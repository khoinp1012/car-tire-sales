const sdk = require('node-appwrite');

/**
 * Appwrite Function: Autonomous Auditing
 * 
 * This function is triggered by database events and creates audit logs.
 * It captures a full snapshot of the document and metadata.
 */
module.exports = async ({ req, res, log, error }) => {
    log('--- Autonomous Auditing Started ---');

    // 1. Setup Environment
    const {
        APPWRITE_FUNCTION_PROJECT_ID,
        APPWRITE_API_KEY,
        APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1',
        DATABASE_ID,
        COLLECTION_AUDIT_LOGS = 'audit_logs'
    } = process.env;

    const event = process.env.APPWRITE_FUNCTION_EVENT || '';
    log(`Event Triggered: ${event}`);

    if (!DATABASE_ID) {
        error('DATABASE_ID environment variable is not set');
        return res.json({ success: false, error: 'Configuration error: DATABASE_ID missing' }, 500);
    }

    if (!APPWRITE_API_KEY) {
        error('APPWRITE_API_KEY environment variable is not set');
        return res.json({ success: false, error: 'Configuration error: APPWRITE_API_KEY missing' }, 500);
    }

    // 2. Parse Document Data
    let document;
    try {
        if (typeof req.body === 'string') {
            document = JSON.parse(req.body);
        } else {
            document = req.body || {};
        }
    } catch (e) {
        error('Failed to parse request body as JSON');
        return res.json({ success: false, error: 'Invalid JSON body' }, 400);
    }

    // 3. Skip audit_logs triggers to avoid recursion
    const collectionId = document.$collectionId;
    if (collectionId === COLLECTION_AUDIT_LOGS) {
        log('Skipping audit of audit_logs collection.');
        return res.json({ success: true, message: 'Skipped audit_logs' });
    }

    // 4. Determine Action from Event
    // Event format: databases.[id].collections.[id].documents.[id].create
    let action = 'unknown';
    if (event.endsWith('.create')) action = 'create';
    else if (event.endsWith('.update')) action = 'update';
    else if (event.endsWith('.delete')) action = 'delete';

    log(`Action: ${action} on Document ID: ${document.$id}`);

    // 5. Build Audit Log Entry
    try {
        const client = new sdk.Client()
            .setEndpoint(APPWRITE_ENDPOINT)
            .setProject(APPWRITE_FUNCTION_PROJECT_ID)
            .setKey(APPWRITE_API_KEY);

        const databases = new sdk.Databases(client);

        // Map fields to audit schema
        // Handle both camelCase (from Appwrite) and snake_case (from sync service)
        const auditData = {
            entityId: document.$id,
            entityType: collectionId,
            version: document.version || 1,
            action: action,
            snapshot: JSON.stringify(document),
            userId: document.lastModifiedBy || document.last_modified_by || 'system',
            timestamp: new Date().toISOString()
        };

        // Add optional fields if they exist
        if (document.deviceId) {
            auditData.deviceId = document.deviceId;
        }

        log(`Creating audit entry for ${collectionId}/${document.$id}...`);

        const result = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_AUDIT_LOGS,
            sdk.ID.unique(),
            auditData
        );

        log(`✅ Audit entry created: ${result.$id}`);

        return res.json({
            success: true,
            auditId: result.$id
        });

    } catch (err) {
        error(`Failed to create audit entry: ${err.message}`);
        return res.json({
            success: false,
            error: err.message
        }, 500);
    }
};
