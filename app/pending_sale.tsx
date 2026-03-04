import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Databases, Query } from 'react-native-appwrite';
import appwrite, { DATABASE_ID, INVENTORY_COLLECTION_ID } from '@/constants/appwrite';
import SuccessPopup from '@/components/SuccessPopup';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Logger } from '@/utils/logger';
import i18n from '@/constants/i18n';
import { useLanguage } from '@/components/LanguageContext';
import { QR_PREFIXES } from '@/constants/config';

// This page sets pending_sale=1 for an inventory item by QR scan
// This page sets pending_sale=1 for an inventory item by QR scan

function PendingSaleContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const { lang } = useLanguage();
  const params = useLocalSearchParams();
  const router = useRouter();
  const scannedValue = params.scanned as string;

  const handleSetPendingSale = React.useCallback(async (qrValue: string) => {
    setLoading(true);
    try {
      const databases = new Databases(appwrite);

      // Handle different QR formats - try to extract sequence number
      let sequence: number;
      if (qrValue.startsWith(QR_PREFIXES.INVENTORY)) {
        sequence = parseInt(qrValue.replace(QR_PREFIXES.INVENTORY, ''));
      } else if (!isNaN(parseInt(qrValue))) {
        sequence = parseInt(qrValue);
      } else {
        setError(i18n.t('invalidQRFormat', { locale: lang, qr: qrValue }));
        return;
      }

      const result = await databases.listDocuments(DATABASE_ID, INVENTORY_COLLECTION_ID, [
        Query.equal('sequence', sequence)
      ]);

      if (result.documents.length > 0) {
        const document = result.documents[0];

        // Check if item is already sold
        if (document.sold) {
          setError(i18n.t('itemAlreadySoldSimple', { locale: lang, sequence }));
          return;
        }

        // Check if item is already pending sale
        if (document.pending_sale === 1) {
          setError(i18n.t('itemAlreadyPendingSale', { locale: lang, sequence }));
          return;
        }

        await databases.updateDocument(DATABASE_ID, INVENTORY_COLLECTION_ID, document.$id, {
          pending_sale: 1
        });
        setSuccess(true);
        setShowSuccessPopup(true);
        setError(null);

        // Auto-redirect back to scanner after 2 seconds
        setTimeout(() => {
          router.replace('/scan_pending_sale');
        }, 2000);
      } else {
        setError(i18n.t('noInventoryItemFound', { locale: lang, sequence }));
      }
    } catch (e) {
      Logger.error('[PendingSaleScreen] Error updating pending_sale:', e);
      setError(i18n.t('failedToUpdatePendingSale', { locale: lang }));
    } finally {
      setLoading(false);
    }
  }, [lang, router]);

  useEffect(() => {
    if (scannedValue) {
      handleSetPendingSale(scannedValue);
    } else {
      setError(i18n.t('noQRCodeScanned', { locale: lang }));
      setLoading(false);
    }
  }, [scannedValue, handleSetPendingSale, lang]);

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /><Text>{i18n.t('processing', { locale: lang })}</Text></View>;
  }
  if (error) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}><Text style={{ fontSize: 18, color: 'red', textAlign: 'center', marginBottom: 20 }}>{error}</Text><Text style={{ fontSize: 16, textAlign: 'center' }}>{i18n.t('scannedQR', { locale: lang })}: {scannedValue}</Text></View>;
  }
  if (success) {
    return (
      <View style={{ flex: 1 }}>
        <SuccessPopup
          visible={showSuccessPopup}
          message={`${i18n.t('pendingSaleSetSuccessfully', { locale: lang })}\n${i18n.t('scannedQR', { locale: lang })}: ${scannedValue}`}
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 20, color: 'green', textAlign: 'center', marginBottom: 10 }}>
            ✓ {i18n.t('pendingSaleSetSuccessfully', { locale: lang })}
          </Text>
          <Text style={{ fontSize: 16, textAlign: 'center', color: '#666' }}>
            {i18n.t('scannedQR', { locale: lang })}: {scannedValue}
          </Text>
          <Text style={{ fontSize: 14, textAlign: 'center', color: '#666', marginTop: 10 }}>
            {i18n.t('returningToScanner', { locale: lang })}
          </Text>
        </View>
      </View>
    );
  }
  return null;
}

export default function PendingSaleScreen() {
  return (
    <ProtectedRoute routeName="pending_sale">
      <PendingSaleContent />
    </ProtectedRoute>
  );
}
