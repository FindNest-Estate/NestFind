import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { colors, spacing, borderRadius } from '../constants/theme';
import { BlurView } from 'expo-blur';

type TabItem = {
    icon: string;
    iconActive: string;
    label: string;
    route: string;
};

const tabs: TabItem[] = [
    { icon: '🏠', iconActive: '🏡', label: 'Explore', route: '/home' },
    { icon: '🔍', iconActive: '🔎', label: 'Search', route: '/home' },
    { icon: '❤️', iconActive: '💖', label: 'Saved', route: '/dashboard' },
    { icon: '📊', iconActive: '📈', label: 'Activity', route: '/dashboard' },
    { icon: '👤', iconActive: '🧑', label: 'Profile', route: '/profile' },
];

export default function BottomNav() {
    const router = useRouter();
    const pathname = usePathname();

    const getActiveIndex = () => {
        if (pathname === '/home' || pathname === '/') return 0;
        if (pathname === '/dashboard') return 2;
        if (pathname === '/profile') return 4;
        return 0;
    };

    const activeIndex = getActiveIndex();

    return (
        <View style={styles.container}>
            {/* Background blur effect */}
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
                            onPress={() => router.push(tab.route as any)}
                            activeOpacity={0.7}
                        >
                            {/* Active indicator pill */}
                            {isActive && <View style={styles.activeIndicator} />}

                            <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
                                <Text style={[styles.icon, isActive && styles.activeIcon]}>
                                    {isActive ? tab.iconActive : tab.icon}
                                </Text>
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
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.05)',
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
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
        width: 40,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: borderRadius.lg,
        marginBottom: 2,
    },
    iconContainerActive: {
        backgroundColor: 'rgba(255, 56, 92, 0.1)',
    },
    icon: {
        fontSize: 22,
    },
    activeIcon: {
        transform: [{ scale: 1.1 }],
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
