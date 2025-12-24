
import { View } from '@/components/Themed';
import { StyleSheet, ScrollView, Alert, Text } from 'react-native';
import ThemedButton from '@/components/ThemedButton';
import i18n from '@/constants/i18n';
import { useLanguage } from '@/components/LanguageContext';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import WelcomeText from '@/components/WelcomeText';
import DefaultBottomBar from '@/components/DefaultBottomBar';
import { logout } from '@/utils/logout';
import { usePermissions } from '@/hooks/usePermissions';
import React, { useCallback } from 'react';

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
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'left',
  },
});
function WelcomeContent() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { permissions, loading, userGroups, roleDescription, refresh, canAccessRoute } = usePermissions();
  const { lang } = useLanguage();
  const router = useRouter();

  // Refresh permissions when screen comes into focus
  // Only refresh, don't add to dependency array to avoid infinite loop
  useFocusEffect(
    useCallback(() => {
      console.log('[Welcome] Screen focused, refreshing permissions...');
      refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Empty deps - only run the effect, not recreate it
  );

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

          {/* ADMIN SECTION - Only for admin group */}
          {canAccessRoute('manage_roles') && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{i18n.t('administration', { locale: lang })}</Text>
              </View>

              <ThemedButton
                title={i18n.t('manageRoles', { locale: lang })}
                onPress={() => {
                  console.log('[WelcomeScreen] Manage Roles clicked');
                  router.push('/manage_roles');
                }}
                color="#ff6f00"
              />

              <ThemedButton
                title={i18n.t('manageUsers', { locale: lang })}
                onPress={() => {
                  console.log('[WelcomeScreen] Manage Users clicked');
                  router.push('/manage_users');
                }}
                color="#ff6f00"
              />

              <ThemedButton
                title={i18n.t('permissionHistory', { locale: lang })}
                onPress={() => {
                  console.log('[WelcomeScreen] Permission History clicked');
                  router.push('/permission_history');
                }}
                color="#ff6f00"
              />
            </>
          )}

          {/* INVENTORY SECTION - Only for inventory_manager and admin groups */}
          {(canAccessRoute('reprint_inventory') ||
            canAccessRoute('find_inventory') ||
            canAccessRoute('insert_inventory') ||
            canAccessRoute('scan_modify_inventory') ||
            canAccessRoute('location_tracking')) && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{i18n.t('inventoryManagement', { locale: lang })}</Text>
                </View>

                {canAccessRoute('find_inventory') && (
                  <ThemedButton
                    title={i18n.t('findInventory', { locale: lang })}
                    onPress={() => {
                      console.log('[WelcomeScreen] Find Inventory clicked');
                      router.push('/find_inventory');
                    }}
                    color="#1976d2"
                  />
                )}

                {canAccessRoute('insert_inventory') && (
                  <ThemedButton
                    title={i18n.t('insertInventory', { locale: lang })}
                    onPress={() => {
                      console.log('Insert Inventory clicked');
                      router.push('/insert_inventory');
                    }}
                    color="#1976d2"
                  />
                )}

                {canAccessRoute('scan_modify_inventory') && (
                  <ThemedButton
                    title={i18n.t('scanQRToModify', { locale: lang })}
                    onPress={() => {
                      console.log('Scan QR to Modify clicked');
                      router.push('/scan_modify_inventory');
                    }}
                    color="#1976d2"
                  />
                )}

                {canAccessRoute('reprint_inventory') && (
                  <ThemedButton
                    title={i18n.t('reprintInventoryLabels', { locale: lang })}
                    onPress={() => {
                      console.log('[WelcomeScreen] Reprint Inventory clicked');
                      router.push('/reprint_inventory');
                    }}
                    color="#1976d2"
                  />
                )}

                {canAccessRoute('location_tracking') && (
                  <ThemedButton
                    title={i18n.t('locationTracking', { locale: lang })}
                    onPress={() => {
                      console.log('[WelcomeScreen] Location Tracking clicked');
                      router.push('/location_tracking');
                    }}
                    color="#1976d2"
                  />
                )}
              </>
            )}

          {/* SALES SECTION - Only for seller and admin groups */}
          {(canAccessRoute('scan_pending_sale') ||
            canAccessRoute('add_customer') ||
            canAccessRoute('create_sales') ||
            canAccessRoute('print_order')) && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{i18n.t('salesAndOrders', { locale: lang })}</Text>
                </View>

                {canAccessRoute('scan_pending_sale') && (
                  <ThemedButton
                    title={i18n.t('scanQRForPendingSale', { locale: lang })}
                    onPress={() => {
                      console.log('Scan QR for Pending Sale clicked');
                      router.push('/scan_pending_sale');
                    }}
                    color="#4caf50"
                  />
                )}

                {canAccessRoute('create_sales') && (
                  <ThemedButton
                    title={i18n.t('createSalesOrder', { locale: lang })}
                    onPress={() => {
                      console.log('Create Sales Order clicked');
                      router.push('/create_sales');
                    }}
                    color="#4caf50"
                  />
                )}

                {canAccessRoute('add_customer') && (
                  <ThemedButton
                    title={i18n.t('addCustomerData', { locale: lang })}
                    onPress={() => {
                      console.log('Add Customer clicked');
                      router.push('/add_customer');
                    }}
                    color="#4caf50"
                  />
                )}

                {canAccessRoute('print_order') && (
                  <ThemedButton
                    title={i18n.t('printOrder', { locale: lang })}
                    onPress={() => {
                      console.log('Print Order clicked');
                      router.push('/print_order');
                    }}
                    color="#4caf50"
                  />
                )}
              </>
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
