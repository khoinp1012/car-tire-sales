// ODS Template Parser for Invoice Generation
import * as FileSystem from 'expo-file-system';
import { 
  formatVNCurrency, 
  formatVNDate, 
  generateInvoiceNumber 
} from './invoiceUtils';

export interface InvoiceData {
  invoiceNumber: string;
  orderDate: string;
  customerName: string;
  customerPhone: string;
  items: Array<{
    stt: number;
    description: string;
    brand: string;
    size: string;
    unitPrice: string;
    total: string;
  }>;
  subtotal: string;
  discountPercent: string;
  discountAmount: string;
  finalTotal: string;
}

/**
 * Load ODS template content - reads from the actual ODS file
 */
export const loadODSTemplate = async (): Promise<string> => {
  try {
    // Try to read the template file
    const templatePath = `${FileSystem.bundleDirectory}../templates/invoice_template.ods`;
    const templateContent = await FileSystem.readAsStringAsync(templatePath);
    return templateContent;
  } catch (error) {
    console.warn('Could not load external ODS template, using embedded template:', error);
    // Fallback to the embedded template content
    return getEmbeddedTemplate();
  }
};

/**
 * Embedded ODS template - synchronized with invoice_template.ods
 */
const getEmbeddedTemplate = (): string => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" xmlns:number="urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0" xmlns:dr3d="urn:oasis:names:tc:opendocument:xmlns:dr3d:1.0" xmlns:math="http://www.w3.org/1998/Math/MathML" xmlns:form="urn:oasis:names:tc:opendocument:xmlns:form:1.0" xmlns:script="urn:oasis:names:tc:opendocument:xmlns:script:1.0" xmlns:ooo="http://openoffice.org/2004/office" xmlns:ooow="http://openoffice.org/2004/writer" xmlns:oooc="http://openoffice.org/2004/calc" xmlns:dom="http://www.w3.org/2001/xml-events" xmlns:xforms="http://www.w3.org/2002/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:rpt="http://openoffice.org/2005/report" xmlns:of="urn:oasis:names:tc:opendocument:xmlns:of:1.2" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:grddl="http://www.w3.org/2003/g/data-view#" xmlns:tableooo="http://openoffice.org/2009/table" xmlns:calcext="urn:org:documentfoundation:names:experimental:calc:xmlns:calcext:1.0" office:version="1.2">
  <office:scripts/>
  <office:font-face-decls>
    <style:font-face style:name="Arial" svg:font-family="Arial" style:font-family-generic="swiss" style:font-pitch="variable"/>
  </office:font-face-decls>
  <office:automatic-styles>
    <style:style style:name="co1" style:family="table-column">
      <style:table-column-properties fo:break-before="auto" style:column-width="2.5cm"/>
    </style:style>
    <style:style style:name="ro1" style:family="table-row">
      <style:table-row-properties style:row-height="0.4cm" fo:break-before="auto" style:use-optimal-row-height="true"/>
    </style:style>
    <style:style style:name="ta1" style:family="table" style:master-page-name="Default">
      <style:table-properties table:display="true" style:writing-mode="lr-tb"/>
    </style:style>
    <style:style style:name="T1" style:family="text">
      <style:text-properties fo:font-weight="bold" style:font-weight-asian="bold" style:font-weight-complex="bold" fo:font-size="16pt"/>
    </style:style>
    <style:style style:name="T2" style:family="text">
      <style:text-properties fo:font-weight="bold" style:font-weight-asian="bold" style:font-weight-complex="bold" fo:font-size="12pt"/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:spreadsheet>
      <table:table table:name="HoaDon" table:style-name="ta1">
        <table:table-column table:style-name="co1" table:number-columns-repeated="6"/>
        
        <!-- Header -->
        <table:table-row table:style-name="ro1">
          <table:table-cell>
            <text:p><text:span text:style-name="T1">HÓA ĐƠN BÁN HÀNG</text:span></text:p>
          </table:table-cell>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
        </table:table-row>
        
        <table:table-row table:style-name="ro1">
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
        </table:table-row>
        
        <!-- Customer Info -->
        <table:table-row table:style-name="ro1">
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Số hóa đơn:</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p>{INVOICE_NUMBER}</text:p>
          </table:table-cell>
          <table:table-cell/>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Ngày:</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p>{ORDER_DATE}</text:p>
          </table:table-cell>
          <table:table-cell/>
        </table:table-row>
        
        <table:table-row table:style-name="ro1">
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Khách hàng:</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p>{CUSTOMER_NAME}</text:p>
          </table:table-cell>
          <table:table-cell/>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Điện thoại:</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p>{CUSTOMER_PHONE}</text:p>
          </table:table-cell>
          <table:table-cell/>
        </table:table-row>
        
        <table:table-row table:style-name="ro1">
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
        </table:table-row>
        
        <!-- Items Header -->
        <table:table-row table:style-name="ro1">
          <table:table-cell>
            <text:p><text:span text:style-name="T2">STT</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Mô tả sản phẩm</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Thương hiệu</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Kích cỡ</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Đơn giá</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Thành tiền</text:span></text:p>
          </table:table-cell>
        </table:table-row>
        
        <!-- Items will be inserted here -->
        {ITEMS_ROWS}
        
        <!-- Totals -->
        <table:table-row table:style-name="ro1">
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Tổng cộng:</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">{SUBTOTAL} VNĐ</text:span></text:p>
          </table:table-cell>
        </table:table-row>
        
        <table:table-row table:style-name="ro1">
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Giảm giá ({DISCOUNT_PERCENT}%):</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">-{DISCOUNT_AMOUNT} VNĐ</text:span></text:p>
          </table:table-cell>
        </table:table-row>
        
        <table:table-row table:style-name="ro1">
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">TỔNG THANH TOÁN:</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p><text:span text:style-name="T1">{FINAL_TOTAL} VNĐ</text:span></text:p>
          </table:table-cell>
        </table:table-row>
        
        <table:table-row table:style-name="ro1">
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
        </table:table-row>
        
        <!-- Footer -->
        <table:table-row table:style-name="ro1">
          <table:table-cell>
            <text:p>Cảm ơn quý khách!</text:p>
          </table:table-cell>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
        </table:table-row>
        
      </table:table>
    </office:spreadsheet>
  </office:body>
