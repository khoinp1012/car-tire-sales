/**
 * Role Translation Utility
 * 
 * Provides helper functions to translate role names and permission-related terms
 */

import i18n from '@/constants/i18n';

/**
 * Get translated role display name
 */
export function getRoleDisplayName(roleId: string): string {
    switch (roleId) {
        case 'admin':
            return i18n.t('roleAdmin');
        case 'inventory_manager':
            return i18n.t('roleInventoryManager');
        case 'seller':
            return i18n.t('roleSeller');
        default:
            // Fallback to role ID if no translation found
            return roleId;
    }
}

/**
 * Get all available roles with translated names
 */
export function getTranslatedRoles(): Array<{ id: string; name: string }> {
    return [
        { id: 'admin', name: i18n.t('roleAdmin') },
        { id: 'inventory_manager', name: i18n.t('roleInventoryManager') },
        { id: 'seller', name: i18n.t('roleSeller') },
    ];
}
