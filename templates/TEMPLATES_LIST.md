# Available Invoice Templates

This document lists all available invoice templates in the system.

## Template Files

1. **`invoice_template.html`** - Default Template
   - **Style**: Modern, balanced design
   - **Use case**: General purpose, professional invoices
   - **Features**: Clean layout, company branding, structured design
   - **Print size**: A4 optimized

2. **`invoice_template_minimal.html`** - Minimal Template  
   - **Style**: Simple, compact design
   - **Use case**: Quick receipts, paper-saving
   - **Features**: Essential information only, small fonts
   - **Print size**: Small receipt format

3. **`invoice_template_detailed.html`** - Detailed Template
   - **Style**: Comprehensive, premium design  
   - **Use case**: Formal business invoices, important customers
   - **Features**: Full company info, terms & conditions, colorful design
   - **Print size**: A4 with full page utilization

4. **`invoice_template_receipt.html`** - Receipt Style Template
   - **Style**: Thermal printer receipt style
   - **Use case**: Point-of-sale receipts, mobile printing
   - **Features**: Monospace font, narrow width, dashed separators
   - **Print size**: Receipt paper (58mm/80mm width)

## Template Usage in Code

```typescript
// Import the utility
import { generateInvoiceHTMLFromTemplate, TemplateData, TemplateType } from '@/utils/templateUtils';

// Prepare data
const templateData: TemplateData = {
  INVOICE_NUMBER: 'HD12345678',
  ORDER_DATE: '25/07/2025, 14:30',
  CUSTOMER_NAME: 'Nguyễn Văn A',
  CUSTOMER_PHONE: '0123456789',
  ITEMS_ROWS: '<tr><td>1</td><td>Product</td>...</tr>',
  SUBTOTAL: '2,000,000',
  DISCOUNT_PERCENT: '5',
  DISCOUNT_AMOUNT: '100,000',
  FINAL_TOTAL: '1,900,000'
};

// Generate HTML with different templates
const defaultHTML = await generateInvoiceHTMLFromTemplate(templateData, 'default');
const minimalHTML = await generateInvoiceHTMLFromTemplate(templateData, 'minimal');
const detailedHTML = await generateInvoiceHTMLFromTemplate(templateData, 'detailed');
const receiptHTML = await generateInvoiceHTMLFromTemplate(templateData, 'receipt');
```

## Switching Templates

To change the default template used in the app, modify the `generateInvoiceHTML` function in `app/print_order.tsx`:

```typescript
// Change this line:
const htmlContent = await generateInvoiceHTMLFromTemplate(templateData, 'default');

// To use a different template:
const htmlContent = await generateInvoiceHTMLFromTemplate(templateData, 'detailed');
```

## Template Comparison

| Feature | Default | Minimal | Detailed | Receipt |
|---------|---------|---------|----------|---------|
| Company Logo | ❌ | ❌ | ✅ | ❌ |
| Color Design | ✅ | ❌ | ✅ | ❌ |
| Terms & Conditions | ❌ | ❌ | ✅ | ❌ |
| Print Size | A4 | Small | A4 | Receipt |
| Professional Look | ✅ | ❌ | ✅ | ❌ |
| Paper Saving | ❌ | ✅ | ❌ | ✅ |
| Mobile Friendly | ✅ | ✅ | ❌ | ✅ |

## Creating Custom Templates

1. Create a new HTML file in the `templates/` folder
2. Copy structure from existing template
3. Modify CSS and HTML as needed
4. Add to `TemplateType` in `templateUtils.ts`
5. Add case in `loadHTMLTemplate` function

## Backup Information

Before making changes to templates, always:
1. Backup original files
2. Test on different devices
3. Verify PDF output quality
4. Check print compatibility

## Support

For template customization help, refer to:
- `TEMPLATE_GUIDE.md` - Detailed customization guide
- `README.md` - General system information
