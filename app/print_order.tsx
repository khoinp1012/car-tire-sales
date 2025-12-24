import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Share
} from 'react-native';
import { Databases, Query } from 'react-native-appwrite';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import appwrite, { DATABASE_ID, SALES_COLLECTION_ID, CUSTOMERS_COLLECTION_ID } from '@/constants/appwrite';
import ThemedButton from '@/components/ThemedButton';
import { useRouter } from 'expo-router';
import i18n from '@/constants/i18n';
import { useLanguage } from '@/components/LanguageContext';
import { formatTireSize } from '@/utils/tireSizeFormatter';
import { TemplateData, generateInvoiceHTMLFromTemplate, InventoryItem, TemplateType } from '@/utils/templateUtils';
import { getCurrentTemplate, TEMPLATE_CONFIG } from '@/utils/templateConfig';
import {
  formatVNCurrency,
  formatVNDate,
  generateInvoiceNumber,
  generatePDFFilename,
  getPDFSuccessMessage
} from '@/utils/invoiceUtils';
import { saveToAndroidDownloads } from '@/utils/androidDownloadManager';
import { ProtectedRoute } from '@/components/ProtectedRoute';

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
  orderCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
  },
  customerInfo: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
  },
  itemsSection: {
    marginBottom: 12,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemDescription: {
    flex: 1,
    fontSize: 12,
    color: '#333',
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1976d2',
    width: 80,
    textAlign: 'right',
  },
  totalsSection: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#333',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  finalTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    borderTopWidth: 1,
    borderTopColor: '#1976d2',
    paddingTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  printButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 120,
  },
  printButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noOrdersText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 50,
  },
  templateSection: {
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  templateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  templateButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1976d2',
    backgroundColor: '#fff',
    minWidth: 70,
  },
  templateButtonActive: {
    backgroundColor: '#1976d2',
  },
  templateButtonText: {
    fontSize: 11,
    color: '#1976d2',
    textAlign: 'center',
    fontWeight: '500',
  },
  templateButtonTextActive: {
    color: '#fff',
  },
});

interface SalesOrder {
  $id: string;
  customer_id: string;
  order_date: string;
  inventory_items_list: string;
  total_amount?: number;
  customer_discount?: number;
}

interface Customer {
  $id: string;
  name: string;
  phone_number: string;
  discount_percent: number;
}

