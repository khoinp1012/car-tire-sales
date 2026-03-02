import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
    version: 4,
    tables: [
        tableSchema({
            name: 'inventory',
            columns: [
                { name: 'brand', type: 'string' },
                { name: 'size', type: 'string' },
                { name: 'unit_price', type: 'number' },
                { name: 'radius_size', type: 'number' },
                { name: 'sequence', type: 'number' },
                { name: 'full_description', type: 'string' },
                { name: 'sold', type: 'boolean' },
                { name: 'pending_sale', type: 'number', isOptional: true },
                { name: 'version', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'last_modified_by', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'appwrite_id', type: 'string', isIndexed: true }
            ]
        }),
        tableSchema({
            name: 'customers',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'phone_number', type: 'string' },
                { name: 'address', type: 'string' },
                { name: 'discount_percent', type: 'number' },
                { name: 'full_description', type: 'string' },
                { name: 'reference', type: 'string' },
                { name: 'version', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'last_modified_by', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'appwrite_id', type: 'string', isIndexed: true }
            ]
        }),
        tableSchema({
            name: 'sales',
            columns: [
                { name: 'customer_id', type: 'string', isIndexed: true },
                { name: 'order_date', type: 'string' },
                { name: 'inventory_items_list', type: 'string' },
                { name: 'total_amount', type: 'number' },
                { name: 'customer_discount', type: 'number' },
                { name: 'reference_id', type: 'string', isOptional: true },
                { name: 'version', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'last_modified_by', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'appwrite_id', type: 'string', isIndexed: true }
            ]
        }),
        tableSchema({
            name: 'user_roles',
            columns: [
                { name: 'user_id', type: 'string', isIndexed: true },
                { name: 'role', type: 'string' },
                { name: 'name', type: 'string' },
                { name: 'email', type: 'string' },
                { name: 'version', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'last_modified_by', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'appwrite_id', type: 'string', isIndexed: true }
            ]
        }),
        tableSchema({
            name: 'permission_config',
            columns: [
                { name: 'config_version', type: 'string' },
                { name: 'is_active', type: 'boolean', isIndexed: true },
                { name: 'roles', type: 'string' },
                { name: 'collection_permissions', type: 'string' },
                { name: 'row_permissions', type: 'string' },
                { name: 'last_modified_at', type: 'string' },
                { name: 'version', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'last_modified_by', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'appwrite_id', type: 'string', isIndexed: true }
            ]
        }),
        tableSchema({
            name: 'stacks',
            columns: [
                { name: 'stack_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'description', type: 'string' },
                { name: 'inventory_ids', type: 'string' },
                { name: 'version', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'last_modified_by', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'appwrite_id', type: 'string', isIndexed: true }
            ]
        })
    ]
});
