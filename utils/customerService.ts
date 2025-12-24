import { Q } from '@nozbe/watermelondb';
import { getDatabase } from './databaseService';
import { ID } from '@/constants/appwrite';
import { Customer } from '@/models';

/**
 * Service for managing Customers via WatermelonDB (Offline-First)
 */
export const customerService = {
    /**
     * Create a new customer
     */
    async createCustomer(data: {
        name: string;
        phone_number: string;
        address?: string;
        discount_percent?: number;
        full_description: string;
    }) {
        const db = getDatabase();

        let newCustomer: Customer;
        await db.write(async () => {
            newCustomer = await db.get<Customer>('customers').create(record => {
                record.appwriteId = ID.unique();
                record.name = data.name;
                record.phoneNumber = data.phone_number;
                record.address = data.address || '';
                record.discountPercent = data.discount_percent || 0;
                record.fullDescription = data.full_description;
                record.reference = ''; // Will be updated by Appwrite sequence on sync
                record.version = 1;
                record.deleted = false;
            });
        });

        return newCustomer!;
    },

    /**
     * Update an existing customer
     */
    async updateCustomer(id: string, data: Partial<{
        name: string;
        phone_number: string;
        address: string;
        discount_percent: number;
        full_description: string;
    }>) {
        const db = getDatabase();
        const customer = await db.get<Customer>('customers').find(id);

        await db.write(async () => {
            await customer.update(record => {
                if (data.name !== undefined) record.name = data.name;
                if (data.phone_number !== undefined) record.phoneNumber = data.phone_number;
                if (data.address !== undefined) record.address = data.address;
                if (data.discount_percent !== undefined) record.discountPercent = data.discount_percent;
                if (data.full_description !== undefined) record.fullDescription = data.full_description;
                record.version = (record.version || 0) + 1;
            });
        });

        return customer;
    },

    /**
     * Delete a customer (Soft Delete)
     */
    async deleteCustomer(id: string) {
        const db = getDatabase();
        const customer = await db.get<Customer>('customers').find(id);

        await db.write(async () => {
            await customer.update(record => {
                record.deleted = true;
            });
        });

        return customer;
    },

    /**
     * List customers (Filter out deleted)
     */
    async listCustomers(query: any = {}) {
        const db = getDatabase();
        const conditions = [Q.where('deleted', false)];

        Object.keys(query).forEach(key => {
            conditions.push(Q.where(key, query[key]));
        });

        return await db.get<Customer>('customers')
            .query(...conditions)
            .fetch();
    }
};
