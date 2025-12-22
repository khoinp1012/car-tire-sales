import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

/**
 * Helper function to make files more accessible in Expo Go environment
 */
export const makeFileAccessible = async (filePath: string, filename: string) => {
  try {
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (isAvailable) {
      // Use expo-sharing for better accessibility
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/pdf',
        dialogTitle: 'Save or Share PDF'
      });
    } else {
      Alert.alert(
        'File Saved',
        `PDF saved to app storage. Use the Share button to access the file.\n\nFile: ${filename}`,
        [{ text: 'OK' }]
      );
    }
  } catch (error) {
    console.error('Error making file accessible:', error);
    Alert.alert(
      'File Information',
      `PDF saved to: ${filePath}\n\nUse the Share button to access the file.`,
      [{ text: 'OK' }]
    );
  }
};

/**
 * Show file location information to user
 */
export const showFileInfo = (filePath: string, filename: string) => {
  Alert.alert(
    'File Saved Successfully',
    `📄 ${filename}\n\n📁 Location: App Storage\n\n💡 Tip: Use the Share button to save to your device or send via email/messaging apps.`,
    [
      {
        text: 'Share Now',
        onPress: () => makeFileAccessible(filePath, filename)
      },
      {
        text: 'OK',
        style: 'cancel'
      }
    ]
  );
};

/**
 * List all PDF files in app directory
 */
export const listSavedPDFs = async (): Promise<string[]> => {
  try {
    const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory || '');
    return files.filter(file => file.endsWith('.pdf'));
  } catch (error) {
    console.error('Error listing PDFs:', error);
    return [];
  }
};

/**
 * Get file info for a saved PDF
 */
export const getPDFInfo = async (filename: string) => {
  try {
    const filePath = `${FileSystem.documentDirectory}${filename}`;
    const info = await FileSystem.getInfoAsync(filePath);
    
    if (info.exists) {
      return {
        path: filePath,
        size: info.size,
        modificationTime: info.modificationTime,
        uri: info.uri
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting PDF info:', error);
    return null;
  }
};
