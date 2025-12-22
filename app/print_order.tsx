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
import appwrite from '@/constants/appwrite';
import ThemedButton from '@/components/ThemedButton';
import { useRouter } from 'expo-router';
import { formatTireSize } from '@/utils/tireSizeFormatter';
import { TemplateData, generateInvoiceHTMLFromTemplate, InventoryItem } from '@/utils/templateUtils';
import { getCurrentTemplate } from '@/utils/templateConfig';
import { 
  formatVNCurrency, 
  formatVNDate, 
  generateInvoiceNumber, 
  generatePDFFilename,
  getPDFSuccessMessage 
} from '@/utils/invoiceUtils';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const DB_ID = '687ca1a800338d2b13ae';
const SALES_COLLECTION_ID = '687ca1b5000adbbf16bd';
const CUSTOMERS_COLLECTION_ID = '687ca1b00024526eedc2';

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
        DB_ID,
        SALES_COLLECTION_ID,
        [Query.orderDesc('order_date'), Query.limit(50)]
      );

      const ordersData = ordersResult.documents as unknown as SalesOrder[];
      setOrders(ordersData);

      // Load customers for all orders
      const customerIds = [...new Set(ordersData.map(order => order.customer_id))];
      const customerPromises = customerIds.map(async (customerId) => {
        try {
          const customer = await databases.getDocument(DB_ID, CUSTOMERS_COLLECTION_ID, customerId);
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
      Alert.alert('Lỗi', 'Không thể tải danh sách đơn hàng');
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

  const generateInvoiceHTML = async (order: SalesOrder, customer: Customer): Promise<string> => {
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

      // Generate HTML from template (using configured default template)
      const currentTemplate = getCurrentTemplate();
      console.log(`📄 Using template type: ${currentTemplate}`);
      const htmlContent = await generateInvoiceHTMLFromTemplate(templateData, currentTemplate);
      
      return htmlContent;
    } catch (error) {
      console.error('Error generating invoice HTML:', error);
      throw error;
    }
  };

  const printOrder = async (order: SalesOrder) => {
    const customer = customers[order.customer_id];
    if (!customer) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin khách hàng');
      return;
    }

    try {
      setPrintingOrderId(order.$id);

      // Generate HTML content
      const htmlContent = await generateInvoiceHTML(order, customer);

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

      // For standalone build (not Expo Go), save to Downloads
      let downloadsPath: string | null = null;
      if (Platform.OS === 'android') {
        try {
          // Request media library permissions
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status === 'granted') {
            // Create asset and save to media library (Downloads)
            const asset = await MediaLibrary.createAssetAsync(documentPath);
            const album = await MediaLibrary.getAlbumAsync('Download');
            if (album) {
              await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
              downloadsPath = '/storage/emulated/0/Download/' + filename;
            } else {
              // Create Downloads album if it doesn't exist
              await MediaLibrary.createAlbumAsync('Download', asset, false);
              downloadsPath = '/storage/emulated/0/Download/' + filename;
            }
          }
        } catch (error) {
          console.log('Could not save to Downloads folder:', error);
          // Continue without Downloads save - file is still in app directory
        }
      }

      // Show success dialog with multiple options
      const message = getPDFSuccessMessage(filename, documentPath, downloadsPath || undefined);

      Alert.alert(
        'Thành công',
        message,
        [
          { text: 'OK', style: 'cancel' },
          {
            text: 'Chia sẻ',
            onPress: async () => {
              try {
                // Use expo-sharing for proper file sharing
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(documentPath, {
                    mimeType: 'application/pdf',
                    dialogTitle: `Chia sẻ hóa đơn ${generateInvoiceNumber(order.$id)}`,
                  });
                } else {
                  // Fallback to React Native Share
                  await Share.share({
                    url: Platform.OS === 'ios' ? documentPath : `file://${documentPath}`,
                    title: filename,
                    message: `Hóa đơn ${generateInvoiceNumber(order.$id)} - ${customer.name}`,
                  });
                }
              } catch (error) {
                console.error('Error sharing PDF:', error);
                Alert.alert('Lỗi', 'Không thể chia sẻ file PDF');
              }
            },
          },
        ]
      );

    } catch (error) {
      console.error('Error printing order:', error);
      Alert.alert('Lỗi', 'Không thể tạo file PDF');
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
          <Text style={styles.itemsTitle}>Sản phẩm ({items.length} món):</Text>
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
              ... và {items.length - 3} sản phẩm khác
            </Text>
          )}
        </View>

        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng cộng:</Text>
            <Text style={styles.totalAmount}>{formatCurrency(subtotal)} VNĐ</Text>
          </View>
          {discountPercent > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Giảm giá ({discountPercent}%):</Text>
              <Text style={styles.totalAmount}>-{formatCurrency(discountAmount)} VNĐ</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, styles.finalTotal]}>Thành tiền:</Text>
            <Text style={[styles.totalAmount, styles.finalTotal]}>{formatCurrency(finalTotal)} VNĐ</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.printButton}
            onPress={() => printOrder(order)}
            disabled={printingOrderId === order.$id}
          >
            <Text style={styles.printButtonText}>
              {printingOrderId === order.$id ? 'Đang tạo PDF...' : 'Tạo PDF'}
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
        <Text style={{ marginTop: 10 }}>Đang tải đơn hàng...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.title}>In Hóa Đơn</Text>
        
        {orders.length === 0 ? (
          <Text style={styles.noOrdersText}>Không có đơn hàng nào</Text>
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
