import React, { useState, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Databases, Query } from 'react-native-appwrite';
import appwrite from '@/constants/appwrite';
import InventoryForm from './InventoryForm';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// This page is for modifying an existing inventory item.
// It expects to receive the scanned QR code via navigation params.
// The QR code format is "TT1_<sequence>" where sequence is the inventory item sequence number.

function ModifyInventoryContent(props: any) {
  const [itemData, setItemData] = useState<any>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useLocalSearchParams();
  
  // Get scanned QR value from navigation params
  const scannedValue = params.scanned as string;

  useEffect(() => {
    if (scannedValue) {
      fetchInventoryData(scannedValue);
    } else {
      setError('No QR code scanned');
      setLoading(false);
    }
  }, [scannedValue]);

  const fetchInventoryData = async (qrValue: string) => {
    try {
      setLoading(true);
      const databases = new Databases(appwrite);
      const DB_ID = '687ca1a800338d2b13ae';
      const COLLECTION_ID = '687ca1ac00054b181ab0';

      // Extract sequence number from QR code (remove "TT1_" prefix)
      const sequence = qrValue.replace('TT1_', '');
      
      // Query inventory by sequence number
      const result = await databases.listDocuments(
        DB_ID,
        COLLECTION_ID,
        [Query.equal('sequence', parseInt(sequence))]
      );

      if (result.documents.length > 0) {
        const document = result.documents[0];
        
        // Check if item is already sold - prevent modification if sold
        if (document.sold) {
          setError(`Item with sequence ${sequence} is already sold and cannot be modified`);
          return;
        }
        
        setItemData(document);
        setDocumentId(document.$id);
        setError(null);
      } else {
        setError(`No inventory item found with sequence: ${sequence}`);
      }
    } catch (e) {
      console.error('Error fetching inventory data:', e);
      setError('Failed to fetch inventory data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading inventory data...</Text>
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
          Scanned QR: {scannedValue}
        </Text>
      </View>
    );
  }

  if (!itemData || !documentId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>No inventory data available</Text>
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
