# 🎯 Complete Template System Documentation

## ✅ What's Been Implemented

The PDF generation system has been completely refactored to use a flexible template-based approach where:

1. **Templates control formatting** - HTML templates handle all presentation logic
2. **Data is separated from presentation** - Item data is passed as objects, not pre-formatted HTML
3. **Multiple template options** - Easy switching between different designs
4. **Template-specific item formatting** - Each template can format items differently

## 🗂️ File Structure

```
/templates/
├── invoice_template.html           # Default professional template
├── invoice_template_minimal.html   # Compact template for paper saving
├── invoice_template_detailed.html  # Premium template with full features
├── invoice_template_receipt.html   # Receipt-style for thermal printers
├── TEMPLATE_GUIDE.md              # Detailed customization guide
├── TEMPLATE_EXAMPLES.md           # Usage examples and code samples
├── TEMPLATES_LIST.md              # Overview of all templates
└── README.md                      # General information

/utils/
├── templateUtils.ts               # Core template processing logic
├── templateConfig.ts              # Configuration and template switching
└── invoiceUtils.ts               # Currency and date formatting

/app/
└── print_order.tsx               # Updated to use new template system
```

## 🚀 How to Use

### 1. Switch Templates Globally

In `utils/templateConfig.ts`, change the default template:

```typescript
export const TEMPLATE_CONFIG = {
  defaultTemplate: 'detailed', // Change this line
  // ... rest of config
};
```

Available options:
- `'default'` - Professional, balanced design
- `'minimal'` - Compact, paper-saving design  
- `'detailed'` - Premium with full company information
- `'receipt'` - Thermal printer receipt style

### 2. Switch Templates Per Invoice (Advanced)

In `app/print_order.tsx`, modify the `generateInvoiceHTML` function:

```typescript
// Use specific template for this invoice
const htmlContent = await generateInvoiceHTMLFromTemplate(templateData, 'detailed');
```

### 3. Customize Item Display

Edit the template-specific functions in `utils/templateUtils.ts`:

```typescript
// Example: Add warranty information to detailed template
const generateDetailedItems = (items: InventoryItem[]): string => {
  return items.map((item, index) => `
    <tr>
      <td class="number-col">${index + 1}</td>
      <td>
        <strong>${item.full_description || 'N/A'}</strong>
        ${item.sequence ? `<br><small>Mã: ${item.sequence}</small>` : ''}
        <br><small style="color: #666;">Bảo hành: 12 tháng</small>
      </td>
      <td>${item.brand || 'N/A'}</td>
      <td><strong>${item.size || 'N/A'}</strong></td>
      <td class="price-col">${formatItemPrice(item.unit_price || 0)}</td>
      <td class="price-col"><strong>${formatItemPrice(item.unit_price || 0)}</strong></td>
    </tr>
  `).join('');
};
```

## 🛠️ Key Features

### Template-Specific Item Formatting

Each template formats items differently:

| Template | Item Format | Use Case |
|----------|-------------|----------|
| Default | Standard table row | General use |
| Minimal | Compact table row | Paper saving |
| Detailed | Enhanced with product codes | Professional invoices |
| Receipt | Stacked div layout | Thermal printers |

### Data Flow

```
Order Data → Items Array → Template Processor → Formatted HTML → PDF
```

1. **Order data** is parsed into an items array
2. **Template processor** formats items based on template type
3. **HTML template** receives formatted data
4. **PDF** is generated from final HTML

### Backward Compatibility

The system maintains compatibility with existing `{ITEMS_ROWS}` placeholder while adding new `ITEMS` array processing.

## 📝 Customization Examples

### Example 1: Add Product Codes to Default Template

```typescript
const generateDefaultItems = (items: InventoryItem[]): string => {
  return items.map((item, index) => `
    <tr>
      <td class="number-col">${index + 1}</td>
      <td>
        ${item.full_description || 'N/A'}
        ${item.sequence ? `<br><small style="color: #666;">Mã: ${item.sequence}</small>` : ''}
      </td>
      <td>${item.brand || 'N/A'}</td>
      <td>${item.size || 'N/A'}</td>
      <td class="price-col">${formatItemPrice(item.unit_price || 0)}</td>
      <td class="price-col">${formatItemPrice(item.unit_price || 0)}</td>
    </tr>
  `).join('');
};
```

### Example 2: Create Custom Template

1. **Create new template file**:
```html
<!-- templates/invoice_template_custom.html -->
<!DOCTYPE html>
<html>
<!-- Your custom template here -->
{ITEMS_ROWS}
</html>
```

2. **Add to template config**:
```typescript
export type TemplateType = 'default' | 'minimal' | 'detailed' | 'receipt' | 'custom';
```

3. **Add template loader case**:
```typescript
case 'custom':
  templateFileName = 'invoice_template_custom.html';
  break;
```

4. **Add custom item formatter**:
```typescript
const generateCustomItems = (items: InventoryItem[]): string => {
  // Your custom formatting logic
};
```

### Example 3: Conditional Template Selection

```typescript
// In print_order.tsx
const selectTemplate = (customer: Customer, items: InventoryItem[]) => {
  if (items.length > 10) return 'detailed';
  if (customer.discount_percent > 10) return 'default';
  return 'minimal';
};

const htmlContent = await generateInvoiceHTMLFromTemplate(
  templateData, 
  selectTemplate(customer, items)
);
```

## 🔧 Configuration Options

### Global Settings (templateConfig.ts)

```typescript
export const TEMPLATE_CONFIG = {
  defaultTemplate: 'default',     // Global default
  availableTemplates: [...],      // Template registry
};
```

### Per-Template Settings

Each template can have its own formatting logic in the `generateXXXItems` functions.

## 🎨 Styling Guidelines

- **Colors**: Use consistent color scheme across templates
- **Fonts**: Ensure fonts work well for printing
- **Layout**: Consider different paper sizes
- **Print optimization**: Include `@media print` CSS rules

## 📋 Benefits

1. **✅ Easy Template Switching** - Change with one line of code
2. **✅ Clean Separation** - Data logic separate from presentation
3. **✅ Template-Specific Formatting** - Each template can format items uniquely
4. **✅ Maintainable** - All formatting logic in dedicated functions
5. **✅ Extensible** - Easy to add new templates or modify existing ones
6. **✅ Type Safety** - Full TypeScript support with interfaces
7. **✅ Backward Compatible** - Existing functionality preserved

## 🎯 Quick Start

To switch to a different template right now:

1. Open `utils/templateConfig.ts`
2. Change `defaultTemplate: 'default'` to `defaultTemplate: 'detailed'`
3. Save and test your PDF generation

That's it! Your invoices will now use the detailed template with enhanced formatting.

---

**The PDF format is now completely controlled by the template files, giving you full control over the appearance and item formatting! 🎉**
