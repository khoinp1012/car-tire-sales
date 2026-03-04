import React from 'react';
import { useRouter } from 'expo-router';
import QRScannerWithBox from '@/components/QRScannerWithBox';
import i18n from '@/constants/i18n';
import { useLanguage } from '@/components/LanguageContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Logger } from '@/utils/logger';

function ScanModifyInventoryContent() {
  const { lang } = useLanguage();
  const router = useRouter();

  const handleScanned = React.useCallback((data: string) => {
    Logger.log('[SCAN MODIFY INVENTORY] QR code scanned:', data);
    router.push({
      pathname: '/modify_inventory',
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
      title={i18n.t('scanQRToModify', { locale: lang })}
      subtitle={i18n.t('scanQRInstructions', { locale: lang })}
      showManualInput={true}
    />
  );
}

export default function ScanModifyInventoryScreen() {
  return (
    <ProtectedRoute routeName="scan_modify_inventory">
      <ScanModifyInventoryContent />
    </ProtectedRoute>
  );
}
