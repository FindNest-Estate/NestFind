import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Platform,
    StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
    approved_slot?: string;
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
    const insets = useSafeAreaInsets();

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

            const response = await axios.get(`${API_URL}/bookings/my-visits`, {
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
        switch (status.toUpperCase()) {
            case 'APPROVED': return colors.success;
            case 'CONFIRMED': return colors.success;
            case 'PENDING': return '#F59E0B';
            case 'CANCELLED': return colors.error;
            case 'COMPLETED': return colors.secondary;
            default: return colors.gray500;
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

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    const renderBookingCard = ({ item }: { item: Booking }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/property/${item.property_id}`)}
            activeOpacity={0.9}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>
                <Text style={styles.date}>{formatDate(item.created_at)}</Text>
            </View>

            <View style={styles.cardContent}>
                <Text style={styles.propertyTitle} numberOfLines={1}>
                    {item.property?.title || 'Unknown Property'}
                </Text>
                <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={14} color={colors.gray500} />
                    <Text style={styles.propertyLocation}>
                        {item.property?.city || 'Unknown Location'}
                    </Text>
                </View>

                {item.property?.price && (
                    <Text style={styles.propertyPrice}>
                        ₹{item.property.price.toLocaleString()}
                    </Text>
                )}

                {/* Visit Details Box */}
                {(item.approved_slot || item.buyer_message) && (
                    <View style={styles.detailsBox}>
                        {item.approved_slot && (
                            <View style={styles.dateTimeRow}>
                                <Ionicons name="calendar-outline" size={16} color={colors.gray700} />
                                <Text style={styles.dateTimeText}>
                                    {formatDate(item.approved_slot)} at {formatTime(item.approved_slot)}
                                </Text>
                            </View>
                        )}
                        {item.buyer_message && !item.approved_slot && (
                            <Text style={styles.messageText} numberOfLines={2}>
                                Note: {item.buyer_message}
                            </Text>
                        )}
                    </View>
                )}
            </View>
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
            {/* Header - Fixed Height & Safe Area */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.gray900} />
                    </TouchableOpacity>
                    <Text style={styles.title}>My Visits</Text>
                    <View style={styles.placeholder} />
                </View>
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
                        <View style={styles.emptyIconBg}>
                            <Ionicons name="calendar" size={48} color={colors.primary} />
                        </View>
                        <Text style={styles.emptyTitle}>No visits yet</Text>
                        <Text style={styles.emptyText}>
                            Your scheduled property visits will appear here. Start exploring properties to book a visit.
                        </Text>
                        <TouchableOpacity
                            style={styles.browseButton}
                            onPress={() => router.push('/home')}
                        >
                            <Text style={styles.browseButtonText}>Explore Properties</Text>
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
        backgroundColor: '#F8F9FA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.white,
    },
    header: {
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
        zIndex: 10,
    },
    headerContent: {
        height: 56,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.gray900,
    },
    placeholder: {
        width: 40,
    },
    listContent: {
        padding: spacing.lg,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.gray100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        marginBottom: spacing.xs,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.white,
        letterSpacing: 0.5,
    },
    date: {
        fontSize: 12,
        color: colors.gray400,
        fontWeight: '500',
    },
    cardContent: {
        padding: spacing.md,
    },
    propertyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: 4,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    propertyLocation: {
        fontSize: 13,
        color: colors.gray500,
    },
    propertyPrice: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.gray900,
        marginBottom: spacing.md,
    },
    detailsBox: {
        backgroundColor: colors.gray50,
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        marginTop: 4,
    },
    dateTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dateTimeText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.gray700,
    },
    messageText: {
        fontSize: 12,
        color: colors.gray500,
        fontStyle: 'italic',
    },

    // Empty State
    emptyContainer: {
        paddingTop: 80,
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: 14,
        color: colors.gray500,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 20,
    },
    browseButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: 12,
        borderRadius: borderRadius.full,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    browseButtonText: {
        color: colors.white,
        fontWeight: '700',
        fontSize: 15,
    },
});
