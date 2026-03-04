// Template loading utilities for Expo compatibility
// This file focuses on loading template files from bundled assets only
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { Logger } from './logger';

/**
 * Load HTML template content using require() with detailed debugging
 */
export const loadTemplateFromAssets = async (templateFileName: string): Promise<string> => {
  Logger.log(`🔄 Loading template: ${templateFileName}`);
  Logger.log(`📍 Template file path: ../assets/templates/${templateFileName}`);

  try {
    let templateModule: any;

    switch (templateFileName) {
      case 'invoice_template.html':
        templateModule = require('../assets/templates/invoice_template.html');
        break;
      case 'invoice_template_minimal.html':
        templateModule = require('../assets/templates/invoice_template_minimal.html');
        break;
      case 'invoice_template_detailed.html':
        templateModule = require('../assets/templates/invoice_template_detailed.html');
        break;
      case 'invoice_template_receipt.html':
        templateModule = require('../assets/templates/invoice_template_receipt.html');
        break;
      default:
        throw new Error(`Unknown template file: ${templateFileName}`);
    }

    Logger.log(`🔍 Template module debug:`);
    Logger.log(`   Type: ${typeof templateModule}`);
    Logger.log(`   Is string: ${typeof templateModule === 'string'}`);
    Logger.log(`   Is object: ${typeof templateModule === 'object'}`);
    Logger.log(`   Keys: ${templateModule && typeof templateModule === 'object' ? Object.keys(templateModule) : 'N/A'}`);
    Logger.log(`   Constructor: ${templateModule?.constructor?.name || 'N/A'}`);
    Logger.log(`   Raw value: ${JSON.stringify(templateModule)?.substring(0, 200)}...`);

    // Try different ways to extract content
    let content = null;

    if (typeof templateModule === 'string') {
      content = templateModule;
      Logger.log(`�📄 Using direct string content`);
    } else if (templateModule?.default) {
      content = templateModule.default;
      Logger.log(`📄 Using default property`);
    } else if (templateModule?.uri) {
      // If it's an asset with URI, read the file
      Logger.log(`📄 Found URI property: ${templateModule.uri}`);
      try {
        content = await FileSystem.readAsStringAsync(templateModule.uri);
        Logger.log(`📄 Read content via URI`);
      } catch (uriError) {
        Logger.log(`❌ Failed to read via URI: ${uriError}`);
      }
    } else if (typeof templateModule === 'number') {
      // In Expo, assets are represented as numbers (asset IDs)
      Logger.log(`📄 Template module is number (asset ID): ${templateModule}`);
      Logger.log(`🔧 Using Asset API to resolve asset ID...`);

      try {
        const asset = Asset.fromModule(templateModule);
        await asset.downloadAsync();

        if (!asset.localUri) {
          throw new Error(`Asset localUri is null for asset ID ${templateModule}`);
        }

        Logger.log(`📍 Asset resolved to URI: ${asset.localUri}`);
        content = await FileSystem.readAsStringAsync(asset.localUri);
        Logger.log(`📄 Read content via Asset API`);

      } catch (assetError) {
        throw new Error(`Failed to resolve asset ID ${templateModule}: ${assetError instanceof Error ? assetError.message : String(assetError)}`);
      }
    }

    if (!content) {
      throw new Error(`Could not extract content from template module. Type: ${typeof templateModule}, Value: ${JSON.stringify(templateModule)}`);
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new Error(`Template content is invalid. Type: ${typeof content}, Length: ${content?.length || 0}`);
    }

    Logger.log(`✅ Successfully loaded template: ${templateFileName}`);
    Logger.log(`📊 Content length: ${content.length} chars`);
    Logger.log(`📋 Content preview: ${content.substring(0, 100)}...`);
    Logger.log(`🎯 Content type verification: ${typeof content}`);

    return content;

  } catch (error) {
    Logger.error(`❌ Failed to load template ${templateFileName}:`, error);
    throw error;
  }
};

/**
 * Initialize templates by validating they can be loaded
 */
export const initializeTemplates = async (): Promise<void> => {
  Logger.log('🔄 Initializing templates...');

  try {
    // Validate that required templates can be loaded
    const templateFiles = [
      'invoice_template.html',
      'invoice_template_minimal.html',
      'invoice_template_detailed.html',
      'invoice_template_receipt.html'
    ];

    Logger.log(`🔍 Checking ${templateFiles.length} template files...`);

    for (const fileName of templateFiles) {
      try {
        Logger.log(`📋 Validating template: ${fileName}`);
        const content = await loadTemplateFromAssets(fileName);

        if (content && content.length > 0) {
          Logger.log(`✅ Template validated: ${fileName} (${content.length} chars)`);
        } else {
          Logger.warn(`⚠️ Template is empty: ${fileName}`);
        }
      } catch (error) {
        Logger.warn(`⚠️ Could not validate template ${fileName}:`, error);
      }
    }

    Logger.log('✅ Template initialization completed');
  } catch (error) {
    Logger.error('❌ Template initialization failed:', error);
    throw error;
  }
};
