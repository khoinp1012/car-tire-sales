import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { AutocompleteDropdown, AutocompleteDropdownContextProvider } from 'react-native-autocomplete-dropdown';
import ThemedButton from '../components/ThemedButton';
import { useRouter } from 'expo-router';
import appwrite, { DATABASE_ID, INVENTORY_COLLECTION_ID } from '../constants/appwrite';
import { Databases, Query } from 'react-native-appwrite';
import { formatTireSize } from '../utils/tireSizeFormatter';
import {
  setupThermalPrinter,
  printInventoryLabel,
  printThermalQR,
  printThermalText,
  type ThermalDevice
} from '../utils/thermalPrinterService';
import QRCode from 'react-native-qrcode-svg';
import i18n from '../constants/i18n';
import { useLanguage } from '../components/LanguageContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { usePermissions } from '@/hooks/usePermissions';
import { QR_PREFIXES } from '@/constants/config';

// Type for inventory item
interface InventoryItem {
  $id: string;
  sequence: number;
  brand: string;
  size: string;
  unit_price?: number;
  radius_size?: number;
  [key: string]: any;
}

const LAST_N = 10;

const ReprintInventoryContent: React.FC = () => {
  const { lang } = useLanguage();
  const { permissions } = usePermissions();
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [enablePrint, setEnablePrint] = useState(true);
  const [printerDevices, setPrinterDevices] = useState<ThermalDevice[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<ThermalDevice | null>(null);
  const [printerDebug, setPrinterDebug] = useState('');
  const [dropdownResetKey, setDropdownResetKey] = useState(0);
  const qrRefs = useRef<{ [seq: number]: any }>({});
  const [customSequence, setCustomSequence] = useState('');

  // Load data on mount
  useEffect(() => {
    fetchLastInventory();
    initializePrinter();
  }, []);
  // Print directly from input
  const handlePrintCustomSequence = async () => {
    if (!customSequence) {
      console.log('[DEBUG] No custom sequence entered');
      return;
    }

    console.log('=== CUSTOM SEQUENCE PRINT DEBUG ===');
    console.log('Custom sequence:', customSequence);

    try {
      const databases = new Databases(appwrite);
      const result = await databases.listDocuments(DATABASE_ID, INVENTORY_COLLECTION_ID, [
        Query.equal('sequence', parseInt(customSequence))
      ]);

      console.log('Database query result:', {
        documentsFound: result.documents.length,
        documents: result.documents
      });

      if (result.documents.length > 0) {
        const doc = result.documents[0];
        console.log('Found inventory document:', doc);

        // Register QR ref for this sequence
        setTimeout(() => {
          if (!qrRefs.current[doc.sequence]) {
            console.log('[DEBUG] QR code ref not ready for custom sequence');
            Alert.alert(i18n.t('error', { locale: lang }), i18n.t('qrCodeNotReady', { locale: lang }));
            return;
          }
          console.log('[DEBUG] Calling handlePrint for custom sequence:', doc.sequence);
          handlePrint({
            sequence: doc.sequence,
            brand: doc.brand,
            size: doc.size,
            unit_price: doc.unit_price,
            radius_size: doc.radius_size,
            ...doc
          });
        }, 100); // Give QRCode a moment to render
      } else {
        console.log('[DEBUG] No inventory found for sequence:', customSequence);
        Alert.alert(i18n.t('noDataFound', { locale: lang }), `${i18n.t('noDataFound', { locale: lang })} ${customSequence}`);
      }
    } catch (e) {
      console.error('[DEBUG] Error fetching custom sequence:', e);
      Alert.alert('Error', i18n.t('failedToFetchInventoryForCustomSequence', { locale: lang }));
    }
  };

  useEffect(() => {
    fetchLastInventory();
    initializePrinter();
  }, []);

  const fetchLastInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const databases = new Databases(appwrite);
      const result = await databases.listDocuments(DATABASE_ID, INVENTORY_COLLECTION_ID, [
        Query.orderDesc('sequence'),
        Query.limit(LAST_N)
      ]);
      // Map documents to InventoryItem type (defensive)
      setItems(result.documents.map((doc: any) => ({
        $id: doc.$id,
        sequence: doc.sequence,
        brand: doc.brand,
        size: doc.size,
        unit_price: doc.unit_price,
        radius_size: doc.radius_size,
        ...doc
      })));
    } catch (e: any) {
      console.error('[ReprintInventoryScreen] Failed to fetch inventory:', e);
      setError(i18n.t('failedToFetchInventory', { locale: lang }));
    } finally {
      setLoading(false);
    }
  };

  const initializePrinter = async () => {
    console.log('=== INITIALIZING PRINTER ===');
    setPrinterDebug('Setting up thermal printer...');

    const result = await setupThermalPrinter(setPrinterDebug);

    console.log('Printer setup result:', {
      success: result.success,
      devicesCount: result.devices.length,
      devices: result.devices
    });

    if (result.success) {
      setPrinterDevices(result.devices);
      const message = `Found ${result.devices.length} thermal printer(s)`;
      setPrinterDebug(message);
      console.log('[PRINTER INIT]', message);

      // Log each device for debugging
      result.devices.forEach((device, index) => {
        console.log(`[PRINTER INIT] Device ${index + 1}:`, {
          name: device.device_name || device.name,
          mac: device.inner_mac_address,
          fullDevice: device
        });
      });
    } else {
      setPrinterDebug('Failed to setup thermal printer');
      console.log('[PRINTER INIT] Setup failed');
    }
    setDropdownResetKey(k => k + 1);
  };

  const handlePrint = async (item: InventoryItem) => {
    // Debug print for emulator: print all relevant values for verification
    const qrValue = `${QR_PREFIXES.INVENTORY}${item.sequence}`;
    const qrRef = qrRefs.current[item.sequence];

    // Enhanced console logging for emulator testing
    console.log('=== REPRINT INVENTORY LABEL DEBUG ===');
    console.log('Print data:', {
      sequence: item.sequence,
      brand: item.brand,
      size: item.size,
      unitPrice: item.unit_price?.toLocaleString() || '',
      radiusSize: item.radius_size || '',
      qrValue: qrValue,
      fullItem: item
    });
    console.log('Print settings:', {
      enablePrint,
      selectedPrinter: selectedPrinter ? {
        name: selectedPrinter.device_name || selectedPrinter.name,
        mac: selectedPrinter.inner_mac_address
      } : null,
      printerDevicesCount: printerDevices.length,
      qrRefAvailable: !!qrRef,
    });

    // Simulated print output for emulator testing
    console.log('=== SIMULATED PRINT OUTPUT ===');
    console.log('INVENTORY LABEL');
    console.log('================');
    console.log(`Sequence: ${item.sequence}`);
    console.log(`Brand: ${item.brand}`);
    console.log(`Size: ${item.size}`);
    if (item.unit_price) console.log(`Unit Price: ${item.unit_price.toLocaleString()}`);
    if (item.radius_size) console.log(`Radius: ${item.radius_size}`);
    console.log('================');
    console.log(`QR Code: ${qrValue}`);
    console.log('=================================');

    if (!enablePrint) {
      console.log('[DEBUG] Print disabled - would show alert');
      Alert.alert(i18n.t('printDisabled', { locale: lang }), i18n.t('enablePrintToSendToPrinter', { locale: lang }));
      return;
    }

    if (!selectedPrinter) {
      console.log('[DEBUG] No printer selected - printing debug info only');
      console.log('[DEBUG] Print data would be sent to printer if one was selected');
      Alert.alert(i18n.t('noPrinters', { locale: lang }), i18n.t('selectPrinter', { locale: lang }));
      return;
    }

    if (!qrRef) {
      console.log('[DEBUG] QR ref not available - would show alert');
      Alert.alert(i18n.t('error', { locale: lang }), i18n.t('qrCodeNotReady', { locale: lang }));
      return;
    }

    try {
      // Use the new thermal printer service to print inventory label
      const inventoryData = {
        sequence: item.sequence,
        brand: item.brand,
        size: item.size,
        unitPrice: item.unit_price?.toLocaleString() || '',
        radiusSize: item.radius_size || ''
      };

      console.log('[DEBUG] Calling printInventoryLabel with:', inventoryData);

      const success = await printInventoryLabel(
        selectedPrinter,
        inventoryData,
        qrRef,
        setPrinterDebug
      );

      if (success) {
        console.log('[DEBUG] Print successful');
        Alert.alert(i18n.t('success', { locale: lang }), i18n.t('printLabelSent', { locale: lang }));
      } else {
        console.log('[DEBUG] Print failed - no success returned');
      }
    } catch (e: any) {
      console.error('[ReprintInventoryScreen] Print failed:', e);
      console.log('[DEBUG] Print error details:', {
        name: e.name,
        message: e.message,
        stack: e.stack
      });
      Alert.alert(i18n.t('error', { locale: lang }), i18n.t('failedToPrintLabel', { locale: lang }));
    }
  };

  if (loading) return <Text style={styles.infoText}>{i18n.t('loading', { locale: lang })}</Text>;
  if (error) return <Text style={styles.errorText}>{error}</Text>;

  return (
    <AutocompleteDropdownContextProvider>
      <View style={styles.container}>
        <Text style={styles.title}>{i18n.t('reprintInventoryLabels', { locale: lang })}</Text>
        {/* Custom Sequence Print UI */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ marginRight: 8 }}>{i18n.t('customSeq', { locale: lang })}:</Text>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, fontSize: 16, backgroundColor: '#fff' }}
                value={customSequence}
                onChangeText={setCustomSequence}
                placeholder={i18n.t('enterSequenceNumber', { locale: lang })}
                keyboardType="numeric"
              />
            </View>
            <ThemedButton
              title={i18n.t('print', { locale: lang })}
              onPress={handlePrintCustomSequence}
              style={{ marginLeft: 8, minWidth: 70 }}
              color="#ff9800"
            />
          </View>
        </View>
        {/* Hidden QR for custom sequence */}
        {customSequence ? (
          <View style={{ position: 'absolute', left: -1000, height: 0, width: 0 }}>
            <QRCode
              value={`${QR_PREFIXES.INVENTORY}${customSequence}`}
              getRef={ref => { if (ref) qrRefs.current[parseInt(customSequence)] = ref; }}
            />
          </View>
        ) : null}
        {/* Enable Print Checkbox */}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
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
        {/* Printer Section UI from insert_inventory */}
        {enablePrint && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 }}>
            <View style={{ flex: 2, zIndex: 10 }}>
              <AutocompleteDropdown
                key={dropdownResetKey + '-printer'}
                closeOnSubmit={true}
                direction="down"
                suggestionsListMaxHeight={200}
                useFilter={false}
                editable={false}
                caseSensitive={false}
                dataSet={printerDevices.map((device, idx) => ({
                  id: JSON.stringify(device),
                  title: device.device_name || device.name || device.inner_mac_address || `Device ${idx + 1}`
                }))}
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
                      console.log('[ReprintInventoryScreen] Printer selected:', device);
                    } catch (e) {
                      setSelectedPrinter(null);
                      console.error('[ReprintInventoryScreen] Error parsing selected printer:', e);
                    }
                  } else {
                    setSelectedPrinter(null);
                    console.log('[ReprintInventoryScreen] Printer deselected');
                  }
                }}
                textInputProps={{
                  placeholder: printerDevices.length > 0 ? i18n.t('selectPrinter', { locale: lang }) : i18n.t('noPrinters', { locale: lang }),
                }}
              />
            </View>
            <ThemedButton
              title={i18n.t('refresh', { locale: lang })}
              onPress={initializePrinter}
              color="#ff9800"
              style={{ flex: 1, minWidth: 70 }}
            />
          </View>
        )}
        {enablePrint && printerDebug ? (
          <Text style={{ marginBottom: 8, color: 'red', fontSize: 12 }}>{printerDebug}</Text>
        ) : null}
        <FlatList
          data={items}
          keyExtractor={item => item.$id}
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemText}>{i18n.t('seq', { locale: lang })}: {item.sequence}</Text>
                <Text style={styles.itemText}>{item.brand} {formatTireSize(item.size)}</Text>
                <View style={{ position: 'absolute', left: -1000, height: 0, width: 0 }}>
                  <QRCode
                    value={`${QR_PREFIXES.INVENTORY}${item.sequence}`}
                    getRef={ref => { if (ref) qrRefs.current[item.sequence] = ref; }}
                  />
                </View>
              </View>
              <ThemedButton
                title={i18n.t('print', { locale: lang })}
                onPress={() => handlePrint(item)}
                style={styles.printButton}
              />
            </View>
          )}
          ListEmptyComponent={<Text style={styles.infoText}>{i18n.t('noRecentInventoryFound', { locale: lang })}</Text>}
        />
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
  },
  printButton: {
    marginLeft: 12,
  },
  infoText: {
    textAlign: 'center',
    marginTop: 32,
    color: '#888',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 32,
    color: 'red',
  },
});

const ReprintInventoryScreen: React.FC = () => {
  return (
    <ProtectedRoute routeName="reprint_inventory">
      <ReprintInventoryContent />
    </ProtectedRoute>
  );
};

export default ReprintInventoryScreen;
