import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import i18n from '@/constants/i18n';
import { useLanguage } from '@/components/LanguageContext';

export default function NotFoundScreen() {
  const { lang } = useLanguage();
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>{i18n.t('screenDoesNotExist', { locale: lang })}</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{i18n.t('goToHome', { locale: lang })}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: '#2e78b7',
  },
});
