import { Logger } from "./logger";
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

/**
 * Enhanced Bluetooth permission handler for Android 12+
 * This ensures proper runtime permission requests for thermal printing
 */
export async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true; // iOS doesn't need these permissions
  }

  try {
    const androidVersion = Platform.Version;
    Logger.log(`[BLUETOOTH PERMISSIONS] Android version: ${androidVersion}`);

    if (androidVersion >= 31) {
      // Android 12+ (API 31+) - Request new Bluetooth permissions
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      ];

      const results = await PermissionsAndroid.requestMultiple(permissions);
      
      const allGranted = Object.values(results).every(
        result => result === PermissionsAndroid.RESULTS.GRANTED
      );

      Logger.log('[BLUETOOTH PERMISSIONS] Android 12+ results:', results);
      Logger.log('[BLUETOOTH PERMISSIONS] All granted:', allGranted);

      if (!allGranted) {
        Alert.alert(
          'Bluetooth Permissions Required',
          'This app needs Bluetooth permissions to connect to thermal printers. Please grant all Bluetooth permissions in the app settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return false;
      }

      return true;
    } else {
      // Android 11 and below - Request location permissions for Bluetooth
      const permissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ];

      const results = await PermissionsAndroid.requestMultiple(permissions);
      
      const allGranted = Object.values(results).every(
        result => result === PermissionsAndroid.RESULTS.GRANTED
      );

      Logger.log('[BLUETOOTH PERMISSIONS] Android <12 results:', results);
      Logger.log('[BLUETOOTH PERMISSIONS] All granted:', allGranted);

      if (!allGranted) {
        Alert.alert(
          'Location Permissions Required',
          'This app needs location permissions to scan for Bluetooth thermal printers on Android 11 and below.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return false;
      }

      return true;
    }
  } catch (error) {
    Logger.error('[BLUETOOTH PERMISSIONS] Error requesting permissions:', error);
    Alert.alert(
      'Permission Error',
      'Failed to request Bluetooth permissions. Please try again or check app settings.'
    );
    return false;
  }
}

/**
 * Check if Bluetooth permissions are granted
 */
export async function checkBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const androidVersion = Platform.Version;

    if (androidVersion >= 31) {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      ];

      const results = await Promise.all(
        permissions.map(permission => PermissionsAndroid.check(permission))
      );

      return results.every(granted => granted);
    } else {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ];

      const results = await Promise.all(
        permissions.map(permission => PermissionsAndroid.check(permission))
      );

      return results.every(granted => granted);
    }
  } catch (error) {
    Logger.error('[BLUETOOTH PERMISSIONS] Error checking permissions:', error);
    return false;
  }
}
