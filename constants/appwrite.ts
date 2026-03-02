import { Client, Account, Functions, Databases, ID } from 'react-native-appwrite';
import { ENV } from './env';

const appwrite = new Client();

appwrite
  .setEndpoint(ENV.APPWRITE.ENDPOINT)
  .setProject(ENV.APPWRITE.PROJECT_ID);

export const account = new Account(appwrite);
export const functions = new Functions(appwrite);
export const databases = new Databases(appwrite);
export { ID };
export default appwrite;

// Database and Collection IDs - exported for convenience
export const DATABASE_ID = ENV.APPWRITE.DATABASE_ID;
export const USER_ROLES_COLLECTION_ID = ENV.COLLECTIONS.USER_ROLES;
export const INVENTORY_COLLECTION_ID = ENV.COLLECTIONS.INVENTORY;
export const CUSTOMERS_COLLECTION_ID = ENV.COLLECTIONS.CUSTOMERS;
export const SALES_COLLECTION_ID = ENV.COLLECTIONS.SALES;
export const AUTOFILL_COLLECTION_ID = ENV.COLLECTIONS.AUTOFILL;
export const PERMISSION_CONFIG_COLLECTION_ID = 'permission_config';
export const AUDIT_LOGS_COLLECTION_ID = ENV.COLLECTIONS.AUDIT_LOGS;
export const STACKS_COLLECTION_ID = ENV.COLLECTIONS.STACKS;

// Google OAuth2 provider config example:
// account.createOAuth2Session('google', 'app://redirect', 'app://redirect');
