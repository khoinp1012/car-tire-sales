# Print Order System

Hệ thống in hóa đơn bán hàng với template tùy chỉnh và tạo PDF cục bộ.

## Tính năng

- Đọc dữ liệu đơn hàng từ cơ sở dữ liệu Appwrite
- Hiển thị danh sách đơn hàng với thông tin chi tiết
- Tạo PDF hóa đơn từ template HTML
- Lưu trữ PDF cục bộ trên thiết bị
- Chia sẻ PDF qua các ứng dụng khác

## Cấu trúc file

```
/templates/
  ├── invoice_template.ods    # Template LibreOffice Calc (để tùy chỉnh)
  └── invoice_template.html   # Template HTML (dùng cho PDF)

/app/
  └── print_order.tsx         # Trang chính in hóa đơn

/utils/
  └── invoiceUtils.ts         # Các hàm tiện ích
```

## Cách sử dung

1. **Truy cập**: Từ màn hình chính, nhấn nút "In Hóa Đơn"
2. **Chọn đơn hàng**: Xem danh sách các đơn hàng đã tạo
3. **Tạo PDF**: Nhấn nút "Tạo PDF" cho đơn hàng muốn in
4. **Lưu/Chia sẻ**: PDF sẽ được lưu và có thể chia sẻ

## Tùy chỉnh template

### Template System (Mới)
Hệ thống đã được nâng cấp với hỗ trợ multiple templates:

- **Default template** (`invoice_template.html`): Template cân bằng, phù hợp mọi trường hợp
- **Minimal template** (`invoice_template_minimal.html`): Template tối giản, tiết kiệm giấy
- **Detailed template** (`invoice_template_detailed.html`): Template chi tiết với đầy đủ thông tin

Xem chi tiết trong file `TEMPLATE_GUIDE.md`.

### Template HTML cũ (Deprecated)
- Chỉnh sửa file `templates/invoice_template.html` 
- Thay đổi CSS để tùy chỉnh giao diện PDF
- Sửa đổi layout, màu sắc, font chữ

### Cách chuyển đổi template
Trong file `app/print_order.tsx`, thay đổi:
```typescript
// Template mặc định
const htmlContent = await generateInvoiceHTMLFromTemplate(templateData);

// Template tối giản  
const htmlContent = await generateInvoiceHTMLFromTemplate(templateData, 'minimal');

// Template chi tiết
const htmlContent = await generateInvoiceHTMLFromTemplate(templateData, 'detailed');
```

## Cấu trúc dữ liệu

### Sales Orders
```typescript
{
  $id: string;
  customer_id: string;
  order_date: string;
  inventory_items_list: string; // JSON array
  total_amount?: number;
  customer_discount?: number;
}
```

### Customers
```typescript
{
  $id: string;
  name: string;
  phone_number: string;
  discount_percent: number;
}
```

### Inventory Items (trong JSON)
```typescript
{
  full_description: string;
  brand: string;
  size: string;
  unit_price: number;
  sequence?: number;
  radius_size?: number;
}
```

## Thư viện sử dụng

- **expo-print**: Tạo PDF từ HTML
- **expo-file-system**: Quản lý file trên thiết bị
- **react-native-appwrite**: Kết nối cơ sở dữ liệu

## Ghi chú kỹ thuật

- PDF được tạo cục bộ, không cần internet
- File được lưu trong document directory của app
- Hỗ trợ chia sẻ qua Share API của hệ điều hành
- Template HTML responsive, phù hợp cho in ấn

## Troubleshooting

### Lỗi không tìm thấy khách hàng
- Kiểm tra customer_id trong sales_orders có tồn tại trong customers collection

### Lỗi tạo PDF
- Kiểm tra quyền ghi file trên thiết bị
- Đảm bảo có đủ dung lượng trống

### Template không hiển thị đúng
- Kiểm tra cú pháp HTML/CSS trong template
- Xác nhận các placeholder được thay thế đúng
