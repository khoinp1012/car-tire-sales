import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import ThemedButton from '@/components/ThemedButton';
import ThermalPrinter, { useThermalPrinter } from '@/components/ThermalPrinter';
import QRCode from 'react-native-qrcode-svg';
import {
  printInventoryLabel,
  printThermalText,
  printThermalQR,
  type ThermalDevice
} from '@/utils/thermalPrinterService';

/**
 * Example component showing how to use the consolidated thermal printer service
 * This demonstrates both direct service usage and the ThermalPrinter component
 */
export default function ThermalPrinterExample() {
  const [selectedDevice, setSelectedDevice] = useState<ThermalDevice | null>(null);
  const [debug, setDebug] = useState('');
  const qrRef = useRef<any>(null);
  
  // Example using the useThermalPrinter hook
  const { printText, printQR, printInventory } = useThermalPrinter();

  // Example inventory data
  const inventoryData = {
    sequence: 12345,
    brand: 'Michelin',
    size: '205/55R16',
    unitPrice: '1,500,000',
    radiusSize: '16'
  };

  const handlePrintInventoryDirect = async () => {
    if (!selectedDevice) {
      Alert.alert('Error', 'Please select a thermal printer first');
      return;
    }

    // Direct service usage
    const success = await printInventoryLabel(
      selectedDevice,
      inventoryData,
      qrRef.current,
      setDebug
    );

    if (success) {
      Alert.alert('Success', 'Inventory label printed successfully');
    }
  };

  const handlePrintTextDirect = async () => {
    if (!selectedDevice) {
      Alert.alert('Error', 'Please select a thermal printer first');
      return;
    }

    const customText = `
CUSTOM RECEIPT
==============
Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}
Item: Sample Product
Price: $19.99
==============
Thank you for your purchase!
    `.trim();

    const success = await printThermalText(
      selectedDevice,
      customText,
      { alignment: 'center' },
      setDebug
    );

    if (success) {
      Alert.alert('Success', 'Custom text printed successfully');
    }
  };

  const handlePrintQRDirect = async () => {
    if (!selectedDevice || !qrRef.current) {
      Alert.alert('Error', 'Please select a printer and ensure QR is ready');
      return;
    }

    const success = await printThermalQR(
      selectedDevice,
      qrRef.current,
      { width: 250, height: 250 },
      setDebug
    );

    if (success) {
      Alert.alert('Success', 'QR code printed successfully');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Thermal Printer Examples</Text>
      
      {/* Thermal Printer Component - handles device selection */}
      <ThermalPrinter
        onDeviceSelected={setSelectedDevice}
        showTestControls={false}
        style={styles.printerSection}
      />

      {selectedDevice && (
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Printing Actions</Text>
          
          <ThemedButton
            title="Print Inventory Label"
            onPress={handlePrintInventoryDirect}
            color="#4CAF50"
            style={styles.button}
          />
          
          <ThemedButton
            title="Print Custom Text"
            onPress={handlePrintTextDirect}
            color="#2196F3"
            style={styles.button}
          />
          
          <ThemedButton
            title="Print QR Code"
            onPress={handlePrintQRDirect}
            color="#FF9800"
            style={styles.button}
          />
        </View>
      )}

      {/* Hidden QR code for printing */}
      <View style={styles.hiddenQR}>
        <QRCode
          value={JSON.stringify(inventoryData)}
          getRef={(ref) => (qrRef.current = ref)}
          size={200}
        />
      </View>

      {debug && (
        <View style={styles.debugSection}>
          <Text style={styles.debugTitle}>Debug Output:</Text>
          <Text style={styles.debugText}>{debug}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  printerSection: {
    marginBottom: 20,
  },
  actionsSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  button: {
    marginVertical: 6,
  },
  hiddenQR: {
    position: 'absolute',
    left: -1000,
    top: -1000,
  },
  debugSection: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  debugTitle: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  debugText: {
    color: '#0f0',
    fontFamily: 'monospace',
    fontSize: 12,
  },
});