</office:document-content>`;
};

/**
 * Replace placeholders in ODS content with actual data
 */
export const processODSTemplate = (odsContent: string, data: InvoiceData): string => {
  let processedContent = odsContent;

  // Replace single placeholders
  const placeholders = {
    '{INVOICE_NUMBER}': data.invoiceNumber,
    '{ORDER_DATE}': data.orderDate,
    '{CUSTOMER_NAME}': data.customerName,
    '{CUSTOMER_PHONE}': data.customerPhone,
    '{SUBTOTAL}': data.subtotal,
    '{DISCOUNT_PERCENT}': data.discountPercent,
    '{DISCOUNT_AMOUNT}': data.discountAmount,
    '{FINAL_TOTAL}': data.finalTotal,
  };

  // Replace all single placeholders
  Object.entries(placeholders).forEach(([placeholder, value]) => {
    processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
  });

  // Generate items rows in ODS format
  const itemsRows = data.items.map(item => `
    <table:table-row table:style-name="ro1">
      <table:table-cell>
        <text:p>${item.stt}</text:p>
      </table:table-cell>
      <table:table-cell>
        <text:p>${item.description}</text:p>
      </table:table-cell>
      <table:table-cell>
        <text:p>${item.brand}</text:p>
      </table:table-cell>
      <table:table-cell>
        <text:p>${item.size}</text:p>
      </table:table-cell>
      <table:table-cell>
        <text:p>${item.unitPrice}</text:p>
      </table:table-cell>
      <table:table-cell>
        <text:p>${item.total}</text:p>
      </table:table-cell>
    </table:table-row>
  `).join('');

  // Replace items placeholder
  processedContent = processedContent.replace('{ITEMS_ROWS}', itemsRows);

  return processedContent;
};

/**
 * Convert ODS XML structure to HTML for PDF generation
 */
export const convertODSToHTML = (odsContent: string): string => {
  // Extract key information from ODS XML and convert to HTML
  // This is a simplified conversion that preserves the structure
  
  const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hóa Đơn Bán Hàng</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.6;
            color: #333;
            font-size: 14px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 20px;
            font-weight: bold;
            color: #1976d2;
            margin: 0;
            text-transform: uppercase;
        }
        
        .invoice-info {
            margin-bottom: 25px;
        }
        
        .invoice-info table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .invoice-info td {
            padding: 6px 0;
            vertical-align: top;
        }
        
        .invoice-info .label {
            font-weight: bold;
            width: 120px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        .items-table th,
        .items-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 12px;
        }
        
        .items-table th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        
        .items-table .number-col {
            text-align: center;
            width: 40px;
        }
        
        .items-table .price-col {
            text-align: right;
            width: 100px;
        }
        
        .totals {
            margin-top: 20px;
        }
        
        .totals table {
            width: 100%;
            max-width: 350px;
            margin-left: auto;
            border-collapse: collapse;
        }
        
        .totals td {
            padding: 6px;
            border-bottom: 1px solid #eee;
        }
        
        .totals .label {
            font-weight: bold;
            text-align: right;
            width: 60%;
        }
        
        .totals .amount {
            text-align: right;
            width: 40%;
        }
        
        .totals .final-total {
            font-size: 16px;
            font-weight: bold;
            color: #1976d2;
            border-top: 2px solid #1976d2;
            border-bottom: 2px solid #1976d2;
        }
        
        .footer {
            margin-top: 30px;
            text-align: center;
            font-style: italic;
            color: #666;
        }
        
        .currency {
            font-weight: normal;
        }
    </style>
</head>
<body>
${convertODSDataToHTML(odsContent)}
</body>
</html>`;

  return htmlContent;
};

