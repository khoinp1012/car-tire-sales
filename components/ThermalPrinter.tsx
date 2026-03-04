import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Alert, ScrollView, StyleSheet } from 'react-native';
import ThemedButton from './ThemedButton';
import QRCode from 'react-native-qrcode-svg';
import {
  setupThermalPrinter,
  printThermalText,
  printThermalQR,
  printInventoryLabel,
  printTestLabel,
  getThermalPrinterStatus,
  type ThermalDevice
} from '@/utils/thermalPrinterService';
import i18n from '@/constants/i18n';
import { useLanguage } from './LanguageContext';

interface ThermalPrinterProps {
  onDeviceSelected?: (device: ThermalDevice | null) => void;
  showTestControls?: boolean;
  style?: any;
}

/**
 * Comprehensive Thermal Printer Component
 * Provides device selection, connection, and printing functionality
 */
export default function ThermalPrinter({
  onDeviceSelected,
  showTestControls = true,
  style
}: ThermalPrinterProps) {
  const [devices, setDevices] = useState<ThermalDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<ThermalDevice | null>(null);
  const [debug, setDebug] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [setupComplete, setSetupComplete] = useState<boolean>(false);
  const { lang } = useLanguage();

  const testQrRef = useRef<any>(null);

  const initializePrinter = React.useCallback(async () => {
    setLoading(true);
    setDebug('Initializing thermal printer...');

    const status = getThermalPrinterStatus();
    if (!status.available) {
      setDebug(i18n.t('thermalPrinterLibNotAvailable', { locale: lang }));
      setLoading(false);
      return;
    }

    const result = await setupThermalPrinter(setDebug);
    if (result.success) {
      setDevices(result.devices);
      setSetupComplete(true);
      setDebug(i18n.t('setupCompleteFoundDevices', { locale: lang, count: result.devices.length }));
    } else {
      setDebug(i18n.t('setupFailed', { locale: lang }));
    }
    setLoading(false);
  }, [lang]);

  useEffect(() => {
    initializePrinter();
  }, [initializePrinter]);

  useEffect(() => {
    if (onDeviceSelected) {
      onDeviceSelected(selectedDevice);
    }
  }, [selectedDevice, onDeviceSelected]);

  const handleDeviceSelect = (device: ThermalDevice) => {
    setSelectedDevice(device);
    setDebug(`Selected: ${device.device_name || device.name || device.inner_mac_address}`);
  };

  const handlePrintTest = async () => {
    if (!selectedDevice) {
      Alert.alert(i18n.t('error', { locale: lang }), i18n.t('pleaseSelectThermalPrinter', { locale: lang }));
      return;
    }

    setLoading(true);
    setDebug(i18n.t('printingTestLabel', { locale: lang }));

    const success = await printTestLabel(selectedDevice, setDebug);
    if (success) {
      setDebug(i18n.t('testLabelPrintedSuccess', { locale: lang }));
    }

    setLoading(false);
  };

  const handlePrintTestQR = async () => {
    if (!selectedDevice) {
      Alert.alert(i18n.t('error', { locale: lang }), i18n.t('pleaseSelectThermalPrinter', { locale: lang }));
      return;
    }

    if (!testQrRef.current) {
      Alert.alert(i18n.t('error', { locale: lang }), i18n.t('qrCodeNotReady', { locale: lang }));
      return;
    }

    setLoading(true);
    setDebug(i18n.t('printingTestQR', { locale: lang }));

    const success = await printThermalQR(
      selectedDevice,
      testQrRef.current,
      { width: 200, height: 200 },
      setDebug
    );

    if (success) {
      setDebug(i18n.t('testQRPrintedSuccess', { locale: lang }));
    }

    setLoading(false);
  };

  const handleRefresh = () => {
    setSelectedDevice(null);
    setDevices([]);
    setSetupComplete(false);
    initializePrinter();
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{i18n.t('thermalPrinter', { locale: lang })}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{i18n.t('deviceSelection', { locale: lang })}</Text>

        {loading && (
          <Text style={styles.loadingText}>{i18n.t('loading', { locale: lang })}</Text>
        )}

        {!setupComplete && !loading && (
          <ThemedButton
            title={i18n.t('initializePrinter', { locale: lang })}
            onPress={initializePrinter}
            style={styles.button}
          />
        )}

        {setupComplete && devices.length > 0 && (
          <ScrollView style={styles.deviceList}>
            {devices.map((device, index) => (
              <ThemedButton
                key={index}
                title={device.device_name || device.name || device.inner_mac_address}
                onPress={() => handleDeviceSelect(device)}
                color={selectedDevice === device ? '#1976d2' : '#43a047'}
                style={styles.deviceButton}
              />
            ))}
          </ScrollView>
        )}

        {setupComplete && devices.length === 0 && (
          <Text style={styles.noDevicesText}>{i18n.t('noThermalPrintersFound', { locale: lang })}</Text>
        )}

        <ThemedButton
          title={i18n.t('refreshDevices', { locale: lang })}
          onPress={handleRefresh}
          color="#666"
          style={styles.button}
        />
      </View>

      {selectedDevice && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('selectedDevice', { locale: lang })}</Text>
          <Text style={styles.deviceInfo}>
            {selectedDevice.device_name || selectedDevice.name || i18n.t('unknownDevice', { locale: lang })}
          </Text>
          <Text style={styles.deviceMac}>
            MAC: {selectedDevice.inner_mac_address}
          </Text>
        </View>
      )}

      {showTestControls && selectedDevice && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('printerTesting', { locale: lang })}</Text>

          <ThemedButton
            title={i18n.t('printTestLabel', { locale: lang })}
            onPress={handlePrintTest}
            color="#43a047"
            style={styles.button}
          />

          <ThemedButton
            title={i18n.t('printTestQRCode', { locale: lang })}
            onPress={handlePrintTestQR}
            color="#1976d2"
            style={styles.button}
          />

          {/* Hidden QR code for testing */}
          <View style={styles.hiddenQR}>
            <QRCode
              value="Test QR Code - Thermal Printer"
              getRef={(ref) => (testQrRef.current = ref)}
              size={200}
            />
          </View>
        </View>
      )}

      {debug && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('debugInfo', { locale: lang })}</Text>
          <ScrollView style={styles.debugContainer}>
            <Text style={styles.debugText}>{debug}</Text>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// Export a hook for using thermal printer in other components
