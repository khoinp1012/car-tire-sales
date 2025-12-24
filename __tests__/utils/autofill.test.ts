import { getAutofillValues } from '@/utils/autofill';
import { Databases } from 'react-native-appwrite';

// 1. Mock the specific library
jest.mock('react-native-appwrite', () => ({
    Databases: jest.fn().mockImplementation(() => ({
        listDocuments: jest.fn(),
    })),
    Query: {
        equal: (field: string, value: any) => `equal(${field}, ${value})`,
    },
}));

// 2. Mock our constants
jest.mock('@/constants/appwrite', () => ({
    __esModule: true,
    default: {},
    DATABASE_ID: 'test_db',
    AUTOFILL_COLLECTION_ID: 'test_autofill',
}));

describe('autofill utility', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return a list of values from the database', async () => {
        // We have to mock the implementation specifically for this test
        const mockListDocs = jest.fn().mockResolvedValue({
            documents: [
                { field_value: 'Bridgestone' },
                { field_value: 'Michelin' }
            ]
        });

        (Databases as unknown as jest.Mock).mockImplementation(() => ({
            listDocuments: mockListDocs
        }));

        const result = await getAutofillValues('brand');

        expect(result).toEqual(['Bridgestone', 'Michelin']);
        expect(mockListDocs).toHaveBeenCalledWith(
            'test_db',
            'test_autofill',
            expect.any(Array)
        );
    });

    it('should return an empty array if database fails', async () => {
        const mockListDocs = jest.fn().mockRejectedValue(new Error('Connection failed'));

        (Databases as unknown as jest.Mock).mockImplementation(() => ({
            listDocuments: mockListDocs
        }));

        // We use a spy to stop the console.log from cluttering the test results
        const logSpy = jest.spyOn(console, 'log').mockImplementation();

        const result = await getAutofillValues('brand');

        expect(result).toEqual([]);
        logSpy.mockRestore();
    });
});