/**
 * Extract data from processed ODS content and format as HTML
 */
const convertODSDataToHTML = (odsContent: string): string => {
  // Extract the data from the processed ODS content
  // This is a simple regex-based extraction
  
  // Extract header text
  const headerMatch = odsContent.match(/<text:span text:style-name="T1">(.*?)<\/text:span>/);
  const headerText = headerMatch ? headerMatch[1] : 'HÓA ĐƠN BÁN HÀNG';
  
  // Extract customer info
  const invoiceNumberMatch = odsContent.match(/Số hóa đơn:<\/text:span>\s*<\/text:p>\s*<\/table:table-cell>\s*<table:table-cell>\s*<text:p>(.*?)<\/text:p>/);
  const orderDateMatch = odsContent.match(/Ngày:<\/text:span>\s*<\/text:p>\s*<\/table:table-cell>\s*<table:table-cell>\s*<text:p>(.*?)<\/text:p>/);
  const customerNameMatch = odsContent.match(/Khách hàng:<\/text:span>\s*<\/text:p>\s*<\/table:table-cell>\s*<table:table-cell>\s*<text:p>(.*?)<\/text:p>/);
  const customerPhoneMatch = odsContent.match(/Điện thoại:<\/text:span>\s*<\/text:p>\s*<\/table:table-cell>\s*<table:table-cell>\s*<text:p>(.*?)<\/text:p>/);
  
  const invoiceNumber = invoiceNumberMatch ? invoiceNumberMatch[1] : '';
  const orderDate = orderDateMatch ? orderDateMatch[1] : '';
  const customerName = customerNameMatch ? customerNameMatch[1] : '';
  const customerPhone = customerPhoneMatch ? customerPhoneMatch[1] : '';
  
  // Extract totals
  const subtotalMatch = odsContent.match(/Tổng cộng:<\/text:span>\s*<\/text:p>\s*<\/table:table-cell>\s*<table:table-cell>\s*<text:p><text:span text:style-name="T2">(.*?)<\/text:span>/);
  const discountMatch = odsContent.match(/Giảm giá \((.*?)%\):<\/text:span>\s*<\/text:p>\s*<\/table:table-cell>\s*<table:table-cell>\s*<text:p><text:span text:style-name="T2">-(.*?)<\/text:span>/);
  const finalTotalMatch = odsContent.match(/TỔNG THANH TOÁN:<\/text:span>\s*<\/text:p>\s*<\/table:table-cell>\s*<table:table-cell>\s*<text:p><text:span text:style-name="T1">(.*?)<\/text:span>/);
  
  const subtotal = subtotalMatch ? subtotalMatch[1] : '';
  const discountPercent = discountMatch ? discountMatch[1] : '0';
  const discountAmount = discountMatch ? discountMatch[2] : '';
  const finalTotal = finalTotalMatch ? finalTotalMatch[1] : '';
  
  // Extract items (this is more complex, simplified for now)
  const itemsHTML = extractItemsFromODS(odsContent);
  
  return `
    <div class="header">
        <h1>${headerText}</h1>
    </div>
    
    <div class="invoice-info">
        <table>
            <tr>
                <td class="label">Số hóa đơn:</td>
                <td>${invoiceNumber}</td>
                <td class="label" style="text-align: right;">Ngày:</td>
                <td style="text-align: right;">${orderDate}</td>
            </tr>
            <tr>
                <td class="label">Khách hàng:</td>
                <td>${customerName}</td>
                <td class="label" style="text-align: right;">Điện thoại:</td>
                <td style="text-align: right;">${customerPhone}</td>
            </tr>
        </table>
    </div>
    
    <table class="items-table">
        <thead>
            <tr>
                <th class="number-col">STT</th>
                <th>Mô tả sản phẩm</th>
                <th>Thương hiệu</th>
                <th>Kích cỡ</th>
                <th class="price-col">Đơn giá</th>
                <th class="price-col">Thành tiền</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHTML}
        </tbody>
    </table>
    
    <div class="totals">
        <table>
            <tr>
                <td class="label">Tổng cộng:</td>
                <td class="amount">${subtotal}</td>
            </tr>
            <tr>
                <td class="label">Giảm giá (${discountPercent}%):</td>
                <td class="amount">-${discountAmount}</td>
            </tr>
            <tr class="final-total">
                <td class="label">TỔNG THANH TOÁN:</td>
                <td class="amount">${finalTotal}</td>
            </tr>
        </table>
    </div>
    
    <div class="footer">
        <p>Cảm ơn quý khách đã tin tương và sử dụng dịch vụ!</p>
        <p>Chúc quý khách lái xe an toàn!</p>
    </div>
  `;
};

