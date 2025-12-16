import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface DealCardProps {
    deal: any;
    onPress: () => void;
}

export default function DealCard({ deal, onPress }: DealCardProps) {
    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'accepted': return colors.success;
            case 'pending': return '#F59E0B'; // Amber
            case 'countered': return '#8B5CF6'; // Violet
            case 'rejected': return colors.error;
            case 'completed': return colors.secondary; // Teal
            default: return colors.gray500;
        }
    };

    const statusColor = getStatusColor(deal.status);
    const date = new Date(deal.created_at).toLocaleDateString(undefined, {
        day: 'numeric', month: 'short', year: 'numeric'
    });

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <View style={styles.header}>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                        {deal.status?.toUpperCase() || 'UNKNOWN'}
                    </Text>
                </View>
                <Text style={styles.date}>{date}</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.iconBox}>
                    <Ionicons name="home" size={20} color={colors.gray600} />
                </View>
                <View style={styles.details}>
                    <Text style={styles.title} numberOfLines={1}>{deal.property?.title || 'Unknown Property'}</Text>
                    <Text style={styles.address} numberOfLines={1}>{deal.property?.city || 'Location N/A'}</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <View>
                    <Text style={styles.label}>Offer Price</Text>
                    <Text style={styles.price}>₹{deal.amount?.toLocaleString() || '0'}</Text>
                </View>
                <View style={styles.actionIcon}>
                    <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.gray100,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
    },
    date: {
        fontSize: 12,
        color: colors.gray400,
        fontWeight: '500',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: spacing.md,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.gray50,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    details: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: 2,
    },
    address: {
        fontSize: 13,
        color: colors.gray500,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
    },
    label: {
        fontSize: 10,
        color: colors.gray400,
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    price: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.gray900,
    },
    actionIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.gray50,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
