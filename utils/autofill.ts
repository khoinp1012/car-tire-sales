// Autofill utility for inventory input fields - Offline-First with WatermelonDB
import { Q } from '@nozbe/watermelondb';
import { getDatabase } from './databaseService';

export type AutofillField = {
  field_name: string;
  collection_name: string;
  field_value: string;
};

/**
 * Fetches unique values for a field from the local database
 * PROPOSED: Dynamic extraction from actual data for offline-first responsiveness
 */
export async function getAutofillValues(fieldName: string, collectionName: string = 'inventory'): Promise<string[]> {
  const db = getDatabase();

  // Map Appwrite collection names to local table names
  const tableMap: Record<string, string> = {
    'inventory_items': 'inventory',
    'inventory': 'inventory',
    'customers': 'customers'
  };

  const tableName = tableMap[collectionName] || 'inventory';

  // Map field names to model property names
  const fieldMapping: Record<string, string> = {
    'unit_price': 'unitPrice',
    'radius_size': 'radiusSize',
    'brand': 'brand',
    'size': 'size',
    'name': 'name' // for customers
  };

  const propertyName = fieldMapping[fieldName] || fieldName;

  try {
    console.log(`[Autofill] Extracting unique ${propertyName} from local ${tableName}...`);

    // Fetch all active (non-deleted) records from the table
    // We filter by 'deleted' to ensure we only suggest values from valid records
    const records = await db.get(tableName)
      .query(Q.where('deleted', false))
      .fetch();

    const uniqueValues = new Set<string>();

    records.forEach((record: any) => {
      const val = record[propertyName];
      // Only add non-empty values
      if (val !== undefined && val !== null && val !== '') {
        uniqueValues.add(String(val));
      }
    });

    // Convert Set to sorted array for better UX
    const result = Array.from(uniqueValues).sort((a, b) => {
      // Numerical sort for numbers, alphabetical for strings
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });

    console.log(`[Autofill] Found ${result.length} unique values for ${fieldName}`);
    return result;
  } catch (e) {
    console.error(`[Autofill] Error extracting unique values for ${fieldName}:`, e);
    return [];
  }
}
