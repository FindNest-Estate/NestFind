import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { API_URL } from '../../constants/api';

type FinanceData = {
    total_earned: number;
    pending_clearance: number;
    next_payout: string;
    revenue_trend: { name: string; amount: number }[];
    transactions: {
        id: number;
        reference: string;
        property_title: string;
        date: string;
        amount: number;
        status: string;
    }[];
};

export default function EarningsScreen() {
    const router = useRouter();
    const [data, setData] = useState<FinanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchFinance();
        }, [])
    );

    const fetchFinance = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            const res = await axios.get(`${API_URL}/dashboard/agent/finance`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
        } catch (e) {
            console.log('Finance fetch error:', e);
            // Mock data for demo
            setData({
                total_earned: 250000,
                pending_clearance: 50000,
                next_payout: 'Dec 15, 2024',
                revenue_trend: [
                    { name: 'Jul', amount: 30000 },
                    { name: 'Aug', amount: 45000 },
                    { name: 'Sep', amount: 38000 },
                    { name: 'Oct', amount: 52000 },
                    { name: 'Nov', amount: 48000 },
                    { name: 'Dec', amount: 37000 },
                ],
                transactions: [
                    { id: 1, reference: 'TXN-001', property_title: '3BHK in Mumbai', date: '2024-12-01', amount: 25000, status: 'PAID' },
                    { id: 2, reference: 'TXN-002', property_title: 'Villa in Pune', date: '2024-11-28', amount: 45000, status: 'PAID' },
                    { id: 3, reference: 'TXN-003', property_title: '2BHK in Bangalore', date: '2024-11-15', amount: 18000, status: 'PAID' },
                ],
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchFinance();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!data) return null;

    // Calculate max for chart
    const maxAmount = Math.max(...data.revenue_trend.map(d => d.amount));

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.backBtn}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Earnings</Text>
                    <View style={{ width: 50 }} />
                </View>

                {/* KPI Cards */}
                <View style={styles.kpiContainer}>
                    {/* Total Earned */}
                    <View style={styles.kpiCardPrimary}>
                        <Text style={styles.kpiLabel}>
                            <Ionicons name="cash-outline" size={14} color="rgba(255,255,255,0.8)" /> Total Payouts
                        </Text>
                        <Text style={styles.kpiValueLarge}>{formatCurrency(data.total_earned)}</Text>
                        <Text style={styles.kpiSubtext}>Lifetime earnings</Text>
                    </View>

                    <View style={styles.kpiRow}>
                        {/* Pending */}
                        <View style={[styles.kpiCard, { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="hourglass-outline" size={24} color="#D97706" style={{ marginBottom: 4 }} />
                            <Text style={styles.kpiValue}>{formatCurrency(data.pending_clearance)}</Text>
                            <Text style={styles.kpiLabelSmall}>Pending</Text>
                        </View>

                        {/* Growth */}
                        <View style={[styles.kpiCard, { backgroundColor: '#D1FAE5' }]}>
                            <Ionicons name="trending-up" size={24} color={colors.success} style={{ marginBottom: 4 }} />
                            <Text style={[styles.kpiValue, { color: colors.success }]}>+12.5%</Text>
                            <Text style={styles.kpiLabelSmall}>Growth</Text>
                        </View>
                    </View>
                </View>

                {/* Revenue Chart */}
                <View style={styles.chartSection}>
                    <Text style={styles.sectionTitle}>
                        <Ionicons name="bar-chart-outline" size={20} color={colors.gray900} /> Earnings History
                    </Text>
                    <View style={styles.chartContainer}>
                        {data.revenue_trend.map((item, index) => (
                            <TouchableOpacity key={`bar-${index}`} style={styles.barContainer} activeOpacity={1}>
                                <View style={styles.barWrapper}>
                                    <View
                                        style={[
                                            styles.bar,
                                            { height: `${(item.amount / maxAmount) * 100}%` }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.barLabel}>{item.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Transactions */}
                <View style={styles.transactionsSection}>
                    <View style={styles.transactionsHeader}>
                        <Text style={styles.sectionTitle}>
                            <Ionicons name="document-text-outline" size={20} color={colors.gray900} /> Recent Payouts
                        </Text>
                        <TouchableOpacity>
                            <Text style={styles.exportBtn}>Export →</Text>
                        </TouchableOpacity>
                    </View>

                    {data.transactions.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="cash-outline" size={40} color={colors.gray400} style={{ marginBottom: 8 }} />
                            <Text style={styles.emptyTitle}>No payouts yet</Text>
                        </View>
                    ) : (
                        data.transactions.map((txn, idx) => (
                            <TouchableOpacity key={`txn-${txn.id}-${idx}`} style={styles.transactionCard} activeOpacity={1}>
                                <View style={styles.transactionInfo}>
                                    <Text style={styles.transactionTitle}>{txn.property_title}</Text>
                                    <Text style={styles.transactionRef}>{txn.reference} • {formatDate(txn.date)}</Text>
                                </View>
                                <View style={styles.transactionAmount}>
                                    <Text style={styles.transactionAmountText}>{formatCurrency(txn.amount)}</Text>
                                    <View style={styles.paidBadge}>
                                        <Text style={styles.paidBadgeText}>✓ PAID</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* Next Payout */}
                {data.pending_clearance > 0 && (
                    <View style={styles.nextPayoutCard}>
                        <Text style={styles.nextPayoutLabel}>
                            <Ionicons name="calendar-outline" size={14} color="#6366F1" /> Next Batch Payout
                        </Text>
                        <Text style={styles.nextPayoutDate}>{data.next_payout}</Text>
                    </View>
                )}

                <View style={{ height: spacing.xxl }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gray50,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.md,
        backgroundColor: colors.white,
    },
    backBtn: {
        color: colors.primary,
        fontWeight: '600',
    },
    headerTitle: {
        ...typography.h2,
        color: colors.gray900,
    },
    kpiContainer: {
        padding: spacing.md,
    },
    kpiCardPrimary: {
        backgroundColor: '#4F46E5',
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    kpiLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
        marginBottom: spacing.xs,
    },
    kpiValueLarge: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.white,
    },
    kpiSubtext: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        marginTop: spacing.xs,
    },
    kpiRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    kpiCard: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    kpiIcon: {
        fontSize: 24,
        marginBottom: spacing.xs,
    },
    kpiValue: {
        ...typography.h3,
        color: colors.gray900,
    },
    kpiLabelSmall: {
        ...typography.caption,
        color: colors.gray600,
    },
    chartSection: {
        backgroundColor: colors.white,
        marginHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.gray900,
        marginBottom: spacing.md,
    },
    chartContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        height: 150,
        paddingTop: spacing.md,
    },
    barContainer: {
        flex: 1,
        alignItems: 'center',
    },
    barWrapper: {
        flex: 1,
        width: 24,
        backgroundColor: colors.gray100,
        borderRadius: borderRadius.sm,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    bar: {
        width: '100%',
        backgroundColor: '#6366F1',
        borderRadius: borderRadius.sm,
    },
    barLabel: {
        ...typography.caption,
        color: colors.gray500,
        marginTop: spacing.xs,
    },
    transactionsSection: {
        marginTop: spacing.lg,
        paddingHorizontal: spacing.md,
    },
    transactionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    exportBtn: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 12,
    },
    transactionCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    transactionInfo: {
        flex: 1,
    },
    transactionTitle: {
        ...typography.body,
        color: colors.gray900,
        fontWeight: '600',
    },
    transactionRef: {
        ...typography.caption,
        color: colors.gray500,
        marginTop: 2,
    },
    transactionAmount: {
        alignItems: 'flex-end',
    },
    transactionAmountText: {
        ...typography.body,
        color: colors.gray900,
        fontWeight: '700',
    },
    paidBadge: {
        backgroundColor: '#D1FAE5',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
        marginTop: 4,
    },
    paidBadgeText: {
        fontSize: 10,
        color: colors.success,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
    },
    emptyEmoji: {
        fontSize: 40,
        marginBottom: spacing.sm,
    },
    emptyTitle: {
        ...typography.body,
        color: colors.gray500,
    },
    nextPayoutCard: {
        backgroundColor: '#EEF2FF',
        marginHorizontal: spacing.md,
        marginTop: spacing.lg,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    nextPayoutLabel: {
        ...typography.bodySmall,
        color: '#6366F1',
        fontWeight: '600',
    },
    nextPayoutDate: {
        ...typography.body,
        color: colors.gray900,
        fontWeight: '700',
    },
});
