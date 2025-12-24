import React, { useState, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Databases, Query } from 'react-native-appwrite';
import appwrite, { DATABASE_ID, INVENTORY_COLLECTION_ID } from '@/constants/appwrite';
import InventoryForm from './InventoryForm';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import i18n from '@/constants/i18n';
import { useLanguage } from '@/components/LanguageContext';
import { QR_PREFIXES } from '@/constants/config';

// This page is for modifying an existing inventory item.
// It expects to receive the scanned QR code via navigation params.
// The QR code format is "{QR_PREFIXES.INVENTORY}<sequence>" where sequence is the inventory item sequence number.

function ModifyInventoryContent(props: any) {
  const [itemData, setItemData] = useState<any>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { lang } = useLanguage();
  const params = useLocalSearchParams();

  // Get scanned QR value from navigation params
  const scannedValue = params.scanned as string;

  useEffect(() => {
    if (scannedValue) {
      fetchInventoryData(scannedValue);
    } else {
      setError(i18n.t('noQRCodeScanned', { locale: lang }));
      setLoading(false);
    }
  }, [scannedValue]);

  const fetchInventoryData = async (qrValue: string) => {
    try {
      setLoading(true);
      const databases = new Databases(appwrite);

      // Extract sequence number from QR code (remove QR prefix)
      const sequence = qrValue.replace(QR_PREFIXES.INVENTORY, '');

      // Query inventory by sequence number
      const result = await databases.listDocuments(
        DATABASE_ID,
        INVENTORY_COLLECTION_ID,
        [Query.equal('sequence', parseInt(sequence))]
      );

      if (result.documents.length > 0) {
        const document = result.documents[0];

        // Check if item is already sold - prevent modification if sold
        if (document.sold) {
          setError(i18n.t('itemAlreadySold', { locale: lang, sequence }));
          return;
        }

        setItemData(document);
        setDocumentId(document.$id);
        setError(null);
      } else {
        setError(i18n.t('noInventoryItemFound', { locale: lang, sequence }));
      }
    } catch (e) {
      console.error('Error fetching inventory data:', e);
      setError(i18n.t('failedToFetchInventory', { locale: lang }));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{i18n.t('loadingInventoryData', { locale: lang })}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, color: 'red', textAlign: 'center', marginBottom: 20 }}>
          {error}
        </Text>
        <Text style={{ fontSize: 16, textAlign: 'center' }}>
          {i18n.t('scannedQR', { locale: lang })}: {scannedValue}
        </Text>
      </View>
    );
  }

  if (!itemData || !documentId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{i18n.t('noInventoryData', { locale: lang })}</Text>
      </View>
    );
  }

  return (
    <InventoryForm
      mode="modify"
      itemData={itemData}
      documentId={documentId}
      {...props}
    />
  );
}

export default function ModifyInventoryScreen(props: any) {
  return (
    <ProtectedRoute routeName="modify_inventory">
      <ModifyInventoryContent {...props} />
    </ProtectedRoute>
  );
}
