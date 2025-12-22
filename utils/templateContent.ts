// Template loading utilities for Expo compatibility
// This file focuses on loading template files from bundled assets only

import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

/**
 * Load HTML template content using require() with detailed debugging
 */
export const loadTemplateFromAssets = async (templateFileName: string): Promise<string> => {
  console.log(`🔄 Loading template: ${templateFileName}`);
  console.log(`📍 Template file path: ../assets/templates/${templateFileName}`);
  
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
    
    console.log(`🔍 Template module debug:`);
    console.log(`   Type: ${typeof templateModule}`);
    console.log(`   Is string: ${typeof templateModule === 'string'}`);
    console.log(`   Is object: ${typeof templateModule === 'object'}`);
    console.log(`   Keys: ${templateModule && typeof templateModule === 'object' ? Object.keys(templateModule) : 'N/A'}`);
    console.log(`   Constructor: ${templateModule?.constructor?.name || 'N/A'}`);
    console.log(`   Raw value: ${JSON.stringify(templateModule)?.substring(0, 200)}...`);
    
    // Try different ways to extract content
    let content = null;
    
    if (typeof templateModule === 'string') {
      content = templateModule;
      console.log(`� Using direct string content`);
    } else if (templateModule?.default) {
      content = templateModule.default;
      console.log(`📄 Using default property`);
    } else if (templateModule?.uri) {
      // If it's an asset with URI, read the file
      console.log(`📄 Found URI property: ${templateModule.uri}`);
      try {
        content = await FileSystem.readAsStringAsync(templateModule.uri);
        console.log(`📄 Read content via URI`);
      } catch (uriError) {
        console.log(`❌ Failed to read via URI: ${uriError}`);
      }
    } else if (typeof templateModule === 'number') {
      // In Expo, assets are represented as numbers (asset IDs)
      console.log(`📄 Template module is number (asset ID): ${templateModule}`);
      console.log(`🔧 Using Asset API to resolve asset ID...`);
      
      try {
        const asset = Asset.fromModule(templateModule);
        await asset.downloadAsync();
        
        if (!asset.localUri) {
          throw new Error(`Asset localUri is null for asset ID ${templateModule}`);
        }
        
        console.log(`📍 Asset resolved to URI: ${asset.localUri}`);
        content = await FileSystem.readAsStringAsync(asset.localUri);
        console.log(`📄 Read content via Asset API`);
        
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
    
    console.log(`✅ Successfully loaded template: ${templateFileName}`);
    console.log(`📊 Content length: ${content.length} chars`);
    console.log(`📋 Content preview: ${content.substring(0, 100)}...`);
    console.log(`🎯 Content type verification: ${typeof content}`);
    
    return content;
    
  } catch (error) {
    console.error(`❌ Failed to load template ${templateFileName}:`, error);
    throw error;
  }
};

/**
 * Initialize templates by validating they can be loaded
 */
export const initializeTemplates = async (): Promise<void> => {
  console.log('🔄 Initializing templates...');
  
  try {
    // Validate that required templates can be loaded
    const templateFiles = [
      'invoice_template.html',
      'invoice_template_minimal.html',
      'invoice_template_detailed.html',
      'invoice_template_receipt.html'
    ];
    
    console.log(`🔍 Checking ${templateFiles.length} template files...`);
    
    for (const fileName of templateFiles) {
      try {
        console.log(`📋 Validating template: ${fileName}`);
        const content = await loadTemplateFromAssets(fileName);
        
        if (content && content.length > 0) {
          console.log(`✅ Template validated: ${fileName} (${content.length} chars)`);
        } else {
          console.warn(`⚠️ Template is empty: ${fileName}`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not validate template ${fileName}:`, error);
      }
    }
    
    console.log('✅ Template initialization completed');
  } catch (error) {
    console.error('❌ Template initialization failed:', error);
    throw error;
  }
};
