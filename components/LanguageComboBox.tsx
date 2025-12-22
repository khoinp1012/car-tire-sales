import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function LanguageComboBox({ value, onChange }: { value: string; onChange: (lang: string) => void }) {
  const handleToggle = () => {
    const newLang = value === 'vi' ? 'en' : 'vi';
    onChange(newLang);
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleToggle}>
      <Text style={styles.buttonText}>
        {value === 'vi' ? 'VI' : 'EN'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 2,
    borderColor: '#1976d2',
    borderRadius: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: 'bold',
  },
});
