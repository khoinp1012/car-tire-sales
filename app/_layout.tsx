import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { LanguageProvider, useLanguage } from '@/components/LanguageContext';
import { Logger } from '@/utils/logger';
import i18n from '@/constants/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { performCriticalSync, startSync } from '@/utils/syncService';
import { useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

const queryClient = new QueryClient();

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading keeps a back button present.
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const [criticalSyncComplete, setCriticalSyncComplete] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      // Perform TIER 1 CRITICAL sync (Blocking)
      performCriticalSync()
        .then((success) => {
          if (success) {
            Logger.log('[RootLayout] ✓ Critical sync completed, app ready');
            setCriticalSyncComplete(true);
            SplashScreen.hideAsync();

            // Start background Tier 2 & 3 sync
            startSync().catch(err => {
              Logger.error('[RootLayout] Background sync failed:', err);
            });
          } else {
            Logger.error('[RootLayout] ✗ Critical sync failed');
            setSyncError('Failed to load critical data. Please check your connection.');
            SplashScreen.hideAsync();
          }
        })
        .catch(err => {
          Logger.error('[RootLayout] ✗ Critical sync error:', err);
          setSyncError('Failed to initialize app. Please restart.');
          SplashScreen.hideAsync();
        });
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  // Show loading screen while critical sync is in progress
  if (!criticalSyncComplete) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Preparing your workspace...</Text>
        {syncError && (
          <Text style={styles.errorText}>{syncError}</Text>
        )}
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <RootLayoutNav />
      </LanguageProvider>
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { lang } = useLanguage();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="welcome" options={{ title: i18n.t('welcome', { locale: lang }) }} />
        <Stack.Screen name="reprint_inventory" options={{ title: i18n.t('reprintInventoryLabels', { locale: lang }) }} />
        <Stack.Screen name="add_customer" options={{ title: i18n.t('addCustomerData', { locale: lang }) }} />
        <Stack.Screen name="create_sales" options={{ title: i18n.t('createSalesOrder', { locale: lang }) }} />
        <Stack.Screen name="find_inventory" options={{ title: i18n.t('findInventory', { locale: lang }) }} />
        <Stack.Screen name="insert_inventory" options={{ title: i18n.t('insertInventory', { locale: lang }) }} />
        <Stack.Screen name="modify_customer" options={{ title: i18n.t('modifyCustomer', { locale: lang }) }} />
        <Stack.Screen name="modify_inventory" options={{ title: i18n.t('modifyInventory', { locale: lang }) }} />
        <Stack.Screen name="pending_sale" options={{ title: i18n.t('pendingSale', { locale: lang }) }} />
        <Stack.Screen name="print_order" options={{ title: i18n.t('printOrder', { locale: lang }) }} />
        <Stack.Screen
          name="scan_modify_inventory"
          options={{
            title: i18n.t('scanQRToModify', { locale: lang }),
            presentation: 'fullScreenModal',
            headerShown: false
          }}
        />
        <Stack.Screen
          name="scan_pending_sale"
          options={{
            title: i18n.t('scanQRForPendingSale', { locale: lang }),
            presentation: 'fullScreenModal',
            headerShown: false
          }}
        />
        <Stack.Screen name="location_tracking" options={{ title: i18n.t('locationTracking', { locale: lang }) }} />
        <Stack.Screen name="manage_roles" options={{ title: i18n.t('manageRoles', { locale: lang }) }} />
        <Stack.Screen name="manage_users" options={{ title: i18n.t('manageUsers', { locale: lang }) }} />
        <Stack.Screen name="permission_history" options={{ title: i18n.t('permissionHistory', { locale: lang }) }} />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#ff3b30',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
