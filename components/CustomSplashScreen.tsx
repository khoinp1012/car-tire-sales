import React, { useEffect, useState } from 'react';
import { View, Image, Animated, StyleSheet, Dimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Prevent native splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

interface CustomSplashScreenProps {
  onFinish: () => void;
}

/**
 * Simple Splash Screen with Logo
 * Shows company logo with fade-in animation
 */
export default function CustomSplashScreen({ onFinish }: CustomSplashScreenProps) {
  const [logoOpacity] = useState(new Animated.Value(0));

  useEffect(() => {
    const startAnimation = async () => {
      // Hide the native splash screen
      await SplashScreen.hideAsync();

      // Start logo animation
      Animated.sequence([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.delay(2000), // Show for 2 seconds
      ]).start(() => {
        onFinish();
      });
    };

    startAnimation();
  }, [onFinish, logoOpacity]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, { opacity: logoOpacity }]}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.7,
    height: height * 0.3,
    maxWidth: 350,
    maxHeight: 200,
  },
});
