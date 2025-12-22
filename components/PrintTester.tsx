import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ThermalPrinter from './ThermalPrinter';

/**
 * Print Tester Component
 * Uses the consolidated ThermalPrinter component
 */
export default function PrintTester() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Printer Testing</Text>
      <ThermalPrinter 
        showTestControls={true}
        style={styles.thermalPrinter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  thermalPrinter: {
    flex: 1,
  },
});