import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CustomerForm from '@/components/forms/CustomerForm';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default function AddCustomerScreen() {
  return (
    <ProtectedRoute routeName="add_customer">
      <View style={styles.container}>
        <CustomerForm mode="insert" />
      </View>
    </ProtectedRoute>
  );
}
