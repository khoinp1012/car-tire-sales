import React from 'react';
import { useRouter } from 'expo-router';
import QRScannerWithBox from '@/components/QRScannerWithBox';
import i18n from '@/constants/i18n';
import { useLanguage } from '@/components/LanguageContext';

export default function ScanPendingSaleScreen() {
  const { lang } = useLanguage();
  const router = useRouter();

  const handleScanned = (data: string) => {
    console.log('[SCAN PENDING SALE] QR code scanned:', data);
    router.push({ 
      pathname: '/pending_sale', 
      params: { scanned: data.trim() } 
    });
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <QRScannerWithBox
      onScanned={handleScanned}
      onCancel={handleCancel}
      title={i18n.t('scanQRForPendingSale', { locale: lang })}
      subtitle={i18n.t('scanQRInstructions', { locale: lang })}
      showManualInput={true}
    />
  );
}
