/**
 * Environment Variables Loader
 * 
 * This module loads and validates all environment variables required by the application.
 * It provides type-safe access to configuration values and ensures all required
 * variables are present before the app starts.
 * 
 * All environment variables must be prefixed with EXPO_PUBLIC_ to be accessible
 * in client-side code when using Expo.
 */

import { Logger } from '@/utils/logger';

/**
 * Environment variable configuration object
 * Provides structured, type-safe access to all environment variables
 */
export const ENV = {
    APPWRITE: {
        ENDPOINT: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || '',
        PROJECT_ID: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '',
        DATABASE_ID: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || '',
    },

    COLLECTIONS: {
        INVENTORY: process.env.EXPO_PUBLIC_COLLECTION_INVENTORY || '',
        CUSTOMERS: process.env.EXPO_PUBLIC_COLLECTION_CUSTOMERS || '',
        SALES: process.env.EXPO_PUBLIC_COLLECTION_SALES || '',
        AUTOFILL: process.env.EXPO_PUBLIC_COLLECTION_AUTOFILL || '',
        USER_ROLES: process.env.EXPO_PUBLIC_COLLECTION_USER_ROLES || 'user_roles',
        STACKS: process.env.EXPO_PUBLIC_COLLECTION_STACKS || 'stacks',
        AUDIT_LOGS: process.env.EXPO_PUBLIC_COLLECTION_AUDIT_LOGS || 'audit_logs',
    },

    GOOGLE: {
        WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
        SIGNIN_FUNCTION_URL: process.env.EXPO_PUBLIC_GOOGLE_SIGNIN_FUNCTION_URL || '',
    },

    APP: {
        DEEP_LINK_SCHEME: process.env.EXPO_PUBLIC_DEEP_LINK_SCHEME || '',
        ANDROID_PACKAGE: process.env.EXPO_PUBLIC_ANDROID_PACKAGE || '',
        IOS_BUNDLE_ID: process.env.EXPO_PUBLIC_IOS_BUNDLE_ID || '',
        EAS_PROJECT_ID: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '',
        NAME: process.env.EXPO_PUBLIC_APP_NAME || 'Lốp xe Toàn Thắng',
    },
} as const;

/**
 * List of required environment variables
 * These must be present for the app to function correctly
 */
const REQUIRED_ENV_VARS = [
    'EXPO_PUBLIC_APPWRITE_ENDPOINT',
    'EXPO_PUBLIC_APPWRITE_PROJECT_ID',
    'EXPO_PUBLIC_APPWRITE_DATABASE_ID',
    'EXPO_PUBLIC_COLLECTION_INVENTORY',
    'EXPO_PUBLIC_COLLECTION_CUSTOMERS',
    'EXPO_PUBLIC_COLLECTION_SALES',
    'EXPO_PUBLIC_COLLECTION_AUTOFILL',
    'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
    'EXPO_PUBLIC_DEEP_LINK_SCHEME',
] as const;

/**
 * Validates that all required environment variables are present
 * @throws Error if any required variable is missing
 */
export function validateEnv(): void {
    const missing: string[] = [];

    for (const varName of REQUIRED_ENV_VARS) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }

    if (missing.length > 0) {
        const errorMessage = [
            '❌ Missing required environment variables:',
            '',
            ...missing.map(v => `  • ${v}`),
            '',
            '📝 Please check your .env file and ensure all required variables are set.',
            '💡 See .env.example for a template with all required variables.',
        ].join('\n');

        Logger.error(errorMessage);
        throw new Error(`Missing ${missing.length} required environment variable(s)`);
    }

    Logger.log('✅ All required environment variables are present');
}

/**
 * Logs current environment configuration (for debugging)
 * Masks sensitive values in production
 */
export function logEnvConfig(maskSensitive: boolean = true): void {
    const mask = (value: string) => {
        if (!maskSensitive) return value;
        if (value.length <= 8) return '***';
        return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
    };

    Logger.log('📋 Environment Configuration:');
    Logger.log('  Appwrite:');
    Logger.log(`    Endpoint: ${ENV.APPWRITE.ENDPOINT}`);
    Logger.log(`    Project ID: ${mask(ENV.APPWRITE.PROJECT_ID)}`);
    Logger.log(`    Database ID: ${mask(ENV.APPWRITE.DATABASE_ID)}`);
    Logger.log('  Collections:');
    Logger.log(`    Inventory: ${mask(ENV.COLLECTIONS.INVENTORY)}`);
    Logger.log(`    Customers: ${mask(ENV.COLLECTIONS.CUSTOMERS)}`);
    Logger.log(`    Sales: ${mask(ENV.COLLECTIONS.SALES)}`);
    Logger.log(`    Autofill: ${mask(ENV.COLLECTIONS.AUTOFILL)}`);
    Logger.log(`    User Roles: ${ENV.COLLECTIONS.USER_ROLES}`);
    Logger.log('  App:');
    Logger.log(`    Name: ${ENV.APP.NAME}`);
    Logger.log(`    Deep Link: ${ENV.APP.DEEP_LINK_SCHEME}`);
}

// Validate environment on module load (only in development)
if (__DEV__) {
    try {
        validateEnv();
    } catch (error) {
        Logger.warn('⚠️ Environment validation failed:', error);
    }
}