function PrintOrderContent() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<{ [key: string]: Customer }>({});
  const [loading, setLoading] = useState(true);
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<{ [orderId: string]: TemplateType }>({});
  const { lang } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const databases = new Databases(appwrite);

      // Load sales orders
      const ordersResult = await databases.listDocuments(
        DATABASE_ID,
        SALES_COLLECTION_ID,
        [Query.orderDesc('order_date'), Query.limit(50)]
      );

      const ordersData = ordersResult.documents as unknown as SalesOrder[];
      setOrders(ordersData);

      // Load customers for all orders
      const customerIds = [...new Set(ordersData.map(order => order.customer_id))];
      const customerPromises = customerIds.map(async (customerId) => {
        try {
          const customer = await databases.getDocument(DATABASE_ID, CUSTOMERS_COLLECTION_ID, customerId);
          return customer as unknown as Customer;
        } catch (error) {
          console.warn(`Failed to load customer ${customerId}:`, error);
          return null;
        }
      });

      const customersArray = await Promise.all(customerPromises);
      const customersMap: { [key: string]: Customer } = {};
      customersArray.forEach(customer => {
        if (customer) {
          customersMap[customer.$id] = customer;
        }
      });

      setCustomers(customersMap);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert(i18n.t('error', { locale: lang }), i18n.t('failedToLoadOrders', { locale: lang }));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return formatVNCurrency(amount);
  };

  const formatDate = (dateString: string) => {
    return formatVNDate(dateString);
  };

  const generateInvoiceHTML = async (order: SalesOrder, customer: Customer, templateType: TemplateType): Promise<string> => {
    try {
      // Parse inventory items
      const items: InventoryItem[] = JSON.parse(order.inventory_items_list);

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.unit_price || 0), 0);
      const discountPercent = customer.discount_percent || 0;
      const discountAmount = (subtotal * discountPercent) / 100;
      const finalTotal = subtotal - discountAmount;

      // Prepare template data with items array
      const templateData: TemplateData = {
        INVOICE_NUMBER: generateInvoiceNumber(order.$id),
        ORDER_DATE: formatDate(order.order_date),
        CUSTOMER_NAME: customer.name,
        CUSTOMER_PHONE: customer.phone_number,
        ITEMS: items, // Pass the items array directly
        SUBTOTAL: formatCurrency(subtotal),
        DISCOUNT_PERCENT: discountPercent.toString(),
        DISCOUNT_AMOUNT: formatCurrency(discountAmount),
        FINAL_TOTAL: formatCurrency(finalTotal)
      };

      // Generate HTML from template using the specified template type
      console.log(`📄 Using template type: ${templateType}`);
      const htmlContent = await generateInvoiceHTMLFromTemplate(templateData, templateType);

      return htmlContent;
    } catch (error) {
      console.error('Error generating invoice HTML:', error);
      throw error;
    }
  };

  const printOrder = async (order: SalesOrder) => {
    const customer = customers[order.customer_id];
    if (!customer) {
      Alert.alert(i18n.t('error', { locale: lang }), i18n.t('customerInfoNotFound', { locale: lang }));
      return;
    }

    try {
      setPrintingOrderId(order.$id);

      // Get the selected template for this order, or use default
      const templateType = selectedTemplates[order.$id] || getCurrentTemplate();

      // Generate HTML content
      const htmlContent = await generateInvoiceHTML(order, customer, templateType);

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      // Generate filename
      const filename = generatePDFFilename(order.$id, customer.name);
      const documentPath = `${FileSystem.documentDirectory}${filename}`;

      // Move file to document directory
      await FileSystem.moveAsync({
        from: uri,
        to: documentPath,
      });

      console.log('PDF created at:', documentPath);

      // For Android, use Storage Access Framework to save to Downloads
      let downloadsPath: string | null = null;
      let savedToDownloads = false;

      if (Platform.OS === 'android') {
        try {
          // Use SAF to save to Downloads folder
          const result = await saveToAndroidDownloads(documentPath, filename);

          if (result.success && result.path) {
            downloadsPath = result.path;
            savedToDownloads = true;
            console.log('PDF saved to Downloads via SAF:', result.path);
          } else {
            console.log('SAF save failed or cancelled:', result.error);
            // File is still available in app directory for sharing
          }
        } catch (error) {
          console.log('Error using SAF, file remains in app directory:', error);
          // Continue - file is still in app directory
        }
      }

      // Show success dialog with appropriate message and options
      const successMessage = savedToDownloads
        ? `${i18n.t('pdfCreatedAndSaved', { locale: lang })}\n\n📄 ${i18n.t('fileLabel', { locale: lang })} ${filename}\n\n📁 ${i18n.t('savedToSelectedFolder', { locale: lang })}\n\n💡 ${i18n.t('findInDownloads', { locale: lang })}`
        : `${i18n.t('pdfCreated', { locale: lang })}\n\n📄 ${i18n.t('fileLabel', { locale: lang })} ${filename}\n\n📁 ${i18n.t('savedAt', { locale: lang })} ${documentPath}\n\n💡 ${i18n.t('saveToDownloadsOrShare', { locale: lang })}`;

      const alertButtons: any[] = [];

      // Add Share button (always available)
      alertButtons.push({
        text: i18n.t('share', { locale: lang }),
        onPress: async () => {
          try {
            // Use expo-sharing for proper file sharing
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(documentPath, {
                mimeType: 'application/pdf',
                dialogTitle: `${i18n.t('shareInvoice', { locale: lang })} ${generateInvoiceNumber(order.$id)}`,
              });
            } else {
              // Fallback to React Native Share
              await Share.share({
                url: Platform.OS === 'ios' ? documentPath : `file://${documentPath}`,
                title: filename,
                message: `${i18n.t('invoice', { locale: lang })} ${generateInvoiceNumber(order.$id)} - ${customer.name}`,
              });
            }
          } catch (error) {
            console.error('Error sharing PDF:', error);
            Alert.alert(i18n.t('error', { locale: lang }), i18n.t('failedToSharePDF', { locale: lang }));
          }
        },
      });

      // Add "Save to Downloads" button if not already saved (Android only)
      if (!savedToDownloads && Platform.OS === 'android') {
        alertButtons.push({
          text: i18n.t('saveToDownloads', { locale: lang }),
          onPress: async () => {
            try {
              const result = await saveToAndroidDownloads(documentPath, filename);
              if (result.success) {
                Alert.alert(
                  i18n.t('success', { locale: lang }),
                  `${i18n.t('savedToFolder', { locale: lang })}\n\n${i18n.t('fileLabel', { locale: lang })} ${filename}`
                );
              } else if (result.error !== 'Permission denied by user') {
                Alert.alert(i18n.t('error', { locale: lang }), i18n.t('failedToSaveToDownloads', { locale: lang }));
              }
            } catch (error) {
              console.error('Error saving to Downloads:', error);
              Alert.alert(i18n.t('error', { locale: lang }), i18n.t('failedToSaveToDownloads', { locale: lang }));
            }
          }
        });
      }

      // Add OK button (always last)
      alertButtons.push({ text: 'OK', style: 'cancel' });

      Alert.alert(i18n.t('success', { locale: lang }), successMessage, alertButtons);

    } catch (error) {
      console.error('Error printing order:', error);
      Alert.alert(i18n.t('error', { locale: lang }), i18n.t('failedToCreatePDF', { locale: lang }));
    } finally {
      setPrintingOrderId(null);
    }
  };

  const renderOrder = (order: SalesOrder) => {
    const customer = customers[order.customer_id];
    if (!customer) return null;

    let items: InventoryItem[] = [];
    try {
      items = JSON.parse(order.inventory_items_list);
    } catch (error) {
      console.warn('Failed to parse items for order:', order.$id);
    }

    const subtotal = items.reduce((sum, item) => sum + (item.unit_price || 0), 0);
    const discountPercent = customer.discount_percent || 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    const finalTotal = subtotal - discountAmount;

    return (
      <View key={order.$id} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>
            {generateInvoiceNumber(order.$id)}
          </Text>
          <Text style={styles.orderDate}>
            {formatDate(order.order_date)}
          </Text>
        </View>

        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerPhone}>{customer.phone_number}</Text>
        </View>

        <View style={styles.itemsSection}>
          <Text style={styles.itemsTitle}>{i18n.t('products', { locale: lang })} ({items.length} {i18n.t('items', { locale: lang })}):</Text>
          {items.slice(0, 3).map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemDescription}>
                {item.brand} {formatTireSize(item.size)} - {item.full_description}
              </Text>
              <Text style={styles.itemPrice}>
                {formatCurrency(item.unit_price || 0)}
              </Text>
            </View>
          ))}
          {items.length > 3 && (
            <Text style={[styles.itemDescription, { fontStyle: 'italic', textAlign: 'center' }]}>
              ... {i18n.t('and', { locale: lang })} {items.length - 3} {i18n.t('otherProducts', { locale: lang })}
            </Text>
          )}
        </View>

        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{i18n.t('total', { locale: lang })}:</Text>
            <Text style={styles.totalAmount}>{formatCurrency(subtotal)} VNĐ</Text>
          </View>
          {discountPercent > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{i18n.t('discount', { locale: lang })} ({discountPercent}%):</Text>
              <Text style={styles.totalAmount}>-{formatCurrency(discountAmount)} VNĐ</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, styles.finalTotal]}>{i18n.t('finalAmount', { locale: lang })}:</Text>
            <Text style={[styles.totalAmount, styles.finalTotal]}>{formatCurrency(finalTotal)} VNĐ</Text>
          </View>
        </View>

        <View style={styles.templateSection}>
          <Text style={styles.templateLabel}>📄 {i18n.t('selectPrintTemplate', { locale: lang })}:</Text>
          <View style={styles.templateButtonRow}>
            {TEMPLATE_CONFIG.availableTemplates.map((template) => {
              const isSelected = (selectedTemplates[order.$id] || getCurrentTemplate()) === template.type;
              return (
                <TouchableOpacity
                  key={template.type}
                  style={[
                    styles.templateButton,
                    isSelected && styles.templateButtonActive
                  ]}
                  onPress={() => {
                    setSelectedTemplates(prev => ({
                      ...prev,
                      [order.$id]: template.type
                    }));
                  }}
                  disabled={printingOrderId === order.$id}
                >
                  <Text style={[
                    styles.templateButtonText,
                    isSelected && styles.templateButtonTextActive
                  ]}>
                    {template.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.printButton}
            onPress={() => printOrder(order)}
            disabled={printingOrderId === order.$id}
          >
            <Text style={styles.printButtonText}>
              {printingOrderId === order.$id ? i18n.t('creatingPDF', { locale: lang }) : i18n.t('createPDF', { locale: lang })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={{ marginTop: 10 }}>{i18n.t('loadingOrders', { locale: lang })}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.title}>{i18n.t('printInvoice', { locale: lang })}</Text>

        {orders.length === 0 ? (
          <Text style={styles.noOrdersText}>{i18n.t('noOrders', { locale: lang })}</Text>
        ) : (
          orders.map(renderOrder)
        )}
      </ScrollView>
    </View>
  );
}

export default function PrintOrderScreen() {
  return (
    <ProtectedRoute routeName="print_order">
      <PrintOrderContent />
    </ProtectedRoute>
  );
}
