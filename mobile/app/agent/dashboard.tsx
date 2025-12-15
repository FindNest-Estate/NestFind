import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    ScrollView,
    Alert,
    Modal,
    TextInput,
    Platform,
    Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { API_URL } from '../../constants/api';

type Booking = {
    id: number;
    property_id: number;
    user_id: number;
    status: string;
    buyer_message?: string;
    approved_slot?: string;
    visit_date?: string;
    visit_time?: string;
    created_at: string;
    buyer?: {
        first_name: string;
        last_name: string;
        email: string;
    };
    property?: {
        title: string;
        city: string;
        address?: string;
        price: number;
    };
};

type Property = {
    id: number;
    title: string;
    city: string;
    price: number;
    property_type: string;
    is_available: boolean;
    status: string;
};

export default function AgentDashboard() {
    const [requests, setRequests] = useState<Booking[]>([]);
    const [upcoming, setUpcoming] = useState<Booking[]>([]);
    const [past, setPast] = useState<Booking[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'requests' | 'upcoming' | 'listings'>('requests');

    // Modals
    const [otpModal, setOtpModal] = useState<{ show: boolean, bookingId: number, otp: string }>({
        show: false, bookingId: 0, otp: ''
    });
    const [counterModal, setCounterModal] = useState<{
        show: boolean,
        bookingId: number,
        date: Date,
        timeSlot: string,
        message: string,
        showDatePicker: boolean,
    }>({
        show: false, bookingId: 0, date: new Date(), timeSlot: '', message: '', showDatePicker: false
    });
    const [completeModal, setCompleteModal] = useState<{
        show: boolean,
        bookingId: number,
        notes: string,
        interest: string,
        timeline: string,
        budget: string,
        latitude: number | null,
        longitude: number | null,
        locationStatus: 'idle' | 'loading' | 'success' | 'error',
        images: string[],
        uploading: boolean,
    }>({
        show: false, bookingId: 0, notes: '', interest: '', timeline: '', budget: '',
        latitude: null, longitude: null, locationStatus: 'idle', images: [], uploading: false
    });

    const router = useRouter();

    useFocusEffect(
        useCallback(() => {
            loadUser();
        }, [])
    );

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const loadUser = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const parsed = JSON.parse(userData);
                setUser(parsed);
                if (parsed.role !== 'agent') {
                    router.replace('/dashboard');
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

            // Fetch agent schedule
            try {
                const scheduleRes = await axios.get(`${API_URL}/bookings/agent-schedule`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRequests(scheduleRes.data.requests || []);
                setUpcoming(scheduleRes.data.upcoming || []);
                setPast(scheduleRes.data.past || []);
            } catch (e) {
                console.log('Schedule fetch error:', e);
            }

            // Fetch agent's properties
            if (user?.id) {
                try {
                    const propertiesRes = await axios.get(`${API_URL}/properties/`, {
                        params: { user_id: user.id }
                    });
                    setProperties(propertiesRes.data || []);
                } catch (e) {
                    console.log('Properties fetch error:', e);
                }
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

    const updateBookingStatus = async (bookingId: number, action: string, extra?: any) => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            await axios.put(
                `${API_URL}/bookings/${bookingId}/status`,
                { action, ...extra },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            Alert.alert('Success', `Booking ${action.toLowerCase()}`);
            fetchData();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to update booking');
        }
    };

    const handleGenerateOTP = async (bookingId: number) => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            await axios.post(
                `${API_URL}/bookings/${bookingId}/otp/generate`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            Alert.alert('OTP Sent', 'OTP has been sent to the buyer');
            setOtpModal({ show: true, bookingId, otp: '' });
        } catch (e) {
            Alert.alert('Error', 'Failed to generate OTP');
        }
    };

    const handleStartVisit = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            await axios.post(
                `${API_URL}/bookings/${otpModal.bookingId}/start`,
                { otp: otpModal.otp },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setOtpModal({ show: false, bookingId: 0, otp: '' });
            Alert.alert('Success', 'Visit started!');
            fetchData();
        } catch (e) {
            Alert.alert('Error', 'Invalid OTP');
        }
    };

    const handleCompleteVisit = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            const location = completeModal.latitude && completeModal.longitude
                ? `${completeModal.latitude},${completeModal.longitude}`
                : '';

            await axios.post(
                `${API_URL}/bookings/${completeModal.bookingId}/complete`,
                {
                    check_in_location: location,
                    latitude: completeModal.latitude,
                    longitude: completeModal.longitude,
                    agent_notes: completeModal.notes,
                    visit_images: completeModal.images,
                    buyer_interest: completeModal.interest,
                    buyer_timeline: completeModal.timeline,
                    buyer_budget_feedback: completeModal.budget,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setCompleteModal({
                show: false, bookingId: 0, notes: '', interest: '', timeline: '', budget: '',
                latitude: null, longitude: null, locationStatus: 'idle', images: [], uploading: false
            });
            Alert.alert('Success', 'Visit completed!');
            fetchData();
        } catch (e) {
            Alert.alert('Error', 'Failed to complete visit');
        }
    };

    const handleCaptureLocation = async () => {
        setCompleteModal(prev => ({ ...prev, locationStatus: 'loading' }));
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required to verify visit.');
                setCompleteModal(prev => ({ ...prev, locationStatus: 'error' }));
                return;
            }
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setCompleteModal(prev => ({
                ...prev,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                locationStatus: 'success'
            }));
        } catch (e) {
            Alert.alert('Error', 'Failed to get location');
            setCompleteModal(prev => ({ ...prev, locationStatus: 'error' }));
        }
    };

    const handlePickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera roll permission is required.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.7,
            });

            if (!result.canceled && result.assets[0]) {
                await uploadImage(result.assets[0].uri);
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleTakePhoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera permission is required.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: false,
                quality: 0.7,
            });

            if (!result.canceled && result.assets[0]) {
                await uploadImage(result.assets[0].uri);
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to take photo');
        }
    };

    const uploadImage = async (uri: string) => {
        setCompleteModal(prev => ({ ...prev, uploading: true }));
        try {
            const token = await AsyncStorage.getItem('auth_token');
            const formData = new FormData();
            const filename = uri.split('/').pop() || 'photo.jpg';
            const match = /\.([\w]+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            formData.append('file', {
                uri,
                name: filename,
                type,
            } as any);

            const response = await axios.post(
                `${API_URL}/bookings/upload-image`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            setCompleteModal(prev => ({
                ...prev,
                images: [...prev.images, response.data.image_path],
                uploading: false
            }));
        } catch (e) {
            Alert.alert('Error', 'Failed to upload image');
            setCompleteModal(prev => ({ ...prev, uploading: false }));
        }
    };

    const handleCounter = async () => {
        if (!counterModal.timeSlot) {
            Alert.alert('Error', 'Please select a time slot');
            return;
        }
        try {
            const token = await AsyncStorage.getItem('auth_token');
            const formattedDate = counterModal.date.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            const slot = `${formattedDate} at ${counterModal.timeSlot}`;

            await axios.put(
                `${API_URL}/bookings/${counterModal.bookingId}/status`,
                {
                    action: 'COUNTER',
                    slot: slot,
                    agent_message: counterModal.message || 'I would like to propose a different time.'
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setCounterModal({
                show: false, bookingId: 0, date: new Date(),
                timeSlot: '', message: '', showDatePicker: false
            });
            Alert.alert('Success', 'Counter proposal sent');
            fetchData();
        } catch (e) {
            Alert.alert('Error', 'Failed to send counter proposal');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toUpperCase()) {
            case 'APPROVED': return colors.success;
            case 'PENDING': return '#F59E0B';
            case 'CANCELLED': case 'REJECTED': return colors.error;
            case 'COMPLETED': return colors.secondary;
            case 'IN_PROGRESS': return '#3B82F6';
            default: return colors.gray500;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
        });
    };

    // Stats
    const pendingCount = requests.length;
    const upcomingCount = upcoming.length;
    const totalListings = properties.length;
    const completedCount = past.filter(b => b.status === 'COMPLETED').length;
    const todayCount = upcoming.filter(v => {
        const vDate = new Date(v.visit_date || v.created_at);
        return vDate.toDateString() === new Date().toDateString();
    }).length;

    const handleLogout = async () => {
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user');
        router.replace('/(auth)/login');
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

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
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.greeting}>Agent Dashboard</Text>
                            <Text style={styles.subtitle}>Hello, {user?.first_name}! 🏠</Text>
                        </View>
                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <Text style={styles.logoutText}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats */}
                <View style={styles.statsContainer}>
                    <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
                        <Text style={styles.statIcon}>⏳</Text>
                        <Text style={styles.statNumber}>{pendingCount}</Text>
                        <Text style={styles.statLabel}>Pending</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
                        <Text style={styles.statIcon}>📅</Text>
                        <Text style={styles.statNumber}>{todayCount}</Text>
                        <Text style={styles.statLabel}>Today</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
                        <Text style={styles.statIcon}>✅</Text>
                        <Text style={styles.statNumber}>{completedCount}</Text>
                        <Text style={styles.statLabel}>Completed</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#E0E7FF' }]}>
                        <Text style={styles.statIcon}>🏠</Text>
                        <Text style={styles.statNumber}>{totalListings}</Text>
                        <Text style={styles.statLabel}>Listings</Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/agent/add-property')}>
                        <Text style={styles.actionCardIcon}>➕</Text>
                        <Text style={styles.actionCardLabel}>Add Property</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('listings')}>
                        <Text style={styles.actionCardIcon}>🏠</Text>
                        <Text style={styles.actionCardLabel}>My Listings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/chat')}>
                        <Text style={styles.actionCardIcon}>💬</Text>
                        <Text style={styles.actionCardLabel}>Messages</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/agent/earnings')}>
                        <Text style={styles.actionCardIcon}>💰</Text>
                        <Text style={styles.actionCardLabel}>Earnings</Text>
                    </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
                        onPress={() => setActiveTab('requests')}
                    >
                        <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
                            Requests ({pendingCount})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
                        onPress={() => setActiveTab('upcoming')}
                    >
                        <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
                            Timeline ({upcomingCount})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'listings' && styles.activeTab]}
                        onPress={() => setActiveTab('listings')}
                    >
                        <Text style={[styles.tabText, activeTab === 'listings' && styles.activeTabText]}>
                            Listings ({totalListings})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <View style={styles.listContainer}>
                    {/* Requests Tab */}
                    {activeTab === 'requests' && (
                        requests.length > 0 ? (
                            requests.map((item, idx) => (
                                <TouchableOpacity key={`req-${item.id}-${idx}`} style={styles.requestCard} activeOpacity={1}>
                                    <View style={styles.requestHeader}>
                                        <View style={styles.buyerAvatar}>
                                            <Text style={styles.buyerInitial}>{item.buyer?.first_name?.[0] || '?'}</Text>
                                        </View>
                                        <View style={styles.buyerInfo}>
                                            <Text style={styles.buyerName}>{item.buyer?.first_name} {item.buyer?.last_name}</Text>
                                            <Text style={styles.requestProperty}>{item.property?.title}</Text>
                                        </View>
                                        <View style={styles.requestTime}>
                                            <Text style={styles.requestTimeText}>{item.visit_time || '---'}</Text>
                                            <Text style={styles.requestDateText}>{formatDate(item.visit_date || item.created_at)}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.requestActions}>
                                        <TouchableOpacity
                                            style={styles.declineBtn}
                                            onPress={() => updateBookingStatus(item.id, 'REJECT', { reason: 'Declined' })}
                                        >
                                            <Text style={styles.declineBtnText}>Decline</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.counterBtn}
                                            onPress={() => setCounterModal({
                                                show: true, bookingId: item.id,
                                                date: new Date(), timeSlot: '',
                                                message: '', showDatePicker: false
                                            })}
                                        >
                                            <Text style={styles.counterBtnText}>Counter</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.acceptBtn}
                                            onPress={() => updateBookingStatus(item.id, 'APPROVE', {
                                                slot: item.visit_date && item.visit_time
                                                    ? new Date(`${item.visit_date} ${item.visit_time}`).toISOString()
                                                    : new Date().toISOString()
                                            })}
                                        >
                                            <Text style={styles.acceptBtnText}>Accept</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyEmoji}>✅</Text>
                                <Text style={styles.emptyTitle}>All caught up!</Text>
                                <Text style={styles.emptyText}>No pending requests</Text>
                            </View>
                        )
                    )}

                    {/* Upcoming/Timeline Tab */}
                    {activeTab === 'upcoming' && (
                        upcoming.length > 0 ? (
                            upcoming.map((visit, idx) => (
                                <TouchableOpacity key={`visit-${visit.id}-${idx}`} style={styles.timelineCard} activeOpacity={1}>
                                    <View style={styles.timelineHeader}>
                                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(visit.status) }]}>
                                            <Text style={styles.statusText}>{visit.status}</Text>
                                        </View>
                                        <Text style={styles.timelineTime}>{visit.visit_time || '---'}</Text>
                                    </View>

                                    <Text style={styles.timelineProperty}>{visit.property?.title}</Text>
                                    <Text style={styles.timelineAddress}>📍 {visit.property?.address || visit.property?.city}</Text>

                                    <View style={styles.timelineBuyer}>
                                        <View style={styles.buyerAvatarSmall}>
                                            <Text style={styles.buyerInitialSmall}>{visit.buyer?.first_name?.[0]}</Text>
                                        </View>
                                        <Text style={styles.timelineBuyerName}>{visit.buyer?.first_name} {visit.buyer?.last_name}</Text>
                                    </View>

                                    <View style={styles.timelineActions}>
                                        {visit.status === 'APPROVED' && (
                                            <TouchableOpacity
                                                style={styles.startBtn}
                                                onPress={() => handleGenerateOTP(visit.id)}
                                            >
                                                <Text style={styles.startBtnText}>🔐 Start Visit</Text>
                                            </TouchableOpacity>
                                        )}
                                        {visit.status === 'IN_PROGRESS' && (
                                            <TouchableOpacity
                                                style={styles.completeBtn}
                                                onPress={() => setCompleteModal({
                                                    show: true,
                                                    bookingId: visit.id,
                                                    notes: '',
                                                    interest: '',
                                                    timeline: '',
                                                    budget: '',
                                                    latitude: null,
                                                    longitude: null,
                                                    locationStatus: 'idle',
                                                    images: [],
                                                    uploading: false
                                                })}
                                            >
                                                <Text style={styles.completeBtnText}>✓ Complete Visit</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyEmoji}>📅</Text>
                                <Text style={styles.emptyTitle}>No upcoming visits</Text>
                            </View>
                        )
                    )}

                    {/* Listings Tab */}
                    {activeTab === 'listings' && (
                        properties.length > 0 ? (
                            properties.map((prop, idx) => (
                                <TouchableOpacity key={`prop-${prop.id}-${idx}`} style={styles.listingCard} activeOpacity={1}>
                                    <View style={styles.listingHeader}>
                                        <View style={styles.listingImageContainer}>
                                            <Text style={styles.listingEmoji}>🏠</Text>
                                        </View>
                                        <View style={styles.listingInfo}>
                                            <Text style={styles.listingTitle} numberOfLines={1}>{prop.title}</Text>
                                            <Text style={styles.listingCity}>📍 {prop.city}</Text>
                                            <Text style={styles.listingPrice}>₹{prop.price?.toLocaleString()}</Text>
                                        </View>
                                        <View style={[styles.listingStatus,
                                        { backgroundColor: prop.status === 'ACTIVE' ? '#D1FAE5' : '#FEE2E2' }]}>
                                            <Text style={[styles.listingStatusText,
                                            { color: prop.status === 'ACTIVE' ? colors.success : colors.error }]}>
                                                {prop.status || 'ACTIVE'}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.listingActions}>
                                        <TouchableOpacity
                                            style={styles.listingActionBtn}
                                            onPress={() => router.push(`/property/${prop.id}`)}
                                        >
                                            <Text style={styles.listingActionText}>👁️ View</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.listingActionBtn}
                                            onPress={() => Alert.alert('Edit', 'Edit property feature coming soon')}
                                        >
                                            <Text style={styles.listingActionText}>✏️ Edit</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.listingActionBtn, styles.listingDeleteBtn]}
                                            onPress={() => {
                                                Alert.alert(
                                                    'Delete Property',
                                                    `Are you sure you want to delete "${prop.title}"?`,
                                                    [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        {
                                                            text: 'Delete',
                                                            style: 'destructive',
                                                            onPress: async () => {
                                                                try {
                                                                    const token = await AsyncStorage.getItem('auth_token');
                                                                    await axios.delete(`${API_URL}/properties/${prop.id}`, {
                                                                        headers: { Authorization: `Bearer ${token}` }
                                                                    });
                                                                    Alert.alert('Success', 'Property deleted');
                                                                    fetchData();
                                                                } catch (e) {
                                                                    Alert.alert('Error', 'Failed to delete property');
                                                                }
                                                            }
                                                        }
                                                    ]
                                                );
                                            }}
                                        >
                                            <Text style={styles.listingDeleteText}>🗑️ Delete</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyEmoji}>🏡</Text>
                                <Text style={styles.emptyTitle}>No listings yet</Text>
                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={() => router.push('/agent/add-property')}
                                >
                                    <Text style={styles.addButtonText}>+ Add Property</Text>
                                </TouchableOpacity>
                            </View>
                        )
                    )}
                </View>

                <View style={{ height: spacing.xxl }} />
            </ScrollView>

            {/* OTP Modal */}
            <Modal visible={otpModal.show} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.otpHeader}>
                            <Text style={styles.otpIcon}>🔐</Text>
                            <Text style={styles.modalTitle}>Security Check</Text>
                        </View>
                        <Text style={styles.modalText}>Ask the buyer for the 4-digit code displayed on their app</Text>

                        <TextInput
                            style={styles.otpInput}
                            placeholder="0000"
                            value={otpModal.otp}
                            onChangeText={(text) => setOtpModal(prev => ({ ...prev, otp: text }))}
                            keyboardType="number-pad"
                            maxLength={4}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalBtnSecondary}
                                onPress={() => setOtpModal({ show: false, bookingId: 0, otp: '' })}
                            >
                                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtnPrimary, otpModal.otp.length < 4 && styles.modalBtnDisabled]}
                                onPress={handleStartVisit}
                                disabled={otpModal.otp.length < 4}
                            >
                                <Text style={styles.modalBtnPrimaryText}>Verify</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Counter Proposal Modal */}
            <Modal visible={counterModal.show} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.counterModalContent}>
                        <Text style={styles.modalTitle}>Propose New Time</Text>
                        <Text style={styles.modalText}>Select a different date and time for this visit</Text>

                        {/* Date Picker */}
                        <Text style={styles.fieldLabel}>📆 Select Date</Text>
                        <TouchableOpacity
                            style={styles.datePickerBtn}
                            onPress={() => setCounterModal(prev => ({ ...prev, showDatePicker: true }))}
                        >
                            <Text style={styles.datePickerBtnText}>
                                {counterModal.date.toLocaleDateString('en-IN', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                })}
                            </Text>
                            <Text>📅</Text>
                        </TouchableOpacity>

                        {counterModal.showDatePicker && (
                            <DateTimePicker
                                value={counterModal.date}
                                mode="date"
                                minimumDate={new Date()}
                                onChange={(event, date) => {
                                    setCounterModal(prev => ({
                                        ...prev,
                                        showDatePicker: Platform.OS === 'ios',
                                        date: date || prev.date
                                    }));
                                }}
                            />
                        )}

                        {/* Time Slots */}
                        <Text style={styles.fieldLabel}>⏰ Select Time</Text>
                        <View style={styles.timeSlotsGrid}>
                            {['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'].map((slot) => (
                                <TouchableOpacity
                                    key={slot}
                                    style={[
                                        styles.timeSlotBtn,
                                        counterModal.timeSlot === slot && styles.timeSlotBtnActive
                                    ]}
                                    onPress={() => setCounterModal(prev => ({ ...prev, timeSlot: slot }))}
                                >
                                    <Text style={[
                                        styles.timeSlotBtnText,
                                        counterModal.timeSlot === slot && styles.timeSlotBtnTextActive
                                    ]}>
                                        {slot}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Reason Message */}
                        <Text style={styles.fieldLabel}>💬 Reason (Optional)</Text>
                        <TextInput
                            style={styles.counterMessageInput}
                            placeholder="Why are you proposing a different time?"
                            placeholderTextColor={colors.gray400}
                            value={counterModal.message}
                            onChangeText={(text) => setCounterModal(prev => ({ ...prev, message: text }))}
                            multiline
                            numberOfLines={2}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalBtnSecondary}
                                onPress={() => setCounterModal({
                                    show: false, bookingId: 0, date: new Date(),
                                    timeSlot: '', message: '', showDatePicker: false
                                })}
                            >
                                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtnPrimary, !counterModal.timeSlot && styles.modalBtnDisabled]}
                                onPress={handleCounter}
                                disabled={!counterModal.timeSlot}
                            >
                                <Text style={styles.modalBtnPrimaryText}>Send Proposal</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Complete Visit Modal */}
            <Modal visible={completeModal.show} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <ScrollView contentContainerStyle={styles.completeModalScroll}>
                        <View style={styles.completeModalContent}>
                            <Text style={styles.modalTitle}>Complete Visit</Text>
                            <Text style={styles.modalText}>Submit report for this visit</Text>

                            <Text style={styles.fieldLabel}>Buyer Interest</Text>
                            <View style={styles.optionsRow}>
                                {['HIGH', 'MEDIUM', 'LOW', 'NONE'].map((level) => (
                                    <TouchableOpacity
                                        key={level}
                                        style={[styles.optionBtn, completeModal.interest === level && styles.optionBtnActive]}
                                        onPress={() => setCompleteModal(prev => ({ ...prev, interest: level }))}
                                    >
                                        <Text style={[styles.optionBtnText, completeModal.interest === level && styles.optionBtnTextActive]}>
                                            {level}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.fieldLabel}>Timeline</Text>
                            <View style={styles.optionsRow}>
                                {['IMMEDIATE', '1_MONTH', '3_MONTHS', 'BROWSING'].map((time) => (
                                    <TouchableOpacity
                                        key={time}
                                        style={[styles.optionBtn, completeModal.timeline === time && styles.optionBtnActive]}
                                        onPress={() => setCompleteModal(prev => ({ ...prev, timeline: time }))}
                                    >
                                        <Text style={[styles.optionBtnText, completeModal.timeline === time && styles.optionBtnTextActive]}>
                                            {time.replace('_', ' ')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.fieldLabel}>Budget Fit</Text>
                            <View style={styles.optionsRow}>
                                {['WITHIN', 'OVER', 'UNDER'].map((fit) => (
                                    <TouchableOpacity
                                        key={fit}
                                        style={[styles.optionBtn, completeModal.budget === fit && styles.optionBtnActive]}
                                        onPress={() => setCompleteModal(prev => ({ ...prev, budget: fit }))}
                                    >
                                        <Text style={[styles.optionBtnText, completeModal.budget === fit && styles.optionBtnTextActive]}>
                                            {fit}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Location Capture */}
                            <Text style={styles.fieldLabel}>📍 Location Verification</Text>
                            <TouchableOpacity
                                style={[
                                    styles.locationBtn,
                                    completeModal.locationStatus === 'success' && styles.locationBtnSuccess,
                                    completeModal.locationStatus === 'error' && styles.locationBtnError
                                ]}
                                onPress={handleCaptureLocation}
                                disabled={completeModal.locationStatus === 'loading'}
                            >
                                {completeModal.locationStatus === 'loading' ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : completeModal.locationStatus === 'success' ? (
                                    <Text style={styles.locationBtnTextSuccess}>✅ Location Captured</Text>
                                ) : completeModal.locationStatus === 'error' ? (
                                    <Text style={styles.locationBtnTextError}>❌ Retry Location</Text>
                                ) : (
                                    <Text style={styles.locationBtnText}>📍 Capture Current Location</Text>
                                )}
                            </TouchableOpacity>

                            {/* Image Upload */}
                            <Text style={styles.fieldLabel}>📷 Visit Photos</Text>
                            <View style={styles.imageButtonsRow}>
                                <TouchableOpacity
                                    style={styles.imageBtn}
                                    onPress={handleTakePhoto}
                                    disabled={completeModal.uploading}
                                >
                                    <Text style={styles.imageBtnText}>📷 Camera</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.imageBtn}
                                    onPress={handlePickImage}
                                    disabled={completeModal.uploading}
                                >
                                    <Text style={styles.imageBtnText}>🖼️ Gallery</Text>
                                </TouchableOpacity>
                            </View>
                            {completeModal.uploading && (
                                <View style={styles.uploadingIndicator}>
                                    <ActivityIndicator size="small" color={colors.primary} />
                                    <Text style={styles.uploadingText}>Uploading...</Text>
                                </View>
                            )}
                            {completeModal.images.length > 0 && (
                                <ScrollView horizontal style={styles.imagesPreview} showsHorizontalScrollIndicator={false}>
                                    {completeModal.images.map((img, idx) => (
                                        <View key={idx} style={styles.imagePreviewContainer}>
                                            <Image
                                                source={{ uri: `${API_URL.replace('/api', '')}/${img}` }}
                                                style={styles.imagePreview}
                                            />
                                            <TouchableOpacity
                                                style={styles.removeImageBtn}
                                                onPress={() => setCompleteModal(prev => ({
                                                    ...prev,
                                                    images: prev.images.filter((_, i) => i !== idx)
                                                }))}
                                            >
                                                <Text style={styles.removeImageBtnText}>×</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </ScrollView>
                            )}

                            <Text style={styles.fieldLabel}>Notes</Text>
                            <TextInput
                                style={styles.notesInput}
                                placeholder="Key observations..."
                                value={completeModal.notes}
                                onChangeText={(text) => setCompleteModal(prev => ({ ...prev, notes: text }))}
                                multiline
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.modalBtnSecondary}
                                    onPress={() => setCompleteModal({
                                        show: false, bookingId: 0, notes: '', interest: '', timeline: '', budget: '',
                                        latitude: null, longitude: null, locationStatus: 'idle', images: [], uploading: false
                                    })}
                                >
                                    <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalBtnPrimary, (!completeModal.interest || !completeModal.timeline) && styles.modalBtnDisabled]}
                                    onPress={handleCompleteVisit}
                                    disabled={!completeModal.interest || !completeModal.timeline}
                                >
                                    <Text style={styles.modalBtnPrimaryText}>Complete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
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
    header: {
        backgroundColor: '#1a1a2e',
        paddingTop: spacing.xxl,
        paddingBottom: spacing.xl,
        paddingHorizontal: spacing.lg,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greeting: {
        ...typography.h2,
        color: colors.white,
    },
    subtitle: {
        ...typography.body,
        color: 'rgba(255,255,255,0.7)',
        marginTop: spacing.xs,
    },
    logoutButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: borderRadius.md,
    },
    logoutText: {
        color: colors.white,
        fontWeight: '600',
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.sm,
        marginTop: spacing.md,
        gap: spacing.xs,
    },
    statCard: {
        flex: 1,
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    statIcon: {
        fontSize: 18,
        marginBottom: 2,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.gray900,
    },
    statLabel: {
        fontSize: 9,
        color: colors.gray700,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.gray900,
        paddingHorizontal: spacing.lg,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    actionsRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
    },
    actionCard: {
        flex: 1,
        backgroundColor: colors.white,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    actionCardIcon: {
        fontSize: 22,
        marginBottom: spacing.xs,
    },
    actionCardLabel: {
        fontSize: 10,
        color: colors.gray700,
    },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: spacing.md,
        marginTop: spacing.lg,
        backgroundColor: colors.gray100,
        borderRadius: borderRadius.lg,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        borderRadius: borderRadius.md,
    },
    activeTab: {
        backgroundColor: colors.white,
    },
    tabText: {
        fontSize: 11,
        color: colors.gray500,
        fontWeight: '500',
    },
    activeTabText: {
        color: colors.gray900,
        fontWeight: '600',
    },
    listContainer: {
        paddingHorizontal: spacing.md,
        marginTop: spacing.md,
    },
    requestCard: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    requestHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    buyerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#6366F1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    buyerInitial: {
        color: colors.white,
        fontWeight: '700',
    },
    buyerInfo: {
        flex: 1,
    },
    buyerName: {
        ...typography.bodySmall,
        color: colors.gray900,
        fontWeight: '600',
    },
    requestProperty: {
        ...typography.caption,
        color: colors.gray500,
    },
    requestTime: {
        alignItems: 'flex-end',
    },
    requestTimeText: {
        fontSize: 12,
        color: '#6366F1',
        fontWeight: '700',
    },
    requestDateText: {
        ...typography.caption,
        color: colors.gray500,
    },
    requestActions: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    declineBtn: {
        flex: 1,
        padding: spacing.sm,
        backgroundColor: colors.gray100,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    declineBtnText: {
        fontSize: 11,
        color: colors.gray600,
        fontWeight: '600',
    },
    counterBtn: {
        flex: 1,
        padding: spacing.sm,
        backgroundColor: '#EEF2FF',
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    counterBtnText: {
        fontSize: 11,
        color: '#6366F1',
        fontWeight: '600',
    },
    acceptBtn: {
        flex: 1,
        padding: spacing.sm,
        backgroundColor: colors.gray900,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    acceptBtnText: {
        fontSize: 11,
        color: colors.white,
        fontWeight: '600',
    },
    timelineCard: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    timelineHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
    },
    statusText: {
        fontSize: 10,
        color: colors.white,
        fontWeight: '600',
    },
    timelineTime: {
        ...typography.body,
        color: colors.primary,
        fontWeight: '700',
    },
    timelineProperty: {
        ...typography.body,
        color: colors.gray900,
        fontWeight: '600',
    },
    timelineAddress: {
        ...typography.caption,
        color: colors.gray500,
        marginTop: 2,
    },
    timelineBuyer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    buyerAvatarSmall: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.gray200,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.xs,
    },
    buyerInitialSmall: {
        fontSize: 12,
        color: colors.gray600,
        fontWeight: '600',
    },
    timelineBuyerName: {
        ...typography.caption,
        color: colors.gray600,
    },
    timelineActions: {
        marginTop: spacing.sm,
    },
    startBtn: {
        backgroundColor: colors.primary,
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    startBtnText: {
        color: colors.white,
        fontWeight: '600',
    },
    completeBtn: {
        backgroundColor: colors.success,
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    completeBtnText: {
        color: colors.white,
        fontWeight: '600',
    },
    propertyCard: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        marginBottom: spacing.sm,
    },
    propertyImage: {
        width: 80,
        height: 80,
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    propertyIcon: {
        fontSize: 28,
    },
    propertyInfo: {
        flex: 1,
        padding: spacing.sm,
    },
    propertyTitle: {
        ...typography.bodySmall,
        color: colors.gray900,
        fontWeight: '600',
    },
    propertyLocation: {
        ...typography.caption,
        color: colors.gray500,
    },
    propertyMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.xs,
    },
    propertyPrice: {
        ...typography.bodySmall,
        color: colors.primary,
        fontWeight: '700',
    },
    availabilityBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    availabilityText: {
        fontSize: 10,
        fontWeight: '600',
    },
    propertyActions: {
        flexDirection: 'row',
        gap: spacing.xs,
        marginTop: spacing.xs,
    },
    editBtn: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        backgroundColor: colors.gray100,
        borderRadius: borderRadius.sm,
    },
    editBtnText: {
        fontSize: 10,
        color: colors.gray700,
    },
    deleteBtn: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        backgroundColor: '#FEE2E2',
        borderRadius: borderRadius.sm,
    },
    deleteBtnText: {
        fontSize: 10,
        color: colors.error,
    },
    // --- New Listing Card Styles ---
    listingCard: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    listingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    listingImageContainer: {
        width: 50,
        height: 50,
        backgroundColor: colors.gray100,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    listingEmoji: {
        fontSize: 24,
    },
    listingInfo: {
        flex: 1,
    },
    listingTitle: {
        ...typography.bodySmall,
        color: colors.gray900,
        fontWeight: '600',
    },
    listingCity: {
        ...typography.caption,
        color: colors.gray500,
    },
    listingPrice: {
        ...typography.bodySmall,
        color: colors.primary,
        fontWeight: '700',
    },
    listingStatus: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
    },
    listingStatusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    listingActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
    },
    listingActionBtn: {
        flex: 1,
        paddingVertical: spacing.sm,
        backgroundColor: colors.gray100,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    listingActionText: {
        fontSize: 12,
        color: colors.gray700,
        fontWeight: '600',
    },
    listingDeleteBtn: {
        backgroundColor: '#FEE2E2',
    },
    listingDeleteText: {
        fontSize: 12,
        color: colors.error,
        fontWeight: '600',
    },
    // --- End Listing Card Styles ---
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
        color: colors.gray900,
        fontWeight: '600',
    },
    emptyText: {
        ...typography.caption,
        color: colors.gray500,
    },
    addButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
        marginTop: spacing.md,
    },
    addButtonText: {
        color: colors.white,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        width: '100%',
        maxWidth: 340,
    },
    otpHeader: {
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    otpIcon: {
        fontSize: 40,
        marginBottom: spacing.xs,
    },
    modalTitle: {
        ...typography.h3,
        color: colors.gray900,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    modalText: {
        ...typography.bodySmall,
        color: colors.gray500,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    otpInput: {
        backgroundColor: colors.gray50,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 8,
        marginBottom: spacing.md,
    },
    counterInput: {
        backgroundColor: colors.gray50,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        marginBottom: spacing.md,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    modalBtnSecondary: {
        flex: 1,
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        backgroundColor: colors.gray100,
        alignItems: 'center',
    },
    modalBtnSecondaryText: {
        color: colors.gray700,
        fontWeight: '600',
    },
    modalBtnPrimary: {
        flex: 1,
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        backgroundColor: colors.primary,
        alignItems: 'center',
    },
    modalBtnPrimaryText: {
        color: colors.white,
        fontWeight: '600',
    },
    modalBtnDisabled: {
        opacity: 0.5,
    },
    completeModalScroll: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: spacing.lg,
    },
    completeModalContent: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
    },
    fieldLabel: {
        ...typography.bodySmall,
        color: colors.gray700,
        fontWeight: '600',
        marginBottom: spacing.xs,
        marginTop: spacing.sm,
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    optionBtn: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
        backgroundColor: colors.gray100,
    },
    optionBtnActive: {
        backgroundColor: colors.primary,
    },
    optionBtnText: {
        fontSize: 10,
        color: colors.gray600,
        fontWeight: '600',
    },
    optionBtnTextActive: {
        color: colors.white,
    },
    notesInput: {
        backgroundColor: colors.gray50,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        height: 80,
        textAlignVertical: 'top',
        marginTop: spacing.xs,
        marginBottom: spacing.md,
    },
    // Counter Modal Styles
    counterModalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        padding: spacing.lg,
        paddingBottom: spacing.xxl,
        maxHeight: '85%',
    },
    datePickerBtn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.gray50,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    datePickerBtnText: {
        ...typography.body,
        color: colors.gray900,
    },
    timeSlotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
        marginBottom: spacing.md,
    },
    timeSlotBtn: {
        width: '23%',
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        backgroundColor: colors.gray100,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    timeSlotBtnActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    timeSlotBtnText: {
        fontSize: 12,
        color: colors.gray700,
        fontWeight: '500',
    },
    timeSlotBtnTextActive: {
        color: colors.white,
        fontWeight: '600',
    },
    counterMessageInput: {
        backgroundColor: colors.gray50,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        minHeight: 60,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: colors.gray200,
        marginBottom: spacing.md,
        fontSize: 14,
        color: colors.gray900,
    },
    // Location Capture Styles
    locationBtn: {
        backgroundColor: colors.gray100,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    locationBtnSuccess: {
        backgroundColor: '#D1FAE5',
        borderColor: '#10b981',
    },
    locationBtnError: {
        backgroundColor: '#FEE2E2',
        borderColor: '#ef4444',
    },
    locationBtnText: {
        ...typography.body,
        color: colors.gray700,
        fontWeight: '600',
    },
    locationBtnTextSuccess: {
        ...typography.body,
        color: '#059669',
        fontWeight: '600',
    },
    locationBtnTextError: {
        ...typography.body,
        color: '#dc2626',
        fontWeight: '600',
    },
    // Image Upload Styles
    imageButtonsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    imageBtn: {
        flex: 1,
        backgroundColor: colors.gray100,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    imageBtnText: {
        ...typography.bodySmall,
        color: colors.gray700,
        fontWeight: '600',
    },
    uploadingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.sm,
        marginBottom: spacing.sm,
    },
    uploadingText: {
        ...typography.bodySmall,
        color: colors.gray500,
        marginLeft: spacing.sm,
    },
    imagesPreview: {
        marginBottom: spacing.md,
    },
    imagePreviewContainer: {
        position: 'relative',
        marginRight: spacing.sm,
    },
    imagePreview: {
        width: 80,
        height: 80,
        borderRadius: borderRadius.md,
    },
    removeImageBtn: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: colors.error,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeImageBtnText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
});
