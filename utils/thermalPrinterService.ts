import { Alert, Platform } from 'react-native';
import { requestBluetoothPermissions } from './bluetoothPermissions';
import { Logger } from './logger';

/**
 * Comprehensive Thermal Printer Service
 * Consolidates all thermal printing functionality for text and QR code printing
 * Uses react-native-thermal-receipt-printer-image-qr library
 */

let BLEPrinter: any = null;

// Initialize the thermal printer library
try {
  const thermalLib = require('react-native-thermal-receipt-printer-image-qr');
  BLEPrinter = thermalLib.BLEPrinter;
  Logger.log('[THERMAL LIB] Thermal printer library loaded successfully, BLEPrinter available:', !!BLEPrinter);
} catch (e) {
  Logger.warn('[THERMAL LIB] Thermal printer library not available:', e);
  BLEPrinter = null;
}

// Types for better type safety
export interface ThermalDevice {
  device_name?: string;
  name?: string;
  inner_mac_address: string;
  [key: string]: any;
}

export interface PrintOptions {
  fontSize?: number;
  alignment?: 'left' | 'center' | 'right';
  bold?: boolean;
  underline?: boolean;
}

export interface QROptions {
  width?: number;
  height?: number;
  alignment?: 'left' | 'center' | 'right';
}

/**
 * Request Bluetooth permissions required for thermal printing
 * Now uses enhanced permission handler
 */
export async function requestThermalPrinterPermissions(setDebug?: (msg: string) => void): Promise<boolean> {
  setDebug?.('Requesting Bluetooth permissions...');
  const granted = await requestBluetoothPermissions();
  setDebug?.(granted ? 'Bluetooth permissions granted' : 'Bluetooth permissions denied');
  return granted;
}

/**
 * Initialize thermal printer and check availability
 */
export async function initializeThermalPrinter(setDebug?: (msg: string) => void): Promise<boolean> {
  if (!BLEPrinter) {
    Logger.log('[INIT] BLEPrinter not available - thermal printer library not loaded');
    setDebug?.('BLEPrinter not available - thermal printer library not loaded');
    return false;
  }

  try {
    await BLEPrinter.init();
    Logger.log('[INIT] Thermal printer initialized successfully');
    setDebug?.('Thermal printer initialized successfully');
    return true;
  } catch (error) {
    Logger.log('[INIT] Failed to initialize thermal printer:', error);
    setDebug?.('Failed to initialize thermal printer: ' + String(error));
    return false;
  }
}

/**
 * Scan for available thermal printer devices
 */
export async function scanThermalPrinters(setDebug?: (msg: string) => void): Promise<ThermalDevice[]> {
  if (!BLEPrinter) {
    setDebug?.('BLEPrinter not available');
    return [];
  }

  try {
    await BLEPrinter.init();
    const devices = await BLEPrinter.getDeviceList();
    setDebug?.(`Found ${devices.length} thermal printer(s): ${JSON.stringify(devices, null, 2)}`);
    return devices;
  } catch (error) {
    setDebug?.('Scan error: ' + String(error));
    return [];
  }
}

/**
 * Connect to a thermal printer device
 */
export async function connectThermalPrinter(device: ThermalDevice, setDebug?: (msg: string) => void): Promise<boolean> {
  if (!BLEPrinter) {
    setDebug?.('BLEPrinter not available');
    return false;
  }

  if (!device?.inner_mac_address) {
    setDebug?.('Invalid device - no MAC address');
    return false;
  }

  try {
    await BLEPrinter.connectPrinter(device.inner_mac_address);
    setDebug?.(`Connected to printer: ${device.device_name || device.name || device.inner_mac_address}`);
    return true;
  } catch (error) {
    setDebug?.('Connection error: ' + String(error));
    return false;
  }
}

/**
 * Print text to thermal printer
 */
