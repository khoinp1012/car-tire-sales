import React, { useState, useEffect } from 'react';
import { View, Text, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Databases, Query } from 'react-native-appwrite';
import appwrite from '@/constants/appwrite';
import ThemedButton from '@/components/ThemedButton';
import SuccessPopup from '@/components/SuccessPopup';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// This page sets pending_sale=1 for an inventory item by QR scan
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  info: { fontSize: 16, marginVertical: 8 },
});

function PendingSaleContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const params = useLocalSearchParams();
  const router = useRouter();
  const scannedValue = params.scanned as string;

  useEffect(() => {
    if (scannedValue) {
      handleSetPendingSale(scannedValue);
    } else {
      setError('No QR code scanned');
      setLoading(false);
    }
  }, [scannedValue]);

  const handleSetPendingSale = async (qrValue: string) => {
    setLoading(true);
    try {
      const databases = new Databases(appwrite);
      const DB_ID = '687ca1a800338d2b13ae'; // CarTireSales database
      const COLLECTION_ID = '687ca1ac00054b181ab0'; // inventory_items collection
      
      // Handle different QR formats - try to extract sequence number
      let sequence: number;
      if (qrValue.startsWith('TT1_')) {
        sequence = parseInt(qrValue.replace('TT1_', ''));
      } else if (!isNaN(parseInt(qrValue))) {
        sequence = parseInt(qrValue);
      } else {
        setError(`Invalid QR format: ${qrValue}`);
        return;
      }

      const result = await databases.listDocuments(DB_ID, COLLECTION_ID, [
        Query.equal('sequence', sequence)
      ]);
      
      if (result.documents.length > 0) {
        const document = result.documents[0];
        
        // Check if item is already sold
        if (document.sold) {
          setError(`Item with sequence ${sequence} is already sold`);
          return;
        }
        
        // Check if item is already pending sale
        if (document.pending_sale === 1) {
          setError(`Item with sequence ${sequence} is already set as pending sale`);
          return;
        }
        
        await databases.updateDocument(DB_ID, COLLECTION_ID, document.$id, { 
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
        setError(`No inventory item found with sequence: ${sequence}`);
      }
    } catch (e) {
      console.error('[PendingSaleScreen] Error updating pending_sale:', e);
      setError('Failed to update pending sale');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /><Text>Processing...</Text></View>;
  }
  if (error) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}><Text style={{ fontSize: 18, color: 'red', textAlign: 'center', marginBottom: 20 }}>{error}</Text><Text style={{ fontSize: 16, textAlign: 'center' }}>Scanned QR: {scannedValue}</Text></View>;
  }
  if (success) {
    return (
      <View style={{ flex: 1 }}>
        <SuccessPopup 
          visible={showSuccessPopup}
          message={`Pending sale set successfully!\nScanned: ${scannedValue}`}
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 20, color: 'green', textAlign: 'center', marginBottom: 10 }}>
            ✓ Pending sale set successfully!
          </Text>
          <Text style={{ fontSize: 16, textAlign: 'center', color: '#666' }}>
            Scanned QR: {scannedValue}
          </Text>
          <Text style={{ fontSize: 14, textAlign: 'center', color: '#666', marginTop: 10 }}>
            Returning to scanner...
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
