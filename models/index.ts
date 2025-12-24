import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date, children, action } from '@nozbe/watermelondb/decorators';

export class Inventory extends Model {
    static table = 'inventory';

    @text('brand') brand!: string;
    @text('size') size!: string;
    @field('unit_price') unitPrice!: number;
    @field('radius_size') radiusSize!: number;
    @field('sequence') sequence!: number;
    @text('full_description') fullDescription!: string;
    @field('sold') sold!: boolean;
    @field('pending_sale') pendingSale?: number;
    @field('version') version!: number;
    @field('deleted') deleted!: boolean;
    @text('last_modified_by') lastModifiedBy!: string;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
    @text('appwrite_id') appwriteId!: string;
}

export class Customer extends Model {
    static table = 'customers';

    @text('name') name!: string;
    @text('phone_number') phoneNumber!: string;
    @text('address') address!: string;
    @field('discount_percent') discountPercent!: number;
    @text('full_description') fullDescription!: string;
    @text('reference') reference!: string;
    @field('version') version!: number;
    @field('deleted') deleted!: boolean;
    @text('last_modified_by') lastModifiedBy!: string;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
    @text('appwrite_id') appwriteId!: string;
}

export class Sales extends Model {
    static table = 'sales';

    @text('customer_id') customerId!: string;
    @text('order_date') orderDate!: string;
    @text('inventory_items_list') inventoryItemsList!: string;
    @field('total_amount') totalAmount!: number;
    @field('customer_discount') customerDiscount!: number;
    @text('reference_id') referenceId?: string;
    @field('version') version!: number;
    @field('deleted') deleted!: boolean;
    @text('last_modified_by') lastModifiedBy!: string;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
    @text('appwrite_id') appwriteId!: string;
}

export class UserRole extends Model {
    static table = 'user_roles';

    @text('user_id') userId!: string;
    @text('role') role!: string;
    @text('name') name!: string;
    @text('email') email!: string;
    @field('version') version!: number;
    @field('deleted') deleted!: boolean;
    @text('last_modified_by') lastModifiedBy!: string;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
    @text('appwrite_id') appwriteId!: string;
}

export class PermissionConfig extends Model {
    static table = 'permission_config';

    @text('config_version') configVersion!: string;
    @field('is_active') isActive!: boolean;
    @text('roles') roles!: string;
    @text('collection_permissions') collectionPermissions!: string;
    @text('row_permissions') rowPermissions!: string;
    @text('last_modified_at') lastModifiedAt!: string;
    @field('version') version!: number;
    @field('deleted') deleted!: boolean;
    @text('last_modified_by') lastModifiedBy!: string;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
    @text('appwrite_id') appwriteId!: string;
}

export class AuditLog extends Model {
    static table = 'audit_logs';

    @text('entity_id') entityId!: string;
    @text('entity_type') entityType!: string;
    @field('version') version!: number;
    @text('action') action!: string;
    @text('snapshot') snapshot!: string;
    @text('user_id') userId!: string;
    @text('timestamp') timestamp!: string;
    @text('device_id') deviceId!: string;
    @text('appwrite_id') appwriteId!: string;
    @readonly @date('created_at') createdAt!: Date;
}
