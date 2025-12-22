// Simple array-based permission system
// Each group has an array of pages/routes they can access

export interface UIPermissions {
  // Authentication status
  isAuthenticated: boolean;
  
  // Simple array of accessible pages/routes
  accessiblePages: string[];
  
  // Group information
  userGroups: string[];
  isAdmin: boolean;
  isInventoryManager: boolean;
  isSeller: boolean;
}

// Define accessible pages for each user group
const GROUP_PERMISSIONS: Record<string, string[]> = {
  // Case 1: No auth - see nothing
  'no_auth': [],
  
  // Case 2: Seller group - only sales related pages
  'seller': [
    'welcome',
    'modal',
    'scan_pending_sale',
    'pending_sale', 
    'create_sales',
    'print_order',
    'add_customer',
    'modify_customer'
  ],
  
  // Case 3: Inventory manager - only inventory related pages  
  'inventory_manager': [
    'welcome',
    'modal',
    'reprint_inventory',
    'find_inventory',
    'insert_inventory',
    'modify_inventory',
    'scan_modify_inventory'
  ],
  
  // Case 4: Admin - can see all pages
  'admin': [
    'welcome',
    'modal',
    // Inventory pages
    'reprint_inventory',
    'find_inventory', 
    'insert_inventory',
    'modify_inventory',
    'scan_modify_inventory',
    // Sales pages
    'scan_pending_sale',
    'pending_sale',
    'create_sales', 
    'print_order',
    // Customer pages
    'add_customer',
    'modify_customer'
  ]
};

export class PermissionManager {
  /**
   * Get UI permissions for a user based on their groups and auth status
   */
  static getUIPermissions(groups: string[], isAuthenticated: boolean = true): UIPermissions {
    // Case 1: No authentication - see nothing
    if (!isAuthenticated || groups.length === 0) {
      return {
        isAuthenticated: false,
        accessiblePages: [],
        userGroups: [],
        isAdmin: false,
        isInventoryManager: false,
        isSeller: false,
      };
    }

    // Combine accessible pages from all user groups
    const accessiblePages = new Set<string>();
    
    // Always add basic pages for authenticated users
    accessiblePages.add('welcome');
    accessiblePages.add('index');
    accessiblePages.add('modal');
    
    // Add pages based on user groups
    groups.forEach(group => {
      const groupPages = GROUP_PERMISSIONS[group] || [];
      groupPages.forEach(page => accessiblePages.add(page));
    });

    // Group checks
    const isAdmin = groups.includes('admin');
    const isInventoryManager = groups.includes('inventory_manager');
    const isSeller = groups.includes('seller');

    return {
      isAuthenticated: true,
      accessiblePages: Array.from(accessiblePages),
      userGroups: groups,
      isAdmin,
      isInventoryManager,
      isSeller,
    };
  }

  /**
   * Check if user can access a specific route
   */
  static canAccessRoute(routeName: string, groups: string[], isAuthenticated: boolean = true): boolean {
    const permissions = this.getUIPermissions(groups, isAuthenticated);
    
    // Public routes that don't need authentication
    const publicRoutes = ['index'];
    if (publicRoutes.includes(routeName)) {
      return true;
    }
    
    // Check if page is in user's accessible pages
    return permissions.accessiblePages.includes(routeName);
  }

  /**
   * Get appropriate error message for unauthorized access
   */
  static getAccessDeniedMessage(routeName: string, groups: string[], isAuthenticated: boolean = true): string {
    if (!isAuthenticated) {
      return 'Please login to access this feature.';
    }

    if (groups.length === 0) {
      return 'No role assigned. Please contact administrator.';
    }

    const isAdmin = groups.includes('admin');
    const isInventoryManager = groups.includes('inventory_manager');
    const isSeller = groups.includes('seller');

    // Inventory routes
    const inventoryRoutes = ['reprint_inventory', 'find_inventory', 'insert_inventory', 'modify_inventory', 'scan_modify_inventory'];
    if (inventoryRoutes.includes(routeName)) {
      if (!isAdmin && !isInventoryManager) {
        return 'You do not have permission to access inventory features. Only admin and inventory managers can access this feature.';
      }
    }

    // Sales routes
    const salesRoutes = ['create_sales', 'pending_sale', 'scan_pending_sale', 'print_order'];
    if (salesRoutes.includes(routeName)) {
      if (!isAdmin && !isSeller) {
        return 'You do not have permission to access sales features. Only admin and sellers can access this feature.';
      }
    }

    // Customer routes
    const customerRoutes = ['add_customer', 'modify_customer'];
    if (customerRoutes.includes(routeName)) {
      if (!isAdmin && !isSeller) {
        return 'You do not have permission to manage customers. Only admin and sellers can access this feature.';
      }
    }

    return 'You do not have permission to access this feature.';
  }

  /**
   * Get user role description for display purposes
   */
  static getUserRoleDescription(groups: string[]): string {
    if (groups.includes('admin')) return 'Administrator';
    if (groups.includes('inventory_manager')) return 'Inventory Manager';
    if (groups.includes('seller')) return 'Seller';
    return 'No Role Assigned';
  }

  /**
   * Helper method to check if user has access to specific feature categories
   */
  static hasInventoryAccess(groups: string[]): boolean {
    return groups.includes('admin') || groups.includes('inventory_manager');
  }

  static hasSalesAccess(groups: string[]): boolean {
    return groups.includes('admin') || groups.includes('seller');
  }

  static hasCustomerAccess(groups: string[]): boolean {
    return groups.includes('admin') || groups.includes('seller');
  }
}
