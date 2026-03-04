import * as FileSystem from 'expo-file-system';
import { Logger } from './logger';

// Import template content from files
// Note: These need to be loaded as assets in Expo
const loadTemplateFile = async (fileName: string): Promise<string> => {
  try {
    // For Expo, we need to copy template files to assets or use a different approach
    // First, let's try to read from the app's assets directory
    const assetPath = `../assets/templates/${fileName}`;
    const fileInfo = await FileSystem.getInfoAsync(assetPath);

    if (fileInfo.exists) {
      return await FileSystem.readAsStringAsync(assetPath);
    }

    // If that fails, try reading from document directory
    const docPath = `${FileSystem.documentDirectory}templates/${fileName}`;
    const docFileInfo = await FileSystem.getInfoAsync(docPath);

    if (docFileInfo.exists) {
      return await FileSystem.readAsStringAsync(docPath);
    }

    throw new Error(`Template file ${fileName} not found in assets or documents`);
  } catch (error) {
    Logger.error(`Failed to load template file ${fileName}:`, error);

    throw error;
  }
};

// Template content map - will be populated with actual template content
export const templateContentMap: Record<string, string> = {};

// Initialize templates by reading files and storing content
export const initializeTemplates = async (): Promise<void> => {
  const templateFiles = [
    'invoice_template.html',
    'invoice_template_minimal.html',
    'invoice_template_detailed.html',
    'invoice_template_receipt.html'
  ];

  for (const fileName of templateFiles) {
    try {
      const content = await loadTemplateFile(fileName);
      templateContentMap[fileName] = content;
      Logger.log(`✅ Loaded template: ${fileName} (${content.length} chars)`);

    } catch (error) {
      Logger.error(`❌ Failed to load template: ${fileName}`, error);

    }
  }
};

// Get template content by file name
export const getTemplateContent = (fileName: string): string | null => {
  return templateContentMap[fileName] || null;
};
