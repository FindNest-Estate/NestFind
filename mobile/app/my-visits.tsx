import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNav from '../components/BottomNav';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { API_URL } from '../constants/api';

type Booking = {
    id: number;
    property_id: number;
    status: string;
    buyer_message?: string;
    agent_message?: string;
    created_at: string;
    property?: {
        title: string;
        city: string;
        price: number;
    };
};

export default function MyVisits() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    useFocusEffect(
        useCallback(() => {
            fetchBookings();
        }, [])
    );

    const fetchBookings = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (!token) {
                router.replace('/(auth)/login');
                return;
            }

            const response = await axios.get(`${API_URL}/bookings/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBookings(response.data);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchBookings();
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'confirmed':
                return colors.success;
            case 'pending':
                return '#F59E0B';
            case 'cancelled':
                return colors.error;
            default:
                return colors.gray500;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const renderBookingCard = ({ item }: { item: Booking }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/property/${item.property_id}`)}
            activeOpacity={0.8}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>
                <Text style={styles.date}>{formatDate(item.created_at)}</Text>
            </View>

            <Text style={styles.propertyTitle} numberOfLines={1}>
                {item.property?.title || 'Property'}
            </Text>
            <Text style={styles.propertyLocation}>
                {item.property?.city || 'Unknown Location'}
            </Text>

            {item.property?.price && (
                <Text style={styles.propertyPrice}>
                    ₹{item.property.price.toLocaleString()}
                </Text>
            )}

            {item.buyer_message && (
                <View style={styles.messageContainer}>
                    <Text style={styles.messageLabel}>Your message:</Text>
                    <Text style={styles.messageText}>{item.buyer_message}</Text>
                </View>
            )}

            {item.agent_message && (
                <View style={styles.agentMessageContainer}>
                    <Text style={styles.messageLabel}>Agent response:</Text>
                    <Text style={styles.messageText}>{item.agent_message}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backButton}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>My Visits</Text>
                <View style={styles.placeholder} />
            </View>

            <FlatList
                data={bookings}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderBookingCard}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyEmoji}>📋</Text>
                        <Text style={styles.emptyTitle}>No visits yet</Text>
                        <Text style={styles.emptyText}>
                            When you schedule a visit to a property, it will appear here.
                        </Text>
                        <TouchableOpacity
                            style={styles.browseButton}
                            onPress={() => router.push('/home')}
                        >
                            <Text style={styles.browseButtonText}>Browse Properties</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />
            <BottomNav />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    listContent: {
        padding: spacing.lg,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.gray200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    statusText: {
        ...typography.caption,
        color: colors.white,
        fontWeight: '600',
    },
    date: {
        ...typography.caption,
        color: colors.gray500,
    },
    propertyTitle: {
        ...typography.h3,
        color: colors.gray900,
        marginBottom: spacing.xs,
    },
    propertyLocation: {
        ...typography.bodySmall,
        color: colors.gray500,
        marginBottom: spacing.xs,
    },
    propertyPrice: {
        ...typography.body,
        color: colors.gray900,
        fontWeight: '600',
    },
    messageContainer: {
        marginTop: spacing.md,
        padding: spacing.sm,
        backgroundColor: colors.gray50,
        borderRadius: borderRadius.md,
    },
    agentMessageContainer: {
        marginTop: spacing.sm,
        padding: spacing.sm,
        backgroundColor: colors.gray100,
        borderRadius: borderRadius.md,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    messageLabel: {
        ...typography.caption,
        color: colors.gray500,
        marginBottom: spacing.xs,
    },
    messageText: {
        ...typography.bodySmall,
        color: colors.gray700,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.xxl * 2,
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        ...typography.h2,
        color: colors.gray900,
        marginBottom: spacing.sm,
    },
    emptyText: {
        ...typography.body,
        color: colors.gray500,
        textAlign: 'center',
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.xl,
    },
    browseButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
    browseButtonText: {
        color: colors.white,
        fontWeight: '600',
        fontSize: 16,
    },
});
