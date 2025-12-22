# New Template Field System - Summary

## ✅ What's Been Implemented

### 1. **Direct Field Access in Templates**
Instead of passing pre-built HTML, templates now have direct access to individual item fields:

**Before (Old System):**
```typescript
// JavaScript generates HTML
const itemsHTML = items.map(item => `<tr><td>${item.name}</td>...</tr>`).join('');
ITEMS_ROWS: itemsHTML  // Pass complete HTML string
```

**After (New System):**
```typescript
// Pass raw data
ITEMS: [
  { full_description: "Lốp Michelin", brand: "Michelin", size: "185/65R15", unit_price: 1500000 },
  // ... more items
]
```

### 2. **Template Loop System**
Templates use `{ITEMS_START}` and `{ITEMS_END}` markers to define item templates:

```html
{ITEMS_START}
<tr>
    <td>{ITEM_INDEX}</td>
    <td>{ITEM_FULL_DESCRIPTION}</td>
    <td>{ITEM_BRAND}</td>
    <td>{ITEM_SIZE}</td>
    <td>{ITEM_UNIT_PRICE} VNĐ</td>
</tr>
{ITEMS_END}
```

### 3. **Available Item Fields**
Each item in the loop has access to:
- `{ITEM_INDEX}` - Sequential number (1, 2, 3...)
- `{ITEM_FULL_DESCRIPTION}` - Product description
- `{ITEM_BRAND}` - Brand name
- `{ITEM_SIZE}` - Size specification
- `{ITEM_UNIT_PRICE}` - Formatted price (1,500,000)
- `{ITEM_UNIT_PRICE_RAW}` - Raw price number (1500000)
- `{ITEM_SEQUENCE}` - Product code (optional)
- `{ITEM_RADIUS_SIZE}` - Radius size (optional)

### 4. **Conditional Rendering**
Show content only when fields have values:

```html
{ITEM_SEQUENCE:CONDITIONAL_START}
<br><small>Product Code: {ITEM_SEQUENCE}</small>
{ITEM_SEQUENCE:CONDITIONAL_END}
```

### 5. **Updated All Templates**
- ✅ `invoice_template.html` - Default template
- ✅ `invoice_template_minimal.html` - Minimal template  
- ✅ `invoice_template_detailed.html` - Detailed template with conditionals
- ✅ `invoice_template_receipt.html` - Receipt style template

## 🎯 Benefits

### 1. **Template Control**
- Templates control **exactly** how items are displayed
- Different templates can show different fields
- No HTML generation in JavaScript code

### 2. **Flexibility**
- Easy to add/remove fields from display
- Custom formatting per template
- Conditional display of optional fields

### 3. **Maintainability**
- Clean separation: data in JS, presentation in templates
- Easy to customize without touching code
- Template-specific item layouts

## 🚀 Usage Examples

### Basic Item Display
```html
{ITEMS_START}
<div class="item">
    <h4>{ITEM_FULL_DESCRIPTION}</h4>
    <p>{ITEM_BRAND} - {ITEM_SIZE}</p>
    <span class="price">{ITEM_UNIT_PRICE} VNĐ</span>
</div>
{ITEMS_END}
```

### Advanced Item Display with Conditionals
```html
{ITEMS_START}
<tr class="item-row">
    <td>{ITEM_INDEX}</td>
    <td>
        <strong>{ITEM_FULL_DESCRIPTION}</strong>
        {ITEM_SEQUENCE:CONDITIONAL_START}
        <br><em>Mã: {ITEM_SEQUENCE}</em>
        {ITEM_SEQUENCE:CONDITIONAL_END}
    </td>
    <td><span class="brand">{ITEM_BRAND}</span></td>
    <td><strong style="color: blue;">{ITEM_SIZE}</strong></td>
    <td class="text-right">{ITEM_UNIT_PRICE} VNĐ</td>
</tr>
{ITEMS_END}
```

### Receipt Style Items
```html
{ITEMS_START}
<div class="receipt-item">
    <div class="item-name">{ITEM_FULL_DESCRIPTION}</div>
    <div class="item-info">
        {ITEM_BRAND} | {ITEM_SIZE} | {ITEM_UNIT_PRICE} VND
    </div>
</div>
{ITEMS_END}
```

## 🔧 Template Development

### 1. **Create Custom Item Layout**
1. Open any template file
2. Find the `{ITEMS_START}` ... `{ITEMS_END}` block
3. Modify the HTML structure inside
4. Use any available `{ITEM_*}` fields
5. Add conditional blocks if needed

### 2. **Test Different Templates**
In `print_order.tsx`, change:
```typescript
const htmlContent = await generateInvoiceHTMLFromTemplate(templateData, 'detailed');
```

### 3. **Add New Item Fields**
If you need new fields:
1. Add to `InventoryItem` interface in `templateUtils.ts`
2. Add to `itemData` object in `processItemLoops` function
3. Use as `{ITEM_NEW_FIELD}` in templates

## 📝 Migration Notes

- ✅ All existing templates updated
- ✅ Backward compatibility maintained
- ✅ No changes needed in `print_order.tsx` (uses `ITEMS` array)
- ✅ Template processing automatically handles the new system

## 🎉 Result

Templates now have **complete control** over item formatting! You can:
- Design unique layouts for each template
- Show/hide fields conditionally
- Format items differently per use case
- Add custom styling and layout
- All without touching JavaScript code!
