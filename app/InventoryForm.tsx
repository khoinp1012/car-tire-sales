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
import { formatTireSize, compactTireSize } from '@/utils/tireSizeFormatter';
import { 
  setupThermalPrinter, 
  printInventoryLabel, 
  printThermalQR, 
  printThermalText,
  printTestLabel,
  type ThermalDevice 
} from '@/utils/thermalPrinterService';
import QRCode from 'react-native-qrcode-svg';

// mode: 'insert' | 'modify'
// If mode is 'modify', must provide itemData and documentId
export default function InventoryForm({ mode = 'insert', itemData, documentId, onSuccess }: any) {
  const { lang } = useLanguage();
  // Initial values: use itemData if modify, else blank/defaults
  const [dropdownResetKey, setDropdownResetKey] = useState(0);
  const [brandForceKey, setBrandForceKey] = useState(0);
  const [sizeForceKey, setSizeForceKey] = useState(0);
  const [priceForceKey, setPriceForceKey] = useState(0);
  const [brandInitialValue, setBrandInitialValue] = useState<{ id: string; title: string } | undefined>(mode === 'modify' && itemData?.brand ? { id: itemData.brand, title: itemData.brand } : undefined);
  const [sizeInitialValue, setSizeInitialValue] = useState<{ id: string; title: string } | undefined>(mode === 'modify' && itemData?.size ? { id: itemData.size, title: formatTireSize(itemData.size) } : undefined);
  const [priceInitialValue, setPriceInitialValue] = useState<{ id: string; title: string } | undefined>(mode === 'modify' && itemData?.unit_price ? { id: String(itemData.unit_price), title: String(itemData.unit_price) } : undefined);
  const [brand, setBrand] = useState(mode === 'modify' && itemData?.brand ? itemData.brand : '');
  const brandInputTextRef = useRef('');
  const [size, setSize] = useState(mode === 'modify' && itemData?.size ? itemData.size : '');
  const sizeInputTextRef = useRef('');
  const [unitPrice, setUnitPrice] = useState(mode === 'modify' && itemData?.unit_price ? String(itemData.unit_price) : '');
  const priceInputTextRef = useRef('');
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
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
  // Printer related state
  const [printerDevices, setPrinterDevices] = useState<ThermalDevice[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<ThermalDevice | null>(null);
  const [printerDebug, setPrinterDebug] = useState('');
  const [enablePrint, setEnablePrint] = useState(false);
  const [lastInsertedSequence, setLastInsertedSequence] = useState<number | null>(null);
  const qrRef = useRef<any>(null);
  const testQrRef = useRef<any>(null);
  const [radiusSize, setRadiusSize] = useState(mode === 'modify' && itemData?.radius_size ? String(itemData.radius_size) : '');
  const brandInputRef = useRef<TextInput>(null);
  const brandDropdownController = useRef<any>(null);
  const sizeInputRef = useRef<TextInput>(null);
  const priceInputRef = useRef<TextInput>(null);

  useEffect(() => {
    getAutofillValues('brand').then(setBrandOptions);
    getAutofillValues('size').then(setSizeOptions);
    getAutofillValues('unit_price').then(setPriceOptions);
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

  // Format unit price with thousand separators for display
  const formatUnitPrice = (value: string | undefined | null) => {
    if (typeof value !== 'string') return '';
    const cleaned = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    if (!cleaned) return '';
    const num = parseFloat(cleaned);
    return isNaN(num) ? '' : num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  // Custom filter functions
  const customFilter = (options: string[], inputText: string, isPrice: boolean = false, isTireSize: boolean = false) => {
    if (!inputText) {
      return options.map(opt => ({ 
        id: opt, 
        title: isPrice ? formatUnitPrice(opt) : isTireSize ? formatTireSize(opt) : opt 
      }));
    }
    const searchText = inputText.toLowerCase().trim();
    const filtered = options.filter(opt => {
      const displayValue = isTireSize ? formatTireSize(opt) : opt;
      return displayValue.toLowerCase().includes(searchText) || opt.toLowerCase().includes(searchText);
    }).map(opt => ({ 
      id: opt, 
      title: isPrice ? formatUnitPrice(opt) : isTireSize ? formatTireSize(opt) : opt 
    }));
    const exactMatch = options.find(opt => opt.toLowerCase() === searchText);
    if (!exactMatch && inputText.trim()) {
      // For tire sizes, store in compact format but display formatted
      const idValue = isTireSize ? compactTireSize(inputText) || inputText : inputText;
      const titleValue = isPrice ? formatUnitPrice(inputText) : isTireSize ? inputText : inputText;
      filtered.unshift({ id: idValue, title: titleValue });
    }
    return filtered;
  };

  useEffect(() => { setFilteredBrandOptions(customFilter(brandOptions, brandInputText)); }, [brandOptions, brandInputText]);
  useEffect(() => { setFilteredSizeOptions(customFilter(sizeOptions, sizeInputText, false, true)); }, [sizeOptions, sizeInputText]);
  useEffect(() => { setFilteredPriceOptions(customFilter(priceOptions, priceInputText, true)); }, [priceOptions, priceInputText]);

  useEffect(() => {
    // Extract radius size from tire size (works with both formatted and compact sizes)
    if (size) {
      // If formatted size like "255/70R16", extract "16"
      const formattedMatch = size.match(/R(\d{1,2})$/i);
      if (formattedMatch) {
        setRadiusSize(formattedMatch[1]);
        return;
      }
      
      // If compact size like "2557016", extract last 2 characters
      const cleanSize = size.replace(/[^0-9]/g, '');
      if (cleanSize.length === 7) {
        setRadiusSize(cleanSize.slice(-2));
        return;
      }
      
      // If 6-digit format like "185651", extract last character and prepend "1"
      if (cleanSize.length === 6) {
        setRadiusSize('1' + cleanSize.slice(-1));
        return;
      }
    }
    
    setRadiusSize('');
  }, [size]);

  // Print logic - updated to use new thermal printer service
  const handlePrintTest = async () => {
    if (!selectedPrinter) {
      Alert.alert('Print Test', 'Please select a thermal printer first');
      return;
    }
    
    // Use the new printTestLabel function
    const success = await printTestLabel(selectedPrinter, setPrinterDebug);
    if (success) {
      Alert.alert('Print Test', 'Test label sent to printer successfully');
    }
  };

  const handlePrintInventory = async (sequence: number) => {
    if (!enablePrint) return;
    if (!selectedPrinter) return;
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

  // Submit logic: insert or modify
  const handleSubmit = async () => {
    setLoading(true);
    const databases = new Databases(appwrite);
    const DB_ID = '687ca1a800338d2b13ae';
    const COLLECTION_ID = '687ca1ac00054b181ab0';
    try {
      let doc, sequence;
      if (mode === 'insert') {
        doc = await databases.createDocument(
          DB_ID,
          COLLECTION_ID,
          ID.unique(),
          {
            full_description: `Brand: ${brand}, Size: ${size}, Price: ${unitPrice}, Radius: ${radiusSize}`,
            brand,
            size,
            unit_price: parseFloat(unitPrice),
            radius_size: radiusSize ? parseInt(radiusSize) : undefined,
            sequence: undefined,
          },
          [Permission.read(Role.any()), Permission.write(Role.any())]
        );
        if (doc.$sequence !== undefined) {
          sequence = parseInt(doc.$sequence, 10);
          await databases.updateDocument(DB_ID, COLLECTION_ID, doc.$id, { sequence });
        }
      } else if (mode === 'modify' && documentId) {
        doc = await databases.updateDocument(
          DB_ID,
          COLLECTION_ID,
          documentId,
          {
            full_description: `Brand: ${brand}, Size: ${size}, Price: ${unitPrice}, Radius: ${radiusSize}`,
            brand,
            size,
            unit_price: parseFloat(unitPrice),
            radius_size: radiusSize ? parseInt(radiusSize) : undefined,
            // sequence: keep existing
          }
        );
        sequence = doc.sequence || doc.$sequence;
      }
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      if (onSuccess) onSuccess(doc);
      // Optionally print after insert/modify
      if (enablePrint && ((mode === 'insert' && sequence) || (mode === 'modify' && doc?.sequence))) {
        await handlePrintInventory(mode === 'insert' ? sequence : doc?.sequence || 0);
      }
      // Reset form if insert
      if (mode === 'insert') {
        setBrand(''); setSize(''); setUnitPrice(''); setQuantity('1'); setBrandInitialValue(undefined); setSizeInitialValue(undefined); setPriceInitialValue(undefined); setBrandInputText(''); setSizeInputText(''); setPriceInputText(''); setRadiusSize(''); brandInputTextRef.current = ''; sizeInputTextRef.current = ''; priceInputTextRef.current = '';
        if (brandInputRef.current) brandInputRef.current.clear && brandInputRef.current.clear();
        if (sizeInputRef.current) sizeInputRef.current.clear && sizeInputRef.current.clear();
        if (priceInputRef.current) priceInputRef.current.clear && priceInputRef.current.clear();
        setDropdownResetKey(k => k + 1);
      }
    } catch (e) {
      Alert.alert('Error', 'An error occurred while saving inventory.');
    }
    setLoading(false);
  };

  // UI (reuse from InsertInventoryScreen, but use state above)
  const styles = StyleSheet.create({
    container: { padding: 24, backgroundColor: '#fff', flexGrow: 1 },
    label: { fontWeight: 'bold', marginTop: 16, marginBottom: 4, fontSize: 16 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#f9f9f9' },
  });

  const printerDropdownOptions = printerDevices.map((device, idx) => ({
    id: JSON.stringify(device),
    title: device.device_name || device.name || device.inner_mac_address || `Device ${idx + 1}`
  }));

  return (
    <AutocompleteDropdownContextProvider>
      <ScrollView contentContainerStyle={styles.container} style={{ zIndex: 1 }}>
        <SuccessPopup 
          visible={showSuccess} 
          message={mode === 'modify' ? 'Updated successfully!' : 'Inserted successfully!'} 
        />
        <Text style={styles.label}>{i18n.t('brand') || 'Brand'}</Text>
        <View style={{ marginBottom: 8, zIndex: 20 }}>
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
            controller={brandDropdownController}
            initialValue={brandInitialValue}
            onSelectItem={item => {
              if (item && item.title) {
                setBrand(item.id);
                brandInputTextRef.current = item.id;
                setBrandInitialValue({ id: item.id, title: item.title });
                setBrandInputText('');
              }
            }}
            onChangeText={text => {
              brandInputTextRef.current = text;
              setBrandInputText(text);
            }}
            onClear={() => {
              console.log('[Brand] onClear - forcing remount due to clear button press');
              setBrand('');
              brandInputTextRef.current = '';
              setBrandInitialValue(undefined);
              setBrandInputText('');
              setBrandForceKey(prev => prev + 1);
            }}
            textInputProps={{
              placeholder: 'Enter or select a brand',
              onBlur: () => {
                setBrand(brandInputTextRef.current);
                setBrandInitialValue(brandInputTextRef.current ? { id: brandInputTextRef.current, title: brandInputTextRef.current } : undefined);
                setBrandInputText('');
                setBrandForceKey(prev => prev + 1);
              },
            }}
          />
        </View>
        <Text style={styles.label}>{i18n.t('size') || 'Size'}</Text>
        <View style={{ marginBottom: 8, zIndex: 20 }}>
          <AutocompleteDropdown
            key={`${dropdownResetKey}-size-${sizeForceKey}`}
            closeOnSubmit={true}
            direction="down"
            suggestionsListMaxHeight={300}
            useFilter={false}
            editable={true}
            caseSensitive={false}
            dataSet={filteredSizeOptions}
            initialValue={sizeInitialValue}
            clearOnFocus={false}
            onSelectItem={item => {
              if (item && item.title) {
                setSize(item.id);
                sizeInputTextRef.current = item.id;
                setSizeInitialValue({ id: item.id, title: item.title });
                setSizeInputText('');
              }
            }}
            onChangeText={text => {
              sizeInputTextRef.current = text;
              setSizeInputText(text);
              // Store in compact format if user types formatted size
              const compactSize = compactTireSize(text) || text;
              setSize(compactSize);
            }}
            onClear={() => {
              console.log('[Size] onClear - forcing remount due to clear button press');
              setSize('');
              sizeInputTextRef.current = '';
              setSizeInitialValue(undefined);
              setSizeInputText('');
              setSizeForceKey(prev => prev + 1);
            }}
            textInputProps={{
              placeholder: 'Enter or select a size (e.g., 255/70R16)',
              onBlur: () => {
                const compactSize = compactTireSize(sizeInputTextRef.current) || sizeInputTextRef.current;
                setSize(compactSize);
                setSizeInitialValue(compactSize ? { id: compactSize, title: formatTireSize(compactSize) } : undefined);
                setSizeInputText('');
                setSizeForceKey(prev => prev + 1);
              },
            }}
          />
        </View>
        <Text style={styles.label}>{i18n.t('unitPrice') || 'Unit Price'}</Text>
        <View style={{ marginBottom: 8, zIndex: 20 }}>
          <AutocompleteDropdown
            key={`${dropdownResetKey}-price-${priceForceKey}`}
            closeOnSubmit={true}
            direction="down"
            suggestionsListMaxHeight={300}
            useFilter={false}
            editable={true}
            caseSensitive={false}
            dataSet={filteredPriceOptions}
            initialValue={priceInitialValue}
            clearOnFocus={false}
            onSelectItem={item => {
              if (item && item.id) {
                setUnitPrice(item.id);
                priceInputTextRef.current = item.id;
                setPriceInitialValue({ id: item.id, title: item.title || '' });
                setPriceInputText('');
              }
            }}
            onChangeText={text => {
              priceInputTextRef.current = text;
              setPriceInputText(text);
              setUnitPrice(text);
            }}
            onClear={() => {
              console.log('[Price] onClear - forcing remount due to clear button press');
              setUnitPrice('');
              priceInputTextRef.current = '';
              setPriceInitialValue(undefined);
              setPriceInputText('');
              setPriceForceKey(prev => prev + 1);
            }}
            textInputProps={{
              placeholder: 'Enter or select a unit price',
              onBlur: () => {
                setUnitPrice(priceInputTextRef.current);
                setPriceInitialValue(priceInputTextRef.current ? { id: priceInputTextRef.current, title: formatUnitPrice(priceInputTextRef.current) } : undefined);
                setPriceInputText('');
                setPriceForceKey(prev => prev + 1);
              },
            }}
          />
        </View>
        {/* Radius and Quantity in one row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 16 }}>
          <View style={{ flex: mode === 'modify' ? 1 : 1 }}>
            <Text style={styles.label}>{i18n.t('radiusSize') || 'Radius Size'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#eee' }]}
              value={radiusSize}
              editable={false}
              placeholder={i18n.t('radiusSize') || 'Radius Size'}
              keyboardType="numeric"
            />
          </View>
          {mode !== 'modify' && (
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.label}>{i18n.t('quantity') || 'Quantity'}</Text>
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
                  placeholder={i18n.t('quantity') || 'Quantity'}
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
          )}
        </View>
        <ThemedButton
          title={mode === 'modify' ? i18n.t('updateInventory') || 'Update Inventory' : i18n.t('insertInventory') || 'Insert Inventory'}
          onPress={handleSubmit}
          color="#1976d2"
          style={{ marginTop: 24 }}
        />
        {/* Enable Print Checkbox */}
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, paddingVertical: 8 }}
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
          <Text style={{ fontSize: 16, fontWeight: '500' }}>Enable Print</Text>
        </TouchableOpacity>
        {/* Printer Section */}
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
                    } catch (e) {
                      setSelectedPrinter(null);
                    }
                  } else {
                    setSelectedPrinter(null);
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
          <QRCode
            value={lastInsertedSequence ? `TT1_${lastInsertedSequence}` : 'TT1_0'}
            getRef={ref => (qrRef.current = ref)}
          />
          <QRCode
            value="TT1_1"
            getRef={ref => (testQrRef.current = ref)}
          />
        </View>
      </ScrollView>
    </AutocompleteDropdownContextProvider>
  );
}
