/**
 * Manage Users Screen
 * 
 * Assign roles to users.
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
    TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { account, databases, DATABASE_ID } from '@/constants/appwrite';
import { Query } from 'react-native-appwrite';
import { getUserRole, setUserRole } from '@/utils/userRoleService';
import { getActivePermissionConfig } from '@/utils/permissionService';
import { useQueryClient } from '@tanstack/react-query';
import { PERMISSION_KEYS } from '@/hooks/usePermissions';
import { Logger } from '@/utils/logger';

interface UserWithRole {
    $id: string;
    email: string;
    name: string;
    role?: string;
}

export default function ManageUsersScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<UserWithRole[]>([]);
    const [roles, setRoles] = useState<string[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const loadData = React.useCallback(async () => {
        try {
            setLoading(true);

            // Load available roles
            const config = await getActivePermissionConfig();
            if (config) {
                setRoles(Object.keys(config.roles));
            }

            // Load all user roles from database
            const userRolesResult = await databases.listDocuments(
                DATABASE_ID,
                'user_roles',
                [Query.limit(100)]
            );

            // Create a map of userId -> role
            const userRoleMap: { [key: string]: string } = {};
            userRolesResult.documents.forEach((doc: any) => {
                userRoleMap[doc.userId] = doc.role;
            });

            // Map user roles to display format
            const usersWithRoles: UserWithRole[] = userRolesResult.documents.map((doc: any) => ({
                $id: doc.userId,
                email: doc.email || doc.userId, // Use email from doc, fallback to userId
                name: doc.name || doc.userId.substring(0, 8) + '...', // Use name from doc, fallback to truncated userId
                role: doc.role,
            }));

            setUsers(usersWithRoles);
        } catch (error) {
            Logger.error('Error loading users:', error);
            Alert.alert('Error', 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    const checkAdminAccess = React.useCallback(async () => {
        try {
            const user = await account.get();
            const userRole = await getUserRole(user.$id);

            if (userRole !== 'admin') {
                Alert.alert(
                    'Access Denied',
                    'Only administrators can manage users.',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
                return;
            }

            setIsAdmin(true);
            await loadData();
        } catch (error) {
            Logger.error('Error verifying admin access:', error);
            Alert.alert('Error', 'Failed to verify admin access');
            router.back();
        }
    }, [router, loadData]);

    useEffect(() => {
        checkAdminAccess();
    }, [checkAdminAccess]);

    const handleChangeUserRole = async (userId: string, newRole: string) => {
        Alert.alert(
            'Change User Role',
            `Assign role "${newRole}" to this user?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            await setUserRole(userId, newRole);
                            // Invalidate all permission queries
                            await queryClient.invalidateQueries({ queryKey: PERMISSION_KEYS.all });
                            Alert.alert('Success', 'User role updated successfully');
                            await loadData();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to update user role');
                        }
                    },
                },
            ]
        );
    };

    const renderRoleSelector = (user: UserWithRole) => {
        return (
            <View style={styles.roleSelectorContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {roles.map((role) => (
                        <TouchableOpacity
                            key={role}
                            style={[
                                styles.roleChip,
                                user.role === role && styles.roleChipActive,
                            ]}
                            onPress={() => handleChangeUserRole(user.$id, role)}
                        >
                            <Text
                                style={[
                                    styles.roleChipText,
                                    user.role === role && styles.roleChipTextActive,
                                ]}
                            >
                                {role}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const filteredUsers = users.filter(
        (user) =>
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading users...</Text>
            </View>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search users..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <ScrollView style={styles.scrollView}>
                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        💡 Tip: User names and emails are automatically saved when assigning roles.
                        To add new users, create accounts via Appwrite Console, then assign roles here.
                    </Text>
                </View>

                {filteredUsers.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No users found</Text>
                    </View>
                ) : (
                    filteredUsers.map((user) => (
                        <View key={user.$id} style={styles.userCard}>
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>{user.name}</Text>
                                <Text style={styles.userEmail}>{user.email}</Text>
                                <Text style={styles.currentRole}>
                                    Current Role: {user.role || 'None'}
                                </Text>
                            </View>
                            {renderRoleSelector(user)}
                        </View>
                    ))
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

    searchContainer: {
        backgroundColor: '#fff',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    searchInput: {
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        fontSize: 16,
    },
    scrollView: {
        flex: 1,
    },
    infoBox: {
        backgroundColor: '#e3f2fd',
        padding: 16,
        margin: 16,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#007AFF',
    },
    infoText: {
        fontSize: 14,
        color: '#1565c0',
        lineHeight: 20,
    },
    userCard: {
        backgroundColor: '#fff',
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    userInfo: {
        marginBottom: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    currentRole: {
        fontSize: 13,
        color: '#007AFF',
        fontWeight: '500',
    },
    roleSelectorContainer: {
        marginTop: 8,
    },
    roleChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    roleChipActive: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    roleChipText: {
        fontSize: 14,
        color: '#666',
    },
    roleChipTextActive: {
        color: '#fff',
        fontWeight: '600',
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
