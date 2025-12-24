import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Databases, Query } from 'react-native-appwrite';
import appwrite, { DATABASE_ID, CUSTOMERS_COLLECTION_ID } from '@/constants/appwrite';
import CustomerForm from './CustomerForm';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import i18n from '@/constants/i18n';
import { useLanguage } from '@/components/LanguageContext';
import { QR_PREFIXES } from '@/constants/config';

// This page is for modifying an existing customer.
// It expects to receive a customer reference or document ID via navigation params.

function ModifyCustomerContent(props: any) {
  const [customerData, setCustomerData] = useState<any>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { lang } = useLanguage();
  const params = useLocalSearchParams();

  // Get customer reference from navigation params
  const customerRef = params.customerRef as string || params.scanned as string;

  useEffect(() => {
    if (customerRef) {
      fetchCustomerData(customerRef);
    } else {
      setError(i18n.t('noCustomerReferenceProvided', { locale: lang }));
      setLoading(false);
    }
  }, [customerRef]);

  const fetchCustomerData = async (refValue: string) => {
    try {
      setLoading(true);
      const databases = new Databases(appwrite);

      // Try different approaches to find the customer
      let result;

      // First, try to extract reference number (remove QR prefix if exists)
      const referenceValue = refValue.replace(QR_PREFIXES.CUSTOMER, '');

      // Try to parse as reference number (integer)
      const referenceNumber = parseInt(referenceValue);
      if (!isNaN(referenceNumber)) {
        // Query customer by reference number
        result = await databases.listDocuments(
          DATABASE_ID,
          CUSTOMERS_COLLECTION_ID,
          [Query.equal('reference', referenceNumber)]
        );
      }

      // If no result and looks like a document ID, try querying by document ID
      if (!result || result.documents.length === 0) {
        try {
          const document = await databases.getDocument(DATABASE_ID, CUSTOMERS_COLLECTION_ID, refValue);
          result = { documents: [document] };
        } catch (e) {
          // Document ID approach failed, keep the original result
        }
      }

      if (result && result.documents.length > 0) {
        const document = result.documents[0];
        setCustomerData(document);
        setDocumentId(document.$id);
        setError(null);
      } else {
        setError(i18n.t('noCustomerFound', { locale: lang, reference: refValue }));
      }
    } catch (e) {
      console.error('Error fetching customer data:', e);
      setError(i18n.t('failedToFetchCustomer', { locale: lang }));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{i18n.t('loadingCustomerData', { locale: lang })}</Text>
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
          {i18n.t('customerReference', { locale: lang })}: {customerRef}
        </Text>
      </View>
    );
  }

  if (!customerData || !documentId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{i18n.t('noCustomerData', { locale: lang })}</Text>
      </View>
    );
  }

  return (
    <CustomerForm
      mode="modify"
      customerData={customerData}
      documentId={documentId}
      {...props}
    />
  );
}

export default function ModifyCustomerScreen(props: any) {
  return (
    <ProtectedRoute routeName="modify_customer">
      <ModifyCustomerContent {...props} />
    </ProtectedRoute>
  );
}
