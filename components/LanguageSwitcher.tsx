import React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { useLanguage } from './LanguageContext';

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  return (
    <View style={styles.container}>
      <Button title="English" onPress={() => setLang('en')} disabled={lang === 'en'} />
      <Button title="Tiếng Việt" onPress={() => setLang('vi')} disabled={lang === 'vi'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
});
