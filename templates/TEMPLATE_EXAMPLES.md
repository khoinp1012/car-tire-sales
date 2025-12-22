# Template System Examples

This file shows examples of how to use the new template system where item formatting is controlled by the template.

## How to Switch Templates

In `app/print_order.tsx`, in the `generateInvoiceHTML` function, change the last parameter:

```typescript
// Default template (professional, balanced)
const htmlContent = await generateInvoiceHTMLFromTemplate(templateData, 'default');

// Minimal template (compact, paper-saving)
const htmlContent = await generateInvoiceHTMLFromTemplate(templateData, 'minimal');

// Detailed template (premium with full features)
const htmlContent = await generateInvoiceHTMLFromTemplate(templateData, 'detailed');

// Receipt template (thermal printer style)
const htmlContent = await generateInvoiceHTMLFromTemplate(templateData, 'receipt');
```

## How Items are Formatted by Each Template

### Default Template
```html
<tr>
  <td class="number-col">1</td>
  <td>Lốp xe Michelin Energy XM2+</td>
  <td>Michelin</td>
  <td>185/65R15</td>
  <td class="price-col">1,500,000</td>
  <td class="price-col">1,500,000</td>
</tr>
```

### Minimal Template
```html
<tr>
  <td class="number-col">1</td>
  <td>Lốp xe Michelin Energy XM2+</td>
  <td>Michelin</td>
  <td>185/65R15</td>
  <td class="price-col">1,500,000</td>
  <td class="price-col">1,500,000</td>
</tr>
```

### Detailed Template
```html
<tr>
  <td class="number-col">1</td>
  <td>
    <strong>Lốp xe Michelin Energy XM2+</strong>
    <br><small>Mã: 12345</small>
  </td>
  <td>Michelin</td>
  <td><strong>185/65R15</strong></td>
  <td class="price-col">1,500,000</td>
  <td class="price-col"><strong>1,500,000</strong></td>
</tr>
```

### Receipt Template
```html
<div class="item-row">
  <div class="item-name">Lốp xe Michelin Energy XM2+</div>
  <div class="item-details">
    <span>Brand: Michelin</span>
    <span>Size: 185/65R15</span>
  </div>
  <div class="item-price">
    <span>1 x 1,500,000</span>
    <span>1,500,000 VND</span>
  </div>
</div>
```

## Customizing Item Display

To customize how items are displayed, edit the functions in `utils/templateUtils.ts`:

### Example 1: Add item quantity
```typescript
const generateDefaultItems = (items: InventoryItem[]): string => {
  return items.map((item, index) => `
    <tr>
      <td class="number-col">${index + 1}</td>
      <td>${item.full_description || 'N/A'}</td>
      <td>${item.brand || 'N/A'}</td>
      <td>${item.size || 'N/A'}</td>
      <td class="number-col">1</td> <!-- Quantity -->
      <td class="price-col">${formatItemPrice(item.unit_price || 0)}</td>
      <td class="price-col">${formatItemPrice(item.unit_price || 0)}</td>
    </tr>
  `).join('');
};
```

### Example 2: Add product codes
```typescript
const generateDetailedItems = (items: InventoryItem[]): string => {
  return items.map((item, index) => `
    <tr>
      <td class="number-col">${index + 1}</td>
      <td>
        <strong>${item.full_description || 'N/A'}</strong>
        ${item.sequence ? `<br><small style="color: #666;">Mã SP: ${item.sequence}</small>` : ''}
        ${item.radius_size ? `<br><small style="color: #999;">R${item.radius_size}</small>` : ''}
      </td>
      <td>${item.brand || 'N/A'}</td>
      <td><strong>${item.size || 'N/A'}</strong></td>
      <td class="price-col">${formatItemPrice(item.unit_price || 0)}</td>
      <td class="price-col"><strong>${formatItemPrice(item.unit_price || 0)}</strong></td>
    </tr>
  `).join('');
};
```

### Example 3: Receipt with Vietnamese formatting
```typescript
const generateReceiptItems = (items: InventoryItem[]): string => {
  return items.map((item, index) => `
    <div class="item-row">
      <div class="item-name">${item.full_description || 'N/A'}</div>
      <div class="item-details">
        <span>Hãng: ${item.brand || 'N/A'}</span>
        <span>Cỡ: ${item.size || 'N/A'}</span>
      </div>
      <div class="item-price">
        <span>1 x ${formatItemPrice(item.unit_price || 0)}</span>
        <span>${formatItemPrice(item.unit_price || 0)} VNĐ</span>
      </div>
    </div>
  `).join('');
};
```

## Adding New Item Fields

If you want to display additional item information:

1. **Add to InventoryItem interface**:
```typescript
export interface InventoryItem {
  full_description: string;
  brand: string;
  size: string;
  unit_price: number;
  sequence?: number;
  radius_size?: number;
  warranty_months?: number; // New field
  origin_country?: string;   // New field
}
```

2. **Use in template functions**:
```typescript
const generateDetailedItems = (items: InventoryItem[]): string => {
  return items.map((item, index) => `
    <tr>
      <td class="number-col">${index + 1}</td>
      <td>
        <strong>${item.full_description || 'N/A'}</strong>
        ${item.sequence ? `<br><small>Mã: ${item.sequence}</small>` : ''}
        ${item.warranty_months ? `<br><small>Bảo hành: ${item.warranty_months} tháng</small>` : ''}
        ${item.origin_country ? `<br><small>Xuất xứ: ${item.origin_country}</small>` : ''}
      </td>
      <td>${item.brand || 'N/A'}</td>
      <td><strong>${item.size || 'N/A'}</strong></td>
      <td class="price-col">${formatItemPrice(item.unit_price || 0)}</td>
      <td class="price-col"><strong>${formatItemPrice(item.unit_price || 0)}</strong></td>
    </tr>
  `).join('');
};
```

## Benefits

1. **Template Control**: Each template can format items differently
2. **Easy Switching**: Change template with one parameter
3. **Clean Separation**: Data logic separate from presentation
4. **Maintainable**: All item formatting in one place per template
5. **Extensible**: Easy to add new templates or modify existing ones
