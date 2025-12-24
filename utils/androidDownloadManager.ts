import * as FileSystem from 'expo-file-system';
import { Platform, Alert } from 'react-native';

/**
 * Save a file to Android Downloads folder using Storage Access Framework
 * This is the proper way to save files to Downloads on Android 10+
 */
export const saveToAndroidDownloads = async (
    sourceUri: string,
    filename: string
): Promise<{ success: boolean; path: string | null; error?: string }> => {
    if (Platform.OS !== 'android') {
        return {
            success: false,
            path: null,
            error: 'This function only works on Android'
        };
    }

    try {
        // Check if SAF is available
        if (!FileSystem.StorageAccessFramework) {
            return {
                success: false,
                path: null,
                error: 'Storage Access Framework not available'
            };
        }

        // Request permission to access a directory (Downloads)
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (!permissions.granted) {
            return {
                success: false,
                path: null,
                error: 'Permission denied by user'
            };
        }

        // Read the source file as base64
        const fileContent = await FileSystem.readAsStringAsync(sourceUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        // Create the file in the selected directory
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            filename,
            'application/pdf'
        );

        // Write the content to the new file
        await FileSystem.writeAsStringAsync(fileUri, fileContent, {
            encoding: FileSystem.EncodingType.Base64,
        });

        return {
            success: true,
            path: fileUri,
        };
    } catch (error) {
        console.error('Error saving to Android Downloads:', error);
        return {
            success: false,
            path: null,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};

/**
 * Save file to Downloads with automatic fallback
 * First tries to save to a pre-configured Downloads directory
 * If that fails, prompts user to select a location
 */
export const saveToDownloadsWithFallback = async (
    sourceUri: string,
    filename: string
): Promise<{ success: boolean; path: string | null; userSelected: boolean }> => {
    if (Platform.OS !== 'android') {
        return { success: false, path: null, userSelected: false };
    }

    try {
        // Try to use a cached Downloads directory URI if available
        // This would skip the picker if user has already granted permission
        const cachedUri = await getCachedDownloadsUri();

        if (cachedUri) {
            try {
                const fileContent = await FileSystem.readAsStringAsync(sourceUri, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
                    cachedUri,
                    filename,
                    'application/pdf'
                );

                await FileSystem.writeAsStringAsync(fileUri, fileContent, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                return {
                    success: true,
                    path: fileUri,
                    userSelected: false
                };
            } catch (error) {
                console.log('Cached URI failed, will prompt user:', error);
                // Fall through to user selection
            }
        }

        // Prompt user to select directory
        const result = await saveToAndroidDownloads(sourceUri, filename);

        if (result.success && result.path) {
            // Cache the directory URI for next time
            const directoryUri = result.path.substring(0, result.path.lastIndexOf('%2F'));
            await cacheDownloadsUri(directoryUri);
        }

        return {
            success: result.success,
            path: result.path,
            userSelected: true
        };
    } catch (error) {
        console.error('Error in saveToDownloadsWithFallback:', error);
        return { success: false, path: null, userSelected: false };
    }
};

/**
 * Get cached Downloads directory URI
 */
const getCachedDownloadsUri = async (): Promise<string | null> => {
    try {
        const uri = await FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Download');
        return uri;
    } catch (error) {
        return null;
    }
};

/**
 * Cache the Downloads directory URI for future use
 */
const cacheDownloadsUri = async (uri: string): Promise<void> => {
    // Note: In a real implementation, you might want to store this in AsyncStorage
    // For now, we rely on the system's permission persistence
    console.log('Downloads URI cached:', uri);
};

/**
 * Save to Downloads with user-friendly prompts
 */
export const saveToDownloadsWithPrompt = async (
    sourceUri: string,
    filename: string,
    onSuccess?: (path: string) => void,
    onError?: (error: string) => void
): Promise<void> => {
    if (Platform.OS !== 'android') {
        Alert.alert('Not Available', 'This feature is only available on Android');
        return;
    }

    try {
        const result = await saveToDownloadsWithFallback(sourceUri, filename);

        if (result.success && result.path) {
            const message = result.userSelected
                ? `File saved successfully!\n\nLocation: ${filename}\n\nYou can find it in the folder you selected.`
                : `File saved to Downloads!\n\nFilename: ${filename}`;

            Alert.alert('Success', message);
            onSuccess?.(result.path);
        } else {
            const errorMsg = 'Failed to save file. Please try again.';
            Alert.alert('Error', errorMsg);
            onError?.(errorMsg);
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
        Alert.alert('Error', `Failed to save file: ${errorMsg}`);
        onError?.(errorMsg);
    }
};
