// Template switching utility for easy testing and customization
import { TemplateType } from './templateUtils';
import { TEMPLATE_CONFIG as APP_TEMPLATE_CONFIG } from '@/constants/config';
import { Logger } from './logger';

/**
 * Configuration for which template to use
 * Change this value to switch templates globally
 */
export const TEMPLATE_CONFIG: {
  defaultTemplate: TemplateType;
  availableTemplates: { type: TemplateType; name: string; description: string }[];
} = {
  defaultTemplate: APP_TEMPLATE_CONFIG.DEFAULT_TYPE, // Change this to switch default template
  availableTemplates: [
    {
      type: 'default',
      name: 'Mặc định',
      description: 'Template cân bằng, phù hợp mọi trường hợp'
    },
    {
      type: 'minimal',
      name: 'Tối giản',
      description: 'Template compact, tiết kiệm giấy'
    },
    {
      type: 'detailed',
      name: 'Chi tiết',
      description: 'Template đầy đủ thông tin, chuyên nghiệp'
    },
    {
      type: 'receipt',
      name: 'Phiếu thu',
      description: 'Template dạng receipt, thích hợp máy in nhiệt'
    }
  ]
};

/**
 * Get the current default template
 */
export const getCurrentTemplate = (): TemplateType => {
  return TEMPLATE_CONFIG.defaultTemplate;
};

/**
 * Helper function to get template info
 */
export const getTemplateInfo = (templateType: TemplateType) => {
  return TEMPLATE_CONFIG.availableTemplates.find(t => t.type === templateType);
};

/**
 * Print template options for debugging
 */
export const logAvailableTemplates = () => {
  Logger.log('📄 Available Invoice Templates:');
  TEMPLATE_CONFIG.availableTemplates.forEach(template => {
    const isCurrent = template.type === TEMPLATE_CONFIG.defaultTemplate;
    Logger.log(`${isCurrent ? '✅' : '📄'} ${template.name} (${template.type}): ${template.description}`);
  });
  Logger.log(`\n🎯 Current template: ${TEMPLATE_CONFIG.defaultTemplate}`);
};
