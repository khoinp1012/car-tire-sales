import { Q } from '@nozbe/watermelondb';
import { getDatabase } from './databaseService';
import { ID } from '@/constants/appwrite';
import { Inventory } from '@/models';

/**
 * Service for managing Inventory via WatermelonDB (Offline-First)
 */
export const inventoryService = {
    /**
     * Create a new inventory item
     */
    async createItem(data: {
        brand: string;
        size: string;
        unit_price: number;
        radius_size?: number;
        full_description: string;
    }) {
        const db = getDatabase();

        let newItem: Inventory;
        await db.write(async () => {
            newItem = await db.get<Inventory>('inventory').create(record => {
                record.appwriteId = ID.unique();
                record.brand = data.brand;
                record.size = data.size;
                record.unitPrice = data.unit_price;
                record.radiusSize = data.radius_size || 0;
                record.fullDescription = data.full_description;
                record.sequence = 0; // Will be updated by Appwrite sequence on sync
                record.version = 1;
                record.deleted = false;
            });
        });

        return newItem!;
    },

    /**
     * Update an existing inventory item
     */
    async updateItem(id: string, data: Partial<{
        brand: string;
        size: string;
        unit_price: number;
        radius_size: number;
        full_description: string;
    }>) {
        const db = getDatabase();
        const item = await db.get<Inventory>('inventory').find(id);

        await db.write(async () => {
            await item.update(record => {
                if (data.brand !== undefined) record.brand = data.brand;
                if (data.size !== undefined) record.size = data.size;
                if (data.unit_price !== undefined) record.unitPrice = data.unit_price;
                if (data.radius_size !== undefined) record.radiusSize = data.radius_size;
                if (data.full_description !== undefined) record.fullDescription = data.full_description;
                record.version = (record.version || 0) + 1;
            });
        });

        return item;
    },

    /**
     * Delete an inventory item (Soft Delete)
     */
    async deleteItem(id: string) {
        const db = getDatabase();
        const item = await db.get<Inventory>('inventory').find(id);

        await db.write(async () => {
            await item.update(record => {
                record.deleted = true;
            });
        });

        return item;
    },

    /**
     * List inventory items (Filter out deleted)
     */
    async listItems(query: any = {}) {
        const db = getDatabase();
        const conditions = [Q.where('deleted', false)];

        // Simple mapping of query object to WatermelonDB conditions
        Object.keys(query).forEach(key => {
            conditions.push(Q.where(key, query[key]));
        });

        return await db.get<Inventory>('inventory')
            .query(...conditions)
            .fetch();
    }
};
