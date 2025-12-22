// Autofill utility for inventory input fields
import { Databases, Query } from 'react-native-appwrite';
import appwrite from '@/constants/appwrite';

const DB_ID = '687ca1a800338d2b13ae';
const COLLECTION_ID = '687f92b50025e9c821f6';

export type AutofillField = {
  field_name: string;
  collection_name: string;
  field_value: string;
};

export async function getAutofillValues(fieldName: string, collectionName: string = 'inventory_items'): Promise<string[]> {
  const databases = new Databases(appwrite);
  try {
    const result = await databases.listDocuments(DB_ID, COLLECTION_ID, [
      Query.equal('field_name', fieldName),
      Query.equal('collection_name', collectionName),
    ]);
    //console.log('Autofill fetch result:', result);
    if (!result.documents || !Array.isArray(result.documents)) {
      console.log('No documents found or result structure unexpected');
      return [];
    }
    return result.documents.map((doc: any) => doc.field_value);
  } catch (e) {
    console.log('Autofill fetch error:', e);
    return [];
  }
}
