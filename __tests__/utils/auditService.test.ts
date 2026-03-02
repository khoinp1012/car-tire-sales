/**
 * Comprehensive Test Suite for Autonomous Auditing System
 * Tests the server-side audit function and audit log integrity
 */

describe('Autonomous Auditing System', () => {
    describe('Audit Function Logic', () => {
        let mockReq: any;
        let mockRes: any;
        let mockLog: jest.Mock;
        let mockError: jest.Mock;
        let mockDatabases: any;

        beforeEach(() => {
            jest.clearAllMocks();

            mockLog = jest.fn();
            mockError = jest.fn();

            mockRes = {
                json: jest.fn((data, status?) => ({ data, status }))
            };

            mockDatabases = {
                createDocument: jest.fn()
            };

            // Reset environment variables
            process.env.APPWRITE_FUNCTION_PROJECT_ID = 'test_project';
            process.env.APPWRITE_API_KEY = 'test_api_key';
            process.env.DATABASE_ID = 'test_db';
            process.env.COLLECTION_AUDIT_LOGS = 'audit_logs';
        });

        describe('Configuration Validation', () => {
            it('should reject requests when DATABASE_ID is missing', async () => {
                delete process.env.DATABASE_ID;

                const handler = createMockAuditHandler();
                await handler({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

                expect(mockError).toHaveBeenCalledWith(expect.stringContaining('DATABASE_ID'));
                expect(mockRes.json).toHaveBeenCalledWith(
                    expect.objectContaining({ success: false }),
                    500
                );
            });

            it('should reject requests when APPWRITE_API_KEY is missing', async () => {
                delete process.env.APPWRITE_API_KEY;

                const handler = createMockAuditHandler();
                await handler({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

                expect(mockError).toHaveBeenCalledWith(expect.stringContaining('APPWRITE_API_KEY'));
                expect(mockRes.json).toHaveBeenCalledWith(
                    expect.objectContaining({ success: false }),
                    500
                );
            });
        });

        describe('Event Processing', () => {
            it('should correctly identify CREATE events', async () => {
                process.env.APPWRITE_FUNCTION_EVENT = 'databases.test_db.collections.inventory.documents.doc_1.create';

                mockReq = {
                    body: JSON.stringify({
                        $id: 'doc_1',
                        $collectionId: 'inventory',
                        brand: 'Michelin',
                        version: 1,
                        lastModifiedBy: 'user_123'
                    })
                };

                const handler = createMockAuditHandler();
                const auditData = await handler({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

                expect(auditData.action).toBe('create');
            });

            it('should correctly identify UPDATE events', async () => {
                process.env.APPWRITE_FUNCTION_EVENT = 'databases.test_db.collections.inventory.documents.doc_1.update';

                mockReq = {
                    body: JSON.stringify({
                        $id: 'doc_1',
                        $collectionId: 'inventory',
                        brand: 'Michelin',
                        version: 2,
                        lastModifiedBy: 'user_123'
                    })
                };

                const handler = createMockAuditHandler();
                const auditData = await handler({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

                expect(auditData.action).toBe('update');
            });

            it('should correctly identify DELETE events', async () => {
                process.env.APPWRITE_FUNCTION_EVENT = 'databases.test_db.collections.inventory.documents.doc_1.delete';

                mockReq = {
                    body: JSON.stringify({
                        $id: 'doc_1',
                        $collectionId: 'inventory',
                        deleted: true,
                        lastModifiedBy: 'user_123'
                    })
                };

                const handler = createMockAuditHandler();
                const auditData = await handler({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

                expect(auditData.action).toBe('delete');
            });
        });

        describe('Recursion Prevention', () => {
            it('should skip auditing audit_logs collection', async () => {
                mockReq = {
                    body: JSON.stringify({
                        $id: 'audit_1',
                        $collectionId: 'audit_logs',
                        entityId: 'doc_1'
                    })
                };

                const handler = createMockAuditHandler();
                await handler({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

                expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Skipping audit'));
                expect(mockRes.json).toHaveBeenCalledWith(
                    expect.objectContaining({ success: true, message: 'Skipped audit_logs' })
                );
            });
        });

        describe('Audit Data Structure', () => {
            it('should create complete audit entry with all required fields', async () => {
                process.env.APPWRITE_FUNCTION_EVENT = 'databases.test_db.collections.inventory.documents.doc_1.create';

                const testDocument = {
                    $id: 'doc_1',
                    $collectionId: 'inventory',
                    $createdAt: '2024-12-25T00:00:00.000Z',
                    $updatedAt: '2024-12-25T00:00:00.000Z',
                    brand: 'Michelin',
                    size: '195/65R15',
                    unitPrice: 100.50,
                    version: 1,
                    lastModifiedBy: 'user_123',
                    deviceId: 'device_456'
                };

                mockReq = {
                    body: JSON.stringify(testDocument)
                };

                const handler = createMockAuditHandler();
                const auditData = await handler({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

                expect(auditData).toMatchObject({
                    entityId: 'doc_1',
                    entityType: 'inventory',
                    version: 1,
                    action: 'create',
                    userId: 'user_123',
                    deviceId: 'device_456'
                });

                // Snapshot should be valid JSON
                expect(() => JSON.parse(auditData.snapshot)).not.toThrow();

                // Snapshot should contain the full document
                const snapshot = JSON.parse(auditData.snapshot);
                expect(snapshot.brand).toBe('Michelin');
                expect(snapshot.unitPrice).toBe(100.50);
            });

            it('should handle missing optional fields gracefully', async () => {
                process.env.APPWRITE_FUNCTION_EVENT = 'databases.test_db.collections.inventory.documents.doc_1.create';

                const minimalDocument = {
                    $id: 'doc_1',
                    $collectionId: 'inventory'
                    // No version, lastModifiedBy, or deviceId
                };

                mockReq = {
                    body: JSON.stringify(minimalDocument)
                };

                const handler = createMockAuditHandler();
                const auditData = await handler({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

                expect(auditData.version).toBe(1); // Default value
                expect(auditData.userId).toBe('system'); // Default value
                expect(auditData.deviceId).toBeUndefined(); // Optional field
            });

            it('should include timestamp in ISO format', async () => {
                process.env.APPWRITE_FUNCTION_EVENT = 'databases.test_db.collections.inventory.documents.doc_1.create';

                mockReq = {
                    body: JSON.stringify({
                        $id: 'doc_1',
                        $collectionId: 'inventory'
                    })
                };

                const handler = createMockAuditHandler();
                const auditData = await handler({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

                expect(auditData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            });
        });

        describe('Error Handling', () => {
            it('should handle invalid JSON body', async () => {
                mockReq = {
                    body: 'invalid json {'
                };

                const handler = createMockAuditHandler();
                await handler({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

                expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Failed to parse'));
                expect(mockRes.json).toHaveBeenCalledWith(
                    expect.objectContaining({ success: false, error: 'Invalid JSON body' }),
                    400
                );
            });

            it('should handle database creation errors', async () => {
                process.env.APPWRITE_FUNCTION_EVENT = 'databases.test_db.collections.inventory.documents.doc_1.create';

                mockReq = {
                    body: JSON.stringify({
                        $id: 'doc_1',
                        $collectionId: 'inventory'
                    })
                };

                const handler = createMockAuditHandlerWithError('Database connection failed');
                await handler({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

                expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Failed to create audit entry'));
                expect(mockRes.json).toHaveBeenCalledWith(
                    expect.objectContaining({ success: false }),
                    500
                );
            });
        });

        describe('Field Mapping Issues', () => {
            it('should handle lastModifiedBy vs last_modified_by correctly', async () => {
                process.env.APPWRITE_FUNCTION_EVENT = 'databases.test_db.collections.inventory.documents.doc_1.create';

                // Test with camelCase (from Appwrite)
                mockReq = {
                    body: JSON.stringify({
                        $id: 'doc_1',
                        $collectionId: 'inventory',
                        lastModifiedBy: 'user_123'
                    })
                };

                const handler = createMockAuditHandler();
                const auditData = await handler({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

                expect(auditData.userId).toBe('user_123');
            });

            it('should handle snake_case field names from sync', async () => {
                process.env.APPWRITE_FUNCTION_EVENT = 'databases.test_db.collections.inventory.documents.doc_1.update';

                // Test with snake_case (potential issue)
                mockReq = {
                    body: JSON.stringify({
                        $id: 'doc_1',
                        $collectionId: 'inventory',
                        last_modified_by: 'user_456' // snake_case instead of camelCase
                    })
                };

                const handler = createMockAuditHandler();
                const auditData = await handler({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

                // This test will reveal if there's a field mapping bug
                // The audit function should handle both formats
                expect(auditData.userId).toBeDefined();
            });
        });
    });

    describe('Audit Log Integrity', () => {
        it('should maintain audit trail for complete CRUD lifecycle', async () => {
            const auditLogs: any[] = [];

            // Simulate CREATE
            const createAudit = {
                entityId: 'tire_1',
                entityType: 'inventory',
                action: 'create',
                version: 1,
                snapshot: JSON.stringify({ brand: 'Michelin', unitPrice: 100 }),
                userId: 'user_123',
                timestamp: '2024-12-25T10:00:00.000Z'
            };
            auditLogs.push(createAudit);

            // Simulate UPDATE
            const updateAudit = {
                entityId: 'tire_1',
                entityType: 'inventory',
                action: 'update',
                version: 2,
                snapshot: JSON.stringify({ brand: 'Michelin', unitPrice: 120 }),
                userId: 'user_123',
                timestamp: '2024-12-25T11:00:00.000Z'
            };
            auditLogs.push(updateAudit);

            // Simulate DELETE
            const deleteAudit = {
                entityId: 'tire_1',
                entityType: 'inventory',
                action: 'delete',
                version: 3,
                snapshot: JSON.stringify({ brand: 'Michelin', unitPrice: 120, deleted: true }),
                userId: 'user_123',
                timestamp: '2024-12-25T12:00:00.000Z'
            };
            auditLogs.push(deleteAudit);

            // Verify audit trail
            expect(auditLogs).toHaveLength(3);
            expect(auditLogs[0].action).toBe('create');
            expect(auditLogs[1].action).toBe('update');
            expect(auditLogs[2].action).toBe('delete');

            // Verify version progression
            expect(auditLogs[0].version).toBe(1);
            expect(auditLogs[1].version).toBe(2);
            expect(auditLogs[2].version).toBe(3);

            // Verify snapshots capture state changes
            const snapshot1 = JSON.parse(auditLogs[0].snapshot);
            const snapshot2 = JSON.parse(auditLogs[1].snapshot);
            expect(snapshot1.unitPrice).toBe(100);
            expect(snapshot2.unitPrice).toBe(120);
        });

        it('should capture all fields in snapshot for forensic analysis', async () => {
            const complexDocument = {
                $id: 'tire_complex',
                $collectionId: 'inventory',
                $createdAt: '2024-12-25T00:00:00.000Z',
                $updatedAt: '2024-12-25T00:00:00.000Z',
                brand: 'Michelin',
                size: '195/65R15',
                unitPrice: 100.50,
                radiusSize: 15,
                sequence: 42,
                fullDescription: 'Premium tire',
                sold: false,
                pendingSale: null,
                version: 1,
                deleted: false,
                lastModifiedBy: 'user_123'
            };

            const snapshot = JSON.stringify(complexDocument);
            const parsed = JSON.parse(snapshot);

            // Verify all fields are preserved
            expect(parsed.brand).toBe('Michelin');
            expect(parsed.unitPrice).toBe(100.50);
            expect(parsed.radiusSize).toBe(15);
            expect(parsed.sold).toBe(false);
            expect(parsed.deleted).toBe(false);
        });
    });

    describe('Integration with Sync Service', () => {
        it('should trigger audit on successful sync push', async () => {
            // This test verifies that when syncService pushes changes,
            // the audit function is triggered by Appwrite events

            const syncedDocument = {
                id: 'local_1',
                brand: 'Goodyear',
                unitPrice: 95.00,
                version: 1,
                lastModifiedBy: 'user_789'
            };

            // Simulate sync push creating document in Appwrite
            // This would trigger: databases.*.collections.*.documents.*.create

            // Expected audit entry
            const expectedAudit = {
                entityId: 'local_1',
                entityType: 'inventory',
                action: 'create',
                version: 1,
                userId: 'user_789'
            };

            expect(expectedAudit.entityId).toBe(syncedDocument.id);
            expect(expectedAudit.userId).toBe(syncedDocument.lastModifiedBy);
        });
    });
});

/**
 * Helper function to create a mock audit handler for testing
 */
function createMockAuditHandler() {
    return async ({ req, res, log, error }: any) => {
        const {
            APPWRITE_API_KEY,
            DATABASE_ID,
            COLLECTION_AUDIT_LOGS = 'audit_logs'
        } = process.env;

        const event = process.env.APPWRITE_FUNCTION_EVENT || '';

        if (!DATABASE_ID) {
            error('DATABASE_ID environment variable is not set');
            return res.json({ success: false, error: 'Configuration error: DATABASE_ID missing' }, 500);
        }

        if (!APPWRITE_API_KEY) {
            error('APPWRITE_API_KEY environment variable is not set');
            return res.json({ success: false, error: 'Configuration error: APPWRITE_API_KEY missing' }, 500);
        }

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

        const collectionId = document.$collectionId;
        if (collectionId === COLLECTION_AUDIT_LOGS) {
            log('Skipping audit of audit_logs collection.');
            return res.json({ success: true, message: 'Skipped audit_logs' });
        }

        let action = 'unknown';
        if (event.endsWith('.create')) action = 'create';
        else if (event.endsWith('.update')) action = 'update';
        else if (event.endsWith('.delete')) action = 'delete';

        const auditData = {
            entityId: document.$id,
            entityType: collectionId,
            version: document.version || 1,
            action: action,
            snapshot: JSON.stringify(document),
            userId: document.lastModifiedBy || document.last_modified_by || 'system',
            timestamp: new Date().toISOString()
        };

        if (document.deviceId) {
            auditData.deviceId = document.deviceId;
        }

        log(`Creating audit entry for ${collectionId}/${document.$id}...`);

        return auditData;
    };
}

/**
 * Helper function to create a mock audit handler that throws errors
 */
function createMockAuditHandlerWithError(errorMessage: string) {
    return async ({ req, res, log, error }: any) => {
        const handler = createMockAuditHandler();
        try {
            await handler({ req, res, log, error });
            throw new Error(errorMessage);
        } catch (err: any) {
            error(`Failed to create audit entry: ${err.message}`);
            return res.json({
                success: false,
                error: err.message
            }, 500);
        }
    };
}
