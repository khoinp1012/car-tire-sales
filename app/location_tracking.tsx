import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Databases, Query } from 'react-native-appwrite';
import appwrite, { DATABASE_ID, INVENTORY_COLLECTION_ID } from '@/constants/appwrite';
import { ENV } from '@/constants/env';
import { QR_PREFIXES } from '@/constants/config';
import i18n from '@/constants/i18n';
import { useLanguage } from '@/components/LanguageContext';
import { usePermissions } from '@/hooks/usePermissions';
import QRScannerWithBox from '@/components/QRScannerWithBox';
import ThemedButton from '@/components/ThemedButton';

interface PendingTire {
    id: string;
    qrCode: string;
    sequence: number;
    timestamp: Date;
}

export default function LocationTrackingScreen() {
    const router = useRouter();
    const { lang } = useLanguage();
    const { canAccess, loading: permissionsLoading } = usePermissions();

    const [pendingTires, setPendingTires] = useState<PendingTire[]>([]);
    const [currentStackId, setCurrentStackId] = useState<string | null>(null);
    const [scannerActive, setScannerActive] = useState(true);
    const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [showConfirmation, setShowConfirmation] = useState(false);

    // Debounce tracking - prevent duplicate scans
    const lastScannedRef = useRef<Map<string, number>>(new Map());
    const DEBOUNCE_MS = 2000; // 2 seconds

    // Check permissions
    useEffect(() => {
        const checkPermissions = async () => {
            if (!permissionsLoading) {
                const hasPermission = await canAccess('inventory', 'update');
                if (!hasPermission) {
                    Alert.alert(
                        i18n.t('accessDenied', { locale: lang }),
                        i18n.t('noPermissionToUpdateLocation', { locale: lang }),
                        [{ text: 'OK', onPress: () => router.back() }]
                    );
                }
            }
        };
        checkPermissions();
    }, [permissionsLoading, canAccess]);

    const isDuplicateScan = (qrCode: string): boolean => {
        const now = Date.now();
        const lastScanTime = lastScannedRef.current.get(qrCode);

        if (lastScanTime && (now - lastScanTime) < DEBOUNCE_MS) {
            return true;
        }

        lastScannedRef.current.set(qrCode, now);
        return false;
    };

    const handleQRScanned = async (qrCode: string) => {
        if (!scannerActive) return;

        // Check for duplicate scan
        if (isDuplicateScan(qrCode)) {
            return; // Silently ignore duplicates
        }

        // Check if it's a tire QR
        if (qrCode.startsWith(QR_PREFIXES.INVENTORY)) {
            const sequence = parseInt(qrCode.replace(QR_PREFIXES.INVENTORY, ''));

            // Check if already in pending list
            if (pendingTires.some(t => t.sequence === sequence)) {
                return; // Silently ignore if already added
            }

            // Add to pending list
            const newTire: PendingTire = {
                id: `${sequence}-${Date.now()}`,
                qrCode,
                sequence,
                timestamp: new Date(),
            };

            setPendingTires(prev => [...prev, newTire]);

            // Play success sound (optional - can add sound here)
            return;
        }

        // Check if it's a stack QR
        if (qrCode.startsWith(QR_PREFIXES.STACK)) {
            const stackId = qrCode.replace(QR_PREFIXES.STACK, '');

            if (pendingTires.length === 0) {
                Alert.alert(
                    i18n.t('error', { locale: lang }),
                    i18n.t('scanTireQRCodes', { locale: lang })
                );
                return;
            }

            // Pause scanner and show confirmation
            setScannerActive(false);
            setCurrentStackId(stackId);
            setShowConfirmation(true);
            return;
        }

        // Invalid QR code
        Alert.alert(
            i18n.t('error', { locale: lang }),
            i18n.t('invalidQRCode', { locale: lang })
        );
    };

    const handleDeleteTire = (tireId: string) => {
        setPendingTires(prev => prev.filter(t => t.id !== tireId));
    };

    const handleClearAll = () => {
        setPendingTires([]);
    };

    const handleCancel = () => {
        setShowConfirmation(false);
        setCurrentStackId(null);
        setScannerActive(true);
    };

    const handleConfirm = async () => {
        if (!currentStackId || pendingTires.length === 0) return;

        setProcessingStatus('processing');

        try {
            const databases = new Databases(appwrite);

            // Verify stack exists
            const stacksResult = await databases.listDocuments(
                DATABASE_ID,
                ENV.COLLECTIONS.STACKS,
                [Query.equal('stackId', currentStackId)]
            );

            if (stacksResult.documents.length === 0) {
                Alert.alert(
                    i18n.t('error', { locale: lang }),
                    i18n.t('stackNotFound', { locale: lang })
                );
                setProcessingStatus('error');
                return;
            }

            const stack = stacksResult.documents[0];
            const stackLocation = stack.location || currentStackId;

            // Update all tires with stack location
            const updatePromises = pendingTires.map(async (tire) => {
                try {
                    // Find the inventory item by sequence
                    const inventoryResult = await databases.listDocuments(
                        DATABASE_ID,
                        INVENTORY_COLLECTION_ID,
                        [Query.equal('sequence', tire.sequence)]
                    );

                    if (inventoryResult.documents.length === 0) {
                        throw new Error(`Tire ${tire.sequence} not found`);
                    }

                    const inventoryDoc = inventoryResult.documents[0];

                    // Update location
                    await databases.updateDocument(
                        DATABASE_ID,
                        INVENTORY_COLLECTION_ID,
                        inventoryDoc.$id,
                        { location: stackLocation }
                    );

                    return { success: true, sequence: tire.sequence };
                } catch (error) {
                    console.error(`Failed to update tire ${tire.sequence}:`, error);
                    return { success: false, sequence: tire.sequence, error };
                }
            });

            const results = await Promise.all(updatePromises);
            const successCount = results.filter(r => r.success).length;
            const failedCount = results.filter(r => !r.success).length;

            if (failedCount === 0) {
                // All succeeded
                Alert.alert(
                    i18n.t('success', { locale: lang }),
                    i18n.t('updatedTires', { locale: lang, count: successCount })
                );
                setProcessingStatus('success');
            } else if (successCount === 0) {
                // All failed
                Alert.alert(
                    i18n.t('error', { locale: lang }),
                    i18n.t('failedToUpdateLocation', { locale: lang })
                );
                setProcessingStatus('error');
            } else {
                // Partial success
                Alert.alert(
                    i18n.t('success', { locale: lang }),
                    i18n.t('partialUpdateSuccess', { locale: lang, success: successCount, failed: failedCount })
                );
                setProcessingStatus('success');
            }

            // Clear pending list and close confirmation
            setPendingTires([]);
            setShowConfirmation(false);
            setCurrentStackId(null);
            setScannerActive(true);
            setProcessingStatus('idle');

        } catch (error) {
            console.error('Failed to update locations:', error);
            Alert.alert(
                i18n.t('error', { locale: lang }),
                i18n.t('failedToUpdateLocation', { locale: lang })
            );
            setProcessingStatus('error');
        }
    };

    if (permissionsLoading) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>{i18n.t('loadingPermissions', { locale: lang })}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>{i18n.t('locationTracking', { locale: lang })}</Text>
                <Text style={styles.counter}>
                    {i18n.t('pendingTires', { locale: lang, count: pendingTires.length })}
                </Text>
            </View>

            {/* Scanner */}
            <View style={styles.scannerContainer}>
                <QRScannerWithBox
                    onScanned={handleQRScanned}
                    onCancel={() => router.back()}
                    showManualInput={false}
                />
            </View>

            {/* Instructions */}
            <View style={styles.instructions}>
                <Text style={styles.instructionText}>{i18n.t('scanTireQRCodes', { locale: lang })}</Text>
                <Text style={styles.instructionText}>{i18n.t('thenScanStackLocation', { locale: lang })}</Text>
            </View>

            {/* Confirmation Modal */}
            <Modal
                visible={showConfirmation}
                transparent={true}
                animationType="slide"
                onRequestClose={handleCancel}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {i18n.t('confirmLocationUpdate', { locale: lang })}
                        </Text>
                        <Text style={styles.stackIdText}>
                            {i18n.t('stackId', { locale: lang, stackId: currentStackId })}
                        </Text>

                        <Text style={styles.tiresListTitle}>
                            {i18n.t('scannedTires', { locale: lang, count: pendingTires.length })}
                        </Text>

                        <ScrollView style={styles.tiresList}>
                            {pendingTires.map((tire) => (
                                <View key={tire.id} style={styles.tireItem}>
                                    <Text style={styles.tireQR}>{tire.qrCode}</Text>
                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={() => handleDeleteTire(tire.id)}
                                    >
                                        <Text style={styles.deleteButtonText}>
                                            {i18n.t('delete', { locale: lang })}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <ThemedButton
                                title={i18n.t('clearAll', { locale: lang })}
                                onPress={handleClearAll}
                                color="#ff9800"
                                style={styles.modalButton}
                            />
                            <ThemedButton
                                title={i18n.t('cancel', { locale: lang })}
                                onPress={handleCancel}
                                color="#757575"
                                style={styles.modalButton}
                            />
                            <ThemedButton
                                title={i18n.t('confirm', { locale: lang })}
                                onPress={handleConfirm}
                                color="#4caf50"
                                style={styles.modalButton}
                                disabled={processingStatus === 'processing' || pendingTires.length === 0}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 16,
        backgroundColor: '#1976d2',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    counter: {
        fontSize: 18,
        color: '#fff',
    },
    scannerContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    instructions: {
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    instructionText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
        marginVertical: 4,
    },
    loadingText: {
        fontSize: 18,
        textAlign: 'center',
        marginTop: 50,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        width: '90%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    stackIdText: {
        fontSize: 18,
        color: '#1976d2',
        marginBottom: 16,
        textAlign: 'center',
        fontWeight: '600',
    },
    tiresListTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    tiresList: {
        maxHeight: 300,
        marginBottom: 16,
    },
    tireItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        marginBottom: 8,
    },
    tireQR: {
        fontSize: 16,
        flex: 1,
    },
    deleteButton: {
        backgroundColor: '#f44336',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    deleteButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    modalButton: {
        flex: 1,
    },
});
