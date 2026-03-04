import React from 'react';
import { Text, View } from '@/components/Themed';
import i18n from '@/constants/i18n';
import { useLanguage } from './LanguageContext';
import Logo from './Logo';
import { Logger } from '@/utils/logger';

export default function WelcomeText({ email }: { email?: string }) {
  const { lang } = useLanguage();
  // force re-render on lang change and log
  React.useEffect(() => {
    Logger.log('[Language Change]', lang);
  }, [lang]);
  return (
    <View style={{ alignItems: 'center', marginBottom: 24 }}>
      {/* Add Logo at the top */}
      <Logo size="large" style={{ marginBottom: 16 }} />

      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        {i18n.t('welcome', { locale: lang })}{email ? `, ${email}` : ''}!
      </Text>
    </View>
  );
}
