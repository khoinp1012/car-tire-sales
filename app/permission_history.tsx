/**
 * Permission History Screen
 * 
 * View and rollback permission configurations.
 * Only accessible by admin role.
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { account } from '@/constants/appwrite';
import {
    getPermissionConfigHistory,
    activatePermissionConfig,
} from '@/utils/permissionService';
import { PermissionConfig } from '@/types/permissions';
import { getUserRole } from '@/utils/userRoleService';

export default function PermissionHistoryScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [activating, setActivating] = useState(false);
    const [configHistory, setConfigHistory] = useState<PermissionConfig[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        checkAdminAccess();
    }, []);

    const checkAdminAccess = async () => {
        try {
            const user = await account.get();
            const userRole = await getUserRole(user.$id);

            if (userRole !== 'admin') {
                Alert.alert(
                    'Access Denied',
                    'Only administrators can view permission history.',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
                return;
            }

            setIsAdmin(true);
            await loadHistory();
        } catch (error) {
            Alert.alert('Error', 'Failed to verify admin access');
            router.back();
        }
    };

    const loadHistory = async () => {
        try {
            setLoading(true);
            const history = await getPermissionConfigHistory();
            setConfigHistory(history);
        } catch (error) {
            console.error('Error loading history:', error);
            Alert.alert('Error', 'Failed to load permission history');
        } finally {
            setLoading(false);
        }
    };

    const handleActivateConfig = async (configId: string, version: string) => {
        Alert.alert(
            'Activate Configuration',
            `This will rollback to version ${version} and replace the current active configuration. All users will be affected immediately. Continue?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Activate',
                    style: 'destructive',
                    onPress: async () => {
                        setActivating(true);
                        try {
                            const success = await activatePermissionConfig(configId);
                            if (success) {
                                Alert.alert('Success', `Configuration v${version} activated`);
                                await loadHistory();
                            } else {
                                Alert.alert('Error', 'Failed to activate configuration');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'An error occurred');
                        } finally {
                            setActivating(false);
                        }
                    },
                },
            ]
        );
    };

    const renderConfigCard = (config: PermissionConfig) => {
        const createdDate = new Date(config.$createdAt || '');
        const modifiedDate = config.lastModifiedAt ? new Date(config.lastModifiedAt) : null;

        return (
            <View
                key={config.$id}
                style={[
                    styles.configCard,
                    config.isActive && styles.configCardActive,
                ]}
            >
                <View style={styles.configHeader}>
                    <View style={styles.configHeaderLeft}>
                        <Text style={styles.configVersion}>Version {config.version}</Text>
                        {config.isActive && (
                            <View style={styles.activeBadge}>
                                <Text style={styles.activeBadgeText}>ACTIVE</Text>
                            </View>
                        )}
                    </View>
                    {!config.isActive && (
                        <TouchableOpacity
                            style={styles.activateButton}
                            onPress={() => handleActivateConfig(config.$id!, config.version)}
                            disabled={activating}
                        >
                            <Text style={styles.activateButtonText}>Activate</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.configDetails}>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Created:</Text>
                        <Text style={styles.detailValue}>
                            {createdDate.toLocaleDateString()} {createdDate.toLocaleTimeString()}
                        </Text>
                    </View>

                    {modifiedDate && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Modified:</Text>
                            <Text style={styles.detailValue}>
                                {modifiedDate.toLocaleDateString()} {modifiedDate.toLocaleTimeString()}
                            </Text>
                        </View>
                    )}

                    {config.lastModifiedBy && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Modified By:</Text>
                            <Text style={styles.detailValue}>
                                {config.lastModifiedBy.substring(0, 8)}...
                            </Text>
                        </View>
                    )}

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Roles:</Text>
                        <Text style={styles.detailValue}>
                            {Object.keys(config.roles).length} roles defined
                        </Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Collections:</Text>
                        <Text style={styles.detailValue}>
                            {Object.keys(config.collectionPermissions).length} collections
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading history...</Text>
            </View>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView}>
                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>📜 Configuration History</Text>
                    <Text style={styles.infoText}>
                        All permission configuration changes are tracked here. You can rollback
                        to any previous version if needed.
                    </Text>
                </View>

                {configHistory.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No configuration history found</Text>
                    </View>
                ) : (
                    configHistory.map((config) => renderConfigCard(config))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },

    scrollView: {
        flex: 1,
    },
    infoBox: {
        backgroundColor: '#fff3cd',
        padding: 16,
        margin: 16,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#ffc107',
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#856404',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#856404',
        lineHeight: 20,
    },
    configCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 8,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    configCardActive: {
        borderColor: '#007AFF',
        borderWidth: 2,
        backgroundColor: '#f0f8ff',
    },
    configHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    configHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    configVersion: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    activeBadge: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    activeBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#fff',
    },
    activateButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    activateButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    configDetails: {
        gap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    detailLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 14,
        color: '#333',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
    },
});
