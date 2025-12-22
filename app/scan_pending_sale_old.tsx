import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, TextInput, Platform } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';
import ThemedButton from '@/components/ThemedButton';
import QRScannerWithBox from '@/components/QRScannerWithBox';
import i18n from '@/constants/i18n';
import { useLanguage } from '@/components/LanguageContext';

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  camera: { flex: 1 },
  overlay: { 
    position: 'absolute', 
    bottom: 120, 
    alignSelf: 'center', 
    backgroundColor: 'white', 
    padding: 16, 
    borderRadius: 8, 
    width: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  instructions: { 
    position: 'absolute', 
    top: 100, 
    alignSelf: 'center', 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    color: 'white', 
    padding: 16, 
    borderRadius: 8, 
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold'
  },
  scanAgainButton: { 
    position: 'absolute', 
    bottom: 40, 
    alignSelf: 'center' 
  }
});

// Default test QR value - change this for testing different inventory items
const DEFAULT_TEST_QR = 'TT1_40';

export default function ScanPendingSaleScreen() {
  const { lang } = useLanguage();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [manualInput, setManualInput] = useState(DEFAULT_TEST_QR);
  const [showManualInput, setShowManualInput] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const router = useRouter();

  // Check if running in emulator/simulator
  const isEmulator = __DEV__ && (Platform.OS === 'android' || Platform.OS === 'ios');

  useEffect(() => {
    // If running in emulator, skip camera permission and show manual input
    if (isEmulator) {
      console.log('[QR SCAN] Running in emulator, showing manual input');
      setHasPermission(false);
      setShowManualInput(true);
      return;
    }

    (async () => {
      try {
        console.log('[QR SCAN] Requesting camera permissions...');
        const { status } = await Camera.requestCameraPermissionsAsync();
        console.log('[QR SCAN] Camera permission status:', status);
        setHasPermission(status === 'granted');
        if (status !== 'granted') {
          console.log('[QR SCAN] Camera permission denied, showing manual input');
          setShowManualInput(true);
          Alert.alert(
            'Camera Permission Required',
            'Please enable camera permission in your device settings to scan QR codes.',
            [
              {
                text: 'Manual Input',
                onPress: () => setShowManualInput(true)
              },
              {
                text: 'Try Again',
                onPress: async () => {
                  const { status: newStatus } = await Camera.requestCameraPermissionsAsync();
                  setHasPermission(newStatus === 'granted');
                  if (newStatus !== 'granted') setShowManualInput(true);
                }
              }
            ]
          );
        }
      } catch (e) {
        console.error('[QR SCAN] Error requesting camera permission:', e);
        setHasPermission(false);
        setShowManualInput(true);
      }
    })();
  }, []);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    console.log('[QR SCAN] Scanned data:', data);
    setScanned(true);
    if (!data || data.trim() === '') {
      console.log('[QR SCAN] Invalid/empty QR code data');
      Alert.alert('Invalid QR code', 'Please try scanning again');
      setTimeout(() => setScanned(false), 2000);
      return;
    }
    console.log('[QR SCAN] Navigating to pending_sale with data:', data);
    router.push({ pathname: '/pending_sale', params: { scanned: data.trim() } });
  };

  const onCameraReady = () => {
    console.log('[QR SCAN] Camera is ready');
    setCameraReady(true);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false || isEmulator) {
    // Show manual input for emulator or no camera
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 20, textAlign: 'center', fontSize: 16 }}>
          {isEmulator ? 'Running in emulator - using manual input:' : 'No access to camera. Enter QR value manually for testing:'}
        </Text>
        <TextInput
          style={{ 
            borderWidth: 1, 
            borderColor: '#ccc', 
            borderRadius: 8, 
            padding: 12, 
            marginVertical: 16, 
            width: 300,
            fontSize: 16 
          }}
          placeholder="Enter QR value (sequence or documentId)"
          value={manualInput}
          onChangeText={setManualInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <ThemedButton
          title={i18n.t('submit', { locale: lang })}
          onPress={() => {
            if (!manualInput || manualInput.trim() === '') {
              Alert.alert('Please enter a value');
              return;
            }
            console.log('[QR SCAN] Manual input submitted:', manualInput.trim());
            router.push({ pathname: '/pending_sale', params: { scanned: manualInput.trim() } });
          }}
          color="#1976d2"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {hasPermission && !showManualInput && !isEmulator && (
        <>
          <CameraView
            style={styles.camera}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ 
              barcodeTypes: ['qr', 'pdf417', 'aztec', 'ean13', 'ean8', 'code39', 'code128'] 
            }}
            facing="back"
            onCameraReady={onCameraReady}
            flash="off"
          />
          {cameraReady && !scanned && (
            <Text style={styles.instructions}>
              Point camera at QR code to scan
            </Text>
          )}
        </>
      )}
      
      {scanned && !isEmulator && (
        <ThemedButton 
          title={i18n.t('tapToScanAgain', { locale: lang })}
          onPress={() => {
            console.log('[QR SCAN] Resetting for new scan');
            setScanned(false);
            setCameraReady(false);
          }} 
          color="#1976d2" 
          style={styles.scanAgainButton} 
        />
      )}
      
      {(showManualInput || isEmulator) && hasPermission && (
        <View style={styles.overlay}>
          <Text style={{ marginBottom: 8, fontSize: 14 }}>
            {isEmulator ? 'Emulator detected - manual input:' : 'No camera detected. Enter QR value manually for testing:'}
          </Text>
          <TextInput
            style={{ 
              borderWidth: 1, 
              borderColor: '#ccc', 
              borderRadius: 8, 
              padding: 12, 
              marginBottom: 8,
              fontSize: 16
            }}
            placeholder="Enter QR value (sequence or documentId)"
            value={manualInput}
            onChangeText={setManualInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <ThemedButton
            title={i18n.t('submit', { locale: lang })}
            onPress={() => {
              if (!manualInput || manualInput.trim() === '') {
                Alert.alert('Please enter a value');
                return;
              }
              console.log('[QR SCAN] Manual overlay input submitted:', manualInput.trim());
              router.push({ pathname: '/pending_sale', params: { scanned: manualInput.trim() } });
            }}
            color="#1976d2"
          />
        </View>
      )}
      
      {hasPermission && !isEmulator && (
        <ThemedButton
          title={i18n.t('manualInput', { locale: lang })}
          onPress={() => setShowManualInput(!showManualInput)}
          color="#ff9800"
          style={{
            position: 'absolute',
            top: 50,
            right: 20,
            paddingHorizontal: 12,
            paddingVertical: 8
          }}
        />
      )}
    </View>
  );
}
