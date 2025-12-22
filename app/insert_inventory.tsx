import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { AutocompleteDropdown, AutocompleteDropdownContextProvider } from 'react-native-autocomplete-dropdown';
import i18n from '@/constants/i18n';
import { useLanguage } from '@/components/LanguageContext';
import SuccessPopup from '@/components/SuccessPopup';
import ThemedButton from '@/components/ThemedButton';
import appwrite, { account } from '@/constants/appwrite';
import { Databases, ID, Permission, Role, Query } from 'react-native-appwrite';
import { getAutofillValues } from '@/utils/autofill';
import { 
  setupThermalPrinter, 
  printInventoryLabel, 
  printThermalQR, 
  printThermalText,
  printTestLabel,
  type ThermalDevice 
} from '@/utils/thermalPrinterService';
import QRCode from 'react-native-qrcode-svg';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { usePermissions } from '@/hooks/usePermissions';
import { useRouter } from 'expo-router';

function InsertInventoryContent() {
  const { lang } = useLanguage();
  const { permissions } = usePermissions();
  const router = useRouter();

  const [dropdownResetKey, setDropdownResetKey] = useState(0);
  const [brandInitialValue, setBrandInitialValue] = useState<{ id: string; title: string } | undefined>(undefined);
  const [sizeInitialValue, setSizeInitialValue] = useState<{ id: string; title: string } | undefined>(undefined);
  const [priceInitialValue, setPriceInitialValue] = useState<{ id: string; title: string } | undefined>(undefined);
  const [brand, setBrand] = useState('');
  const brandInputTextRef = useRef('');
  const [size, setSize] = useState('');
  const sizeInputTextRef = useRef('');
  const [unitPrice, setUnitPrice] = useState('');
  const priceInputTextRef = useRef('');
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  // AutocompleteDropdown manages suggestions visibility

  // Autofill options fetched once
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [sizeOptions, setSizeOptions] = useState<string[]>([]);
  const [priceOptions, setPriceOptions] = useState<string[]>([]);

  // Custom filter state for each dropdown
  const [filteredBrandOptions, setFilteredBrandOptions] = useState<{ id: string; title: string }[]>([]);
  const [filteredSizeOptions, setFilteredSizeOptions] = useState<{ id: string; title: string }[]>([]);
  const [filteredPriceOptions, setFilteredPriceOptions] = useState<{ id: string; title: string }[]>([]);
  
  // Current input text for filtering
  const [brandInputText, setBrandInputText] = useState('');
  const [sizeInputText, setSizeInputText] = useState('');
  const [priceInputText, setPriceInputText] = useState('');

  // Force remount keys for when component internal state gets out of sync
  const [brandForceKey, setBrandForceKey] = useState(0);
  const [sizeForceKey, setSizeForceKey] = useState(0);
  const [priceForceKey, setPriceForceKey] = useState(0);

  // Printer related state
  const [printerDevices, setPrinterDevices] = useState<ThermalDevice[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<ThermalDevice | null>(null);
  const [printerDebug, setPrinterDebug] = useState('');
  const [enablePrint, setEnablePrint] = useState(false);
  const [lastInsertedSequence, setLastInsertedSequence] = useState<number | null>(null);
  const qrRef = useRef<any>(null);
  const testQrRef = useRef<any>(null);

  useEffect(() => {
    getAutofillValues('brand').then(setBrandOptions);
    getAutofillValues('size').then(setSizeOptions);
    getAutofillValues('unit_price').then(setPriceOptions);
    
    // Initialize printer scanning
    initializePrinter();
  }, []);

  const initializePrinter = async () => {
    setPrinterDebug('Setting up thermal printer...');
    const result = await setupThermalPrinter(setPrinterDebug);
    if (result.success) {
      setPrinterDevices(result.devices);
      setPrinterDebug(`Found ${result.devices.length} thermal printer(s)`);
    } else {
      setPrinterDebug('Failed to setup thermal printer');
    }
  };



  // Format options for AutocompleteDropdown

  // Format options for AutocompleteDropdown

  // Format unit price with thousand separators for display
  const formatUnitPrice = (value: string | undefined | null) => {
    if (typeof value !== 'string') return '';
    // Allow digits and a single decimal point
    const cleaned = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    if (!cleaned) return '';
    const num = parseFloat(cleaned);
    return isNaN(num) ? '' : num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  // Custom filter functions
  const customFilter = (options: string[], inputText: string, isPrice: boolean = false) => {
    if (!inputText) {
      // If no input, return all options
      return options.map(opt => ({
        id: opt,
        title: isPrice ? formatUnitPrice(opt) : opt
      }));
    }

    const searchText = inputText.toLowerCase().trim();
    
    // Filter existing options that match the input
    const filtered = options.filter(opt => 
      opt.toLowerCase().includes(searchText)
    ).map(opt => ({
      id: opt,
      title: isPrice ? formatUnitPrice(opt) : opt
    }));

    // Always include the current input as a selectable option (for custom entries)
    const exactMatch = options.find(opt => 
      opt.toLowerCase() === searchText
    );
    
    if (!exactMatch && inputText.trim()) {
      // Add the custom input as the first option
      filtered.unshift({
        id: inputText,
        title: isPrice ? formatUnitPrice(inputText) : inputText
      });
    }

    return filtered;
  };

  // Update filtered options when base options or input text changes
  useEffect(() => {
    const filtered = customFilter(brandOptions, brandInputText);
    setFilteredBrandOptions(filtered);
  }, [brandOptions, brandInputText]);

  useEffect(() => {
    const filtered = customFilter(sizeOptions, sizeInputText);
    setFilteredSizeOptions(filtered);
  }, [sizeOptions, sizeInputText]);

  useEffect(() => {
    const filtered = customFilter(priceOptions, priceInputText, true);
    setFilteredPriceOptions(filtered);
  }, [priceOptions, priceInputText]);

  // Printer functions
  const handlePrintTest = async () => {
    // Console log what would be printed (for testing without printer)
    console.log('=== PRINT TEST OUTPUT ===');
    console.log('QR Code Data: "TT1_1"');
    console.log('QR Code Size: 200x200');
    
    // Print test text data
    const testText = `Sequence: 1\nBrand: Test Brand\nSize: 205/55R16\nUnit Price: 1,500,000\nRadius: 16\n`;
    console.log('Text Data:');
    console.log(testText);
    console.log('=== END PRINT TEST ===');
    
    // Only check for printer if we actually want to print to hardware
    if (!selectedPrinter) {
      console.log('No printer selected - showing console output only');
      Alert.alert('Print Test', 'Print test completed - check console for output');
      return;
    }
    
    // Use the new printTestLabel function
    const success = await printTestLabel(selectedPrinter, setPrinterDebug);
    if (success) {
      Alert.alert('Print Test', 'Test label sent to printer successfully');
    }
  };

  const handlePrintInventory = async (sequence: number) => {
    console.log('handlePrintInventory called with sequence:', sequence);
    console.log('enablePrint status:', enablePrint);
    
    if (!enablePrint) {
      console.log('Print disabled - returning early');
      return;
    }
    
    // Console log what would be printed (for testing without printer)
    const qrValue = `TT1_${sequence}`;
    console.log('=== PRINT INVENTORY OUTPUT ===');
    console.log(`QR Code Data: "${qrValue}"`);
    console.log('QR Code Size: 200x200');
    console.log('=== END PRINT INVENTORY ===');
    
    // Only check for printer if we actually want to print to hardware
    if (!selectedPrinter) {
      console.log('No printer selected - showing console output only');
      return;
    }
    
    if (!qrRef.current) {
      Alert.alert('QR code ref not available');
      return;
    }
    
    // Use the new printInventoryLabel function
    const inventoryData = {
      sequence,
      brand,
      size,
      unitPrice: unitPrice ? Number(unitPrice).toLocaleString() : '',
      radiusSize
    };
    
    const success = await printInventoryLabel(
      selectedPrinter, 
      inventoryData, 
      qrRef.current, 
      setPrinterDebug
    );
    
    if (success) {
      setPrinterDebug('Inventory label printed successfully');
    }
  };

  const handlePrintInventoryWithData = async (printData: any) => {
    console.log('handlePrintInventoryWithData called with data:', printData);
    console.log('enablePrint status:', enablePrint);
    
    if (!enablePrint) {
      console.log('Print disabled - returning early');
      return;
    }
    
    if (!printData.sequence) {
      console.log('No sequence in print data - returning early');
      return;
    }
    
    // Console log what would be printed (for testing without printer)
    const qrValue = `TT1_${printData.sequence}`;
    console.log('=== PRINT INVENTORY OUTPUT ===');
    console.log(`QR Code Data: "${qrValue}"`);
    console.log('QR Code Size: 200x200');
    
    // Print all data as text using captured data
    const inventoryText = `Sequence: ${printData.sequence}\nBrand: ${printData.brand}\nSize: ${printData.size}\nUnit Price: ${printData.unitPrice}\nRadius: ${printData.radiusSize}\n`;
    console.log('Text Data:');
    console.log(inventoryText);
    console.log('=== END PRINT INVENTORY ===');
    
    // Only check for printer if we actually want to print to hardware
    if (!selectedPrinter) {
      console.log('No printer selected - showing console output only');
      return;
    }
    
    if (!qrRef.current) {
      Alert.alert('QR code ref not available');
      return;
    }
    
    // Print sequence as QR code with prefix
    // Use the new printInventoryLabel function with captured data
    const inventoryData = {
      sequence: printData.sequence,
      brand: printData.brand,
      size: printData.size,
      unitPrice: printData.unitPrice,
      radiusSize: printData.radiusSize
    };
    
    const success = await printInventoryLabel(
      selectedPrinter, 
      inventoryData, 
      qrRef.current, 
      setPrinterDebug
    );
    
    if (success) {
      setPrinterDebug('Inventory label with data printed successfully');
    }
  };

  // Format options for AutocompleteDropdown
  // Note: We now use filtered options instead of direct mapping
  // Format printer devices for dropdown
  const printerDropdownOptions = printerDevices.map((device, idx) => ({
    id: JSON.stringify(device),
    title: device.device_name || device.name || device.inner_mac_address || `Device ${idx + 1}`
  }));

  // Log dropdown values after options are declared
  useEffect(() => {
    // console.log('Filtered Brand Options:', filteredBrandOptions);
    // console.log('Filtered Size Options:', filteredSizeOptions);
    // console.log('Filtered Price Options:', filteredPriceOptions);
  }, [filteredBrandOptions, filteredSizeOptions, filteredPriceOptions]);

  const [radiusSize, setRadiusSize] = useState('');

  useEffect(() => {
    if (size.length === 7) {
      setRadiusSize(size.slice(-2));
    } else {
      setRadiusSize('');
    }
  }, [size]);

  // ...existing code...

  const handleSubmit = async () => {
    setLoading(true);
    const qty = Math.max(1, parseInt(quantity));
    const databases = new Databases(appwrite);
    const DB_ID = '687ca1a800338d2b13ae';
    const COLLECTION_ID = '687ca1ac00054b181ab0';
    let successCount = 0;
    let errorCount = 0;
    let insertedItems = []; // Track all inserted items for printing
    
    for (let i = 0; i < qty; i++) {
      try {
        const full_description = `Brand: ${brand}, Size: ${size}, Price: ${unitPrice}, Radius: ${radiusSize}`;
        const doc = await databases.createDocument(
          DB_ID,
          COLLECTION_ID,
          ID.unique(),
          {
            full_description,
            brand,
            size,
            unit_price: parseFloat(unitPrice),
            radius_size: radiusSize ? parseInt(radiusSize) : undefined,
            sequence: undefined, // will update after creation
          },
          [Permission.read(Role.any()), Permission.write(Role.any())]
        );
        // Update sequence field with doc.$sequence value
        if (doc.$sequence !== undefined) {
          const parsedSequence = parseInt(doc.$sequence, 10);
          console.log('Parsed sequence value for update:', parsedSequence);
          await databases.updateDocument(DB_ID, COLLECTION_ID, doc.$id, { sequence: parsedSequence });
          
          // Store this item for printing
          insertedItems.push({
            sequence: parsedSequence,
            brand: brand,
            size: size,
            unitPrice: unitPrice,
            radiusSize: radiusSize
          });
        }
        successCount++;
        console.log('Inserted document:', doc);
        console.log('Sequence value ($sequence):', doc.$sequence);
        
        // Store the last inserted sequence for QR code generation
        if (doc.$sequence !== undefined) {
          setLastInsertedSequence(parseInt(doc.$sequence, 10));
        }
      } catch (e) {
        errorCount++;
        console.log('Insert Inventory Error:', e);
      }
    }
    setLoading(false);
    if (successCount > 0) {
      console.log('All inserted items for printing:', insertedItems);
      console.log('All inserted items for printing:', insertedItems);
      
      // Clear all input fields to their default
      console.log('Insert Inventory Success:', successCount);
      setBrand('');
      setSize('');
      setUnitPrice('');
      setQuantity('1');
      // Reset initialValues
      setBrandInitialValue(undefined);
      setSizeInitialValue(undefined);
      setPriceInitialValue(undefined);
      // Clear custom filter input text
      setBrandInputText('');
      setSizeInputText('');
      setPriceInputText('');
      // Reset radiusSize based on cleared size
      setRadiusSize('');
      // If you want radiusSize to auto-update after autofill refresh, re-run the effect manually
      // This is only needed if size is set programmatically and useEffect doesn't trigger
      // setRadiusSize(size.length === 8 ? size.slice(-2) : '');
      // Also clear the text input refs for controlled fields
      brandInputTextRef.current = '';
      sizeInputTextRef.current = '';
      priceInputTextRef.current = '';
      if (brandInputRef.current) brandInputRef.current.clear && brandInputRef.current.clear();
      if (sizeInputRef.current) sizeInputRef.current.clear && sizeInputRef.current.clear();
      if (priceInputRef.current) priceInputRef.current.clear && priceInputRef.current.clear();
      // Force dropdowns to re-mount and reset
      setDropdownResetKey(k => k + 1);
      // Show success banner
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      // Insert autofill values if not exist (use first item's data for autofill)
      const autofillCollectionId = '687f92b50025e9c821f6';
      const insertAutofillIfNotExist = async (field_name: string, field_value: string) => {
        if (!field_value) {
          // console.log(`[Autofill] Skip empty value for field: ${field_name}`);
          return;
        }
        try {
          const result = await databases.listDocuments(DB_ID, autofillCollectionId, [
            Query.equal('field_name', field_name),
            Query.equal('collection_name', 'inventory_items'),
            Query.equal('field_value', field_value),
          ]);
          // console.log(`[Autofill] Query result for ${field_name}=${field_value}:`, result);
          if (!result.documents || result.documents.length === 0) {
            const created = await databases.createDocument(DB_ID, autofillCollectionId, ID.unique(), {
              field_name,
              collection_name: 'inventory_items',
              field_value,
            },);
            // console.log(`[Autofill] Inserted new value for ${field_name}: ${field_value}`, created);
          } else {
            // console.log(`[Autofill] Value already exists for ${field_name}: ${field_value}`);
          }
        } catch (err) {
          // console.log(`[Autofill] Error for field ${field_name} with value ${field_value}:`, err);
        }
      };
      
      // Use first item's data for autofill
      if (insertedItems.length > 0) {
        const firstItem = insertedItems[0];
        await insertAutofillIfNotExist('brand', firstItem.brand);
        await insertAutofillIfNotExist('size', firstItem.size);
        await insertAutofillIfNotExist('unit_price', firstItem.unitPrice);
        await insertAutofillIfNotExist('radius_size', firstItem.radiusSize);
      }

      // Refresh autofill dropdowns after database update
      getAutofillValues('brand').then(setBrandOptions);
      getAutofillValues('size').then(setSizeOptions);
      getAutofillValues('unit_price').then(setPriceOptions);
      
      // Print inventory for each item if printing is enabled
      if (enablePrint && insertedItems.length > 0) {
        console.log('Attempting to print inventory for', insertedItems.length, 'items...');
        console.log('enablePrint:', enablePrint);
        console.log('Items to print:', insertedItems);
        
        // Print each item with a small delay between prints
        for (let i = 0; i < insertedItems.length; i++) {
          const item = insertedItems[i];
          setTimeout(() => {
            console.log(`Printing item ${i + 1} of ${insertedItems.length}:`, item);
            handlePrintInventoryWithData(item);
          }, 500 * (i + 1)); // Stagger prints by 500ms each
        }
      } else {
        console.log('Print conditions not met:');
        console.log('enablePrint:', enablePrint);
        console.log('insertedItems.length:', insertedItems.length);
      }
    }
    if (errorCount > 0) {
      Alert.alert('Error', `Co loi xay ra ${errorCount} item${errorCount > 1 ? 's' : ''}`);
    }
  };

  const brandInputRef = useRef<TextInput>(null);
  // Use correct type for controller ref to avoid TS errors
  const brandDropdownController = useRef<any>(null);
  const sizeDropdownController = useRef<any>(null);
  const priceDropdownController = useRef<any>(null);
  const sizeInputRef = useRef<TextInput>(null);
  const priceInputRef = useRef<TextInput>(null);

  const styles = StyleSheet.create({
    container: {
      padding: 24,
      backgroundColor: '#fff',
      flexGrow: 1,
    },
    label: {
      fontWeight: 'bold',
      marginTop: 16,
      marginBottom: 4,
      fontSize: 16,
    },
    input: {
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      backgroundColor: '#f9f9f9',
    },
  });

return (
    <AutocompleteDropdownContextProvider>
      <ScrollView contentContainerStyle={styles.container} style={{ zIndex: 1 }}>
        <SuccessPopup visible={showSuccess} />
      {/* ...existing code... */}
      <Text style={styles.label}>{i18n.t('brand', { locale: lang }) || 'Brand'}</Text>
      <View style={{ marginBottom: 8, zIndex: 20 }}>
        <AutocompleteDropdown
          key={`${dropdownResetKey}-brand-${brandForceKey}`}
          closeOnSubmit={true} // close dropdown on submit
          direction="down"
          clearOnFocus={false} // Disable clearOnFocus to prevent auto-revert
          suggestionsListMaxHeight={300}
          useFilter={false} // We implement custom filtering
          editable={true}
          caseSensitive={false}
          dataSet={filteredBrandOptions}
          controller={brandDropdownController}
        initialValue={brandInitialValue}
        onSelectItem={item => {
          if (item && item.title) {
            setBrand(item.id); // Use id which is the actual value
            brandInputTextRef.current = item.id;
            setBrandInitialValue({ id: item.id, title: item.title });
            setBrandInputText(''); // Clear input text to show all options again
          }
        }}
        onChangeText={text => {
          brandInputTextRef.current = text;
          setBrand(text); // Update brand state as user types
          setBrandInputText(text); // This triggers the custom filter
          // Update initialValue to prevent revert on blur
          setBrandInitialValue(text ? { id: text, title: text } : undefined);
        }}
        onClear={() => {
          console.log('[Brand] onClear - forcing remount due to clear button press');
          setBrand('');
          brandInputTextRef.current = '';
          setBrandInitialValue(undefined);
          setBrandInputText('');
          setBrandForceKey(prev => prev + 1);
        }}
        onBlur={() => {
          console.log('[Brand] onBlur - forcing remount due to potential state mismatch');
          setBrandForceKey(prev => prev + 1);
        }}
        onFocus={() => {
          // Optional: Add focus handling if needed
        }}
        // ******************************************************
        textInputProps={{
          placeholder: i18n.t('enterOrSelectBrand', { locale: lang }),
        }}
      />
      </View>
      <Text style={styles.label}>{i18n.t('size', { locale: lang }) || 'Size'}</Text>
      <View style={{ marginBottom: 8, zIndex: 20 }}>
        <AutocompleteDropdown
          key={`${dropdownResetKey}-size-${sizeForceKey}`}
          closeOnSubmit={true}
          direction="down"
          suggestionsListMaxHeight={300}
          useFilter={false} // We implement custom filtering
          editable={true}
          caseSensitive={false}
          dataSet={filteredSizeOptions}
          initialValue={sizeInitialValue}
          clearOnFocus={false} // Disable clearOnFocus to prevent auto-revert
          controller={sizeDropdownController}
          onSelectItem={item => {
            if (item && item.title) {
              setSize(item.id); // Use id which is the actual value
              sizeInputTextRef.current = item.id;
              setSizeInitialValue({ id: item.id, title: item.title });
              setSizeInputText(''); // Clear input text to show all options again
            }
          }}
          onChangeText={text => {
            sizeInputTextRef.current = text;
            setSizeInputText(text); // This triggers the custom filter
            setSize(text); // Update size immediately for radius calculation
            // Update initialValue to prevent revert on blur
            setSizeInitialValue(text ? { id: text, title: text } : undefined);
          }}
          onClear={() => {
            console.log('[Size] onClear - forcing remount due to clear button press');
            setSize('');
            sizeInputTextRef.current = '';
            setSizeInitialValue(undefined);
            setSizeInputText('');
            setSizeForceKey(prev => prev + 1);
          }}
          onBlur={() => {
            console.log('[Size] onBlur - forcing remount due to potential state mismatch');
            setSizeForceKey(prev => prev + 1);
          }}
          onFocus={() => {
            // Optional: Add focus handling if needed
          }}
          textInputProps={{
            placeholder: i18n.t('enterOrSelectSize', { locale: lang }),
          }}
        />
      </View>
      <Text style={styles.label}>{i18n.t('unitPrice', { locale: lang }) || 'Unit Price'}</Text>
      <View style={{ marginBottom: 8, zIndex: 20 }}>
        <AutocompleteDropdown
          key={`${dropdownResetKey}-price-${priceForceKey}`}
          closeOnSubmit={true}
          direction="down"
          suggestionsListMaxHeight={300}
          useFilter={false} // We implement custom filtering
          editable={true}
          caseSensitive={false}
          dataSet={filteredPriceOptions}
          initialValue={priceInitialValue}
          clearOnFocus={false} // Disable clearOnFocus to prevent auto-revert
          controller={priceDropdownController}
          onSelectItem={item => {
            if (item && item.id) {
              setUnitPrice(item.id); // Use id which is the actual value
              priceInputTextRef.current = item.id;
              setPriceInitialValue({ id: item.id, title: item.title || '' });
              setPriceInputText(''); // Clear input text to show all options again
            }
          }}
          onChangeText={text => {
            priceInputTextRef.current = text;
            setPriceInputText(text); // This triggers the custom filter
            setUnitPrice(text); // Update price immediately
            // Update initialValue to prevent revert on blur
            setPriceInitialValue(text ? { id: text, title: formatUnitPrice(text) || text } : undefined);
          }}
          onClear={() => {
            console.log('[Price] onClear - forcing remount due to clear button press');
            setUnitPrice('');
            priceInputTextRef.current = '';
            setPriceInitialValue(undefined);
            setPriceInputText('');
            setPriceForceKey(prev => prev + 1);
          }}
          onBlur={() => {
            console.log('[Price] onBlur - forcing remount due to potential state mismatch');
            setPriceForceKey(prev => prev + 1);
          }}
          onFocus={() => {
            // Optional: Add focus handling if needed
          }}
          textInputProps={{
            placeholder: i18n.t('enterOrSelectUnitPrice', { locale: lang }),
          }}
        />
      </View>
      
      {/* Radius and Quantity in one row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{i18n.t('radiusSize', { locale: lang })}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: '#eee' }]}
            value={radiusSize}
            editable={false}
            placeholder={i18n.t('radiusSize', { locale: lang })}
            keyboardType="numeric"
          />
        </View>
        
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.label}>{i18n.t('quantity', { locale: lang })}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <ThemedButton
              title="-"
              onPress={() => setQuantity(q => String(Math.max(1, parseInt(q) - 1)))}
              color="#d32f2f"
              style={{ marginHorizontal: 4, minWidth: 40, paddingHorizontal: 0 }}
            />
            <TextInput
              style={[styles.input, { width: 60, textAlign: 'center', marginHorizontal: 4 }]}
              value={quantity}
              onChangeText={text => setQuantity(text.replace(/[^0-9]/g, ''))}
              placeholder={i18n.t('quantity', { locale: lang })}
              keyboardType="numeric"
            />
            <ThemedButton
              title="+"
              onPress={() => setQuantity(q => String(Math.max(1, parseInt(q) + 1)))}
              color="#388e3c"
              style={{ marginHorizontal: 4, minWidth: 40, paddingHorizontal: 0 }}
            />
          </View>
        </View>
      </View>
      
      <ThemedButton
        title={i18n.t('insertInventory', { locale: lang })}
        onPress={handleSubmit}
        color="#1976d2"
        style={{ marginTop: 24 }}
      />
      
      {/* Enable Print Checkbox */}
      <TouchableOpacity 
        style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          marginTop: 24,
          paddingVertical: 8 
        }}
        onPress={() => setEnablePrint(!enablePrint)}
      >
        <View style={{
          width: 20,
          height: 20,
          borderWidth: 2,
          borderColor: '#1976d2',
          borderRadius: 4,
          marginRight: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: enablePrint ? '#1976d2' : 'transparent'
        }}>
          {enablePrint && (
            <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>✓</Text>
          )}
        </View>
        <Text style={{ fontSize: 16, fontWeight: '500' }}>{i18n.t('enablePrint', { locale: lang })}</Text>
      </TouchableOpacity>
      
      {/* Printer Section - All in one row */}
      {enablePrint && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 8 }}>
        <View style={{ flex: 2, zIndex: 10 }}>
          <AutocompleteDropdown
            key={dropdownResetKey + '-printer'}
            closeOnSubmit={true}
            direction="down"
            suggestionsListMaxHeight={200}
            useFilter={false}
            editable={false}
            caseSensitive={false}
            dataSet={printerDropdownOptions}
            initialValue={selectedPrinter ? { 
              id: JSON.stringify(selectedPrinter), 
              title: selectedPrinter.device_name || selectedPrinter.name || selectedPrinter.inner_mac_address || 'Selected Device'
            } : undefined}
            clearOnFocus={false}
            onSelectItem={item => {
              if (item && item.id) {
                try {
                  const device = JSON.parse(item.id);
                  setSelectedPrinter(device);
                  console.log('Printer selected:', device);
                } catch (e) {
                  console.error('Error parsing selected printer:', e);
                }
              } else {
                setSelectedPrinter(null);
                console.log('Printer deselected');
              }
            }}
            textInputProps={{
              placeholder: printerDevices.length > 0 ? i18n.t('selectPrinter', { locale: lang }) : i18n.t('noPrinters', { locale: lang }),
            }}
          />
        </View>
        
        <ThemedButton
          title={i18n.t('printTest', { locale: lang })}
          onPress={handlePrintTest}
          color="#1976d2"
          style={{ flex: 1, minWidth: 80 }}
        />
        
        <ThemedButton
          title={i18n.t('refresh', { locale: lang })}
          onPress={initializePrinter}
          color="#ff9800"
          style={{ flex: 1, minWidth: 70 }}
        />
      </View>
      )}
      
      {enablePrint && printerDebug ? (
        <Text style={{ marginTop: 8, color: 'red', fontSize: 12 }}>{printerDebug}</Text>
      ) : null}
      
      {/* Hidden QR code for base64 generation */}
      <View style={{ position: 'absolute', left: -1000 }}>
        {/* QR code for sequence number */}
        <QRCode
          value={lastInsertedSequence ? `TT1_${lastInsertedSequence}` : 'TT1_0'}
          getRef={ref => (qrRef.current = ref)}
        />
        {/* QR code for test printing */}
        <QRCode
          value="TT1_1"
          getRef={ref => (testQrRef.current = ref)}
        />
      </View>
      </ScrollView>
    </AutocompleteDropdownContextProvider>
  );
}

export default function InsertInventoryScreen() {
  return (
    <ProtectedRoute routeName="insert_inventory">
      <InsertInventoryContent />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  label: {
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 4,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
});
