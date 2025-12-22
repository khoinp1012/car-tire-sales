import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';

type ThemedButtonProps = {
  title: string;
  onPress: () => void;
  color?: string;
  style?: ViewStyle;
  disabled?: boolean;
};

export default function ThemedButton({ title, onPress, color = '#1976d2', style, disabled = false }: ThemedButtonProps) {
  const buttonColor = disabled ? '#cccccc' : color;
  
  return (
    <TouchableOpacity 
      style={[styles.button, { backgroundColor: buttonColor }, style]} 
      onPress={disabled ? undefined : onPress} 
      activeOpacity={disabled ? 1 : 0.8}
      disabled={disabled}
    >
      <Text style={[styles.text, { color: disabled ? '#666666' : '#fff' }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
