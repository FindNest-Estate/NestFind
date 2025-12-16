import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius } from '../../../constants/theme';
import { API_URL } from '../../../constants/api';
import ScreenHeader from '../../../components/common/ScreenHeader';
import DealCard from '../../../components/deals/DealCard';

export default function DealsList() {
    const router = useRouter();
    const [deals, setDeals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchDeals();
    }, []);

    const fetchDeals = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            const response = await axios.get(`${API_URL}/offers/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDeals(response.data);
        } catch (error) {
            console.error('Error fetching deals:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'accepted': return colors.success;
            case 'pending': return '#F59E0B';
            case 'countered': return '#8B5CF6';
            case 'rejected': return colors.error;
            case 'completed': return colors.secondary;
            default: return colors.gray500;
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <DealCard
            deal={item}
            onPress={() => router.push(`/dashboard/deals/${item.id}`)}
        />
    );

    return (
        <View style={styles.container}>
            <ScreenHeader title="My Deals" />

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={deals}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDeals(); }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text-outline" size={48} color={colors.gray400} />
                            <Text style={styles.emptyText}>No deals yet</Text>
                        </View>
                    }
                />
            )}
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
    list: {
        padding: spacing.md,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
    },
    date: {
        fontSize: 12,
        color: colors.gray500,
    },
    cardContent: {
        marginBottom: spacing.md,
    },
    propertyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: 2,
    },
    propertyAddress: {
        fontSize: 12,
        color: colors.gray500,
        marginBottom: 8,
    },
    price: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.primary,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
        paddingTop: spacing.sm,
    },
    viewDetailsText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: spacing.xxl,
    },
    emptyText: {
        color: colors.gray500,
        marginTop: spacing.md,
    },
});