export async function printThermalText(
  device: ThermalDevice,
  text: string,
  options: PrintOptions = {},
  setDebug?: (msg: string) => void,
  showAlert: boolean = true
): Promise<boolean> {
  if (!device) {
    if (showAlert) Alert.alert('Error', 'No thermal printer device selected');
    return false;
  }

  if (!BLEPrinter) {
    setDebug?.('BLEPrinter not available');
    if (showAlert) Alert.alert('Error', 'Thermal printer not available');
    return false;
  }

  try {
    // Connect to printer
    const connected = await connectThermalPrinter(device, setDebug);
    if (!connected) {
      if (showAlert) Alert.alert('Error', 'Failed to connect to thermal printer');
      return false;
    }

    // Print the text
    await BLEPrinter.printText(text, options);

    setDebug?.(`Text printed successfully: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
    if (showAlert) Alert.alert('Success', 'Text sent to thermal printer successfully');
    return true;
  } catch (error) {
    const errorMessage = 'Failed to print text: ' + String(error);
    setDebug?.(errorMessage);
    if (showAlert) Alert.alert('Print Error', errorMessage);
    return false;
  }
}

/**
 * Print QR code to thermal printer
 */
export async function printThermalQR(
  device: ThermalDevice,
  qrElement: any,
  options: QROptions = {},
  setDebug?: (msg: string) => void,
  showAlert: boolean = true
): Promise<boolean> {
  if (!device) {
    if (showAlert) Alert.alert('Error', 'No thermal printer device selected');
    return false;
  }

  if (!BLEPrinter) {
    setDebug?.('BLEPrinter not available');
    if (showAlert) Alert.alert('Error', 'Thermal printer not available');
    return false;
  }

  if (!qrElement || !qrElement.toDataURL) {
    if (showAlert) Alert.alert('Error', 'QR code element not available or invalid');
    return false;
  }

  const { width = 200, height = 200 } = options;

  try {
    // Connect to printer
    const connected = await connectThermalPrinter(device, setDebug);
    if (!connected) {
      if (showAlert) Alert.alert('Error', 'Failed to connect to thermal printer');
      return false;
    }

    // Convert QR to image and print
    return new Promise((resolve) => {
      qrElement.toDataURL(async (dataURL: string) => {
        try {
          if (!dataURL) {
            if (showAlert) Alert.alert('Error', 'Failed to generate QR code image');
            resolve(false);
            return;
          }

          await BLEPrinter.printImageBase64(dataURL, {
            imageWidth: width,
            imageHeight: height
          });

          setDebug?.(`QR code printed successfully. Size: ${width}x${height}`);
          if (showAlert) Alert.alert('Success', `QR code sent to thermal printer. Size: ${width}x${height}`);
          resolve(true);
        } catch (error) {
          const errorMessage = 'Failed to print QR code: ' + String(error);
          setDebug?.(errorMessage);
          if (showAlert) Alert.alert('Print Error', errorMessage);
          resolve(false);
        }
      });
    });
  } catch (error) {
    const errorMessage = 'Failed to print QR code: ' + String(error);
    setDebug?.(errorMessage);
    if (showAlert) Alert.alert('Print Error', errorMessage);
    return false;
  }
}

/**
 * Print QR code from string value (creates QR internally)
 */
export async function printThermalQRFromString(
  device: ThermalDevice,
  qrValue: string,
  _options: QROptions = {},
  setDebug?: (msg: string) => void
): Promise<boolean> {

  if (!qrValue) {
    Alert.alert('Error', 'QR code value is required');
    return false;
  }

  // This would need to be implemented if you want to create QR codes internally
  // For now, we expect the QR element to be passed from the component
  setDebug?.('printThermalQRFromString not implemented - use printThermalQR with QR element');
  return false;
}

/**
 * Print formatted inventory label with logo
 */
export async function printInventoryLabel(
  device: ThermalDevice,
  inventoryData: {
    sequence?: number;
    brand: string;
    size: string;
    unitPrice?: string | number;
    radiusSize?: string | number;
  },
  qrElement?: any,
  logoElement?: any,
  setDebug?: (msg: string) => void
): Promise<boolean> {
  const { sequence, brand, size, unitPrice, radiusSize } = inventoryData;

  // Enhanced debugging for emulator testing
  Logger.log('=== THERMAL PRINTER SERVICE DEBUG ===');
  Logger.log('printInventoryLabel called with:', {
    device: device ? {
      name: device.device_name || device.name,
      mac: device.inner_mac_address
    } : null,
    inventoryData,
    qrElementAvailable: !!qrElement,
    BLEPrinterAvailable: !!BLEPrinter
  });

  // Format the inventory text in Vietnamese
  let inventoryText = 'NHAN KHO HANG\n';
  inventoryText += '================\n';

  if (sequence) inventoryText += `So thu tu: ${sequence}\n`;
  inventoryText += `Thuong hieu: ${brand}\n`;
  inventoryText += `Kich thuoc: ${size}\n`;
  if (unitPrice) inventoryText += `Gia ban: ${unitPrice} VND\n`;
  if (radiusSize) inventoryText += `Kich thuoc mam: ${radiusSize}\n`;

  inventoryText += '================\n';

  Logger.log('=== FORMATTED PRINT TEXT ===');
  Logger.log(inventoryText);
  Logger.log('============================');

  // If BLEPrinter is not available, return false (no fake success)
  if (!BLEPrinter) {
    Logger.log('[THERMAL SERVICE] BLEPrinter not available - cannot print');
    setDebug?.('BLEPrinter not available - thermal printer library not loaded');
    Alert.alert('Error', 'Thermal printer not available');
    return false;
  }

  try {
    // Print logo first if provided
    if (logoElement) {
      Logger.log('[THERMAL SERVICE] Printing company logo...');
      const logoSuccess = await printThermalQR(device, logoElement, { width: 150, height: 80 }, setDebug, false);
      if (logoSuccess) {
        Logger.log('[THERMAL SERVICE] Logo printed successfully');
        // Add spacing after logo
        await printThermalText(device, '\n', {}, setDebug, false);
      }
    }

    // Print QR code SECOND if provided
    if (qrElement) {
      Logger.log('[THERMAL SERVICE] Printing QR code...');
      const qrSuccess = await printThermalQR(device, qrElement, { width: 200, height: 200 }, setDebug, false);
      if (!qrSuccess) {
        setDebug?.('QR code printing failed, continuing with text...');
        Logger.log('[THERMAL SERVICE] QR code printing failed');
      } else {
        Logger.log('[THERMAL SERVICE] QR code printed successfully');
        // Add some spacing after QR code
        await printThermalText(device, '\n', {}, setDebug, false);
      }
    }

    // Then print the Vietnamese text
    Logger.log('[THERMAL SERVICE] Printing Vietnamese text...');
    const textSuccess = await printThermalText(device, inventoryText, {}, setDebug, false);

    if (textSuccess) {
      Logger.log('[THERMAL SERVICE] Vietnamese text printed successfully');
      setDebug?.('Nhãn kho hàng đã được in thành công');
      Alert.alert('Thành công', 'Nhãn kho hàng đã được in thành công');
      return true;
    }

    Logger.log('[THERMAL SERVICE] Text printing failed');
    Alert.alert('Lỗi', 'Không thể in văn bản');
    return false;
  } catch (error) {
    const errorMessage = 'Không thể in nhãn kho hàng: ' + String(error);
    Logger.error('[THERMAL SERVICE] Print error:', error);
    setDebug?.(errorMessage);
    Alert.alert('Lỗi in', errorMessage);
    return false;
  }
}

/**
 * Print test label for printer verification
 */
export async function printTestLabel(
  device: ThermalDevice,
  setDebug?: (msg: string) => void
): Promise<boolean> {
  const testData = {
    sequence: 1,
    brand: 'Thương hiệu thử nghiệm',
    size: '205/55R16',
    unitPrice: '1,500,000',
    radiusSize: '16'
  };

  return printInventoryLabel(device, testData, undefined, undefined, setDebug);
}

/**
 * Complete thermal printer setup flow
 * Requests permissions, initializes printer, and scans for devices
 */
export async function setupThermalPrinter(setDebug?: (msg: string) => void): Promise<{
  success: boolean;
  devices: ThermalDevice[];
}> {
  Logger.log('=== THERMAL PRINTER SETUP DEBUG ===');
  setDebug?.('Starting thermal printer setup...');

  // Check if thermal printer library is available first
  if (!BLEPrinter) {
    Logger.log('[SETUP] BLEPrinter not available - thermal printer library not loaded');
    setDebug?.('Thermal printer library not available - no real printer support');
    return { success: false, devices: [] };
  }

  // Request permissions
  Logger.log('[SETUP] Requesting permissions...');
  const permissionsGranted = await requestThermalPrinterPermissions(setDebug);
  if (!permissionsGranted) {
    Logger.log('[SETUP] Permissions not granted');
    setDebug?.('Thermal printer setup failed: permissions not granted');
    return { success: false, devices: [] };
  }

  // Initialize printer
  Logger.log('[SETUP] Initializing printer...');
  const initialized = await initializeThermalPrinter(setDebug);
  if (!initialized) {
    Logger.log('[SETUP] Initialization failed');
    setDebug?.('Thermal printer setup failed: initialization failed');
    return { success: false, devices: [] };
  }

  // Scan for devices
  Logger.log('[SETUP] Scanning for devices...');
  const devices = await scanThermalPrinters(setDebug);

  Logger.log(`[SETUP] Setup completed. Found ${devices.length} device(s):`, devices);
  setDebug?.(`Thermal printer setup completed. Found ${devices.length} device(s)`);
  return { success: true, devices };
}

/**
 * Check if thermal printer is available
 */
export function isThermalPrinterAvailable(): boolean {
  return BLEPrinter !== null;
}

/**
 * Get thermal printer status information
 */
export function getThermalPrinterStatus(): {
  available: boolean;
  libraryLoaded: boolean;
  platform: string;
} {
  return {
    available: BLEPrinter !== null,
    libraryLoaded: BLEPrinter !== null,
    platform: Platform.OS
  };
}

// Export the BLEPrinter instance for advanced usage (if needed)
export { BLEPrinter };
