import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ScrollView } from 'react-native';
import { AutocompleteDropdown, AutocompleteDropdownContextProvider } from 'react-native-autocomplete-dropdown';
import ThemedButton from '../components/ThemedButton';
import appwrite from '../constants/appwrite';
import { Databases, Query } from 'react-native-appwrite';
import { getAutofillValues } from '../utils/autofill';
import { formatVNCurrency } from '../utils/invoiceUtils';
import { formatTireSize } from '../utils/tireSizeFormatter';
import i18n from '../constants/i18n';
import { useLanguage } from '../components/LanguageContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { usePermissions } from '@/hooks/usePermissions';
import { useRouter } from 'expo-router';

// Type for inventory item
interface InventoryItem {
  $id: string;
  sequence: number;
  brand: string;
  size: string;
  unit_price?: number;
  radius_size?: number;
  sold: boolean;
  full_description?: string;
  [key: string]: any;
}

const DB_ID = '687ca1a800338d2b13ae';
const COLLECTION_ID = '687ca1ac00054b181ab0';

const FindInventoryContent: React.FC = () => {
  const { lang } = useLanguage();
  const { permissions } = usePermissions();
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchPerformed, setSearchPerformed] = useState<boolean>(false);
  
  // Search criteria - using refs like insert_inventory
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedRadius, setSelectedRadius] = useState<string>('');
  const brandInputTextRef = useRef('');
  const radiusInputTextRef = useRef('');
  
  // Autofill data - base options
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [radiusOptions, setRadiusOptions] = useState<string[]>([]);
  
  // Filtered options for dropdowns (following insert_inventory pattern)
  const [filteredBrandOptions, setFilteredBrandOptions] = useState<{ id: string; title: string }[]>([]);
  const [filteredRadiusOptions, setFilteredRadiusOptions] = useState<{ id: string; title: string }[]>([]);
  
  // Current input text for filtering
  const [brandInputText, setBrandInputText] = useState('');
  const [radiusInputText, setRadiusInputText] = useState('');
  
  // Force remount keys for when component internal state gets out of sync
  const [brandForceKey, setBrandForceKey] = useState(0);
  const [radiusForceKey, setRadiusForceKey] = useState(0);
  
  // Initial values for dropdowns
  const [brandInitialValue, setBrandInitialValue] = useState<{ id: string; title: string } | undefined>(undefined);
  const [radiusInitialValue, setRadiusInitialValue] = useState<{ id: string; title: string } | undefined>(undefined);
  
  const [dropdownResetKey, setDropdownResetKey] = useState(0);

  useEffect(() => {
    loadAutofillData();
  }, []);

  // Custom filter functions (from insert_inventory pattern)
  const customFilter = (options: string[], inputText: string) => {
    if (!inputText) {
      // If no input, return all options
      return options.map(opt => ({
        id: opt,
        title: opt
      }));
    }

    const searchText = inputText.toLowerCase().trim();
    
    // Filter existing options that match the input
    const filtered = options.filter(opt => 
      opt.toLowerCase().includes(searchText)
    ).map(opt => ({
      id: opt,
      title: opt
    }));

    // Always include the current input as a selectable option (for custom entries)
    const exactMatch = options.find(opt => 
      opt.toLowerCase() === searchText
    );
    
    if (!exactMatch && inputText.trim()) {
      // Add the custom input as the first option
      filtered.unshift({
        id: inputText,
        title: inputText
      });
    }

    return filtered;
  };

  // Update filtered options when base options or input text changes
  useEffect(() => {
    setFilteredBrandOptions(customFilter(brandOptions, brandInputText));
  }, [brandOptions, brandInputText]);

  useEffect(() => {
    setFilteredRadiusOptions(customFilter(radiusOptions, radiusInputText));
  }, [radiusOptions, radiusInputText]);

  const loadAutofillData = async () => {
    try {
      console.log('[FindInventoryScreen] Loading autofill data...');
      
      // Load brand options from autofill (store as string array)
      const brands = await getAutofillValues('brand', 'inventory_items');
      setBrandOptions(brands);
      
      // Load radius options from autofill (store as string array)
      const radiuses = await getAutofillValues('radius_size', 'inventory_items');
      setRadiusOptions(radiuses);
      
      console.log('[FindInventoryScreen] Autofill data loaded:', { 
        brands: brands.length, 
        radiuses: radiuses.length 
      });
      
      setDropdownResetKey(k => k + 1);
    } catch (e) {
      console.error('[FindInventoryScreen] Failed to load autofill data:', e);
      Alert.alert('Error', i18n.t('failedToLoadSearchOptions', { locale: lang }));
    }
  };

  const searchInventory = async () => {
    if (!selectedBrand && !selectedRadius) {
      Alert.alert(i18n.t('searchCriteriaRequired', { locale: lang }), i18n.t('pleaseSelectBrandOrRadius', { locale: lang }));
      return;
    }

    setLoading(true);
    setError(null);
    setSearchPerformed(true);
    
    try {
      console.log('[FindInventoryScreen] Starting search:', { 
        selectedBrand, 
        selectedRadius 
      });
      
      const databases = new Databases(appwrite);
      const queries = [
        Query.equal('sold', false), // Only unsold items
      ];
      
      // Add brand filter if selected
      if (selectedBrand) {
        queries.push(Query.equal('brand', selectedBrand));
      }
      
      // Add radius filter if selected
      if (selectedRadius) {
        queries.push(Query.equal('radius_size', parseInt(selectedRadius)));
      }
      
      // Order by sequence for consistent results
      queries.push(Query.orderDesc('sequence'));
      
      const result = await databases.listDocuments(DB_ID, COLLECTION_ID, queries);
      
      console.log('[FindInventoryScreen] Search completed:', {
        totalFound: result.documents.length,
        queries: queries.length
      });
      
      // Map documents to InventoryItem type
      const inventoryItems = result.documents.map((doc: any) => ({
        $id: doc.$id,
        sequence: doc.sequence,
        brand: doc.brand,
        size: doc.size,
        unit_price: doc.unit_price,
        radius_size: doc.radius_size,
        sold: doc.sold,
        full_description: doc.full_description,
        ...doc
      }));
      
      setItems(inventoryItems);
      
    } catch (e: any) {
      console.error('[FindInventoryScreen] Search failed:', e);
      setError(i18n.t('failedToSearchInventory', { locale: lang }));
      Alert.alert(i18n.t('error', { locale: lang }), i18n.t('failedToSearchInventory', { locale: lang }));
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSelectedBrand('');
    setSelectedRadius('');
    brandInputTextRef.current = '';
    radiusInputTextRef.current = '';
    setBrandInputText('');
    setRadiusInputText('');
    setBrandInitialValue(undefined);
    setRadiusInitialValue(undefined);
    setItems([]);
    setError(null);
    setSearchPerformed(false);
    setDropdownResetKey(k => k + 1);
  };

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <View style={styles.itemRow}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemText}>{i18n.t('seq', { locale: lang })}: {item.sequence}</Text>
        <Text style={styles.itemText}>{item.brand} {formatTireSize(item.size)}</Text>
        <Text style={styles.itemSubText}>{i18n.t('radius', { locale: lang })}: {item.radius_size || 'N/A'}</Text>
        <Text style={styles.itemSubText}>{i18n.t('price', { locale: lang })}: {item.unit_price ? formatVNCurrency(item.unit_price) + ' VND' : 'N/A'}</Text>
      </View>
    </View>
  );

  return (
    <AutocompleteDropdownContextProvider>
      <View style={styles.container}>
        <Text style={styles.title}>{i18n.t('findInventory', { locale: lang })}</Text>
        
        {/* Search Form */}
        <View style={styles.searchForm}>
          {/* Brand Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('brandLabel', { locale: lang })}</Text>
            <View style={styles.dropdownContainer}>
                            <AutocompleteDropdown
                key={`${dropdownResetKey}-brand-${brandForceKey}`}
                closeOnSubmit={true}
                direction="down"
                clearOnFocus={false}
                suggestionsListMaxHeight={300}
                useFilter={false}
                editable={true}
                caseSensitive={false}
                dataSet={filteredBrandOptions}
                initialValue={brandInitialValue}
                onSelectItem={item => {
                  if (item && item.title) {
                    setSelectedBrand(item.id);
                    brandInputTextRef.current = item.id;
                    setBrandInitialValue({ id: item.id, title: item.title });
                    setBrandInputText('');
                  }
                }}
                onChangeText={text => {
                  brandInputTextRef.current = text;
                  setSelectedBrand(text);
                  setBrandInputText(text);
                  setBrandInitialValue(text ? { id: text, title: text } : undefined);
                }}
                onClear={() => {
                  console.log('[Brand] onClear - forcing remount due to clear button press');
                  setSelectedBrand('');
                  brandInputTextRef.current = '';
                  setBrandInitialValue(undefined);
                  setBrandInputText('');
                  setBrandForceKey(prev => prev + 1);
                }}
                onBlur={() => {
                  setBrandForceKey(prev => prev + 1);
                }}
                textInputProps={{
                  placeholder: i18n.t('enterOrSelectBrand', { locale: lang }),
                }}
              />
            </View>
          </View>

          {/* Radius Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('radiusLabel', { locale: lang })}</Text>
            <View style={styles.dropdownContainer}>
              <AutocompleteDropdown
                key={`${dropdownResetKey}-radius-${radiusForceKey}`}
                closeOnSubmit={true}
                direction="down"
                clearOnFocus={false} 
                suggestionsListMaxHeight={200}
                useFilter={false} // We implement custom filtering
                editable={true}
                caseSensitive={false}
                dataSet={filteredRadiusOptions}
                initialValue={radiusInitialValue}
                onSelectItem={item => {
                  if (item && item.title) {
                    setSelectedRadius(item.id); // Use id which is the actual value
                    radiusInputTextRef.current = item.id;
                    setRadiusInitialValue({ id: item.id, title: item.title });
                    setRadiusInputText(''); // Clear input text to show all options again
                  }
                }}
                onChangeText={text => {
                  radiusInputTextRef.current = text;
                  setSelectedRadius(text); // Update selected radius as user types
                  setRadiusInputText(text); // This triggers the custom filter
                  setRadiusInitialValue(text ? { id: text, title: text } : undefined);
                }}
                onClear={() => {
                  console.log('[Radius] onClear - forcing remount due to clear button press');
                  setSelectedRadius('');
                  radiusInputTextRef.current = '';
                  setRadiusInitialValue(undefined);
                  setRadiusInputText('');
                  setRadiusForceKey(prev => prev + 1);
                }}
                onBlur={() => {
                  setRadiusForceKey(prev => prev + 1);
                }}
                textInputProps={{
                  placeholder: radiusOptions.length > 0 ? i18n.t('enterOrSelectRadius', { locale: lang }) : i18n.t('loadingRadius', { locale: lang }),
                }}
              />
            </View>
          </View>

          {/* Search Buttons */}
          <View style={styles.buttonRow}>
            <ThemedButton
              title={i18n.t('search', { locale: lang })}
              onPress={searchInventory}
              style={styles.searchButton}
              color="#1976d2"
            />
            <ThemedButton
              title={i18n.t('clear', { locale: lang })}
              onPress={clearSearch}
              style={styles.clearButton}
              color="#ff9800"
            />
          </View>
        </View>

        {/* Results Section */}
        <View style={styles.resultsContainer}>
          {loading && <Text style={styles.infoText}>Searching...</Text>}
          
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          {searchPerformed && !loading && !error && (
            <Text style={styles.resultsHeader}>
              {i18n.t('foundItems', { locale: lang })} {items.length} {items.length === 1 ? i18n.t('unsoldItem', { locale: lang }) : i18n.t('unsoldItems', { locale: lang })}
            </Text>
          )}
          
          <FlatList
            data={items}
            keyExtractor={item => item.$id}
            renderItem={renderInventoryItem}
            ListEmptyComponent={
              searchPerformed && !loading && !error ? (
                <Text style={styles.infoText}>
                  No unsold inventory found matching your criteria.
                </Text>
              ) : null
            }
            style={styles.resultsList}
          />
        </View>
      </View>
    </AutocompleteDropdownContextProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  searchForm: {
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  dropdownContainer: {
    zIndex: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  searchButton: {
    flex: 1,
  },
  clearButton: {
    flex: 1,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    color: '#333',
  },
  resultsList: {
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemInfo: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemSubText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 1,
  },
  infoText: {
    textAlign: 'center',
    marginTop: 32,
    color: '#888',
    fontSize: 16,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 32,
    color: 'red',
    fontSize: 16,
  },
});

const FindInventoryScreen: React.FC = () => {
  return (
    <ProtectedRoute routeName="find_inventory">
      <FindInventoryContent />
    </ProtectedRoute>
  );
};

export default FindInventoryScreen;
