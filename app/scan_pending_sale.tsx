import React from 'react';
import { useRouter } from 'expo-router';
import QRScannerWithBox from '@/components/QRScannerWithBox';
import i18n from '@/constants/i18n';
import { useLanguage } from '@/components/LanguageContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Logger } from '@/utils/logger';

function ScanPendingSaleContent() {
  const { lang } = useLanguage();
  const router = useRouter();

  const handleScanned = React.useCallback((data: string) => {
    Logger.log('[SCAN PENDING SALE] QR code scanned:', data);
    router.push({
      pathname: '/pending_sale',
      params: { scanned: data.trim() }
    });
  }, [router]);

  const handleCancel = React.useCallback(() => {
    router.back();
  }, [router]);

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

export default function ScanPendingSaleScreen() {
  return (
    <ProtectedRoute routeName="scan_pending_sale">
      <ScanPendingSaleContent />
    </ProtectedRoute>
  );
}
