import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import i18n from '@/constants/i18n';
import { useLanguage } from '@/components/LanguageContext';
import SuccessPopup from '@/components/SuccessPopup';
import ThemedButton from '@/components/ThemedButton';
import appwrite, { DATABASE_ID, CUSTOMERS_COLLECTION_ID } from '@/constants/appwrite';
import { Databases, ID, Permission, Role, Query } from 'react-native-appwrite';
import { useRouter } from 'expo-router';

// mode: 'insert' | 'modify'
// If mode is 'modify', must provide customerData and documentId
export default function CustomerForm({ mode = 'insert', customerData, documentId, onSuccess }: any) {
  const router = useRouter();
  const { lang } = useLanguage();

  // Form state based on customer schema
  const [name, setName] = useState(mode === 'modify' && customerData?.name ? customerData.name : '');
  const [phoneNumber, setPhoneNumber] = useState(mode === 'modify' && customerData?.phone_number ? customerData.phone_number : '');
  const [address, setAddress] = useState(mode === 'modify' && customerData?.address ? customerData.address : '');
  const [discountPercent, setDiscountPercent] = useState(mode === 'modify' && customerData?.discount_percent ? String(customerData.discount_percent) : '0');
  const [reference, setReference] = useState(mode === 'modify' && customerData?.reference ? String(customerData.reference) : '');
  const [fullDescription, setFullDescription] = useState(mode === 'modify' && customerData?.full_description ? customerData.full_description : '');

  // UI state
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Error', i18n.t('customerNameRequired', { locale: lang }));
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Error', i18n.t('phoneNumberRequired', { locale: lang }));
      return;
    }

    const discountValue = parseFloat(discountPercent) || 0;
    if (discountValue < 0 || discountValue > 100) {
      Alert.alert('Error', i18n.t('discountPercentRange', { locale: lang }));
      return;
    }

    setLoading(true);
    try {
      const databases = new Databases(appwrite);

      // Generate full description
      const description = `${name} - ${phoneNumber}${address ? ` - ${address}` : ''}`;

      const customerPayload: any = {
        name: name.trim(),
        phone_number: phoneNumber.trim(),
        address: address.trim(),
        discount_percent: discountValue,
        full_description: description,
      };

      // Note: reference field will be null by default for new customers
      // Only modify mode might have reference if customerData contains it

      let result;
      if (mode === 'modify' && documentId) {
        // Update existing customer
        result = await databases.updateDocument(DATABASE_ID, CUSTOMERS_COLLECTION_ID, documentId, customerPayload);
        console.log('Customer updated successfully:', result);
      } else {
        // Insert new customer
        result = await databases.createDocument(
          DATABASE_ID,
          CUSTOMERS_COLLECTION_ID,
          ID.unique(),
          customerPayload,
          [
            Permission.read(Role.any()),
            Permission.update(Role.any()),
            Permission.delete(Role.any()),
          ]
        );
        console.log('Customer inserted successfully:', result);
      }

      setShowSuccess(true);
      if (onSuccess) {
        onSuccess(result);
      }

      // Reset form for insert mode
      if (mode === 'insert') {
        setTimeout(() => {
          setName('');
          setPhoneNumber('');
          setAddress('');
          setDiscountPercent('0');
          setReference('');
          setFullDescription('');
          setShowSuccess(false);
        }, 2000);
      } else {
        // For modify mode, redirect back after success
        setTimeout(() => {
          router.back();
        }, 2000);
      }

    } catch (error) {
      console.error('Error saving customer:', error);
      Alert.alert(i18n.t('error', { locale: lang }), i18n.t('failedToModifyCustomer', { locale: lang, mode }));
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: '#fff',
    },
    scrollContainer: {
      flexGrow: 1,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 24,
      textAlign: 'center',
      color: '#333',
    },
    label: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 8,
      color: '#333',
    },
    input: {
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      fontSize: 16,
      backgroundColor: '#f9f9f9',
    },
    multilineInput: {
      height: 80,
      textAlignVertical: 'top',
    },
    buttonContainer: {
      marginTop: 24,
      marginBottom: 32,
    },
    infoText: {
      fontSize: 14,
      color: '#666',
      fontStyle: 'italic',
      marginBottom: 8,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>
          {mode === 'modify' ? i18n.t('modifyCustomer', { locale: lang }) : i18n.t('addNewCustomer', { locale: lang })}
        </Text>

        {mode === 'modify' && customerData && (
          <View style={{ backgroundColor: '#e3f2fd', padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <Text style={styles.infoText}>
              {i18n.t('modifyingCustomer', { locale: lang })}: {customerData.name} (Ref: {customerData.reference})
            </Text>
          </View>
        )}

        <Text style={styles.label}>{i18n.t('customerName', { locale: lang })} *</Text>
        <TextInput
          style={styles.input}
          placeholder={i18n.t('enterCustomerName', { locale: lang })}
          autoCorrect={false}
          autoCapitalize="words"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>{i18n.t('phoneNumber', { locale: lang })} *</Text>
        <TextInput
          style={styles.input}
          placeholder={i18n.t('enterPhoneNumber', { locale: lang })}
          autoCorrect={false}
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />

        <Text style={styles.label}>{i18n.t('address', { locale: lang })}</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder={i18n.t('enterAddress', { locale: lang })}
          autoCorrect={false}
          value={address}
          onChangeText={setAddress}
          multiline={true}
        />

        {/* Discount field hidden as requested
        <Text style={styles.label}>{i18n.t('discountPercent', { locale: lang })}</Text>
        <TextInput
          style={styles.input}
          placeholder={i18n.t('enterDiscountPercentage', { locale: lang })}
          value={discountPercent}
          onChangeText={setDiscountPercent}
          keyboardType="numeric"
        />
        */}

        {mode === 'modify' && (
          <>
            <Text style={styles.label}>{i18n.t('referenceNumber', { locale: lang })}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#f0f0f0' }]}
              value={reference}
              editable={false}
              placeholder={i18n.t('autoGenerated', { locale: lang })}
            />
          </>
        )}

        <View style={styles.buttonContainer}>
          <ThemedButton
            title={loading ? i18n.t('saving', { locale: lang }) : (mode === 'modify' ? i18n.t('updateCustomer', { locale: lang }) : i18n.t('addCustomer', { locale: lang }))}
            onPress={handleSubmit}
            color="#1976d2"
          />
        </View>
      </ScrollView>

      <SuccessPopup
        visible={showSuccess}
        message={mode === 'modify' ? i18n.t('customerUpdated', { locale: lang }) : i18n.t('customerAdded', { locale: lang })}
      />

      {loading && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={{ color: 'white', marginTop: 8 }}>
            {mode === 'modify' ? i18n.t('updating', { locale: lang }) : i18n.t('adding', { locale: lang })}
          </Text>
        </View>
      )}
    </View>
  );
}
