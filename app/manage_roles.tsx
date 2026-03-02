/**
 * Manage Roles Screen
 * 
 * Edit role permissions and hierarchy.
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
    getActivePermissionConfig,
    savePermissionConfig,
} from '@/utils/permissionService';
import { PermissionConfig, PermissionAction } from '@/types/permissions';
import { getUserRole } from '@/utils/userRoleService';
import i18n from '@/constants/i18n';
import { getRoleDisplayName } from '@/utils/roleTranslation';
import { useQueryClient } from '@tanstack/react-query';
import { PERMISSION_KEYS } from '@/hooks/usePermissions';

export default function ManageRolesScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<PermissionConfig | null>(null);
    const [selectedRole, setSelectedRole] = useState<string>('admin');
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
                    i18n.t('accessDeniedAdmin'),
                    i18n.t('onlyAdministratorsCanManageRoles'),
                    [{ text: 'OK', onPress: () => router.back() }]
                );
                return;
            }

            setIsAdmin(true);
            await loadPermissionConfig();
        } catch (error) {
            Alert.alert(i18n.t('error'), i18n.t('failedToVerifyAdminAccess'));
            router.back();
        }
    };

    const loadPermissionConfig = async () => {
        try {
            setLoading(true);
            const activeConfig = await getActivePermissionConfig();

            if (!activeConfig) {
                Alert.alert(
                    i18n.t('noConfigurationFound'),
                    i18n.t('noActivePermissionConfig'),
                    [{ text: 'OK', onPress: () => router.back() }]
                );
                return;
            }

            setConfig(activeConfig);
        } catch (error) {
            console.error('Error loading permission config:', error);
            Alert.alert(i18n.t('error'), i18n.t('failedToLoadPermissionConfig'));
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        if (!config) return;

        Alert.alert(
            i18n.t('saveConfiguration'),
            i18n.t('updateRolePermissionsConfirm'),
            [
                { text: i18n.t('cancel'), style: 'cancel' },
                {
                    text: i18n.t('submit'),
                    style: 'default',
                    onPress: async () => {
                        setSaving(true);
                        try {
                            const success = await savePermissionConfig(config);
                            if (success) {
                                Alert.alert(i18n.t('success'), i18n.t('rolePermissionsSaved'));
                                // Invalidate all permission queries
                                await queryClient.invalidateQueries({ queryKey: PERMISSION_KEYS.all });
                                await loadPermissionConfig();
                            } else {
                                Alert.alert(i18n.t('error'), i18n.t('failedToSaveRolePermissions'));
                            }
                        } catch (error) {
                            Alert.alert(i18n.t('error'), i18n.t('failedToSaveRolePermissions'));
                        } finally {
                            setSaving(false);
                        }
                    },
                },
            ]
        );
    };

    const toggleCollectionPermission = (
        roleId: string,
        collection: string,
        action: PermissionAction
    ) => {
        if (!config) return;

        const updatedConfig = { ...config };
        const role = updatedConfig.roles[roleId];

        if (!role.permissions.collections[collection]) {
            role.permissions.collections[collection] = [];
        }

        const permissions = role.permissions.collections[collection];
        const index = permissions.indexOf(action);

        if (index > -1) {
            permissions.splice(index, 1);
        } else {
            permissions.push(action);
        }

        // Update collection permissions mapping
        if (!updatedConfig.collectionPermissions[collection]) {
            updatedConfig.collectionPermissions[collection] = {};
        }

        if (!updatedConfig.collectionPermissions[collection][action]) {
            updatedConfig.collectionPermissions[collection][action] = [];
        }

        const roleList = updatedConfig.collectionPermissions[collection][action]!;
        const roleIndex = roleList.indexOf(roleId);

        if (index > -1) {
            // Permission was removed
            if (roleIndex > -1) {
                roleList.splice(roleIndex, 1);
            }
        } else {
            // Permission was added
            if (roleIndex === -1) {
                roleList.push(roleId);
            }
        }

        setConfig(updatedConfig);
    };

    const hasPermission = (roleId: string, collection: string, action: PermissionAction): boolean => {
        if (!config) return false;
        const role = config.roles[roleId];
        return role?.permissions.collections[collection]?.includes(action) || false;
    };

    const renderRoleSelector = () => {
        if (!config) return null;

        return (
            <View style={styles.selectorContainer}>
                <Text style={styles.selectorLabel}>{i18n.t('selectRole')}:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {Object.keys(config.roles).map((roleId) => (
                        <TouchableOpacity
                            key={roleId}
                            style={[
                                styles.roleButton,
                                selectedRole === roleId && styles.roleButtonActive,
                            ]}
                            onPress={() => setSelectedRole(roleId)}
                        >
                            <Text
                                style={[
                                    styles.roleButtonText,
                                    selectedRole === roleId && styles.roleButtonTextActive,
                                ]}
                            >
                                {getRoleDisplayName(roleId)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const renderRoleHierarchy = () => {
        if (!config || !selectedRole) return null;

        const role = config.roles[selectedRole];

        return (
            <View style={styles.hierarchyContainer}>
                <Text style={styles.sectionTitle}>{i18n.t('roleInformation')}</Text>
                <View style={styles.hierarchyRow}>
                    <Text style={styles.hierarchyLabel}>{i18n.t('hierarchyLevel')}:</Text>
                    <Text style={styles.hierarchyValue}>{role.hierarchy}</Text>
                </View>
                <View style={styles.hierarchyRow}>
                    <Text style={styles.hierarchyLabel}>{i18n.t('inheritsFrom')}:</Text>
                    <Text style={styles.hierarchyValue}>
                        {role.inheritsFrom.length > 0
                            ? role.inheritsFrom.map(r => getRoleDisplayName(r)).join(', ')
                            : i18n.t('none')}
                    </Text>
                </View>
            </View>
        );
    };

    const renderCollectionPermissions = () => {
        if (!config || !selectedRole) return null;

        const collections = Object.keys(config.collectionPermissions);
        const actions: PermissionAction[] = ['read', 'create', 'update', 'delete'];

        return (
            <View style={styles.permissionsContainer}>
                <Text style={styles.sectionTitle}>{i18n.t('collectionPermissions')}</Text>
                <Text style={styles.sectionSubtitle}>
                    {i18n.t('role')}: {getRoleDisplayName(selectedRole)}
                </Text>

                {collections.map((collection) => (
                    <View key={collection} style={styles.collectionRow}>
                        <Text style={styles.collectionName}>{collection}</Text>
                        <View style={styles.actionsContainer}>
                            {actions.map((action) => (
                                <TouchableOpacity
                                    key={action}
                                    style={[
                                        styles.actionButton,
                                        hasPermission(selectedRole, collection, action) &&
                                        styles.actionButtonActive,
                                    ]}
                                    onPress={() =>
                                        toggleCollectionPermission(selectedRole, collection, action)
                                    }
                                >
                                    <Text
                                        style={[
                                            styles.actionButtonText,
                                            hasPermission(selectedRole, collection, action) &&
                                            styles.actionButtonTextActive,
                                        ]}
                                    >
                                        {action.charAt(0).toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

                <View style={styles.legendContainer}>
                    <Text style={styles.legendTitle}>{i18n.t('legend')}:</Text>
                    <Text style={styles.legendText}>{i18n.t('legendPermissions')}</Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>{i18n.t('loadingRoles')}</Text>
            </View>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView}>
                {config && (
                    <>
                        <View style={styles.configInfo}>
                            <Text style={styles.configVersion}>
                                {i18n.t('configurationVersion')}: {config.version}
                            </Text>
                        </View>

                        {renderRoleSelector()}
                        {renderRoleHierarchy()}
                        {renderCollectionPermissions()}
                    </>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSaveConfig}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>{i18n.t('saveChanges')}</Text>
                    )}
                </TouchableOpacity>
            </View>
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
    configInfo: {
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 8,
    },
    configVersion: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    selectorContainer: {
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 8,
    },
    selectorLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    roleButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        marginRight: 8,
    },
    roleButtonActive: {
        backgroundColor: '#007AFF',
    },
    roleButtonText: {
        fontSize: 14,
        color: '#666',
    },
    roleButtonTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    hierarchyContainer: {
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 8,
    },
    hierarchyRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    hierarchyLabel: {
        fontSize: 14,
        color: '#666',
        width: 140,
    },
    hierarchyValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
        flex: 1,
    },
    permissionsContainer: {
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    collectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    collectionName: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
        flex: 1,
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonActive: {
        backgroundColor: '#34C759',
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    actionButtonTextActive: {
        color: '#fff',
    },
    legendContainer: {
        marginTop: 16,
        padding: 12,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
    },
    legendTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    legendText: {
        fontSize: 12,
        color: '#666',
    },
    footer: {
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    saveButton: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: '#ccc',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
});
