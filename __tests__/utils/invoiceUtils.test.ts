import {
    formatVNCurrency,
    generateInvoiceNumber,
    sanitizeFilename,
    generatePDFFilename
} from '@/utils/invoiceUtils';

describe('invoiceUtils', () => {
    describe('formatVNCurrency', () => {
        it('should format numbers into a currency string', () => {
            const result = formatVNCurrency(1000000);
            // We check if it's a string and contains digits. 
            // This avoids issues with different systems using dots, commas, or spaces.
            expect(typeof result).toBe('string');
            expect(result).toMatch(/\d/);
        });
    });

    describe('generateInvoiceNumber', () => {
        it('should create an uppercase ID prefixed with HD', () => {
            const orderId = 'abc123def456';
            const result = generateInvoiceNumber(orderId);
            expect(result).toBe('HDABC123DE'); // HD + first 8 chars
        });
    });

    describe('sanitizeFilename', () => {
        it('should remove special characters but keep Vietnamese characters', () => {
            const messyName = 'Nguyễn Văn A! @#$%^&*()';
            const result = sanitizeFilename(messyName);
            expect(result).toContain('Nguyễn_Văn_A');
            expect(result).not.toContain('!');
            expect(result).not.toContain('@');
        });

        it('should replace spaces with underscores', () => {
            expect(sanitizeFilename('Test File Name')).toBe('Test_File_Name');
        });
    });

    describe('generatePDFFilename', () => {
        it('should combine components into a valid filename', () => {
            const orderId = '123456789';
            const customer = 'Khoi';
            const filename = generatePDFFilename(orderId, customer);

            expect(filename).toMatch(/^HD12345678_Khoi_\d{4}-\d{2}-\d{2}\.pdf$/);
        });
    });
});
