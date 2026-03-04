import { getAutofillValues } from '@/utils/autofill';
import { getDatabase } from '@/utils/databaseService';

// Mock Database Service
jest.mock('@/utils/databaseService', () => ({
    getDatabase: jest.fn(),
}));

describe('autofill utility', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return a list of values from the database', async () => {
        const mockRecords = [
            { brand: 'Bridgestone', deleted: false },
            { brand: 'Michelin', deleted: false }
        ];

        const mockQuery = {
            fetch: jest.fn().mockResolvedValue(mockRecords),
        };

        const mockCollection = {
            query: jest.fn().mockReturnValue(mockQuery),
        };

        const mockDb = {
            get: jest.fn().mockReturnValue(mockCollection),
        };

        (getDatabase as jest.Mock).mockReturnValue(mockDb);

        const result = await getAutofillValues('brand');

        expect(result).toEqual(['Bridgestone', 'Michelin']);
        expect(mockDb.get).toHaveBeenCalledWith('inventory');
    });

    it('should return an empty array if database fails', async () => {
        const mockDb = {
            get: jest.fn().mockImplementation(() => {
                throw new Error('Database error');
            }),
        };

        (getDatabase as jest.Mock).mockReturnValue(mockDb);

        // We use a spy to stop the console.error from cluttering the test results
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await getAutofillValues('brand');

        expect(result).toEqual([]);
        errorSpy.mockRestore();
    });
});
