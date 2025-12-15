import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../constants/theme';

interface ScreenHeaderProps {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    rightAction?: {
        icon: keyof typeof Ionicons.glyphMap;
        onPress: () => void;
        color?: string;
    };
    style?: any;
}

export default function ScreenHeader({
    title,
    subtitle,
    showBack = true,
    rightAction,
    style
}: ScreenHeaderProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={[
            styles.container,
            { paddingTop: insets.top + (Platform.OS === 'android' ? 12 : 0) },
            style
        ]}>
            <View style={styles.content}>
                {/* Left: Back Button or Placeholder */}
                <View style={styles.leftContainer}>
                    {showBack && (
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="arrow-back" size={24} color={colors.gray900} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Center: Title */}
                <View style={styles.titleContainer}>
                    <Text style={styles.title} numberOfLines={1}>{title}</Text>
                    {subtitle && (
                        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
                    )}
                </View>

                {/* Right: Action or Placeholder */}
                <View style={styles.rightContainer}>
                    {rightAction ? (
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={rightAction.onPress}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons
                                name={rightAction.icon}
                                size={24}
                                color={rightAction.color || colors.primary}
                            />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 40 }} />
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
        zIndex: 100,
    },
    content: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
    },
    leftContainer: {
        width: 40,
        alignItems: 'flex-start',
    },
    rightContainer: {
        width: 40,
        alignItems: 'flex-end',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    actionButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.gray900,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 12,
        color: colors.gray500,
        marginTop: 2,
        textAlign: 'center',
    },
});
