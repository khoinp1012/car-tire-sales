import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Simple approach to save files to external storage
 * This bypasses MediaLibrary and uses direct file system access
 * Always keeps a copy in app directory for sharing purposes
 */
export const saveToExternalStorage = async (
  sourceUri: string, 
  filename: string
): Promise<{ success: boolean; path: string; location: string; appPath: string }> => {
  try {
    // First, always save to app directory as backup for sharing
    const appPath = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.copyAsync({
      from: sourceUri,
      to: appPath,
    });

    if (Platform.OS === 'android') {
      try {
        // Try to save to public external directory
        // Note: This might require WRITE_EXTERNAL_STORAGE permission
        const externalPath = `${FileSystem.documentDirectory}../../../storage/emulated/0/Download/${filename}`;
        
        await FileSystem.copyAsync({
          from: appPath,
          to: externalPath,
        });
        
        return {
          success: true,
          path: `/storage/emulated/0/Download/${filename}`,
          location: 'Downloads folder (external)',
          appPath: appPath
        };
      } catch (externalError) {
        console.warn('External storage access failed:', externalError);
        
        // Fallback to app directory (which we already saved)
        return {
          success: true,
          path: appPath,
          location: 'App storage (external access failed)',
          appPath: appPath
        };
      }
    } else {
      // iOS - app directory only
      return {
        success: true,
        path: appPath,
        location: 'App storage',
        appPath: appPath
      };
    }
  } catch (error) {
    console.error('Error in saveToExternalStorage:', error);
    return {
      success: false,
      path: sourceUri,
      location: 'Save failed',
      appPath: sourceUri
    };
  }
};

/**
 * Alternative method using StorageAccessFramework (Android 11+)
 * This allows users to pick the save location
 */
export const saveWithUserPicker = async (
  sourceUri: string,
  filename: string
): Promise<{ success: boolean; path: string; location: string }> => {
  try {
    if (Platform.OS !== 'android') {
      // Fallback for non-Android
      return saveToExternalStorage(sourceUri, filename);
    }

    // For now, use the simple method
    // In the future, this could be enhanced with StorageAccessFramework
    return saveToExternalStorage(sourceUri, filename);
  } catch (error) {
    console.error('Error in saveWithUserPicker:', error);
    return {
      success: false,
      path: sourceUri,
      location: 'Save failed'
    };
  }
};
