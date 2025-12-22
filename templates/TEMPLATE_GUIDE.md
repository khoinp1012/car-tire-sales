# Invoice Template System

Hệ thống template HTML cho việc tạo hóa đơn PDF trong ứng dụng bán hàng lốp xe.

## Cấu trúc Templates

### 1. Templates có sẵn

- **`invoice_template.html`** - Template mặc định với thiết kế cân bằng
- **`invoice_template_minimal.html`** - Template tối giản, tiết kiệm giấy
- **`invoice_template_detailed.html`** - Template chi tiết với đầy đủ thông tin

### 2. Placeholders (Các biến thay thế)

Tất cả templates đều sử dụng các placeholder sau:

#### Invoice Information Placeholders:
```
{INVOICE_NUMBER}    - Số hóa đơn (VD: HD12345678)
{ORDER_DATE}        - Ngày lập hóa đơn (VD: 25/07/2025, 14:30)
{CUSTOMER_NAME}     - Tên khách hàng
{CUSTOMER_PHONE}    - Số điện thoại khách hàng
{SUBTOTAL}          - Tổng tiền trước chiết khấu
{DISCOUNT_PERCENT}  - Phần trăm chiết khấu (VD: 5)
{DISCOUNT_AMOUNT}   - Số tiền chiết khấu
{FINAL_TOTAL}       - Tổng tiền cuối cùng
```

#### Items Loop System:
Templates sử dụng hệ thống loop để hiển thị danh sách sản phẩm:

```html
{ITEMS_START}
<!-- Template for each item -->
<tr>
    <td>{ITEM_INDEX}</td>
    <td>{ITEM_FULL_DESCRIPTION}</td>
    <td>{ITEM_BRAND}</td>
    <td>{ITEM_SIZE}</td>
    <td>{ITEM_UNIT_PRICE}</td>
</tr>
{ITEMS_END}
```

#### Available Item Fields:
```
{ITEM_INDEX}            - Số thứ tự (1, 2, 3...)
{ITEM_FULL_DESCRIPTION} - Mô tả đầy đủ sản phẩm
{ITEM_BRAND}            - Thương hiệu
{ITEM_SIZE}             - Kích cỡ
{ITEM_UNIT_PRICE}       - Đơn giá (đã format: 1,500,000)
{ITEM_UNIT_PRICE_RAW}   - Đơn giá thô (1500000)
{ITEM_SEQUENCE}         - Mã sản phẩm (có thể trống)
{ITEM_RADIUS_SIZE}      - Kích thước bán kính (có thể trống)
```

#### Conditional Rendering:
Để hiển thị thông tin chỉ khi field có giá trị:

```html
{ITEM_SEQUENCE:CONDITIONAL_START}
<br><small>Mã SP: {ITEM_SEQUENCE}</small>
{ITEM_SEQUENCE:CONDITIONAL_END}
```

Block này chỉ xuất hiện nếu `ITEM_SEQUENCE` có giá trị.

## Cách sử dụng

### 1. Trong code TypeScript

```typescript
import { generateInvoiceHTMLFromTemplate, TemplateData } from '@/utils/templateUtils';

// Chuẩn bị dữ liệu
const templateData: TemplateData = {
  INVOICE_NUMBER: 'HD12345678',
  ORDER_DATE: '25/07/2025, 14:30',
  CUSTOMER_NAME: 'Nguyễn Văn A',
  CUSTOMER_PHONE: '0123456789',
  ITEMS: [
    {
      full_description: 'Lốp xe Michelin Energy XM2',
      brand: 'Michelin',
      size: '185/65R15',
      unit_price: 1500000,
      sequence: 'LP001'
    },
    {
      full_description: 'Lốp xe Bridgestone Turanza',
      brand: 'Bridgestone', 
      size: '195/55R16',
      unit_price: 1800000
    }
  ],
  SUBTOTAL: '3,300,000',
  DISCOUNT_PERCENT: '5',
  DISCOUNT_AMOUNT: '165,000',
  FINAL_TOTAL: '3,135,000'
};

// Tạo HTML từ template mặc định
const htmlContent = await generateInvoiceHTMLFromTemplate(templateData);

// Hoặc sử dụng template khác
const minimalHTML = await generateInvoiceHTMLFromTemplate(templateData, 'minimal');
const detailedHTML = await generateInvoiceHTMLFromTemplate(templateData, 'detailed');
```

### 2. Thay đổi template trong print_order.tsx

```typescript
// Trong hàm generateInvoiceHTML, thay đổi template type:
const htmlContent = await generateInvoiceHTMLFromTemplate(templateData, 'detailed');
```

