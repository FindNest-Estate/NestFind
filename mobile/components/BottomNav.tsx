import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { colors, spacing, borderRadius } from '../constants/theme';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

type TabItem = {
    icon: string;
    iconActive: string;
    label: string;
    route: string;
};

export default function BottomNav() {
    const router = useRouter();
    const pathname = usePathname();
    const [dashboardRoute, setDashboardRoute] = useState('/dashboard');

    useEffect(() => {
        checkUserRole();
    }, []);

    const checkUserRole = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                if (user.role === 'agent') {
                    setDashboardRoute('/agent/dashboard');
                } else {
                    setDashboardRoute('/dashboard');
                }
            }
        } catch (e) {
            console.log('Error checking role', e);
        }
    };

    const tabs: TabItem[] = [
        { icon: 'search-outline', iconActive: 'search', label: 'Explore', route: '/home' },
        { icon: 'key-outline', iconActive: 'key', label: 'Rent', route: '/rent' },
        { icon: 'people-outline', iconActive: 'people', label: 'Agents', route: '/find-agent' },
        { icon: 'grid-outline', iconActive: 'grid', label: 'Dashboard', route: dashboardRoute },
        { icon: 'person-outline', iconActive: 'person', label: 'Profile', route: '/profile' },
    ];

    const getActiveIndex = () => {
        if (pathname === '/home' || pathname === '/') return 0;
        if (pathname === '/rent') return 1;
        if (pathname === '/find-agent' || pathname.startsWith('/agent/profile')) return 2;
        if (pathname === '/dashboard' || pathname === '/agent/dashboard' || pathname === '/my-visits') return 3;
        if (pathname === '/profile') return 4;
        return 0; // Default to Home if unknown
    };

    const activeIndex = getActiveIndex();

    return (
        <View style={styles.container}>
            {/* Background blur effect - Simplified for stability */}
            <View style={styles.blurContainer}>
                <View style={styles.background} />
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                {tabs.map((tab, index) => {
                    const isActive = index === activeIndex;
                    return (
                        <TouchableOpacity
                            key={`${tab.route}-${index}`}
                            style={styles.tab}
                            onPress={() => router.replace(tab.route as any)}
                            activeOpacity={0.7}
                        >
                            {/* Active indicator pill */}
                            {isActive && <View style={styles.activeIndicator} />}

                            <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
                                <Ionicons
                                    name={isActive ? tab.iconActive as any : tab.icon as any}
                                    size={24}
                                    color={isActive ? colors.primary : colors.gray500}
                                />
                            </View>
                            <Text style={[styles.label, isActive && styles.activeLabel]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        backgroundColor: 'transparent',
    },
    blurContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    background: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.98)', // Less transparent for cleaner look
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10,
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        paddingTop: 8,
        paddingHorizontal: spacing.xs,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.xs,
        position: 'relative',
    },
    activeIndicator: {
        position: 'absolute',
        top: -8,
        width: 32,
        height: 3,
        backgroundColor: colors.primary,
        borderRadius: 2,
    },
    iconContainer: {
        width: 48,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: borderRadius.lg,
        marginBottom: 2,
    },
    iconContainerActive: {
        // backgroundColor: 'rgba(255, 56, 92, 0.1)', // Optional pill background
    },
    label: {
        fontSize: 10,
        fontWeight: '500',
        color: colors.gray500,
        marginTop: 2,
    },
    activeLabel: {
        color: colors.primary,
        fontWeight: '600',
    },
});
