import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export default function Logo({ size = 'medium', style }: LogoProps) {
  const logoStyles = [
    styles.logo,
    styles[size],
    style
  ];

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/logo.png')} // Place your converted PNG here
        style={logoStyles}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    // Default logo styling
  },
  small: {
    width: 80,
    height: 60,
  },
  medium: {
    width: 120,
    height: 90,
  },
  large: {
    width: 160,
    height: 120,
  },
});
