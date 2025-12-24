import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { account } from '@/constants/appwrite';

/**
 * Session Context Manager
 * 
 * Manages cached user ID and device ID for audit logging.
 * Initialized once at app startup and cached for the session.
 */

let cachedUserId: string | null = null;
let cachedDeviceId: string | null = null;

const DEVICE_ID_KEY = '@app/deviceId';

/**
 * Initialize session context
 * Should be called once at app startup
 */
export async function initializeSessionContext(): Promise<void> {
    try {
        console.log('[SessionContext] Initializing...');

        // Get or create device ID
        cachedDeviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

        if (!cachedDeviceId) {
            cachedDeviceId = Crypto.randomUUID();
            await AsyncStorage.setItem(DEVICE_ID_KEY, cachedDeviceId);
            console.log('[SessionContext] Created new device ID:', cachedDeviceId);
        } else {
            console.log('[SessionContext] Loaded device ID:', cachedDeviceId);
        }

        // Get user ID
        try {
            const user = await account.get();
            cachedUserId = user.$id;
            console.log('[SessionContext] Loaded user ID:', cachedUserId);
        } catch (error) {
            console.warn('[SessionContext] No user session, using system');
            cachedUserId = 'system';
        }

        console.log('[SessionContext] Initialized successfully');
    } catch (error) {
        console.error('[SessionContext] Initialization failed:', error);
        cachedUserId = 'system';
        cachedDeviceId = 'unknown';
    }
}

/**
 * Get current user ID
 * Returns cached value if available, otherwise fetches from Appwrite
 */
export async function getCurrentUserId(): Promise<string> {
    if (cachedUserId) {
        return cachedUserId;
    }

    // Fallback if not initialized
    try {
        const user = await account.get();
        cachedUserId = user.$id;
        return user.$id;
    } catch (error) {
        console.warn('[SessionContext] Failed to get user ID, using system');
        cachedUserId = 'system';
        return 'system';
    }
}

/**
 * Get device ID
 * Returns cached value if available, otherwise creates one
 */
export async function getDeviceId(): Promise<string> {
    if (cachedDeviceId) {
        return cachedDeviceId;
    }

    // Fallback if not initialized
    try {
        cachedDeviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

        if (!cachedDeviceId) {
            cachedDeviceId = Crypto.randomUUID();
            await AsyncStorage.setItem(DEVICE_ID_KEY, cachedDeviceId);
        }

        return cachedDeviceId;
    } catch (error) {
        console.error('[SessionContext] Failed to get device ID:', error);
        return 'unknown';
    }
}

/**
 * Update user ID (call after login/logout)
 */
export async function updateUserId(userId: string | null): Promise<void> {
    cachedUserId = userId || 'system';
    console.log('[SessionContext] User ID updated:', cachedUserId);
}

/**
 * Clear session context (call on logout)
 */
export async function clearSessionContext(): Promise<void> {
    cachedUserId = 'system';
    console.log('[SessionContext] Session context cleared');
}

/**
 * Get current session context
 */
export async function getSessionContext(): Promise<{
    userId: string;
    deviceId: string;
}> {
    return {
        userId: await getCurrentUserId(),
        deviceId: await getDeviceId()
    };
}
