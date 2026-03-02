import { formatTireSize, compactTireSize, isCompactTireSize } from '@/utils/tireSizeFormatter';

describe('tireSizeFormatter', () => {
    describe('formatTireSize', () => {
        it('should format 7-digit compact size correctly (e.g. 255/70R16)', () => {
            expect(formatTireSize('2557016')).toBe('255/70R16');
        });

        it('should format 6-digit compact size correctly (e.g. 185/65R15)', () => {
            // Logic in code: 185(3) + 65(2) + 5(1) -> 185/65R15
            expect(formatTireSize('185655')).toBe('185/65R15');
        });

        it('should handle alphanumeric input by returning it as-is', () => {
            expect(formatTireSize('255/70R16')).toBe('255/70R16');
            expect(formatTireSize('CUSTOM-SIZE')).toBe('CUSTOM-SIZE');
        });

        it('should handle invalid lengths by returning as-is', () => {
            expect(formatTireSize('123')).toBe('123');
            expect(formatTireSize('123456789')).toBe('123456789');
        });

        it('should handle null/undefined', () => {
            expect(formatTireSize(null)).toBe('');
            expect(formatTireSize(undefined)).toBe('');
        });
    });

    describe('compactTireSize', () => {
        it('should convert standard format to compact string', () => {
            expect(compactTireSize('255/70R16')).toBe('2557016');
        });

        it('should handle dash separators', () => {
            expect(compactTireSize('255-70-16')).toBe('2557016');
        });

        it('should pad single digit rim sizes with a zero', () => {
            // If user enters 255/70R1 -> code pads to 2557001
            expect(compactTireSize('255/70R1')).toBe('2557001');
        });
    });

    describe('isCompactTireSize', () => {
        it('should return true for 6 or 7 digit strings', () => {
            expect(isCompactTireSize('123456')).toBe(true);
            expect(isCompactTireSize('1234567')).toBe(true);
        });

        it('should return true if cleaning the string results in 6 or 7 digits (Current Behavior)', () => {
            expect(isCompactTireSize('12345')).toBe(false);
            // Even though this is formatted, the code thinks it's compact because it has 7 digits total
            expect(isCompactTireSize('255/70R16')).toBe(true);
        });
    });
});