/**
 * Extract items data from ODS content and convert to HTML table rows
 */
const extractItemsFromODS = (odsContent: string): string => {
  // Extract items from the ODS content between the headers and totals
  // This is a simplified extraction - in practice, you'd want more robust XML parsing
  
  const itemsRegex = /<table:table-row table:style-name="ro1">\s*<table:table-cell>\s*<text:p>(\d+)<\/text:p>\s*<\/table:table-cell>\s*<table:table-cell>\s*<text:p>(.*?)<\/text:p>\s*<\/table:table-cell>\s*<table:table-cell>\s*<text:p>(.*?)<\/text:p>\s*<\/table:table-cell>\s*<table:table-cell>\s*<text:p>(.*?)<\/text:p>\s*<\/table:table-cell>\s*<table:table-cell>\s*<text:p>(.*?)<\/text:p>\s*<\/table:table-cell>\s*<table:table-cell>\s*<text:p>(.*?)<\/text:p>\s*<\/table:table-cell>\s*<\/table:table-row>/g;
  
  let itemsHTML = '';
  let match;
  
  while ((match = itemsRegex.exec(odsContent)) !== null) {
    const [, stt, description, brand, size, unitPrice, total] = match;
    itemsHTML += `
      <tr>
        <td class="number-col">${stt}</td>
        <td>${description}</td>
        <td>${brand}</td>
        <td>${size}</td>
        <td class="price-col">${unitPrice}</td>
        <td class="price-col">${total}</td>
      </tr>
    `;
  }
  
  return itemsHTML;
};

/**
 * Main function to generate invoice HTML from ODS template and data
 */
