import React from 'react';
import { StyleSheet, View } from 'react-native';
import InventoryForm from '@/components/forms/InventoryForm';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

/**
 * Insert Inventory Screen
 * 
 * Uses the shared InventoryForm component in 'insert' mode.
 * Protected by 'insert_inventory' permission.
 */
export default function InsertInventoryScreen() {
  return (
    <ProtectedRoute routeName="insert_inventory">
      <View style={styles.container}>
        <InventoryForm mode="insert" />
      </View>
    </ProtectedRoute>
  );
}
