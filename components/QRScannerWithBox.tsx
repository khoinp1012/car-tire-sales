import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions, Platform, TextInput, Animated } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';
import ThemedButton from '@/components/ThemedButton';
import i18n from '@/constants/i18n';
import { useLanguage } from '@/components/LanguageContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Scanner box dimensions - ensure it's a perfect square
const SCANNER_BOX_WIDTH = screenWidth * 0.6;
const SCANNER_BOX_HEIGHT = SCANNER_BOX_WIDTH; // Perfect square (1:1 aspect ratio)

// Calculate overlay heights - use exact calculations to prevent gaps
const OVERLAY_TOP_HEIGHT = (screenHeight - SCANNER_BOX_HEIGHT) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: OVERLAY_TOP_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  overlayBottom: {
    position: 'absolute',
    top: OVERLAY_TOP_HEIGHT + SCANNER_BOX_HEIGHT,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  overlayLeft: {
    position: 'absolute',
    top: OVERLAY_TOP_HEIGHT,
    left: 0,
    width: (screenWidth - SCANNER_BOX_WIDTH) / 2,
    height: SCANNER_BOX_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  overlayRight: {
    position: 'absolute',
    top: OVERLAY_TOP_HEIGHT,
    right: 0,
    width: (screenWidth - SCANNER_BOX_WIDTH) / 2,
    height: SCANNER_BOX_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  scannerBox: {
    position: 'absolute',
    top: OVERLAY_TOP_HEIGHT,
    left: (screenWidth - SCANNER_BOX_WIDTH) / 2,
    width: SCANNER_BOX_WIDTH,
    height: SCANNER_BOX_HEIGHT,
    borderWidth: 3,
    borderColor: '#00ff00',
    backgroundColor: 'transparent',
  },
  scanningLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00ff00',
    shadowColor: '#00ff00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  scannerCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#00ff00',
    borderWidth: 4,
  },
  topLeft: {
    top: -4,
    left: -4,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  topRight: {
    top: -4,
    right: -4,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: -4,
    left: -4,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: -4,
    right: -4,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  instructionsContainer: {
    position: 'absolute',
    top: screenHeight * 0.1,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  instructions: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: 16,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  manualInputContainer: {
    position: 'absolute',
    bottom: 180,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    borderRadius: 8,
  },
  manualInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
});

interface QRScannerProps {
  onScanned: (data: string) => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
  showManualInput?: boolean;
  restrictToBox?: boolean; // Optional prop to enable bounds checking
  debugMode?: boolean; // Optional prop to enable debug logging
}

export default function QRScannerWithBox({
  onScanned,
  onCancel,
  title,
  subtitle,
  showManualInput = true,
  restrictToBox = false, // Default to fast scanning
  debugMode = false // Default to no debug logging
}: QRScannerProps) {
  const { lang } = useLanguage();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  // Animation for scanning line
  const scanLineAnimation = useRef(new Animated.Value(0)).current;

  // Check if running in emulator/simulator
  const isEmulator = __DEV__ && (Platform.OS === 'android' || Platform.OS === 'ios');

  useEffect(() => {
    requestCameraPermission();
  }, []);

  useEffect(() => {
    if (cameraReady && !scanned) {
      startScanAnimation();
    }
  }, [cameraReady, scanned]);

  const startScanAnimation = () => {
    const animate = () => {
      scanLineAnimation.setValue(0);
      Animated.timing(scanLineAnimation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      }).start(() => {
        if (!scanned) {
          animate();
        }
      });
    };
    animate();
  };

  const requestCameraPermission = async () => {
    try {
      console.log('[QR SCANNER] Checking camera permissions...');

      // First, check if we already have permission (instant, no dialog)
      const currentPermission = await Camera.getCameraPermissionsAsync();
      console.log('[QR SCANNER] Current permission status:', currentPermission.status);

      if (currentPermission.status === 'granted') {
        console.log('[QR SCANNER] Camera permission already granted');
        setHasPermission(true);
        return;
      }

      // If not granted, request permission (may show system dialog)
      console.log('[QR SCANNER] Requesting camera permission...');
      const { status } = await Camera.requestCameraPermissionsAsync();
      console.log('[QR SCANNER] Permission request result:', status);

      if (status === 'granted') {
        console.log('[QR SCANNER] Camera permission granted');
        setHasPermission(true);
      } else {
        console.log('[QR SCANNER] Camera permission denied:', status);
        setHasPermission(false);
        if (showManualInput) {
          Alert.alert(
            i18n.t('cameraPermissionRequired', { locale: lang }),
            i18n.t('enableCameraPermissionMessage', { locale: lang }),
            [
              {
                text: i18n.t('manualInput', { locale: lang }),
                onPress: () => setShowManual(true)
              },
              {
                text: i18n.t('tryAgain', { locale: lang }),
                onPress: requestCameraPermission
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('[QR SCANNER] Error with camera permission:', error);
      setHasPermission(false);
      if (showManualInput) {
        setShowManual(true);
      }
    }
  };

  const handleBarcodeScanned = ({ type, data, bounds }: any) => {
    if (scanned) return;

    // If restrictToBox is enabled, check bounds. Otherwise scan immediately for better performance
    if (restrictToBox) {
      console.log('[QR SCANNER] Bounds checking enabled');
      console.log('[QR SCANNER] Bounds object:', bounds);

      if (bounds && bounds.origin && bounds.size) {
        // Calculate QR code center
        const qrCenterX = bounds.origin.x + bounds.size.width / 2;
        const qrCenterY = bounds.origin.y + bounds.size.height / 2;

        // Calculate scanner box bounds with tolerance (20px padding)
        const tolerance = 20;
        const boxLeft = (screenWidth - SCANNER_BOX_WIDTH) / 2 - tolerance;
        const boxRight = (screenWidth - SCANNER_BOX_WIDTH) / 2 + SCANNER_BOX_WIDTH + tolerance;
        const boxTop = OVERLAY_TOP_HEIGHT - tolerance;
        const boxBottom = OVERLAY_TOP_HEIGHT + SCANNER_BOX_HEIGHT + tolerance;

        console.log(`[QR SCANNER] QR Center: (${qrCenterX}, ${qrCenterY})`);
        console.log(`[QR SCANNER] Box bounds: left=${boxLeft}, right=${boxRight}, top=${boxTop}, bottom=${boxBottom}`);
        console.log(`[QR SCANNER] Screen: ${screenWidth}x${screenHeight}, Box: ${SCANNER_BOX_WIDTH}x${SCANNER_BOX_HEIGHT}`);

        // Check if QR code center is within the scanner box (with tolerance)
        if (qrCenterX >= boxLeft && qrCenterX <= boxRight &&
          qrCenterY >= boxTop && qrCenterY <= boxBottom) {
          console.log('[QR SCANNER] QR code detected within scanner box (with tolerance):', data);
          setScanned(true);
          onScanned(data);
        } else {
          console.log('[QR SCANNER] QR code detected outside scanner box, ignoring');
        }
        return;
      } else {
        console.log('[QR SCANNER] Bounds not available, falling back to immediate scan');
        // Fallback if bounds are not available
        setScanned(true);
        onScanned(data);
        return;
      }
    }

    // Default fast scanning mode - scan immediately
    console.log('[QR SCANNER] Fast scanning mode - QR code detected:', data);
    setScanned(true);
    onScanned(data);
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      console.log('[QR SCANNER] Manual input submitted:', manualInput.trim());
      onScanned(manualInput.trim());
    } else {
      Alert.alert(i18n.t('error', { locale: lang }), i18n.t('pleaseEnterQRCode', { locale: lang }));
    }
  };

  const resetScanner = () => {
    setScanned(false);
    if (cameraReady) {
      startScanAnimation();
    }
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: 'white', fontSize: 16 }}>
          {i18n.t('requestingCameraPermission', { locale: lang })}
        </Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ color: 'white', fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
          {i18n.t('cameraPermissionDenied', { locale: lang })}
        </Text>
        {showManualInput && (
          <View style={{ width: '100%' }}>
            <TextInput
              style={styles.manualInput}
              value={manualInput}
              onChangeText={setManualInput}
              placeholder={i18n.t('enterQRCodeManually', { locale: lang })}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <ThemedButton
                title={i18n.t('submit', { locale: lang })}
                onPress={handleManualSubmit}
                color="#1976d2"
                style={{ flex: 1 }}
              />
              <ThemedButton
                title={i18n.t('cancel', { locale: lang })}
                onPress={onCancel}
                color="#f44336"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}
        {!showManualInput && (
          <ThemedButton
            title={i18n.t('cancel', { locale: lang })}
            onPress={onCancel}
            color="#f44336"
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        onCameraReady={() => setCameraReady(true)}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'pdf417', 'code128', 'code93', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e'],
        }}
      />

      {/* Dark overlay with cutout for scanner box */}
      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayBottom} />
        <View style={styles.overlayLeft} />
        <View style={styles.overlayRight} />
      </View>

      {/* Scanner box with enhanced corners */}
      <View style={styles.scannerBox}>
        {/* Corner decorations */}
        <View style={[styles.scannerCorner, styles.topLeft]} />
        <View style={[styles.scannerCorner, styles.topRight]} />
        <View style={[styles.scannerCorner, styles.bottomLeft]} />
        <View style={[styles.scannerCorner, styles.bottomRight]} />

        {/* Animated scanning line */}
        {cameraReady && !scanned && (
          <Animated.View
            style={[
              styles.scanningLine,
              {
                top: scanLineAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, SCANNER_BOX_HEIGHT - 12],
                }),
              },
            ]}
          />
        )}
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructions}>
          {title || i18n.t('scanQRInstructions', { locale: lang })}
          {subtitle && `\n${subtitle}`}
        </Text>
      </View>

      {/* Manual input overlay */}
      {showManual && (
        <View style={styles.manualInputContainer}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
            {i18n.t('manualInput', { locale: lang })}
          </Text>
          <TextInput
            style={styles.manualInput}
            value={manualInput}
            onChangeText={setManualInput}
            placeholder={i18n.t('enterQRCodeManually', { locale: lang })}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <ThemedButton
              title={i18n.t('submit', { locale: lang })}
              onPress={handleManualSubmit}
              color="#1976d2"
              style={{ flex: 1 }}
            />
            <ThemedButton
              title={i18n.t('cancel', { locale: lang })}
              onPress={() => setShowManual(false)}
              color="#666"
              style={{ flex: 1 }}
            />
          </View>
        </View>
      )}

      {/* Bottom buttons */}
      <View style={styles.buttonContainer}>
        {showManualInput && !showManual && (
          <ThemedButton
            title={i18n.t('manualInput', { locale: lang })}
            onPress={() => setShowManual(true)}
            color="#666"
          />
        )}

        {scanned && (
          <ThemedButton
            title={i18n.t('tapToScanAgain', { locale: lang })}
            onPress={resetScanner}
            color="#1976d2"
          />
        )}

        <ThemedButton
          title={i18n.t('cancel', { locale: lang })}
          onPress={onCancel}
          color="#f44336"
        />
      </View>
    </View>
  );
}