export const generateInvoiceFromODS = async (data: InvoiceData): Promise<string> => {
  try {
    // Load ODS template (will use embedded if file loading fails)
    const odsContent = await loadODSTemplate();
    
    // Process placeholders with actual data
    const processedODS = processODSTemplate(odsContent, data);
    
    // Convert processed ODS to HTML
    const htmlContent = convertODSToHTML(processedODS);
    
    return htmlContent;
  } catch (error) {
    console.error('Error generating invoice from ODS:', error);
    throw error;
  }
};
};

/**
 * Load and parse ODS template file
 */
export const loadODSTemplate = async (): Promise<string> => {
  try {
    // Load the ODS template from the templates directory
    const templatePath = require('../templates/invoice_template.ods');
    
    // Read the file content
    const templateContent = await FileSystem.readAsStringAsync(templatePath);
    return templateContent;
  } catch (error) {
    console.error('Error loading ODS template:', error);
    // Fallback to embedded template if file loading fails
    return getDefaultODSTemplate();
  }
};

/**
 * Fallback default ODS template content
 */
const getDefaultODSTemplate = (): string => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" xmlns:number="urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0" xmlns:dr3d="urn:oasis:names:tc:opendocument:xmlns:dr3d:1.0" xmlns:math="http://www.w3.org/1998/Math/MathML" xmlns:form="urn:oasis:names:tc:opendocument:xmlns:form:1.0" xmlns:script="urn:oasis:names:tc:opendocument:xmlns:script:1.0" xmlns:ooo="http://openoffice.org/2004/office" xmlns:ooow="http://openoffice.org/2004/writer" xmlns:oooc="http://openoffice.org/2004/calc" xmlns:dom="http://www.w3.org/2001/xml-events" xmlns:xforms="http://www.w3.org/2002/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:rpt="http://openoffice.org/2005/report" xmlns:of="urn:oasis:names:tc:opendocument:xmlns:of:1.2" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:grddl="http://www.w3.org/2003/g/data-view#" xmlns:tableooo="http://openoffice.org/2009/table" xmlns:calcext="urn:org:documentfoundation:names:experimental:calc:xmlns:calcext:1.0" office:version="1.2">
  <office:scripts/>
  <office:font-face-decls>
    <style:font-face style:name="Arial" svg:font-family="Arial" style:font-family-generic="swiss" style:font-pitch="variable"/>
  </office:font-face-decls>
  <office:automatic-styles>
    <style:style style:name="co1" style:family="table-column">
      <style:table-column-properties fo:break-before="auto" style:column-width="2.5cm"/>
    </style:style>
    <style:style style:name="ro1" style:family="table-row">
      <style:table-row-properties style:row-height="0.4cm" fo:break-before="auto" style:use-optimal-row-height="true"/>
    </style:style>
    <style:style style:name="ta1" style:family="table" style:master-page-name="Default">
      <style:table-properties table:display="true" style:writing-mode="lr-tb"/>
    </style:style>
    <style:style style:name="T1" style:family="text">
      <style:text-properties fo:font-weight="bold" style:font-weight-asian="bold" style:font-weight-complex="bold" fo:font-size="16pt"/>
    </style:style>
    <style:style style:name="T2" style:family="text">
      <style:text-properties fo:font-weight="bold" style:font-weight-asian="bold" style:font-weight-complex="bold" fo:font-size="12pt"/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:spreadsheet>
      <table:table table:name="HoaDon" table:style-name="ta1">
        <table:table-column table:style-name="co1" table:number-columns-repeated="6"/>
        
        <!-- Header -->
        <table:table-row table:style-name="ro1">
          <table:table-cell>
            <text:p><text:span text:style-name="T1">HÓA ĐƠN BÁN HÀNG</text:span></text:p>
          </table:table-cell>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
        </table:table-row>
        
        <table:table-row table:style-name="ro1">
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
        </table:table-row>
        
        <!-- Customer Info -->
        <table:table-row table:style-name="ro1">
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Số hóa đơn:</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p>{INVOICE_NUMBER}</text:p>
          </table:table-cell>
          <table:table-cell/>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Ngày:</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p>{ORDER_DATE}</text:p>
          </table:table-cell>
          <table:table-cell/>
        </table:table-row>
        
        <table:table-row table:style-name="ro1">
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Khách hàng:</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p>{CUSTOMER_NAME}</text:p>
          </table:table-cell>
          <table:table-cell/>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Điện thoại:</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p>{CUSTOMER_PHONE}</text:p>
          </table:table-cell>
          <table:table-cell/>
        </table:table-row>
        
        <table:table-row table:style-name="ro1">
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
        </table:table-row>
        
        <!-- Items Header -->
        <table:table-row table:style-name="ro1">
          <table:table-cell>
            <text:p><text:span text:style-name="T2">STT</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Mô tả sản phẩm</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Thương hiệu</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Kích cỡ</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Đơn giá</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Thành tiền</text:span></text:p>
          </table:table-cell>
        </table:table-row>
        
        <!-- Items will be inserted here -->
        {ITEMS_ROWS}
        
        <!-- Totals -->
        <table:table-row table:style-name="ro1">
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Tổng cộng:</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">{SUBTOTAL} VNĐ</text:span></text:p>
          </table:table-cell>
        </table:table-row>
        
        <table:table-row table:style-name="ro1">
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">Giảm giá ({DISCOUNT_PERCENT}%):</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">-{DISCOUNT_AMOUNT} VNĐ</text:span></text:p>
          </table:table-cell>
        </table:table-row>
        
        <table:table-row table:style-name="ro1">
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell>
            <text:p><text:span text:style-name="T2">TỔNG THANH TOÁN:</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p><text:span text:style-name="T1">{FINAL_TOTAL} VNĐ</text:span></text:p>
          </table:table-cell>
        </table:table-row>
        
        <table:table-row table:style-name="ro1">
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
        </table:table-row>
        
        <!-- Footer -->
        <table:table-row table:style-name="ro1">
          <table:table-cell>
            <text:p>Cảm ơn quý khách!</text:p>
          </table:table-cell>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
          <table:table-cell/>
        </table:table-row>
        
      </table:table>
    </office:spreadsheet>
  </office:body>
