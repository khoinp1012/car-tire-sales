import React from 'react';
import { View, StyleSheet, Button, Text } from 'react-native';
import LanguageSwitcherBox from './LanguageSwitcherBox';
import i18n from '@/constants/i18n';
import { useLanguage } from './LanguageContext';

export default function DefaultBottomBar({ onLogout, groups }: { onLogout?: () => void, groups?: string[] }) {
  const { lang } = useLanguage();

  return (
    <View style={styles.bar}>
      <View style={styles.leftSection}>
        <LanguageSwitcherBox />
      </View>

      <View style={styles.centerSection}>
        <Button title={i18n.t('logout', { locale: lang })} onPress={onLogout} color="#d32f2f" />
      </View>

      {groups && groups.length > 0 && (
        <View style={styles.rightSection}>
          <Text style={styles.groupsText} numberOfLines={1} ellipsizeMode="tail">
            {i18n.t('groups', { locale: lang })}: {groups.join(', ')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 8,
    minHeight: 60,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  groupsText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
  },
});
