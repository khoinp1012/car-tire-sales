import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Save a file to the Downloads folder on Android, or app directory on iOS
 */
export const saveToDownloads = async (
  sourceUri: string, 
  filename: string
): Promise<{ success: boolean; path: string; location: string; appPath: string }> => {
  try {
    if (Platform.OS === 'android') {
      try {
        // First, copy the file to a proper location with correct extension
        const tempPath = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.copyAsync({
          from: sourceUri,
          to: tempPath,
        });

        // Request media library permissions
        const { status } = await MediaLibrary.requestPermissionsAsync();
        
        if (status === 'granted') {
          // Create asset from the properly named file
          const asset = await MediaLibrary.createAssetAsync(tempPath);
          
          // Try to get or create Downloads album
          let album = await MediaLibrary.getAlbumAsync('Download');
          
          if (album == null) {
            // Create Downloads album if it doesn't exist
            album = await MediaLibrary.createAlbumAsync('Download', asset, false);
          } else {
            // Add to existing Downloads album
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          }
          
          return {
            success: true,
            path: `Downloads/${filename}`,
            location: 'Downloads folder',
            appPath: tempPath
          };
        } else {
          // Permission denied, keep file in app directory
          return {
            success: true,
            path: tempPath,
            location: 'App storage (no Downloads permission)',
            appPath: tempPath
          };
        }
      } catch (error) {
        console.warn('MediaLibrary method failed, trying alternative approach:', error);
        
        // Alternative approach: Try to save directly to Downloads using FileSystem
        try {
          const downloadsPath = `${FileSystem.documentDirectory}../Downloads/${filename}`;
          await FileSystem.copyAsync({
            from: sourceUri,
            to: downloadsPath,
          });
          
          return {
            success: true,
            path: downloadsPath,
            location: 'Downloads folder (direct)',
            appPath: sourceUri
          };
        } catch (directError) {
          console.warn('Direct Downloads access failed:', directError);
          
          // Final fallback - save to app directory
          const newPath = `${FileSystem.documentDirectory}${filename}`;
          await FileSystem.copyAsync({
            from: sourceUri,
            to: newPath,
          });
          
          return {
            success: true,
            path: newPath,
            location: 'App storage (fallback)',
            appPath: newPath
          };
        }
      }
    } else {
      // iOS - save to app directory
      const newPath = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.copyAsync({
        from: sourceUri,
        to: newPath,
      });
      
      return {
        success: true,
        path: newPath,
        location: 'App storage',
        appPath: newPath
      };
    }
  } catch (error) {
    console.error('Error saving file:', error);
    
    // Final fallback - try to save to app directory
    try {
      const newPath = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.copyAsync({
        from: sourceUri,
        to: newPath,
      });
      
      return {
        success: true,
        path: newPath,
        location: 'App storage (error fallback)',
        appPath: newPath
      };
    } catch (fallbackError) {
      console.error('All save methods failed:', fallbackError);
      return {
        success: false,
        path: sourceUri,
        location: 'Failed to save',
        appPath: sourceUri
      };
    }
  }
};

/**
 * Check if we have permission to write to Downloads folder
 */
export const checkDownloadsPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false; // iOS doesn't support Downloads folder access
  }
  
  try {
    const { status } = await MediaLibrary.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking Downloads permission:', error);
    return false;
  }
};

/**
 * Request permission to write to Downloads folder
 */
export const requestDownloadsPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false; // iOS doesn't support Downloads folder access
  }
  
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting Downloads permission:', error);
    return false;
  }
};
