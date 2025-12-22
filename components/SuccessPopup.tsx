import React from 'react';
import { View, Text } from 'react-native';

type SuccessPopupProps = {
  visible: boolean;
  message?: string;
};

export default function SuccessPopup({ visible, message = 'Inserted successfully!' }: SuccessPopupProps) {
  if (!visible) return null;
  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999,
      backgroundColor: 'rgba(0,0,0,0.15)',
      pointerEvents: 'none',
    }}>
      <View style={{
        backgroundColor: '#4caf50',
        padding: 24,
        borderRadius: 16,
        minWidth: 220,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
        alignItems: 'center',
      }}>
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, textAlign: 'center' }}>
          {message}
        </Text>
      </View>
    </View>
  );
}
