// Template loading test utility
import { loadTemplateFromAssets, initializeTemplates } from './templateContent';
import { loadHTMLTemplate } from './templateUtils';

/**
 * Test template loading functionality
 * This function can be called from the app to verify templates are working
 */
export const testTemplateLoading = async (): Promise<void> => {
  console.log('🧪 Starting template loading test...');
  
  try {
    // Initialize templates
    console.log('📋 Step 1: Initializing templates...');
    await initializeTemplates();
    
    // Test direct template loading
    console.log('📋 Step 2: Testing direct template loading...');
    const directTemplate = await loadTemplateFromAssets('invoice_template.html');
    console.log(`✅ Direct loading successful: ${directTemplate.length} characters`);
    
    // Test template utility loading
    console.log('📋 Step 3: Testing template utility loading...');
    const utilityTemplate = await loadHTMLTemplate('default');
    console.log(`✅ Utility loading successful: ${utilityTemplate.length} characters`);
    
    // Test all template types
    const templateTypes = ['default', 'minimal', 'detailed', 'receipt'] as const;
    
    for (const templateType of templateTypes) {
      try {
        console.log(`📋 Step 4.${templateTypes.indexOf(templateType) + 1}: Testing ${templateType} template...`);
        const template = await loadHTMLTemplate(templateType);
        console.log(`✅ ${templateType} template loaded: ${template.length} characters`);
      } catch (error) {
        console.error(`❌ Failed to load ${templateType} template:`, error);
      }
    }
    
    console.log('🎉 Template loading test completed successfully!');
    
  } catch (error) {
    console.error('❌ Template loading test failed:', error);
    throw error;
  }
};

/**
 * Quick template test that can be called from components
 */
export const quickTemplateTest = async (): Promise<boolean> => {
  try {
    await initializeTemplates();
    const template = await loadHTMLTemplate('default');
    return template.length > 1000; // Basic size check
  } catch (error) {
    console.error('Quick template test failed:', error);
    return false;
  }
};
