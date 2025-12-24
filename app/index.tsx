import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Alert, Platform, View, Text, Linking, AppState, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { account, functions } from '@/constants/appwrite';
import { OAuthProvider } from 'react-native-appwrite';
import * as AuthSession from 'expo-auth-session';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import ThemedButton from '@/components/ThemedButton';
import Logo from '@/components/Logo';
import { LanguageProvider, useLanguage } from '@/components/LanguageContext';
import LanguageSwitcherBox from '@/components/LanguageSwitcherBox';
import i18n from '@/constants/i18n';
import { GOOGLE_WEB_CLIENT_ID, APPWRITE_NATIVE_SIGNIN_FUNCTION_URL } from '@/constants/googleConfig';
import { ENV } from '@/constants/env';

function IndexScreenContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pendingAuth, setPendingAuth] = useState(false);
  const [isWeb, setIsWeb] = useState(false);
  const { lang } = useLanguage();
  const authTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsWeb(Platform.OS === 'web');
    checkAuthStatus();

    // Configure Google Sign-In
    if (Platform.OS !== 'web') {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        offlineAccess: true,
      });

      // Note: GOOGLE_ANDROID_CLIENT_ID is used by Google Play Services automatically 
      // based on the package name and SHA-1 fingerprint. We don't need to pass it here,
      // but we keep it in googleConfig.ts for reference.
    }
  }, []);

  useEffect(() => {
    const DEEP_LINK_SCHEME = ENV.APP.DEEP_LINK_SCHEME;

    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl && (initialUrl.includes(DEEP_LINK_SCHEME) || initialUrl.includes('exp://'))) {
        handleAuthCallback(initialUrl);
      }
    };

    const linkingSubscription = Linking.addEventListener('url', (event) => {
      if (event.url.includes(DEEP_LINK_SCHEME) || event.url.includes('exp://')) {
        handleAuthCallback(event.url);
      }
    });

    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && pendingAuth) {
        checkAuthStatus();
      }
    });

    handleInitialURL();

    return () => {
      linkingSubscription.remove();
      appStateSubscription.remove();
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
  }, [pendingAuth]);

  const handleAuthCallback = async (url: string) => {
    try {
      const urlObj = new URL(url);

      // Check for error first
      const error = urlObj.searchParams.get('error') || urlObj.searchParams.get('error_description');
      if (error) {
        Alert.alert(
          i18n.t('authenticationError', { locale: lang }),
          `OAuth error: ${error}`
        );
        setLoading(false);
        setPendingAuth(false);
        return;
      }

      // Check if this is an error callback
      if (url.includes('/error')) {
        Alert.alert(
          i18n.t('authenticationError', { locale: lang }),
          i18n.t('authCancelledOrFailed', { locale: lang })
        );
        setLoading(false);
        setPendingAuth(false);
        return;
      }

      const userId = urlObj.searchParams.get('userId');
      const secret = urlObj.searchParams.get('secret');

      if (userId && secret) {
        await createAppwriteSession(userId, secret);
      } else {
        // For OAuth2Session, session might already be created
        checkAuthStatus();
      }
    } catch (error) {
      Alert.alert(
        i18n.t('authenticationError', { locale: lang }),
        i18n.t('failedToProcessAuthResponse', { locale: lang })
      );
      setLoading(false);
      setPendingAuth(false);
    }
  };

  const createAppwriteSession = async (userId: string, secret: string) => {
    try {
      const session = await account.createSession(userId, secret);
      const user = await account.get();

      router.replace({
        pathname: '/welcome',
        params: {
          email: user.email || 'authenticated-user',
          name: user.name || 'User'
        }
      });

    } catch (error) {
      // If session creation fails, maybe the session already exists
      if ((error as any)?.code === 401 || (error as any)?.message?.includes('session')) {
        await checkAuthStatus();
        return;
      }

      Alert.alert(
        i18n.t('sessionError', { locale: lang }),
        `${i18n.t('failedToCreateSession', { locale: lang })}

Debug: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setLoading(false);
      setPendingAuth(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const user = await account.get();

      if (user?.email || user?.$id) {
        // Clear any pending timeout
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }

        setLoading(false);
        setPendingAuth(false);

        router.replace({
          pathname: '/welcome',
          params: {
            email: user.email || 'anonymous',
            name: user.name || 'User'
          }
        });
        return;
      }
    } catch (e) {
      // No existing session found
    } finally {
      setLoading(false);
      setPendingAuth(false);
    }
  };

  const startGoogleAuth = async () => {
    setLoading(true);
    setPendingAuth(true);

    try {
      // Use AuthSession.makeRedirectUri() to automatically generate the correct URI for the environment
      // This works for both Expo Go (exp:// scheme) and Development Builds (custom scheme)
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: ENV.APP.DEEP_LINK_SCHEME, // Custom scheme for dev builds
        path: 'auth', // Optional path
      });

      const failureUri = AuthSession.makeRedirectUri({
        scheme: ENV.APP.DEEP_LINK_SCHEME,
        path: 'error',
      });

      console.log('OAuth Configuration:', {
        redirectUri,
        failureUri,
        platform: Platform.OS,
        isDev: __DEV__
      });

      // Use OAuth2Token for external browser authentication
      const authUrl = await account.createOAuth2Token(
        OAuthProvider.Google,
        redirectUri,
        failureUri
      );

      let loginUrl: string;
      if (typeof authUrl === 'string') {
        loginUrl = authUrl;
      } else if (authUrl && typeof authUrl === 'object' && 'toString' in authUrl) {
        loginUrl = authUrl.toString();
      } else {
        throw new Error('Failed to get valid login URL from Appwrite');
      }

      const canOpen = await Linking.canOpenURL(loginUrl);
      if (!canOpen) {
        throw new Error('Device cannot open authentication URLs');
      }

      await Linking.openURL(loginUrl);

      // Set up timeout for auth completion as fallback only
      authTimeoutRef.current = setTimeout(() => {
        if (pendingAuth) {
          setLoading(false);
          setPendingAuth(false);
          Alert.alert(
            i18n.t('authenticationError', { locale: lang }),
            i18n.t('authenticationTimeout', { locale: lang })
          );
        }
      }, 30000); // Reduced to 30 seconds

    } catch (error) {
      Alert.alert(
        i18n.t('authenticationError', { locale: lang }),
        `${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease ensure you have a browser installed and try again.`
      );
      setLoading(false);
      setPendingAuth(false);
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }
    }
  };

  const startNativeGoogleSignIn = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        i18n.t('notAvailableOnWeb', { locale: lang }),
        i18n.t('nativeGoogleSignInOnlyMobile', { locale: lang })
      );
      return;
    }

    setLoading(true);
    console.log('--- Native Google Sign-In Started ---');

    try {
      console.log('Checking Play Services...');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      console.log('Calling GoogleSignin.signIn()...');
      const userInfo = await GoogleSignin.signIn();
      console.log('Google Sign-In Success:', JSON.stringify(userInfo, null, 2));

      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        console.error('No ID token found in userInfo.data');
        throw new Error('Failed to get ID token from Google');
      }

      console.log('ID Token retrieved:', idToken.substring(0, 20) + '...');
      console.log('Calling Appwrite function: google-native-signin');

      // Call Appwrite function to verify token and create session
      // We use createExecution which is the standard way to run Appwrite functions from the client
      const execution = await functions.createExecution(
        'google-native-signin',
        JSON.stringify({ idToken }),
        false // async = false to wait for result
      );

      console.log('Execution result:', JSON.stringify(execution, null, 2));

      if (execution.status === 'failed') {
        console.error('Function execution failed:', execution.errors);
        throw new Error(`Function failed: ${execution.errors || 'Unknown execution error'}`);
      }

      let result;
      try {
        result = JSON.parse(execution.responseBody);
      } catch (parseError) {
        console.error('Failed to parse function response body:', parseError);
        throw new Error(`Invalid JSON output from function: ${execution.responseBody.substring(0, 100)}`);
      }

      console.log('Function Output result:', JSON.stringify(result, null, 2));

      if (!result.success) {
        console.error('Appwrite function returned success: false');
        throw new Error(result.error || 'Failed to authenticate with Appwrite');
      }

      console.log('Creating session with userId:', result.userId);

      // Check if session already exists
      try {
        const existingUser = await account.get();
        if (existingUser && existingUser.$id === result.userId) {
          console.log('Session already exists for this user, skipping session creation');

          // Navigate to welcome screen directly
          router.replace({
            pathname: '/welcome',
            params: {
              email: existingUser.email || result.email || 'authenticated-user',
              name: existingUser.name || result.name || 'User'
            }
          });
          return;
        }
      } catch (e) {
        // No existing session, continue with session creation
        console.log('No existing session found, creating new session');
      }

      // Create session with the returned userId and secret
      await account.createSession(result.userId, result.secret);
      console.log('Session created successfully!');

      // Get user info
      console.log('Fetching user details from account.get()...');
      const user = await account.get();
      console.log('User details retrieved:', user.email);

      // Navigate to welcome screen
      router.replace({
        pathname: '/welcome',
        params: {
          email: user.email || result.email || 'authenticated-user',
          name: user.name || result.name || 'User'
        }
      });

    } catch (error: any) {
      console.error('--- Native Google Sign-In Error ---');
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      console.error('Error stack:', error?.stack);

      let errorMessage = 'An unknown error occurred';

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        errorMessage = 'Sign in was cancelled';
      } else if (error.code === statusCodes.IN_PROGRESS) {
        errorMessage = 'Sign in is already in progress';
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play Services not available. Please update Google Play Services.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert(
        i18n.t('authenticationError', { locale: lang }),
        `${errorMessage}\n\nCheck console for details.`
      );
    } finally {
      console.log('--- Native Google Sign-In Finished ---');
      setLoading(false);
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

        {!isWeb && (
          <View style={styles.buttonContainer}>
            <ThemedButton
              title={`🚀 ${i18n.t('nativeGoogleSignIn', { locale: lang })}`}
              onPress={startNativeGoogleSignIn}
              style={styles.authButton}
              color="#34A853"
            />
            <Text style={styles.nativeHint}>
              {i18n.t('nativeSignInFast', { locale: lang })}
            </Text>
          </View>
        )}



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
  warningContainer: {
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    maxWidth: 300,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 8,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 12,
    color: '#E65100',
    lineHeight: 16,
    textAlign: 'center',
  },
  nativeHint: {
    fontSize: 11,
    color: '#34A853',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
