/**
 * Application Configuration Constants
 * 
 * This file contains non-sensitive, static configuration values that are
 * safe to commit to version control. These values define business logic
 * and application behavior that doesn't change between environments.
 * 
 * For environment-specific or sensitive values, see constants/env.ts
 */

/**
 * Company and business information
 */
export const COMPANY_INFO = {
    NAME: 'CỬA HÀNG TOÀN THẮNG',
    DISPLAY_NAME: 'Lốp xe Toàn Thắng',
    SHORT_NAME: 'Toàn Thắng',
} as const;

/**
 * QR Code prefixes for different entity types
 * These prefixes help identify the type of entity a QR code represents
 */
export const QR_PREFIXES = {
    /** Prefix for inventory item QR codes (e.g., "TT1_12345") */
    INVENTORY: 'TT1_',

    /** Prefix for customer reference codes (e.g., "CUST_001") */
    CUSTOMER: 'CUST_',

    /** Prefix for stack location QR codes (e.g., "STACK_A1") */
    STACK: 'STACK_',
} as const;

/**
 * Role configuration and hierarchy
 */
export const ROLES = {
    /**
     * Role hierarchy from lowest to highest permissions
     * Higher roles inherit all permissions from lower roles
     */
    HIERARCHY: ['seller', 'inventory_manager', 'admin'] as const,

    /**
     * Human-readable display names for roles
     */
    DISPLAY_NAMES: {
        admin: 'Administrator',
        inventory_manager: 'Inventory Manager',
        seller: 'Seller',
    } as const,

    /**
     * Role identifiers (for type safety)
     */
    IDS: {
        ADMIN: 'admin',
        INVENTORY_MANAGER: 'inventory_manager',
        SELLER: 'seller',
    } as const,
} as const;

/**
 * Template configuration for invoice generation
 */
export const TEMPLATE_CONFIG = {
    /** Default template type to use for invoices */
    DEFAULT_TYPE: 'default' as const,

    /** Available template types */
    TYPES: {
        DEFAULT: 'default',
        MINIMAL: 'minimal',
        DETAILED: 'detailed',
        RECEIPT: 'receipt',
    } as const,
} as const;

/**
 * Route names for navigation and permission checking
 * Using constants ensures type safety and prevents typos
 */
export const ROUTES = {
    // Public routes
    INDEX: 'index',

    // Authenticated routes
    WELCOME: 'welcome',
    MODAL: 'modal',

    // Sales routes
    CREATE_SALES: 'create_sales',
    PENDING_SALE: 'pending_sale',
    SCAN_PENDING_SALE: 'scan_pending_sale',
    PRINT_ORDER: 'print_order',

    // Customer routes
    ADD_CUSTOMER: 'add_customer',
    MODIFY_CUSTOMER: 'modify_customer',

    // Inventory routes
    INSERT_INVENTORY: 'insert_inventory',
    MODIFY_INVENTORY: 'modify_inventory',
    SCAN_MODIFY_INVENTORY: 'scan_modify_inventory',
    FIND_INVENTORY: 'find_inventory',
    REPRINT_INVENTORY: 'reprint_inventory',
    LOCATION_TRACKING: 'location_tracking',

    // Admin routes
    MANAGE_PERMISSIONS: 'manage_permissions',
} as const;

/**
 * Invoice and document formatting constants
 */
export const INVOICE = {
    /** Invoice number prefix (e.g., "HD12345678") */
    NUMBER_PREFIX: 'HD',

    /** Number of characters to use from order ID for invoice number */
    ID_LENGTH: 8,

    /** Maximum filename length for generated PDFs */
    MAX_FILENAME_LENGTH: 100,

    /** Currency symbol */
    CURRENCY: 'VNĐ',

    /** Locale for number and date formatting */
    LOCALE: 'vi-VN',
} as const;

/**
 * UI and display constants
 */
export const UI = {
    /** Default page size for paginated lists */
    DEFAULT_PAGE_SIZE: 25,

    /** Maximum items to show in autocomplete dropdowns */
    MAX_AUTOCOMPLETE_ITEMS: 50,

    /** Debounce delay for search inputs (ms) */
    SEARCH_DEBOUNCE_MS: 300,
} as const;

/**
 * Validation constants
 */
export const VALIDATION = {
    /** Minimum password length */
    MIN_PASSWORD_LENGTH: 8,

    /** Phone number regex pattern (Vietnamese format) */
    PHONE_PATTERN: /^(0|\+84)[0-9]{9,10}$/,

    /** Maximum discount percentage allowed */
    MAX_DISCOUNT_PERCENT: 100,
} as const;

/**
 * Type exports for TypeScript
 */
export type RoleId = typeof ROLES.HIERARCHY[number];
export type TemplateType = typeof TEMPLATE_CONFIG.TYPES[keyof typeof TEMPLATE_CONFIG.TYPES];
export type RouteId = typeof ROUTES[keyof typeof ROUTES];
