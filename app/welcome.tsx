
import { View } from '@/components/Themed';
import { StyleSheet, ScrollView, Alert } from 'react-native';
import ThemedButton from '@/components/ThemedButton';
import i18n from '@/constants/i18n';
import { useLanguage } from '@/components/LanguageContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import WelcomeText from '@/components/WelcomeText';
import DefaultBottomBar from '@/components/DefaultBottomBar';
import { logout } from '@/utils/logout';
import { usePermissions } from '@/hooks/usePermissions';
import React from 'react';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 100, // Add space for bottom bar
  },
  buttonContainer: {
    width: '80%',
    gap: 16,
  },
});
function WelcomeContent() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { permissions, loading, userGroups, roleDescription } = usePermissions();
  const { lang } = useLanguage();
  const router = useRouter();

  console.log('[Welcome] Screen loaded with email:', email);
  console.log('[Welcome] Current permissions:', permissions);
  console.log('[Welcome] User role:', roleDescription);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <WelcomeText />
      </View>
    );
  }

  if (!permissions) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <WelcomeText />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={true}
      >
        <WelcomeText />
        <View style={styles.buttonContainer}>
        {/* Case 1: No auth - see nothing (all buttons are protected by permissions) */}
        
        {/* INVENTORY RELATED BUTTONS - Only for inventory_manager and admin groups */}
        {/* Reprint Inventory Button - Inventory related */}
        {permissions.accessiblePages.includes('reprint_inventory') && (
          <ThemedButton
            title={i18n.t('reprintInventoryLabels', { locale: lang })}
            onPress={() => {
              console.log('[WelcomeScreen] Reprint Inventory clicked');
              router.push('/reprint_inventory');
            }}
            color="#ff9800"
          />
        )}
        
        {/* Find Inventory Button - Inventory related */}
        {permissions.accessiblePages.includes('find_inventory') && (
          <ThemedButton
            title={i18n.t('findInventory', { locale: lang })}
            onPress={() => {
              console.log('[WelcomeScreen] Find Inventory clicked');
              router.push('/find_inventory');
            }}
            color="#4CAF50"
          />
        )}
        
        {/* Insert Inventory Button - Inventory related */}
        {permissions.accessiblePages.includes('insert_inventory') && (
          <ThemedButton
            title={i18n.t('insertInventory', { locale: lang })}
            onPress={() => {
              console.log('Insert Inventory clicked');
              router.push('/insert_inventory');
            }}
            color="#1976d2"
          />
        )}
        
        {/* Modify Inventory Button - Inventory related */}
        {permissions.accessiblePages.includes('scan_modify_inventory') && (
          <ThemedButton
            title={i18n.t('scanQRToModify', { locale: lang })}
            onPress={() => {
              console.log('Scan QR to Modify clicked');
              router.push('/scan_modify_inventory');
            }}
            color="#607d8b"
          />
        )}
        
        {/* SALES RELATED BUTTONS - Only for seller and admin groups */}
        {/* Scan QR for Pending Sale Button - Sales related */}
        {permissions.accessiblePages.includes('scan_pending_sale') && (
          <ThemedButton
            title={i18n.t('scanQRForPendingSale', { locale: lang })}
            onPress={() => {
              console.log('Scan QR for Pending Sale clicked');
              router.push('/scan_pending_sale');
            }}
            color="#ff5722"
          />
        )}
        
        {/* Add Customer Button - Sales related (sellers manage customers) */}
        {permissions.accessiblePages.includes('add_customer') && (
          <ThemedButton
            title={i18n.t('addCustomerData', { locale: lang })}
            onPress={() => {
              console.log('Add Customer clicked');
              router.push('/add_customer');
            }}
            color="#9c27b0"
          />
        )}
        
        {/* Create Sales Order Button - Sales related */}
        {permissions.accessiblePages.includes('create_sales') && (
          <ThemedButton
            title={i18n.t('createSalesOrder', { locale: lang })}
            onPress={() => {
              console.log('Create Sales Order clicked');
              router.push('/create_sales');
            }}
            color="#4caf50"
          />
        )}
        
        {/* Print Order Button - Sales related */}
        {permissions.accessiblePages.includes('print_order') && (
          <ThemedButton
            title={i18n.t('printOrder', { locale: lang })}
            onPress={() => {
              console.log('Print Order clicked');
              router.push('/print_order');
            }}
            color="#2196f3"
          />
        )}
      </View>
      </ScrollView>
      <DefaultBottomBar onLogout={logout} groups={userGroups} />
    </View>
  );
}

export default function WelcomeScreen() {
  return <WelcomeContent />;
}
