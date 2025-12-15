import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';

// --- Types ---
interface StatCardProps {
    label: string;
    value: number | string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    onPress?: () => void;
}

interface SectionHeaderProps {
    title: string;
    action?: string;
    onAction?: () => void;
}

interface QuickActionProps {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
    onPress?: () => void;
}

interface VisitCardProps {
    date: Date;
    title: string;
    location: string;
    status: string;
    timeSlot?: string;
    otp?: string;
    onPress: () => void;
}

// --- Components ---

export const StatCard = ({ label, value, icon, color, onPress }: StatCardProps) => (
    <TouchableOpacity
        style={styles.statCard}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
    >
        <View style={styles.statHeader}>
            <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
        </View>
        <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
);

export const SectionHeader = ({ title, action, onAction }: SectionHeaderProps) => (
    <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action && (
            <TouchableOpacity onPress={onAction}>
                <Text style={styles.sectionAction}>{action}</Text>
            </TouchableOpacity>
        )}
    </View>
);

export const QuickAction = ({ label, icon, color, bg, onPress }: QuickActionProps) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
        <View style={[styles.quickActionIcon, { backgroundColor: bg }]}>
            <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
);

export const VisitCard = ({ date, title, location, status, timeSlot, otp, onPress }: VisitCardProps) => (
    <TouchableOpacity style={styles.visitCard} onPress={onPress} activeOpacity={0.9}>
        <View style={styles.visitDateBox}>
            <Text style={styles.visitDay}>{date.toLocaleString('en-US', { weekday: 'short' }).toUpperCase()}</Text>
            <Text style={styles.visitDateNum}>{date.getDate()}</Text>
        </View>

        <View style={styles.visitContent}>
            <Text style={styles.visitTitle} numberOfLines={1}>{title}</Text>
            <View style={styles.visitRow}>
                <Ionicons name="location-outline" size={14} color={colors.gray500} />
                <Text style={styles.visitSubText} numberOfLines={1}>{location}</Text>
            </View>
            <View style={styles.visitRow}>
                <Ionicons name="time-outline" size={14} color={colors.gray500} />
                <Text style={styles.visitSubText}>{timeSlot || 'Time TBD'}</Text>
            </View>
        </View>

        {status === 'CONFIRMED' || status === 'APPROVED' ? (
            <View style={styles.visitStatusConfirmed}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            </View>
        ) : (
            <View style={[styles.visitStatusBadge, { backgroundColor: status === 'PENDING' ? '#FEF3C7' : '#EFF6FF' }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: status === 'PENDING' ? '#D97706' : '#1D4ED8' }}>
                    {status === 'pending' ? 'WAIT' : status}
                </Text>
            </View>
        )}
    </TouchableOpacity>
);

// --- Styles ---
const styles = StyleSheet.create({
    // Stat Card
    statCard: {
        flex: 1,
        backgroundColor: colors.white,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.gray100,
        // Minimal shadow for clean look
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 2,
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    iconContainer: {
        padding: 6,
        borderRadius: 8,
    },
    statValue: {
        ...typography.h3,
        fontWeight: '800', // Making it bolder like web design
        color: colors.gray900,
    },
    statLabel: {
        ...typography.bodySmall,
        color: colors.gray500,
        fontWeight: '600',
    },

    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.gray900,
        letterSpacing: -0.5,
    },
    sectionAction: {
        ...typography.bodySmall,
        fontWeight: '700',
        color: colors.primary,
    },

    // Quick Action
    quickAction: {
        alignItems: 'center',
        gap: 8,
    },
    quickActionIcon: {
        width: 56,
        height: 56,
        borderRadius: 20, // Squircle-ish
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickActionLabel: {
        ...typography.bodySmall,
        fontWeight: '600',
        color: colors.gray700,
    },

    // Visit Card
    visitCard: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        padding: spacing.sm,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.gray100,
        marginBottom: spacing.sm,
        alignItems: 'center',
    },
    visitDateBox: {
        backgroundColor: colors.gray50,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    visitDay: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.gray400,
        marginBottom: 2,
    },
    visitDateNum: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.gray900,
    },
    visitContent: {
        flex: 1,
        gap: 2,
    },
    visitTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: 2,
    },
    visitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    visitSubText: {
        fontSize: 12,
        color: colors.gray500,
    },
    visitStatusConfirmed: {
        marginLeft: spacing.sm,
    },
    visitStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginLeft: spacing.sm,
    },
});
