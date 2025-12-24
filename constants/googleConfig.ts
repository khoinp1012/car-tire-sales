// Google Sign-In Configuration
// Get these from Google Cloud Console: https://console.cloud.google.com/

import { ENV } from './env';

/**
 * Google Web Client ID from Google Cloud Console
 * This is used for Google Sign-In authentication
 */
export const GOOGLE_WEB_CLIENT_ID = ENV.GOOGLE.WEB_CLIENT_ID;

/**
 * Appwrite function URL for native sign-in
 * Using the function ID 'google-native-signin' from appwrite.json
 */
export const APPWRITE_NATIVE_SIGNIN_FUNCTION_URL = ENV.GOOGLE.SIGNIN_FUNCTION_URL;
