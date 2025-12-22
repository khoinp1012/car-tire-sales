import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { usePermissions } from '@/hooks/usePermissions';
import ThemedButton from '@/components/ThemedButton';
import i18n from '@/constants/i18n';
import { useLanguage } from '@/components/LanguageContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  routeName: string;
  fallbackRoute?: '/welcome' | '/index';
  showAlert?: boolean;
}

/**
 * ProtectedRoute component that enforces permission-based access control
 * Wraps route components and handles unauthorized access
 */
export function ProtectedRoute({ 
  children, 
  routeName, 
  fallbackRoute = '/welcome',
  showAlert = true 
}: ProtectedRouteProps) {
  const { permissions, loading, canAccessRoute, getAccessDeniedMessage } = usePermissions();
  const { lang } = useLanguage();
  const router = useRouter();

  // Show loading state while permissions are being fetched
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Check if user has permission to access this route
  const hasAccess = canAccessRoute(routeName);

  if (!hasAccess) {
    const errorMessage = getAccessDeniedMessage(routeName);
    
    // Show alert if enabled
    if (showAlert) {
      Alert.alert(
        i18n.t('accessDenied', { locale: lang }) || 'Access Denied',
        errorMessage,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to fallback route
              if (fallbackRoute && router.canGoBack()) {
                router.back();
              } else {
                router.replace(fallbackRoute as any);
              }
            }
          }
        ]
      );
    }

    // Show access denied screen
    return (
      <View style={styles.container}>
        <View style={styles.deniedContainer}>
          <Text style={styles.deniedTitle}>
            {i18n.t('accessDenied', { locale: lang }) || 'Access Denied'}
          </Text>
          <Text style={styles.deniedMessage}>
            {errorMessage}
          </Text>
          {permissions && (
            <Text style={styles.roleInfo}>
              Current Role: {permissions.userGroups.length > 0 
                ? permissions.userGroups.join(', ') 
                : 'No role assigned'}
            </Text>
          )}
          <View style={styles.buttonContainer}>
            <ThemedButton
              title={i18n.t('goBack', { locale: lang }) || 'Go Back'}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace(fallbackRoute as any);
                }
              }}
              color="#666"
              style={styles.button}
            />
            <ThemedButton
              title={i18n.t('goToWelcome', { locale: lang }) || 'Go to Welcome'}
              onPress={() => router.replace('/welcome')}
              color="#1976d2"
              style={styles.button}
            />
          </View>
        </View>
      </View>
    );
  }

  // User has permission, render the protected content
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  deniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center',
  },
  deniedMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  roleInfo: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  button: {
    minWidth: 120,
  },
});

/**
 * Higher-order component version of ProtectedRoute for easier use
 */
export function withProtectedRoute(routeName: string, fallbackRoute: '/welcome' | '/index' = '/welcome') {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return function ProtectedComponent(props: P) {
      return (
        <ProtectedRoute routeName={routeName} fallbackRoute={fallbackRoute}>
          <Component {...props} />
        </ProtectedRoute>
      );
    };
  };
}
