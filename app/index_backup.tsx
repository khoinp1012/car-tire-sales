import React, { useState, useEffect } from 'react';
import { StyleSheet, Alert, Platform, View, Text, Linking, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { account } from '@/constants/appwrite';
import { OAuthProvider } from 'react-native-appwrite';
import ThemedButton from '@/components/ThemedButton';
import Logo from '@/components/Logo';
import { LanguageProvider, useLanguage } from '@/components/LanguageContext';
import LanguageSwitcherBox from '@/components/LanguageSwitcherBox';
import i18n from '@/constants/i18n';

function IndexScreenContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pendingAuth, setPendingAuth] = useState(false);
  const [isWeb, setIsWeb] = useState(false);
  const { lang } = useLanguage();

  useEffect(() => {
    setIsWeb(Platform.OS === 'web');
    checkAuthStatus();
  }, []);

  useEffect(() => {
    // Handle incoming deep links
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl && initialUrl.includes('appwrite-callback')) {
        console.log('[Index] Handling initial URL:', initialUrl);
        handleAuthCallback(initialUrl);
      }
    };

    // Handle deep links while app is running
    const linkingSubscription = Linking.addEventListener('url', (event) => {
      console.log('[Index] Received URL event:', event.url);
      if (event.url.includes('appwrite-callback')) {
        handleAuthCallback(event.url);
      }
    });

    // Handle app state changes (when user returns from browser)
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && pendingAuth) {
        console.log('[Index] App became active, checking for auth result...');
        setTimeout(checkAuthStatus, 1000);
      }
    });

    handleInitialURL();

    return () => {
      linkingSubscription.remove();
      appStateSubscription.remove();
    };
  }, [pendingAuth]);

  const handleAuthCallback = async (url: string) => {
    console.log('[Index] Processing auth callback:', url);
    
    try {
      const urlObj = new URL(url);
      const userId = urlObj.searchParams.get('userId');
      const secret = urlObj.searchParams.get('secret');
      
      if (userId && secret) {
        console.log('[Index] Found auth credentials');
        await createAppwriteSession(userId, secret);
      } else {
        console.log('[Index] No credentials in callback URL, checking if session exists...');
        await checkAuthStatus();
      }
    } catch (error) {
      console.error('[Index] Error processing callback:', error);
      Alert.alert(i18n.t('authenticationError', { locale: lang }), 'Failed to process authentication response');
      setLoading(false);
      setPendingAuth(false);
    }
  };

  const createAppwriteSession = async (userId: string, secret: string) => {
    try {
      console.log('[Index] Creating Appwrite session...');
      await account.createSession(userId, secret);
      
      const user = await account.get();
      console.log('[Index] Session created successfully for:', user.email);
      
      Alert.alert(
        i18n.t('loginSuccessful', { locale: lang }), 
        `${i18n.t('welcome', { locale: lang })} ${user.name || user.email}!`, 
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('[Index] Navigating to welcome...');
              router.replace({ 
                pathname: '/welcome', 
                params: { 
                  email: user.email,
                  name: user.name || ''
                } 
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('[Index] Session creation failed:', error);
      Alert.alert(
        i18n.t('sessionError', { locale: lang }), 
        i18n.t('failedToCreateSession', { locale: lang })
      );
    } finally {
      setLoading(false);
      setPendingAuth(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const user = await account.get();
      if (user?.email) {
        console.log('[Index] User already authenticated, redirecting to welcome');
        setTimeout(() => {
          router.replace({ 
            pathname: '/welcome', 
            params: { 
              email: user.email,
              name: user.name || ''
            } 
          });
        }, 100);
        return;
      }
    } catch (e) {
      console.log('[Index] No existing session found');
    } finally {
      setLoading(false);
      setPendingAuth(false);
    }
  };

  const startGoogleAuth = async () => {
    setLoading(true);
    setPendingAuth(true);
    
    try {
      console.log('[Index] Starting Google OAuth flow...');
      
      const redirectUri = 'appwrite-callback-687b358f00367ce271e0://';
      console.log('[Index] Using redirect URI:', redirectUri);

      // Create OAuth URL
      const authUrl = await account.createOAuth2Token(
        OAuthProvider.Google,
        redirectUri,
        redirectUri
      );

      let loginUrl: string;
      if (typeof authUrl === 'string') {
        loginUrl = authUrl;
      } else if (authUrl && typeof authUrl === 'object' && 'toString' in authUrl) {
        loginUrl = authUrl.toString();
      } else {
        throw new Error('Failed to get valid login URL');
      }

      console.log('[Index] Opening authentication URL...');
      
      // Open in external browser (works better for dev builds)
      const canOpen = await Linking.canOpenURL(loginUrl);
      if (canOpen) {
        await Linking.openURL(loginUrl);
        
        // Show instructions to user
        Alert.alert(
          i18n.t('authenticationStarted', { locale: lang }),
          i18n.t('completeBrowserLogin', { locale: lang }),
          [
            {
              text: i18n.t('cancel', { locale: lang }),
              onPress: () => {
                setLoading(false);
                setPendingAuth(false);
              },
              style: 'cancel'
            },
            {
              text: 'OK',
              onPress: () => {}
            }
          ]
        );
      } else {
        throw new Error('Cannot open authentication URL');
      }

    } catch (error) {
      console.error('[Index] Authentication error:', error);
      Alert.alert(
        i18n.t('authenticationError', { locale: lang }), 
        error instanceof Error ? error.message : 'Unknown error'
      );
      setLoading(false);
      setPendingAuth(false);
    }
  };

  if (loading && !pendingAuth) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.loadingText}>{i18n.t('loading', { locale: lang })}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Logo size="large" style={styles.logo} />
        
        <Text style={styles.title}>{i18n.t('appTitle', { locale: lang })}</Text>
        <Text style={styles.subtitle}>
          {isWeb ? i18n.t('webTestingMode', { locale: lang }) : i18n.t('mobileAppMode', { locale: lang })}
        </Text>
        <Text style={styles.platformInfo}>
          {i18n.t('platform', { locale: lang })}: {Platform.OS} | {isWeb ? i18n.t('chromebrowser', { locale: lang }) : i18n.t('nativeApp', { locale: lang })}
        </Text>
        
        {pendingAuth && (
          <View style={styles.pendingContainer}>
            <Text style={styles.pendingText}>{i18n.t('authenticationInProgress', { locale: lang })}</Text>
            <Text style={styles.pendingSubtext}>
              {i18n.t('completeBrowserLogin', { locale: lang })}
            </Text>
          </View>
        )}
        
        <View style={styles.buttonContainer}>
          <ThemedButton
            title={isWeb ? i18n.t('webLogin', { locale: lang }) : i18n.t('mobileLogin', { locale: lang })}
            onPress={startGoogleAuth}
            style={styles.authButton}
            color="#4285F4"
          />
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>{i18n.t('quickTestingInfo', { locale: lang })}</Text>
          <Text style={styles.infoText}>
            {isWeb 
              ? i18n.t('webLoginOptimized', { locale: lang })
              : i18n.t('mobileLoginInfo', { locale: lang })
            }
          </Text>
        </View>
        
        <View style={styles.languageSwitcher}>
          <LanguageSwitcherBox />
        </View>
      </View>
    </View>
  );
}

export default function IndexScreen() {
  return (
    <LanguageProvider>
      <IndexScreenContent />
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logo: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
    color: '#666',
  },
  platformInfo: {
    fontSize: 14,
    marginBottom: 30,
    textAlign: 'center',
    color: '#888',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  pendingContainer: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  pendingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    textAlign: 'center',
  },
  pendingSubtext: {
    fontSize: 12,
    color: '#1976D2',
    textAlign: 'center',
    marginTop: 5,
  },
  buttonContainer: {
    width: '100%',
    marginVertical: 8,
    maxWidth: 300,
  },
  authButton: {
    paddingVertical: 12,
  },
  infoContainer: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    marginTop: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    maxWidth: 300,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#1976D2',
    lineHeight: 16,
  },
  languageSwitcher: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
});