## Tùy chỉnh Templates

### 1. Chỉnh sửa template có sẵn

Mở file template bằng text editor và chỉnh sửa:

- **CSS styles**: Thay đổi màu sắc, font chữ, kích thước
- **HTML structure**: Thay đổi bố cục, thêm/bớt thông tin
- **Content**: Thay đổi text hiển thị

### 2. Tạo template mới

1. Tạo file mới trong thư mục `templates/` (VD: `invoice_template_custom.html`)
2. Copy nội dung từ template có sẵn
3. Chỉnh sửa theo ý muốn
4. Cập nhật `templateUtils.ts` để hỗ trợ template mới:

```typescript
export type TemplateType = 'default' | 'minimal' | 'detailed' | 'custom';

// Thêm case trong loadHTMLTemplate
case 'custom':
  templateFileName = 'invoice_template_custom.html';
  break;
```

### 3. Lưu ý khi tùy chỉnh

- **Giữ nguyên placeholders**: Không được thay đổi tên các placeholder `{PLACEHOLDER_NAME}`
- **CSS print-friendly**: Sử dụng CSS phù hợp cho in ấn (tránh background đậm, font quá nhỏ)
- **Responsive**: Đảm bảo template hiển thị tốt trên các kích thước giấy khác nhau
- **Vietnamese font**: Sử dụng font hỗ trợ tiếng Việt tốt

## Ví dụ tùy chỉnh

### 1. Thay đổi màu chủ đạo

```css
/* Thay đổi từ màu xanh (#1976d2) sang màu đỏ */
.header h1 {
    color: #d32f2f; /* Thay vì #1976d2 */
}

.invoice-info .label {
    color: #d32f2f;
}

.totals .final-total {
    background-color: #d32f2f;
    border-color: #d32f2f;
}
```

### 2. Thêm logo công ty

```html
<div class="header">
    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..." 
         alt="Logo" style="height: 60px; margin-bottom: 10px;">
    <h1>Hóa Đơn Bán Hàng</h1>
</div>
```

### 3. Thêm thông tin cho từng sản phẩm

```html
{ITEMS_START}
<tr>
    <td>{ITEM_INDEX}</td>
    <td>
        <strong>{ITEM_FULL_DESCRIPTION}</strong>
        {ITEM_SEQUENCE:CONDITIONAL_START}
        <br><small style="color: #666;">Mã: {ITEM_SEQUENCE}</small>
        {ITEM_SEQUENCE:CONDITIONAL_END}
    </td>
    <td><span class="brand-badge">{ITEM_BRAND}</span></td>
    <td><strong>{ITEM_SIZE}</strong></td>
    <td class="price">{ITEM_UNIT_PRICE} VNĐ</td>
</tr>
{ITEMS_END}
```

### 4. Tạo layout card cho sản phẩm (cho receipt template)

```html
{ITEMS_START}
<div class="product-card">
    <div class="product-header">
        <span class="item-number">#{ITEM_INDEX}</span>
        <span class="brand">{ITEM_BRAND}</span>
    </div>
    <div class="product-name">{ITEM_FULL_DESCRIPTION}</div>
    <div class="product-details">
        <span class="size">Size: {ITEM_SIZE}</span>
        <span class="price">{ITEM_UNIT_PRICE} VNĐ</span>
    </div>
</div>
{ITEMS_END}
```

## Troubleshooting

### Lỗi không tìm thấy template
- Kiểm tra tên file template trong thư mục `templates/`
- Đảm bảo file có đúng extension `.html`

### Template không hiển thị đúng định dạng
- Kiểm tra cú pháp HTML/CSS
- Đảm bảo không có lỗi trong CSS

### Placeholder không được thay thế
- Kiểm tra tên placeholder có đúng format `{PLACEHOLDER_NAME}`
- Đảm bảo tên placeholder khớp với interface `TemplateData`

### PDF không đẹp khi in
- Sử dụng units phù hợp cho print (pt, mm, cm thay vì px)
- Kiểm tra CSS `@media print`
- Tránh sử dụng background colors đậm

## Performance Tips

1. **Template caching**: Templates được cache sau lần đầu load
2. **Minimal templates**: Sử dụng template minimal cho in nhanh
3. **CSS optimization**: Tránh CSS phức tạp để PDF render nhanh hơn

## Best Practices

1. **Backup templates**: Luôn backup templates trước khi chỉnh sửa
2. **Test thoroughly**: Test templates trên nhiều thiết bị khác nhau
3. **Maintain consistency**: Giữ nhất quán trong thiết kế và format
4. **Documentation**: Ghi chú khi thay đổi templates