export function useThermalPrinter() {
  const [selectedDevice, setSelectedDevice] = useState<ThermalDevice | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { lang } = useLanguage();

  const printText = async (text: string, setDebug?: (msg: string) => void) => {
    if (!selectedDevice) {
      Alert.alert(i18n.t('error', { locale: lang }), i18n.t('pleaseSelectThermalPrinter', { locale: lang }));
      return false;
    }
    return await printThermalText(selectedDevice, text, {}, setDebug);
  };

  const printQR = async (qrElement: any, options?: { width?: number; height?: number }, setDebug?: (msg: string) => void) => {
    if (!selectedDevice) {
      Alert.alert(i18n.t('error', { locale: lang }), i18n.t('pleaseSelectThermalPrinter', { locale: lang }));
      return false;
    }
    return await printThermalQR(selectedDevice, qrElement, options, setDebug);
  };

  const printInventory = async (inventoryData: any, qrElement?: any, setDebug?: (msg: string) => void) => {
    if (!selectedDevice) {
      Alert.alert(i18n.t('error', { locale: lang }), i18n.t('pleaseSelectThermalPrinter', { locale: lang }));
      return false;
    }
    return await printInventoryLabel(selectedDevice, inventoryData, qrElement, setDebug);
  };

  return {
    selectedDevice,
    setSelectedDevice,
    isReady,
    setIsReady,
    printText,
    printQR,
    printInventory
  };
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  deviceList: {
    maxHeight: 150,
    marginBottom: 8,
  },
  deviceButton: {
    marginVertical: 2,
  },
  button: {
    marginVertical: 4,
  },
  loadingText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#666',
    marginVertical: 8,
  },
  noDevicesText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 8,
  },
  deviceInfo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  deviceMac: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  hiddenQR: {
    position: 'absolute',
    left: -1000,
    top: -1000,
  },
  debugContainer: {
    maxHeight: 100,
    backgroundColor: '#000',
    padding: 8,
    borderRadius: 4,
  },
  debugText: {
    color: '#0f0',
    fontFamily: 'monospace',
    fontSize: 12,
  },
});