</office:document-content>`;
};

/**
 * Replace placeholders in ODS content with actual data
 */
export const processODSTemplate = (odsContent: string, data: InvoiceData): string => {
  let processedContent = odsContent;

  // Replace single placeholders
  const placeholders = {
    '{INVOICE_NUMBER}': data.invoiceNumber,
    '{ORDER_DATE}': data.orderDate,
    '{CUSTOMER_NAME}': data.customerName,
    '{CUSTOMER_PHONE}': data.customerPhone,
    '{SUBTOTAL}': data.subtotal,
    '{DISCOUNT_PERCENT}': data.discountPercent,
    '{DISCOUNT_AMOUNT}': data.discountAmount,
    '{FINAL_TOTAL}': data.finalTotal,
  };

  // Replace all single placeholders
  Object.entries(placeholders).forEach(([placeholder, value]) => {
    processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
  });

  // Generate items rows
  const itemsRows = data.items.map(item => `
    <table:table-row table:style-name="ro1">
      <table:table-cell>
        <text:p>${item.stt}</text:p>
      </table:table-cell>
      <table:table-cell>
        <text:p>${item.description}</text:p>
      </table:table-cell>
      <table:table-cell>
        <text:p>${item.brand}</text:p>
      </table:table-cell>
      <table:table-cell>
        <text:p>${item.size}</text:p>
      </table:table-cell>
      <table:table-cell>
        <text:p>${item.unitPrice}</text:p>
      </table:table-cell>
      <table:table-cell>
        <text:p>${item.total}</text:p>
      </table:table-cell>
    </table:table-row>
  `).join('');

  // Replace items placeholder
  processedContent = processedContent.replace('{ITEMS_ROWS}', itemsRows);

  return processedContent;
};

/**
 * Convert ODS content to HTML for PDF generation
 */
export const convertODSToHTML = (odsContent: string): string => {
  // This is a simplified conversion from ODS XML to HTML
  // In a full implementation, you'd parse the XML structure more thoroughly
  
  let htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hóa Đơn Bán Hàng</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.6;
            color: #333;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 24px;
            font-weight: bold;
            color: #1976d2;
            margin: 0;
            text-transform: uppercase;
        }
        
        .invoice-info {
            margin-bottom: 30px;
        }
        
        .invoice-info table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .invoice-info td {
            padding: 8px 0;
            vertical-align: top;
        }
        
        .invoice-info .label {
            font-weight: bold;
            width: 120px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        .items-table th,
        .items-table td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }
        
        .items-table th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        
        .items-table .number-col {
            text-align: center;
            width: 50px;
        }
        
        .items-table .price-col {
            text-align: right;
            width: 120px;
        }
        
        .totals {
            margin-top: 20px;
        }
        
        .totals table {
            width: 100%;
            max-width: 400px;
            margin-left: auto;
            border-collapse: collapse;
        }
        
        .totals td {
            padding: 8px;
            border-bottom: 1px solid #eee;
        }
        
        .totals .label {
            font-weight: bold;
            text-align: right;
            width: 60%;
        }
        
        .totals .amount {
            text-align: right;
            width: 40%;
        }
        
        .totals .final-total {
            font-size: 18px;
            font-weight: bold;
            color: #1976d2;
            border-top: 2px solid #1976d2;
            border-bottom: 2px solid #1976d2;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            font-style: italic;
            color: #666;
        }
        
        .currency {
            font-weight: normal;
        }
    </style>
</head>
<body>`;

  // Extract text content from ODS and convert to HTML structure
  // This is a simplified approach - in practice, you'd parse the XML more carefully
  
  // For now, we'll use a basic template structure and populate it with ODS data
  htmlContent += `
    <div class="header">
        <h1>HÓA ĐƠN BÁN HÀNG</h1>
    </div>
    
    <div class="invoice-info">
        <table>
            <tr>
                <td class="label">Số hóa đơn:</td>
                <td><!-- Will be filled by template processing --></td>
                <td class="label" style="text-align: right;">Ngày:</td>
                <td style="text-align: right;"><!-- Will be filled by template processing --></td>
            </tr>
            <tr>
                <td class="label">Khách hàng:</td>
                <td><!-- Will be filled by template processing --></td>
                <td class="label" style="text-align: right;">Điện thoại:</td>
                <td style="text-align: right;"><!-- Will be filled by template processing --></td>
            </tr>
        </table>
    </div>
    
    <table class="items-table">
        <thead>
            <tr>
                <th class="number-col">STT</th>
                <th>Mô tả sản phẩm</th>
                <th>Thương hiệu</th>
                <th>Kích cỡ</th>
                <th class="price-col">Đơn giá</th>
                <th class="price-col">Thành tiền</th>
            </tr>
        </thead>
        <tbody>
            <!-- Items will be inserted here -->
        </tbody>
    </table>
    
    <div class="totals">
        <table>
            <tr>
                <td class="label">Tổng cộng:</td>
                <td class="amount"><!-- Subtotal --></td>
            </tr>
            <tr>
                <td class="label">Giảm giá:</td>
                <td class="amount"><!-- Discount --></td>
            </tr>
            <tr class="final-total">
                <td class="label">TỔNG THANH TOÁN:</td>
                <td class="amount"><!-- Final total --></td>
            </tr>
        </table>
    </div>
    
    <div class="footer">
        <p>Cảm ơn quý khách đã tin tương và sử dụng dịch vụ!</p>
        <p>Chúc quý khách lái xe an toàn!</p>
    </div>
</body>
</html>`;

  return htmlContent;
};

/**
 * Generate invoice HTML from ODS template and data
 */
export const generateInvoiceFromODS = async (data: InvoiceData): Promise<string> => {
  try {
    // Load ODS template
    const odsContent = await loadODSTemplate();
    
    // Process placeholders
    const processedODS = processODSTemplate(odsContent, data);
    
    // Convert to HTML
    const htmlContent = convertODSToHTML(processedODS);
    
    return htmlContent;
  } catch (error) {
    console.error('Error generating invoice from ODS:', error);
    throw error;
  }
};
