import { Q } from '@nozbe/watermelondb';
import { getDatabase } from './databaseService';
import { AuditLog } from '@/models';

/**
 * Audit Service
 * 
 * Provides functions to query and analyze audit logs.
 * Audit logs are immutable records of all changes to tracked collections.
 */

export const auditService = {
    /**
     * Get all audit logs for a specific entity
     * Returns history in reverse chronological order (newest first)
     */
    async getEntityHistory(entityId: string): Promise<AuditLog[]> {
        const db = getDatabase();
        return await db.get<AuditLog>('audit_logs')
            .query(
                Q.where('entity_id', entityId),
                Q.sortBy('timestamp', Q.desc)
            )
            .fetch();
    },

    /**
     * Get a specific version of an entity
     */
    async getEntityVersion(entityId: string, version: number): Promise<AuditLog | null> {
        const db = getDatabase();
        const logs = await db.get<AuditLog>('audit_logs')
            .query(
                Q.where('entity_id', entityId),
                Q.where('version', version)
            )
            .fetch();
        return logs[0] || null;
    },

    /**
     * Get all changes by a specific user
     */
    async getUserActivity(userId: string, limit = 100): Promise<AuditLog[]> {
        const db = getDatabase();
        return await db.get<AuditLog>('audit_logs')
            .query(
                Q.where('user_id', userId),
                Q.sortBy('timestamp', Q.desc),
                Q.take(limit)
            )
            .fetch();
    },

    /**
     * Get all changes from a specific device
     */
    async getDeviceActivity(deviceId: string, limit = 100): Promise<AuditLog[]> {
        const db = getDatabase();
        return await db.get<AuditLog>('audit_logs')
            .query(
                Q.where('device_id', deviceId),
                Q.sortBy('timestamp', Q.desc),
                Q.take(limit)
            )
            .fetch();
    },

    /**
     * Get all changes in a time range
     */
    async getChangesByTimeRange(startTime: string, endTime: string): Promise<AuditLog[]> {
        const db = getDatabase();
        return await db.get<AuditLog>('audit_logs')
            .query(
                Q.where('timestamp', Q.gte(startTime)),
                Q.where('timestamp', Q.lte(endTime)),
                Q.sortBy('timestamp', Q.desc)
            )
            .fetch();
    },

    /**
     * Get all changes for a specific collection type
     */
    async getCollectionHistory(entityType: string, limit = 100): Promise<AuditLog[]> {
        const db = getDatabase();
        return await db.get<AuditLog>('audit_logs')
            .query(
                Q.where('entity_type', entityType),
                Q.sortBy('timestamp', Q.desc),
                Q.take(limit)
            )
            .fetch();
    },

    /**
     * Get recent changes across all collections
     */
    async getRecentChanges(limit = 50): Promise<AuditLog[]> {
        const db = getDatabase();
        return await db.get<AuditLog>('audit_logs')
            .query(
                Q.sortBy('timestamp', Q.desc),
                Q.take(limit)
            )
            .fetch();
    },

    /**
     * Parse snapshot data from an audit log
     */
    parseSnapshot(auditLog: AuditLog): any {
        try {
            return JSON.parse(auditLog.snapshot);
        } catch (error) {
            console.error('[AuditService] Failed to parse snapshot:', error);
            return null;
        }
    },

    /**
     * Compare two versions of an entity
     * Returns the differences between the snapshots
     */
    async compareVersions(entityId: string, version1: number, version2: number): Promise<{
        version1Data: any;
        version2Data: any;
        changes: string[];
    } | null> {
        const v1 = await this.getEntityVersion(entityId, version1);
        const v2 = await this.getEntityVersion(entityId, version2);

        if (!v1 || !v2) return null;

        const v1Data = this.parseSnapshot(v1);
        const v2Data = this.parseSnapshot(v2);

        if (!v1Data || !v2Data) return null;

        // Find changed fields
        const changes: string[] = [];
        const allKeys = new Set([...Object.keys(v1Data), ...Object.keys(v2Data)]);

        for (const key of allKeys) {
            if (JSON.stringify(v1Data[key]) !== JSON.stringify(v2Data[key])) {
                changes.push(key);
            }
        }

        return {
            version1Data: v1Data,
            version2Data: v2Data,
            changes
        };
    },

    /**
     * Restore a document to a specific version
     * WARNING: This creates a new version, it doesn't delete history
     */
    async restoreVersion(entityId: string, version: number): Promise<any> {
        const db = getDatabase();

        // Find the audit log for that version
        const auditLog = await this.getEntityVersion(entityId, version);

        if (!auditLog) {
            throw new Error(`Version ${version} not found for entity ${entityId}`);
        }

        // Parse the snapshot
        const snapshot = this.parseSnapshot(auditLog);
        if (!snapshot) {
            throw new Error('Failed to parse snapshot data');
        }

        // Determine collection
        const entityType = auditLog.entityType;
        const item = await db.get(entityType).find(entityId);

        if (!item) {
            throw new Error(`Document ${entityId} not found in ${entityType}`);
        }

        // Remove audit metadata from snapshot before restoring
        const { version: _, deleted, lastModifiedBy, created_at, updated_at, ...cleanData } = snapshot;

        // Restore the data (this will create a new version with current timestamp)
        await db.write(async () => {
            await item.update(record => {
                Object.keys(cleanData).forEach(key => {
                    (record as any)[key] = cleanData[key];
                });
                (record as any).version = ((record as any).version || 0) + 1;
            });
        });

        return item;
    },

    /**
     * Get statistics about audit logs
     */
    async getStatistics(): Promise<{
        totalLogs: number;
        byAction: { CREATE: number; UPDATE: number; DELETE: number };
        byCollection: Record<string, number>;
        byUser: Record<string, number>;
    }> {
        const db = getDatabase();
        const allLogs = await db.get<AuditLog>('audit_logs').query().fetch();

        const stats = {
            totalLogs: allLogs.length,
            byAction: { CREATE: 0, UPDATE: 0, DELETE: 0 },
            byCollection: {} as Record<string, number>,
            byUser: {} as Record<string, number>
        };

        for (const log of allLogs) {
            // Count by action
            if (log.action === 'CREATE' || log.action === 'UPDATE' || log.action === 'DELETE') {
                stats.byAction[log.action]++;
            }

            // Count by collection
            stats.byCollection[log.entityType] = (stats.byCollection[log.entityType] || 0) + 1;

            // Count by user
            stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;
        }

        return stats;
    }
};
