import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNav from '../components/BottomNav';
import { colors, spacing, borderRadius, typography } from '../constants/theme';

export default function Profile() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                setUser(JSON.parse(userData));
            }
        } catch (e) {
            console.error('Error loading user', e);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.removeItem('auth_token');
                        await AsyncStorage.removeItem('user');
                        router.replace('/(auth)/login');
                    }
                },
            ]
        );
    };

    const menuItems = [
        { icon: 'clipboard-outline', label: 'My Visits', route: '/my-visits' },
        { icon: 'heart-outline', label: 'Saved Properties', route: '/saved' },
        { icon: 'settings-outline', label: 'Settings', route: '/settings' },
        { icon: 'help-circle-outline', label: 'Help & Support', route: '/help' },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backButton}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Profile</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content}>
                {/* User Info */}
                <View style={styles.userSection}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {user?.first_name?.[0]?.toUpperCase() || '?'}
                        </Text>
                    </View>
                    <Text style={styles.userName}>
                        {user?.first_name} {user?.last_name}
                    </Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>
                            {user?.role?.toUpperCase() || 'BUYER'}
                        </Text>
                    </View>
                </View>

                {/* Menu Items */}
                <View style={styles.menuSection}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.menuItem}
                            onPress={() => router.push(item.route as any)}
                        >
                            <Ionicons name={item.icon as any} size={24} color={colors.gray700} style={{ marginRight: spacing.md }} />
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Logout Button */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                >
                    <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>

                {/* App Version */}
                <Text style={styles.version}>NestFind v1.0.0</Text>
            </ScrollView>
            <BottomNav />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray200,
    },
    backButton: {
        ...typography.body,
        color: colors.primary,
    },
    title: {
        ...typography.h3,
        color: colors.gray900,
    },
    placeholder: {
        width: 50,
    },
    content: {
        flex: 1,
    },
    userSection: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray200,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.white,
    },
    userName: {
        ...typography.h2,
        color: colors.gray900,
        marginBottom: spacing.xs,
    },
    userEmail: {
        ...typography.body,
        color: colors.gray500,
        marginBottom: spacing.sm,
    },
    roleBadge: {
        backgroundColor: colors.gray100,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    roleText: {
        ...typography.caption,
        color: colors.gray700,
        fontWeight: '600',
    },
    menuSection: {
        paddingVertical: spacing.md,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.white,
    },
    menuIcon: {
        // fontSize: 24, (removed)
        marginRight: spacing.md,
    },
    menuLabel: {
        ...typography.body,
        color: colors.gray900,
        flex: 1,
    },
    menuArrow: {
        // ...typography.body, (removed)
        color: colors.gray400,
    },
    logoutButton: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.lg,
        backgroundColor: colors.white,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.error,
        alignItems: 'center',
    },
    logoutButtonText: {
        color: colors.error,
        fontWeight: '600',
        fontSize: 16,
    },
    version: {
        ...typography.caption,
        color: colors.gray400,
        textAlign: 'center',
        marginVertical: spacing.xl,
    },
});
