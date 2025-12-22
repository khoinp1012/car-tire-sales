import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, TextInput } from 'react-native';
import { AutocompleteDropdown, AutocompleteDropdownContextProvider } from 'react-native-autocomplete-dropdown';
import { Databases, Query, ID, Permission, Role } from 'react-native-appwrite';
import appwrite from '@/constants/appwrite';
import ThemedButton from '@/components/ThemedButton';
import SuccessPopup from '@/components/SuccessPopup';
import { useRouter } from 'expo-router';
import i18n from '@/constants/i18n';
import { useLanguage } from '@/components/LanguageContext';
import { formatVNCurrency } from '@/utils/invoiceUtils';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { usePermissions } from '@/hooks/usePermissions';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1976d2',
  },
  section: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  itemCard: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  itemText: {
    fontSize: 14,
    marginBottom: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  totalSection: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
    textAlign: 'center',
  },
  noItemsText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  buttonFlex: {
    flex: 1,
  },
});

function CreateSalesContent() {
  const { lang } = useLanguage();
  const { permissions } = usePermissions();
  const router = useRouter();
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [customers, setCustomers] = useState<{ id: string; title: string; data: any }[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadPendingItems(), loadCustomers()]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingItems = async () => {
    try {
      const databases = new Databases(appwrite);
      const DB_ID = '687ca1a800338d2b13ae';
      const INVENTORY_COLLECTION_ID = '687ca1ac00054b181ab0';

      const result = await databases.listDocuments(DB_ID, INVENTORY_COLLECTION_ID, [
        Query.equal('pending_sale', 1),
        Query.equal('sold', false),
        Query.orderAsc('sequence')
      ]);

      setPendingItems(result.documents);
    } catch (error) {
      console.error('Error loading pending items:', error);
      throw error;
    }
  };

  const loadCustomers = async () => {
    try {
      const databases = new Databases(appwrite);
      const DB_ID = '687ca1a800338d2b13ae';
      const CUSTOMERS_COLLECTION_ID = '687ca1b00024526eedc2';

      const result = await databases.listDocuments(DB_ID, CUSTOMERS_COLLECTION_ID, [
        Query.orderAsc('name')
      ]);

      // Format customers for autocomplete using full_description
      const formattedCustomers = result.documents.map(customer => ({
        id: customer.$id,
        title: customer.full_description || `${customer.name} - ${customer.phone_number}`,
        data: customer
      }));

      setCustomers(formattedCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
      throw error;
    }
  };

  const calculateTotal = () => {
    return pendingItems.reduce((total, item) => total + (item.unit_price || 0), 0);
  };

  const calculateFinalTotal = () => {
    const total = calculateTotal();
    const discount = selectedCustomer?.data.discount_percent || 0;
    const discountAmount = (total * discount) / 100;
    return total - discountAmount;
  };

  const handleCancelSale = async () => {
    Alert.alert(
      i18n.t('confirmSale', { locale: lang }),
      i18n.t('cancelSaleConfirm', { locale: lang }),
      [
        { text: i18n.t('cancel', { locale: lang }), style: 'cancel' },
        { text: 'Confirm', onPress: confirmCancelSale }
      ]
    );
  };

  const confirmCancelSale = async () => {
    try {
      setSubmitting(true);
      const databases = new Databases(appwrite);
      const DB_ID = '687ca1a800338d2b13ae';
      const INVENTORY_COLLECTION_ID = '687ca1ac00054b181ab0';

      // Update all pending items: set pending_sale back to null
      const updatePromises = pendingItems.map(item =>
        databases.updateDocument(DB_ID, INVENTORY_COLLECTION_ID, item.$id, {
          pending_sale: null,
        })
      );

      await Promise.all(updatePromises);
      
      Alert.alert(
        i18n.t('success', { locale: lang }),
        i18n.t('saleCancelled', { locale: lang }),
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error cancelling sale:', error);
      Alert.alert(i18n.t('error', { locale: lang }), i18n.t('failedToCancelSale', { locale: lang }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSale = async () => {
    if (!selectedCustomer) {
      Alert.alert('Error', i18n.t('pleaseSelectCustomer', { locale: lang }));
      return;
    }

    if (pendingItems.length === 0) {
      Alert.alert('Error', i18n.t('noPendingItems', { locale: lang }));
      return;
    }

    const finalTotal = selectedCustomer?.data.discount_percent > 0 ? calculateFinalTotal() : calculateTotal();
    const discountText = selectedCustomer?.data.discount_percent > 0 
      ? ` (${i18n.t('total', { locale: lang })}: ${formatVNCurrency(finalTotal)} VND ${i18n.t('after', { locale: lang })} ${selectedCustomer.data.discount_percent}% ${i18n.t('discount', { locale: lang })})` 
      : ` (${i18n.t('total', { locale: lang })}: ${formatVNCurrency(finalTotal)} VND)`;

    Alert.alert(
      i18n.t('confirmSale', { locale: lang }),
      `${i18n.t('createSaleFor', { locale: lang })} ${selectedCustomer.data.name} ${i18n.t('withItems', { locale: lang })} ${pendingItems.length} ${i18n.t('items', { locale: lang })}?${discountText}`,
      [
        { text: i18n.t('cancel', { locale: lang }), style: 'cancel' },
        { text: i18n.t('confirm', { locale: lang }), onPress: confirmSale }
      ]
    );
  };

  const confirmSale = async () => {
    try {
      setSubmitting(true);
      const databases = new Databases(appwrite);
      const DB_ID = '687ca1a800338d2b13ae';
      const INVENTORY_COLLECTION_ID = '687ca1ac00054b181ab0';
      const SALES_COLLECTION_ID = '687ca1b5000adbbf16bd';

      // Create line items data - complete historical snapshot as JSON string
      const lineItems = pendingItems.map(item => ({
        item_id: item.$id,                    // For reference if needed
        sequence: item.sequence,
        brand: item.brand || '',
        size: item.size || '',
        full_description: item.full_description || '',
        unit_price: item.unit_price || 0,     // Price at time of sale
        radius_size: item.radius_size || 0,
        sale_date: new Date().toISOString()   // When this item was sold
      }));

      // Calculate totals
      const totalAmount = calculateTotal();
      const customerDiscount = selectedCustomer.data.discount_percent || 0;
      const discountAmount = (totalAmount * customerDiscount) / 100;
      const finalAmount = totalAmount - discountAmount;

      // Create sales order with correct schema
      // inventory_items_list is a JSON string containing complete item data
      // reference_id should be null by default (refers to another customer if needed)
      const salesOrder = {
        customer_id: selectedCustomer.id,
        order_date: new Date().toISOString(),
        inventory_items_list: JSON.stringify(lineItems), // Complete historical snapshot
        total_amount: finalAmount,
        customer_discount: customerDiscount,
        // reference_id is omitted so it defaults to null
      };

      console.log('Creating sales order with data:', salesOrder);

      const saleResult = await databases.createDocument(
        DB_ID,
        SALES_COLLECTION_ID,
        ID.unique(),
        salesOrder,
        [
          Permission.read(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any()),
        ]
      );

      // Update inventory items: set sold=true, pending_sale=0
      const updatePromises = pendingItems.map(item =>
        databases.updateDocument(DB_ID, INVENTORY_COLLECTION_ID, item.$id, {
          sold: true,
          pending_sale: 0
        })
      );

      await Promise.all(updatePromises);

      console.log('Sales order created successfully:', saleResult);
      setShowSuccess(true);

      // Reset and reload data after success
      setTimeout(() => {
        setSelectedCustomer(null);
        loadData();
        setShowSuccess(false);
      }, 2000);

    } catch (error) {
      console.error('Error creating sale:', error);
      Alert.alert(i18n.t('error', { locale: lang }), i18n.t('failedToCreateSale', { locale: lang }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={{ marginTop: 8 }}>{i18n.t('loading', { locale: lang })}</Text>
      </View>
    );
  }

  return (
    <AutocompleteDropdownContextProvider>
      <View style={styles.container}>
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{i18n.t('createSalesOrder', { locale: lang })}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <View style={styles.buttonFlex}>
              <ThemedButton
                title={i18n.t('cancel', { locale: lang })}
                onPress={handleCancelSale}
                color="#f44336"
              />
            </View>
            <View style={styles.buttonFlex}>
              <ThemedButton
                title={submitting ? i18n.t('creatingSale', { locale: lang }) : i18n.t('createSalesOrder', { locale: lang })}
                onPress={submitting || pendingItems.length === 0 || !selectedCustomer ? () => {} : handleCreateSale}
                color={submitting || pendingItems.length === 0 || !selectedCustomer ? '#ccc' : '#1976d2'}
              />
            </View>
          </View>

          {/* Customer Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('selectCustomer', { locale: lang })}</Text>
            <Text style={styles.label}>{i18n.t('customer', { locale: lang })} *</Text>
            <AutocompleteDropdown
              clearOnFocus={false}
              closeOnBlur={true}
              closeOnSubmit={false}
              dataSet={customers}
              onSelectItem={(item: any) => {
                if (item) {
                  setSelectedCustomer(item);
                }
              }}
              textInputProps={{
                placeholder: i18n.t('searchCustomerPlaceholder', { locale: lang }),
                autoCorrect: false,
                style: {
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                },
              }}
              inputContainerStyle={{ backgroundColor: 'transparent' }}
              containerStyle={{ marginBottom: 16 }}
            />
            {selectedCustomer && (
              <View style={{ backgroundColor: '#e8f5e8', padding: 12, borderRadius: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{i18n.t('selected', { locale: lang })}: {selectedCustomer.data.name}</Text>
                <Text style={{ fontSize: 14, color: '#666' }}>{i18n.t('phone', { locale: lang })}: {selectedCustomer.data.phone_number}</Text>
                {selectedCustomer.data.address && (
                  <Text style={{ fontSize: 14, color: '#666' }}>{i18n.t('address', { locale: lang })}: {selectedCustomer.data.address}</Text>
                )}
                {selectedCustomer.data.discount_percent > 0 && (
                  <Text style={{ fontSize: 14, color: '#e91e63' }}>{i18n.t('discount', { locale: lang })}: {selectedCustomer.data.discount_percent}%</Text>
                )}
              </View>
            )}
          </View>

          {/* Pending Items */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('pendingItems', { locale: lang })} ({pendingItems.length})</Text>
            {pendingItems.length === 0 ? (
              <Text style={styles.noItemsText}>{i18n.t('noPendingItemsFound', { locale: lang })}</Text>
            ) : (
              pendingItems.map((item, index) => (
                <View key={item.$id} style={styles.itemCard}>
                  <Text style={styles.itemText}>
                    <Text style={{ fontWeight: 'bold' }}>#{item.sequence}</Text> - {item.full_description}
                  </Text>
                  <Text style={styles.itemText}>{i18n.t('brand', { locale: lang })}: {item.brand} | {i18n.t('size', { locale: lang })}: {item.size}</Text>
                  <Text style={styles.priceText}>{formatVNCurrency(item.unit_price || 0)} VND</Text>
                </View>
              ))
            )}
          </View>

          {/* Total Section */}
          {pendingItems.length > 0 && (
            <View style={styles.totalSection}>
              <Text style={styles.totalText}>
                {i18n.t('subtotal', { locale: lang })}: {formatVNCurrency(calculateTotal())} VND
              </Text>
              {selectedCustomer?.data.discount_percent > 0 && (
                <>
                  <Text style={{ textAlign: 'center', marginTop: 4, color: '#e91e63' }}>
                    {i18n.t('discount', { locale: lang })} ({selectedCustomer.data.discount_percent}%): -{formatVNCurrency((calculateTotal() * selectedCustomer.data.discount_percent) / 100)} VND
                  </Text>
                  <Text style={[styles.totalText, { marginTop: 8, fontSize: 22, color: '#4caf50' }]}>
                    {i18n.t('finalTotal', { locale: lang })}: {formatVNCurrency(calculateFinalTotal())} VND
                  </Text>
                </>
              )}
              {(!selectedCustomer?.data.discount_percent || selectedCustomer.data.discount_percent === 0) && (
                <Text style={[styles.totalText, { marginTop: 8, fontSize: 22, color: '#4caf50' }]}>
                  {i18n.t('total', { locale: lang })}: {formatVNCurrency(calculateTotal())} VND
                </Text>
              )}
            </View>
          )}
        </ScrollView>

        <SuccessPopup
          visible={showSuccess}
          message={i18n.t('salesOrderCreatedSuccessfully', { locale: lang })}
        />

        {submitting && (
          <View style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.3)', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}>
            <ActivityIndicator size="large" color="#1976d2" />
            <Text style={{ color: 'white', marginTop: 8 }}>{i18n.t('creatingSale', { locale: lang })}</Text>
          </View>
        )}
      </View>
    </AutocompleteDropdownContextProvider>
  );
}

export default function CreateSalesScreen() {
  return (
    <ProtectedRoute routeName="create_sales">
      <CreateSalesContent />
    </ProtectedRoute>
  );
}
