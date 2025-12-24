// Template utilities for processing HTML templates with placeholders
import * as FileSystem from 'expo-file-system';
import { loadTemplateFromAssets, initializeTemplates } from './templateContent';
import { formatTireSize } from './tireSizeFormatter';

// Minimal fallback template in case all file loading fails
const FALLBACK_DEFAULT_TEMPLATE = `// Template utilities for processing HTML templates with placeholders
import * as FileSystem from 'expo-file-system';
import { loadTemplateFromAssets, initializeTemplates } from './templateContent';`;

export interface InventoryItem {
  full_description: string;
  brand: string;
  size: string;
  unit_price: number;
  sequence?: number;
  radius_size?: number;
}

export interface TemplateData {
  INVOICE_NUMBER: string;
  ORDER_DATE: string;
  CUSTOMER_NAME: string;
  CUSTOMER_PHONE: string;
  ITEMS: InventoryItem[];
  SUBTOTAL: string;
  DISCOUNT_PERCENT: string;
  DISCOUNT_AMOUNT: string;
  FINAL_TOTAL: string;
}

export type TemplateType = 'default' | 'minimal' | 'detailed' | 'receipt';

/**
 * Load HTML template from files using the template loading system
 */
export const loadHTMLTemplate = async (templateType: TemplateType = 'default'): Promise<string> => {
  console.log(`🔄 Loading template: ${templateType}`);

  try {
    // Ensure templates are initialized first
    await initializeTemplates();

    // Map template types to file names
    const templateFileMap: Record<TemplateType, string> = {
      'default': 'invoice_template.html',
      'minimal': 'invoice_template_minimal.html',
      'detailed': 'invoice_template_detailed.html',
      'receipt': 'invoice_template_receipt.html'
    };

    const templateFileName = templateFileMap[templateType];
    console.log(`📋 Loading template file: ${templateFileName} for type: ${templateType}`);

    // Load the template - no fallback, only use actual template files
    const templateContent = await loadTemplateFromAssets(templateFileName);

    if (!templateContent || templateContent.trim().length === 0) {
      throw new Error(`Template ${templateFileName} is empty`);
    }

    console.log(`✅ Successfully loaded template: ${templateType} (${templateContent.length} chars)`);
    console.log(`📄 Template file used: ${templateFileName}`);
    return templateContent;

  } catch (error) {
    console.error(`❌ Error loading template "${templateType}":`, error);
    throw error;
  }
};

/**
 * Process template by replacing placeholders with actual data
 */
export const processHTMLTemplate = (template: string, data: TemplateData, templateType: TemplateType = 'default'): string => {
  console.log(`🔧 Processing template. Type: ${templateType}, Template length: ${template?.length || 'undefined'}`);

  if (!template) {
    console.error('❌ Template is undefined in processHTMLTemplate!');
    throw new Error('Template is undefined');
  }

  let processedTemplate = template;

  // Handle ITEMS processing - find and process item loops in template
  processedTemplate = processItemLoops(processedTemplate, data.ITEMS);

  // Replace all other placeholders (excluding ITEMS which is already processed)
  Object.entries(data).forEach(([key, value]) => {
    if (key === 'ITEMS') return; // Skip the items array, already processed

    const placeholder = `{${key}}`;
    const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
    processedTemplate = processedTemplate.replace(regex, value.toString());
  });

  return processedTemplate;
};

/**
 * Process item loops in template - handles {ITEMS_START} ... {ITEMS_END} blocks
 */
const processItemLoops = (template: string, items: InventoryItem[]): string => {
  // Look for item loop blocks: {ITEMS_START} ... {ITEMS_END}
  const itemLoopRegex = /\{ITEMS_START\}([\s\S]*?)\{ITEMS_END\}/g;

  return template.replace(itemLoopRegex, (match, itemTemplate) => {
    // Generate HTML for each item using the template within the loop
    return items.map((item, index) => {
      let processedItem = itemTemplate;

      // Replace item-specific placeholders
      const itemData = {
        ITEM_INDEX: (index + 1).toString(),
        ITEM_FULL_DESCRIPTION: item.full_description || 'N/A',
        ITEM_BRAND: item.brand || 'N/A',
        ITEM_SIZE: formatTireSize(item.size) || 'N/A',
        ITEM_UNIT_PRICE: formatItemPrice(item.unit_price || 0),
        ITEM_UNIT_PRICE_RAW: (item.unit_price || 0).toString(),
        ITEM_SEQUENCE: item.sequence?.toString() || '',
        ITEM_RADIUS_SIZE: item.radius_size?.toString() || ''
      };

      // Process conditional blocks first (before replacing placeholders)
      processedItem = processConditionalBlocks(processedItem, itemData);

      // Replace all item placeholders
      Object.entries(itemData).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
        processedItem = processedItem.replace(regex, value);
      });

      return processedItem;
    }).join('');
  });
};

/**
 * Process conditional blocks in item templates
 * Format: {FIELD_NAME:CONDITIONAL_START} ... {FIELD_NAME:CONDITIONAL_END}
 */
const processConditionalBlocks = (template: string, itemData: { [key: string]: string }): string => {
  // Look for conditional blocks: {FIELD_NAME:CONDITIONAL_START} ... {FIELD_NAME:CONDITIONAL_END}
  const conditionalRegex = /\{(\w+):CONDITIONAL_START\}([\s\S]*?)\{\1:CONDITIONAL_END\}/g;

  return template.replace(conditionalRegex, (match, fieldName, conditionalContent) => {
    // Check if the field has a value (not empty string)
    const fieldValue = itemData[fieldName];
    if (fieldValue && fieldValue.trim() !== '') {
      return conditionalContent;
    } else {
      return ''; // Remove the conditional block if field is empty
    }
  });
};

/**
 * Format item price for display
 */
const formatItemPrice = (price: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

/**
 * Generate complete invoice HTML using template
 */
export const generateInvoiceHTMLFromTemplate = async (
  data: TemplateData,
  templateType: TemplateType = 'default'
): Promise<string> => {
  try {
    console.log(`🚀 Starting HTML generation for template: ${templateType}`);
    console.log(`📊 Items count: ${data.ITEMS.length}`);

    // Load the template
    const template = await loadHTMLTemplate(templateType);
    console.log(`🔧 Template loaded. Length: ${template?.length || 'undefined'}, Type: ${typeof template}`);

    if (!template) {
      throw new Error('Template is undefined after loading');
    }

    // Process placeholders with template-specific formatting
    const processedHTML = processHTMLTemplate(template, data, templateType);

    console.log(`✅ HTML generation complete!`);
    console.log(`📄 Final HTML size: ${processedHTML.length} characters`);
    console.log(`💾 Estimated size: ${Math.round(processedHTML.length / 1024)} KB`);

    return processedHTML;
  } catch (error) {
    console.error('❌ Error generating invoice HTML from template:', error);
    throw error;
  }
};
