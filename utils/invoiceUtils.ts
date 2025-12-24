// Utility functions for PDF generation and invoice formatting

/**
 * Format number as Vietnamese currency
 */
export const formatVNCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format date for Vietnamese locale
 */
export const formatVNDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Generate invoice number from order ID
 */
export const generateInvoiceNumber = (orderId: string): string => {
  return `HD${orderId.substring(0, 8).toUpperCase()}`;
};

/**
 * Sanitize filename for safe file system operations
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9\u00C0-\u017F\u1E00-\u1EFF\s._-]/g, '') // Keep Vietnamese characters (including Extended Latin)
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 100); // Limit length
};

/**
 * Generate PDF filename for invoice
 */
export const generatePDFFilename = (orderId: string, customerName: string): string => {
  const invoiceNumber = generateInvoiceNumber(orderId);
  const safeName = sanitizeFilename(customerName);
  const timestamp = new Date().toISOString().split('T')[0];
  return `${invoiceNumber}_${safeName}_${timestamp}.pdf`;
};

/**
 * Get user-friendly success message for PDF creation
 */
export const getPDFSuccessMessage = (filename: string, appPath: string, downloadsPath?: string): string => {
  if (downloadsPath) {
    return `Đã tạo PDF: ${filename}\n\n📁 Lưu tại:\n• Ứng dụng: ${appPath}\n• Downloads: ${downloadsPath}\n\n💡 Bạn có thể tìm file trong thư mục Downloads!`;
  } else {
    return `Đã tạo PDF: ${filename}\n\n📁 Lưu tại: ${appPath}\n\n⚠️ Lưu ý: File chỉ có thể truy cập qua chia sẻ trong Expo Go`;
  }
};
