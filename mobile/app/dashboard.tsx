import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Modal,
    TextInput,
    Alert,
    Platform,
    TouchableOpacity,
    ImageBackground
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNav from '../components/BottomNav';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { API_URL } from '../constants/api';
import { StatCard, SectionHeader, QuickAction, VisitCard } from '../components/dashboard/DashboardComponents';
import PropertyCard from '../components/PropertyCard';

export default function BuyerDashboard() {
    const [visits, setVisits] = useState<any[]>([]);
    const [offers, setOffers] = useState<any[]>([]);
    const [favorites, setFavorites] = useState<any[]>([]);
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Modals
    const [rateModal, setRateModal] = useState<{ show: boolean, visitId: number, rating: number, comment: string }>({
        show: false, visitId: 0, rating: 0, comment: ''
    });

    const router = useRouter();
    const insets = useSafeAreaInsets();

    useFocusEffect(
        useCallback(() => {
            loadUser();
            fetchData();
        }, [])
    );

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

    const fetchData = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (!token) return router.replace('/(auth)/login');

            const [visitsRes, offersRes, favRes, propsRes] = await Promise.all([
                axios.get(`${API_URL}/bookings/my-visits`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/offers/`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/users/favorites`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/properties/`)
            ]);

            setVisits(visitsRes.data || []);
            setOffers(offersRes.data || []);
            setFavorites(favRes.data || []);
            setProperties(propsRes.data?.slice(0, 5) || []);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRateVisit = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            await axios.post(
                `${API_URL}/bookings/${rateModal.visitId}/review`,
                { rating: rateModal.rating, comment: rateModal.comment, visit_outcome: 'Completed' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setRateModal({ show: false, visitId: 0, rating: 0, comment: '' });
            Alert.alert('Success', 'Thank you for your feedback!');
            fetchData();
        } catch (e) {
            Alert.alert('Error', 'Failed to submit rating');
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const activeOffersCount = offers.filter(o => !['rejected', 'completed', 'cancelled'].includes(o.status)).length;
    const upcomingVisitsList = visits.filter(v => ['APPROVED', 'PENDING', 'CONFIRMED'].includes(v.status));

    const getTimeGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.md }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>{getTimeGreeting()},</Text>
                        <Text style={styles.userName}>{user?.first_name || 'Buyer'}</Text>
                    </View>
                    <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile')}>
                        {user?.first_name ? (
                            <Text style={styles.profileInitial}>{user.first_name[0]}</Text>
                        ) : (
                            <Ionicons name="person" size={20} color={colors.primary} />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Search Bar Placeholder */}
                <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/home')}>
                    <Ionicons name="search" size={20} color={colors.gray400} />
                    <Text style={styles.searchText}>Search by city, neighborhood...</Text>
                </TouchableOpacity>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statsRow}>
                        <StatCard
                            label="Active Offers"
                            value={activeOffersCount}
                            icon="document-text"
                            color={colors.primary}
                            onPress={() => router.push('/dashboard/deals' as any)}
                        />
                        <View style={{ width: spacing.md }} />
                        <StatCard
                            label="Upcoming Visits"
                            value={upcomingVisitsList.length}
                            icon="calendar"
                            color={colors.success}
                            onPress={() => router.push('/my-visits')}
                        />
                    </View>
                    <View style={{ height: spacing.md }} />
                    <View style={styles.statsRow}>
                        <StatCard
                            label="Saved Homes"
                            value={favorites.length}
                            icon="heart"
                            color={colors.error}
                            onPress={() => { }}
                        />
                        <View style={{ width: spacing.md }} />
                        <StatCard
                            label="Msg Unread"
                            value={0}
                            icon="chatbubble"
                            color="#8B5CF6"
                            onPress={() => router.push('/messages')}
                        />
                    </View>
                </View>

                {/* Upcoming Schedule */}
                <View style={styles.section}>
                    <SectionHeader title="Your Schedule" action="View Calendar" onAction={() => router.push('/my-visits')} />
                    {upcomingVisitsList.length > 0 ? (
                        upcomingVisitsList.slice(0, 3).map((visit) => (
                            <VisitCard
                                key={visit.id}
                                date={new Date(visit.created_at)}
                                title={visit.property?.title || 'Property'}
                                location={visit.property?.city || 'Unknown City'}
                                status={visit.status}
                                timeSlot={visit.approved_slot ? new Date(visit.approved_slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined}
                                onPress={() => { }}
                            />
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No upcoming visits scheduled.</Text>
                            <TouchableOpacity onPress={() => router.push('/home' as any)}>
                                <Text style={styles.linkText}>Book a tour</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <SectionHeader title="Quick Actions" />
                    <View style={styles.quickActionsRow}>
                        <QuickAction label="Find Agent" icon="people" color="#0284C7" bg="#E0F2FE" onPress={() => router.push('/find-agent')} />
                        <QuickAction label="Loans" icon="calculator" color="#059669" bg="#D1FAE5" onPress={() => router.push('/loans')} />
                        <QuickAction label="Docs" icon="folder-open" color="#7C3AED" bg="#EDE9FE" onPress={() => { }} />
                        <QuickAction label="Support" icon="headset" color="#EA580C" bg="#FFEDD5" onPress={() => { }} />
                    </View>
                </View>

                {/* Recommended */}
                <View style={styles.section}>
                    <SectionHeader title="Recommended" />
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}
                    >
                        {properties.map((prop) => (
                            <PropertyCard
                                key={prop.id}
                                property={prop}
                                onPress={() => router.push(`/property/${prop.id}`)}
                                width={220}
                                style={{ marginRight: spacing.md }}
                            />
                        ))}
                    </ScrollView>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <BottomNav />

            {/* Ratings Modal - Simplified for brevity but functionality preserved */}
            <Modal visible={rateModal.show} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Rate Visit</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Comment..."
                            value={rateModal.comment}
                            onChangeText={t => setRateModal(prev => ({ ...prev, comment: t }))}
                        />
                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 10 }}>
                            {[1, 2, 3, 4, 5].map(s => (
                                <TouchableOpacity key={s} onPress={() => setRateModal(prev => ({ ...prev, rating: s }))}>
                                    <Ionicons name={rateModal.rating >= s ? "star" : "star-outline"} size={30} color="#F59E0B" />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setRateModal({ show: false, visitId: 0, rating: 0, comment: '' })}>
                                <Text style={{ color: colors.gray600 }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalBtnSubmit} onPress={handleRateVisit}>
                                <Text style={{ color: colors.white, fontWeight: 'bold' }}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA', // Slightly gray background for contrast
    },
    scrollContent: {
        paddingBottom: 80,
    },
    header: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greeting: {
        color: colors.gray500,
        fontSize: 14,
        fontWeight: '600',
    },
    userName: {
        color: colors.gray900,
        fontSize: 24,
        fontWeight: '800', // Making it bolder
        letterSpacing: -0.5,
    },
    profileBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.gray200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileInitial: {
        fontWeight: 'bold',
        color: colors.gray700,
    },
    searchBar: {
        marginHorizontal: spacing.lg,
        backgroundColor: colors.white,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    searchText: {
        color: colors.gray400,
        fontWeight: '500',
    },
    statsGrid: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.xl,
    },
    statsRow: {
        flexDirection: 'row',
    },
    section: {
        marginBottom: spacing.xl,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        backgroundColor: colors.white,
        marginHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.gray100,
        borderStyle: 'dashed',
    },
    emptyText: {
        color: colors.gray400,
        marginBottom: 4,
    },
    linkText: {
        color: colors.primary,
        fontWeight: 'bold',
    },
    quickActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg + 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    modalContent: {
        backgroundColor: colors.white,
        width: '100%',
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: spacing.lg,
    },
    input: {
        width: '100%',
        backgroundColor: colors.gray50,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
        textAlignVertical: 'top',
    },
    modalBtnCancel: {
        padding: spacing.md,
        backgroundColor: colors.gray100,
        borderRadius: borderRadius.md,
        flex: 1,
        alignItems: 'center',
    },
    modalBtnSubmit: {
        padding: spacing.md,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
        flex: 1,
        alignItems: 'center',
    }
});
