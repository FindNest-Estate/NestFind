import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    ScrollView,
    Modal,
    TextInput,
    Alert,
    Clipboard,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    approved_slot?: string;
    agent_suggested_slot?: string;
    visit_otp?: string;
    buyer_rating?: number;
    created_at: string;
    property?: {
        title: string;
        city: string;
        price: number;
    };
};

type Offer = {
    id: number;
    property_id: number;
    amount: number;
    status: string;
    property?: {
        title: string;
        city: string;
        images?: { image_path: string }[];
    };
};

type Favorite = {
    id: number;
    title: string;
    city: string;
    price: number;
};

export default function BuyerDashboard() {
    const [visits, setVisits] = useState<Booking[]>([]);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Modals
    const [rateModal, setRateModal] = useState<{ show: boolean, visitId: number, rating: number, comment: string }>({
        show: false, visitId: 0, rating: 0, comment: ''
    });
    const [cancelModal, setCancelModal] = useState<{ show: boolean, visitId: number }>({
        show: false, visitId: 0
    });
    const [counterModal, setCounterModal] = useState<{ show: boolean, visitId: number, proposedTime: string }>({
        show: false, visitId: 0, proposedTime: ''
    });

    const router = useRouter();

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
                const parsed = JSON.parse(userData);
                setUser(parsed);
                if (parsed.role === 'agent') {
                    router.replace('/agent/dashboard');
                }
            }
        } catch (e) {
            console.error('Error loading user', e);
        }
    };

    const fetchData = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (!token) {
                router.replace('/(auth)/login');
                return;
            }

            // Fetch buyer's visits
            try {
                const visitsRes = await axios.get(`${API_URL}/bookings/my-visits`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setVisits(visitsRes.data || []);
            } catch (e) {
                console.log('Visits fetch error:', e);
            }

            // Fetch offers
            try {
                const offersRes = await axios.get(`${API_URL}/offers/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setOffers(offersRes.data || []);
            } catch (e) {
                console.log('Offers fetch error:', e);
            }

            // Fetch favorites
            try {
                const favRes = await axios.get(`${API_URL}/users/favorites`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setFavorites(favRes.data || []);
            } catch (e) {
                console.log('Favorites fetch error:', e);
            }

            // Fetch featured properties
            try {
                const propertiesRes = await axios.get(`${API_URL}/properties/`);
                setProperties(propertiesRes.data?.slice(0, 6) || []);
            } catch (e) {
                console.log('Properties fetch error:', e);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleCancelVisit = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            await axios.put(
                `${API_URL}/bookings/${cancelModal.visitId}/status`,
                { action: 'CANCEL', reason: 'Buyer cancelled' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setCancelModal({ show: false, visitId: 0 });
            Alert.alert('Success', 'Visit cancelled');
            fetchData();
        } catch (e) {
            Alert.alert('Error', 'Failed to cancel visit');
        }
    };

    const handleRateVisit = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            await axios.post(
                `${API_URL}/bookings/${rateModal.visitId}/review`,
                {
                    rating: rateModal.rating,
                    comment: rateModal.comment,
                    visit_outcome: 'Completed'
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setRateModal({ show: false, visitId: 0, rating: 0, comment: '' });
            Alert.alert('Success', 'Thank you for your feedback!');
            fetchData();
        } catch (e) {
            Alert.alert('Error', 'Failed to submit rating');
        }
    };

    const handleAcceptCounter = async (visitId: number, proposedSlot: string) => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            await axios.put(
                `${API_URL}/bookings/${visitId}/status`,
                { action: 'APPROVE', slot: proposedSlot },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            Alert.alert('Success', 'Counter proposal accepted! Visit confirmed.');
            fetchData();
        } catch (e) {
            Alert.alert('Error', 'Failed to accept counter proposal');
        }
    };

    const handleDeclineCounter = async (visitId: number) => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            await axios.put(
                `${API_URL}/bookings/${visitId}/status`,
                { action: 'CANCEL', reason: 'Buyer declined counter proposal' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            Alert.alert('Declined', 'Counter proposal declined.');
            fetchData();
        } catch (e) {
            Alert.alert('Error', 'Failed to decline counter proposal');
        }
    };

    const formatProposedTime = (dateString?: string) => {
        if (!dateString) return 'No time proposed';
        try {
            // Handle various date formats
            let date: Date;

            // Check if it's already a valid ISO string with timezone
            if (dateString.includes('Z') || dateString.includes('+')) {
                date = new Date(dateString);
            }
            // Handle datetime-local format: "2024-12-13T14:30" (no timezone)
            else if (dateString.includes('T') && !dateString.includes('Z')) {
                // Append local timezone
                date = new Date(dateString);
            }
            // Handle other formats
            else {
                date = new Date(dateString);
            }

            if (isNaN(date.getTime())) {
                console.log('Invalid date:', dateString);
                return 'Time not set';
            }

            return date.toLocaleString('en-IN', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            console.log('Date parse error:', e);
            return 'Time not set';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toUpperCase()) {
            case 'APPROVED': case 'CONFIRMED': return colors.success;
            case 'PENDING': return '#F59E0B';
            case 'COUNTER_PROPOSED': return '#8B5CF6';
            case 'CANCELLED': case 'REJECTED': return colors.error;
            case 'COMPLETED': return colors.secondary;
            default: return colors.gray500;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    // Stats
    const activeOffers = offers.filter(o => !['rejected', 'completed', 'cancelled'].includes(o.status)).length;
    const upcomingVisits = visits.filter(b => ['APPROVED', 'PENDING'].includes(b.status)).length;
    const completedDeals = offers.filter(o => o.status === 'completed').length;
    const favoritesCount = favorites.length;

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const activeOffer = offers.find(o => !['rejected', 'cancelled', 'completed'].includes(o.status));

    return (
        <View style={styles.container}>
            {/* Header Background */}
            <View style={styles.headerBackground} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.white} />
                }
            >
                {/* Header Content */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
                        <Text style={styles.greeting}>Hello, {user?.first_name || 'Buyer'}</Text>
                    </View>
                    <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/profile')}>
                        {user?.first_name ? (
                            <Text style={styles.profileInitial}>{user.first_name[0]}</Text>
                        ) : (
                            <Ionicons name="person" size={20} color={colors.primary} />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Quick Stats - Premium Minimalist */}
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#EEF2FF' }]}>
                            <Ionicons name="document-text" size={20} color={colors.primary} />
                        </View>
                        <Text style={styles.statNumber}>{activeOffers}</Text>
                        <Text style={styles.statLabel}>Offers</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#ECFDF5' }]}>
                            <Ionicons name="calendar" size={20} color={colors.success} />
                        </View>
                        <Text style={styles.statNumber}>{upcomingVisits}</Text>
                        <Text style={styles.statLabel}>Visits</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#FFF1F2' }]}>
                            <Ionicons name="heart" size={20} color={colors.error} />
                        </View>
                        <Text style={styles.statNumber}>{favoritesCount}</Text>
                        <Text style={styles.statLabel}>Saved</Text>
                    </View>
                </View>

                {/* Active Visit OTP - Boarding Pass Style */}
                {visits.filter(v => v.visit_otp && ['APPROVED', 'IN_PROGRESS'].includes(v.status)).map((activeVisit) => (
                    <View key={`otp-${activeVisit.id}`} style={styles.otpSection}>
                        <View style={styles.otpCard}>
                            <View style={styles.otpHeader}>
                                <View>
                                    <Text style={styles.otpLabel}>VISIT PASS</Text>
                                    <Text style={styles.otpPropertyTitle} numberOfLines={1}>{activeVisit.property?.title}</Text>
                                </View>
                                <Ionicons name="qr-code" size={24} color={colors.white} />
                            </View>

                            <View style={styles.otpBody}>
                                <View style={styles.otpRow}>
                                    <View>
                                        <Text style={styles.otpFieldLabel}>DATE</Text>
                                        <Text style={styles.otpFieldValue}>{formatDate(activeVisit.created_at)}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.otpFieldLabel}>TIME</Text>
                                        <Text style={styles.otpFieldValue}>
                                            {activeVisit.approved_slot ? formatProposedTime(activeVisit.approved_slot).split(',')[1] : 'TBD'}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={styles.otpFieldLabel}>CITY</Text>
                                        <Text style={styles.otpFieldValue}>{activeVisit.property?.city}</Text>
                                    </View>
                                </View>

                                <View style={styles.otpDivider}>
                                    <View style={styles.otpHoleLeft} />
                                    <View style={styles.otpLine} />
                                    <View style={styles.otpHoleRight} />
                                </View>

                                <View style={styles.codeSection}>
                                    <Text style={styles.codeLabel}>ENTRY CODE</Text>
                                    <TouchableOpacity
                                        style={styles.codeContainer}
                                        onPress={() => Alert.alert('Copied', `Code ${activeVisit.visit_otp} copied`)}
                                    >
                                        <Text style={styles.codeText}>{activeVisit.visit_otp}</Text>
                                        <Ionicons name="copy-outline" size={16} color={colors.gray500} style={{ marginLeft: 8 }} />
                                    </TouchableOpacity>
                                    <Text style={styles.codeWarning}>Share with agent upon arrival</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                ))}

                {/* Upcoming Schedule */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Upcoming Visits</Text>
                        <TouchableOpacity onPress={() => router.push('/my-visits')}>
                            <Text style={styles.seeAll}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    {visits.filter(v => ['APPROVED', 'PENDING', 'COUNTER_PROPOSED'].includes(v.status)).length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="calendar-outline" size={48} color={colors.gray400} />
                            <Text style={styles.emptyText}>No upcoming visits scheduled</Text>
                            <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/home')}>
                                <Text style={styles.exploreBtnText}>Explore Properties</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        visits.filter(v => ['APPROVED', 'PENDING', 'COUNTER_PROPOSED'].includes(v.status)).slice(0, 3).map((visit, idx) => (
                            <TouchableOpacity
                                key={`visit-${visit.id}`}
                                style={[styles.visitCard, visit.status === 'COUNTER_PROPOSED' && styles.visitCardAction]}
                                activeOpacity={0.9}
                            >
                                <View style={styles.visitRow}>
                                    <View style={styles.dateBox}>
                                        <Text style={styles.dateDay}>{formatDate(visit.created_at).split(' ')[0]}</Text>
                                        <Text style={styles.dateMonth}>{formatDate(visit.created_at).split(' ')[1]}</Text>
                                    </View>
                                    <View style={styles.visitInfo}>
                                        <Text style={styles.visitTitle} numberOfLines={1}>{visit.property?.title}</Text>
                                        <View style={styles.locationRow}>
                                            <Ionicons name="location-outline" size={12} color={colors.gray500} />
                                            <Text style={styles.visitLocation}>{visit.property?.city}</Text>
                                        </View>

                                        {/* Status Badge */}
                                        <View style={[
                                            styles.statusBadge,
                                            { backgroundColor: visit.status === 'COUNTER_PROPOSED' ? '#FEF3C7' : '#DCFCE7' }
                                        ]}>
                                            <Text style={[
                                                styles.statusText,
                                                { color: visit.status === 'COUNTER_PROPOSED' ? '#D97706' : '#166534' }
                                            ]}>
                                                {visit.status === 'COUNTER_PROPOSED' ? 'Needs Action' : visit.status}
                                            </Text>
                                        </View>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
                                </View>

                                {/* Counter Proposal Action Area */}
                                {visit.status === 'COUNTER_PROPOSED' && (
                                    <View style={styles.actionArea}>
                                        <Text style={styles.actionTitle}>New time proposed by agent:</Text>
                                        <Text style={styles.actionTime}>{formatProposedTime(visit.agent_suggested_slot)}</Text>
                                        <View style={styles.actionButtons}>
                                            <TouchableOpacity
                                                style={[styles.actionBtn, styles.declineBtn]}
                                                onPress={() => handleDeclineCounter(visit.id)}
                                            >
                                                <Text style={styles.declineBtnText}>Decline</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.actionBtn, styles.acceptBtn]}
                                                onPress={() => handleAcceptCounter(visit.id, visit.agent_suggested_slot || '')}
                                            >
                                                <Text style={styles.acceptBtnText}>Accept New Time</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* Quick Actions Grid */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActionsGrid}>
                        <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/home')}>
                            <View style={[styles.quickActionIcon, { backgroundColor: '#E0F2FE' }]}>
                                <Ionicons name="search" size={24} color="#0284C7" />
                            </View>
                            <Text style={styles.quickActionLabel}>Search</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/my-visits')}>
                            <View style={[styles.quickActionIcon, { backgroundColor: '#F3E8FF' }]}>
                                <Ionicons name="filter" size={24} color="#9333EA" />
                            </View>
                            <Text style={styles.quickActionLabel}>Preferences</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.quickActionItem}>
                            <View style={[styles.quickActionIcon, { backgroundColor: '#FFE4E6' }]}>
                                <Ionicons name="heart" size={24} color="#E11D48" />
                            </View>
                            <Text style={styles.quickActionLabel}>Saved</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/profile')}>
                            <View style={[styles.quickActionIcon, { backgroundColor: '#F1F5F9' }]}>
                                <Ionicons name="settings" size={24} color="#475569" />
                            </View>
                            <Text style={styles.quickActionLabel}>Settings</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Recommended Section */}
                {properties.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Recommended For You</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                            {properties.map((prop) => (
                                <TouchableOpacity
                                    key={prop.id}
                                    style={styles.recCard}
                                    onPress={() => router.push(`/property/${prop.id}`)}
                                    activeOpacity={0.9}
                                >
                                    <View style={styles.recImage}>
                                        <Ionicons name="image-outline" size={32} color={colors.white} />
                                    </View>
                                    <View style={styles.recContent}>
                                        <Text style={styles.recPrice}>₹{prop.price?.toLocaleString()}</Text>
                                        <Text style={styles.recTitle} numberOfLines={1}>{prop.title}</Text>
                                        <Text style={styles.recCity}>{prop.city}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            <BottomNav />

            {/* Modals remain mostly the same but styled better if needed - preserving functionality */}
            <Modal visible={cancelModal.show} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderIcon}>
                            <Ionicons name="alert-circle" size={32} color={colors.error} />
                        </View>
                        <Text style={styles.modalTitle}>Cancel Visit?</Text>
                        <Text style={styles.modalText}>Are you sure you want to cancel this visit? This action cannot be undone.</Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalBtnSecondary}
                                onPress={() => setCancelModal({ show: false, visitId: 0 })}
                            >
                                <Text style={styles.modalBtnSecondaryText}>Keep Visit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalBtnDanger} onPress={handleCancelVisit}>
                                <Text style={styles.modalBtnDangerText}>Yes, Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={rateModal.show} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Rate Your Visit</Text>
                        <Text style={styles.modalText}>How was your experience with this property and agent?</Text>

                        <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity
                                    key={star}
                                    onPress={() => setRateModal(prev => ({ ...prev, rating: star }))}
                                >
                                    <Ionicons
                                        name={rateModal.rating >= star ? "star" : "star-outline"}
                                        size={32}
                                        color="#F59E0B"
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            style={styles.commentInput}
                            placeholder="Share your thoughts (optional)..."
                            value={rateModal.comment}
                            onChangeText={(text) => setRateModal(prev => ({ ...prev, comment: text }))}
                            multiline
                            textAlignVertical="top"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalBtnSecondary}
                                onPress={() => setRateModal({ show: false, visitId: 0, rating: 0, comment: '' })}
                            >
                                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtnPrimary, rateModal.rating === 0 && styles.modalBtnDisabled]}
                                onPress={handleRateVisit}
                                disabled={rateModal.rating === 0}
                            >
                                <Text style={styles.modalBtnPrimaryText}>Submit Review</Text>
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
        backgroundColor: colors.gray50,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.white,
    },
    headerBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 280,
        backgroundColor: colors.primary,
        borderBottomRightRadius: 60,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 60,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateText: {
        ...typography.bodySmall,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 4,
        fontWeight: '600',
    },
    greeting: {
        ...typography.h2,
        color: colors.white,
        fontSize: 28,
    },
    profileButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    profileInitial: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.white,
    },

    // Stats Container
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        marginHorizontal: spacing.lg,
        borderRadius: borderRadius.xl,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 4,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: -20,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: colors.gray200,
    },
    statIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    statNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.gray900,
    },
    statLabel: {
        fontSize: 10,
        color: colors.gray500,
        fontWeight: '500',
    },

    // Sections
    section: {
        marginTop: spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.gray900,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    seeAll: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '600',
    },

    // OTP Card - Boarding Pass Style
    otpSection: {
        paddingHorizontal: spacing.lg,
        marginTop: spacing.xl,
    },
    otpCard: {
        backgroundColor: colors.primary,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    otpHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    otpLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 1,
        marginBottom: 4,
    },
    otpPropertyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.white,
    },
    otpBody: {
        padding: spacing.lg,
        backgroundColor: colors.primary,
    },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    otpFieldLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 2,
    },
    otpFieldValue: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.white,
    },
    otpDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.lg,
        marginHorizontal: -spacing.lg,
    },
    otpHoleLeft: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.gray50,
        marginLeft: -10,
    },
    otpHoleRight: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.gray50,
        marginRight: -10,
    },
    otpLine: {
        flex: 1,
        height: 1,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        borderStyle: 'dashed',
    },
    codeSection: {
        alignItems: 'center',
    },
    codeLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 8,
        letterSpacing: 2,
    },
    codeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
        marginBottom: 8,
    },
    codeText: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 4,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    codeWarning: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.6)',
    },

    // Visit Cards
    visitCard: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    visitCardAction: {
        borderColor: '#FEF3C7',
        backgroundColor: '#FFFBEB',
    },
    visitRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateBox: {
        backgroundColor: colors.gray50,
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        minWidth: 50,
        marginRight: spacing.md,
    },
    dateDay: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.gray900,
    },
    dateMonth: {
        fontSize: 10,
        color: colors.gray500,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    visitInfo: {
        flex: 1,
    },
    visitTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: 2,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 6,
    },
    visitLocation: {
        fontSize: 12,
        color: colors.gray500,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    actionArea: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    actionTitle: {
        fontSize: 12,
        color: colors.gray700,
        marginBottom: 4,
    },
    actionTime: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gray900,
        marginBottom: spacing.md,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    acceptBtn: {
        backgroundColor: '#D97706',
    },
    acceptBtnText: {
        color: colors.white,
        fontWeight: '600',
        fontSize: 12,
    },
    declineBtn: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#D97706',
    },
    declineBtnText: {
        color: '#D97706',
        fontWeight: '600',
        fontSize: 12,
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    emptyText: {
        fontSize: 14,
        color: colors.gray500,
        marginTop: spacing.md,
        marginBottom: spacing.lg,
    },
    exploreBtn: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: colors.black,
    },
    exploreBtnText: {
        color: colors.white,
        fontWeight: '600',
        fontSize: 14,
    },

    // Quick Actions
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: spacing.md,
        gap: spacing.md,
    },
    quickActionItem: {
        width: '46%', // approximate for 2 columns with gap
        backgroundColor: colors.white,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        flexDirection: 'row', // or 'column' based on pref, 'row' is better for compact
        alignItems: 'center',
        marginBottom: spacing.xs,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    quickActionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    quickActionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gray700,
    },

    // Recommendations
    horizontalList: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        gap: spacing.md,
    },
    recCard: {
        width: 200,
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        marginRight: spacing.sm,
    },
    recImage: {
        height: 120,
        backgroundColor: colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recContent: {
        padding: spacing.sm,
    },
    recPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: 2,
    },
    recTitle: {
        fontSize: 14,
        color: colors.gray900,
        marginBottom: 2,
    },
    recCity: {
        fontSize: 12,
        color: colors.gray500,
    },

    // History
    historyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
    },
    historyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.gray400,
        marginRight: spacing.md,
    },
    historyTitle: {
        flex: 1,
        fontSize: 14,
        color: colors.gray900,
    },
    ratingDisplay: {
        flexDirection: 'row',
    },
    ratingStars: {
        fontSize: 10,
    },
    rateBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: colors.gray100,
    },
    rateBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.gray900,
    },

    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        backgroundColor: colors.white,
        borderRadius: 24,
        padding: spacing.xl,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeaderIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    modalText: {
        fontSize: 14,
        color: colors.gray600,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: spacing.md,
        width: '100%',
    },
    modalBtnSecondary: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.gray100,
        alignItems: 'center',
    },
    modalBtnSecondaryText: {
        color: colors.gray900,
        fontWeight: '600',
    },
    modalBtnDanger: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.error,
        alignItems: 'center',
    },
    modalBtnDangerText: {
        color: colors.white,
        fontWeight: '600',
    },
    modalBtnPrimary: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.primary,
        alignItems: 'center',
    },
    modalBtnPrimaryText: {
        color: colors.white,
        fontWeight: '600',
    },
    modalBtnDisabled: {
        backgroundColor: colors.gray200,
    },
    starsRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    commentInput: {
        width: '100%',
        height: 100,
        backgroundColor: colors.gray50,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        textAlignVertical: 'top',
    },
    // Counter Proposal Styles
    counterProposalCard: {
        borderWidth: 2,
        borderColor: '#8B5CF6',
        backgroundColor: '#F3E8FF',
    },
    counterProposalInfo: {
        marginTop: spacing.xs,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        padding: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    counterProposalLabel: {
        ...typography.caption,
        color: '#7C3AED',
        fontWeight: '600',
    },
    counterProposalTime: {
        ...typography.bodySmall,
        color: '#5B21B6',
        fontWeight: '700',
    },
    counterActions: {
        flexDirection: 'row',
        gap: spacing.xs,
        marginTop: spacing.xs,
    },

});
