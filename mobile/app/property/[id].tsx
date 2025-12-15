import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Image,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Dimensions,
    Alert,
    Modal,
    TextInput,
    Platform,
    Linking,
    Share,
    KeyboardAvoidingView,
    StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { API_URL } from '../../constants/api';

const { width } = Dimensions.get('window');

// Available time slots
const TIME_SLOTS = [
    '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '02:00 PM', '03:00 PM',
    '04:00 PM', '05:00 PM', '06:00 PM'
];

// Sample coordinates for Indian cities (you can integrate geocoding API later)
const CITY_COORDINATES: { [key: string]: { lat: number, lng: number } } = {
    'Mumbai': { lat: 19.0760, lng: 72.8777 },
    'Delhi': { lat: 28.7041, lng: 77.1025 },
    'Bangalore': { lat: 12.9716, lng: 77.5946 },
    'Hyderabad': { lat: 17.3850, lng: 78.4867 },
    'Chennai': { lat: 13.0827, lng: 80.2707 },
    'Kolkata': { lat: 22.5726, lng: 88.3639 },
    'Pune': { lat: 18.5204, lng: 73.8567 },
    'default': { lat: 20.5937, lng: 78.9629 }, // Center of India
};

export default function PropertyDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [property, setProperty] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [visitMessage, setVisitMessage] = useState('');
    const [scheduling, setScheduling] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Date/Time slot booking
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);

    // New state for full functionality
    const [isFavorite, setIsFavorite] = useState(false);
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [offerAmount, setOfferAmount] = useState('');
    const [submittingOffer, setSubmittingOffer] = useState(false);
    const [hasActiveBooking, setHasActiveBooking] = useState(false);
    const [activeBookingStatus, setActiveBookingStatus] = useState<string | null>(null);

    useEffect(() => {
        fetchProperty();
        loadCurrentUser();
        checkFavoriteStatus();
        checkActiveBooking();
    }, [id]);

    const loadCurrentUser = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const parsed = JSON.parse(userData);
                console.log('Current user loaded:', parsed.id, parsed.email, parsed.role);
                setCurrentUser(parsed);
            }
        } catch (e) {
            console.log('Error loading user:', e);
        }
    };

    const fetchProperty = async () => {
        try {
            const response = await axios.get(`${API_URL}/properties/${id}`);
            console.log('Property owner_id:', response.data.owner_id, 'owner:', response.data.owner?.id);
            setProperty(response.data);
        } catch (error) {
            console.error('Error fetching property:', error);
            Alert.alert('Error', 'Failed to load property details');
        } finally {
            setLoading(false);
        }
    };

    // Check if property is in favorites
    const checkFavoriteStatus = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (!token) return;
            const res = await axios.get(`${API_URL}/favorites/check/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsFavorite(res.data.is_favorite);
        } catch (e) {
            // Silently fail - favorites might not be implemented
        }
    };

    // Check if user has an active booking for this property
    const checkActiveBooking = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (!token) return;

            const res = await axios.get(`${API_URL}/bookings/my-visits`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Check if any booking for this property is active (not completed/cancelled)
            const propertyId = parseInt(id as string);
            const activeBooking = res.data.find((booking: any) =>
                booking.property_id === propertyId &&
                !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(booking.status?.toUpperCase())
            );

            if (activeBooking) {
                setHasActiveBooking(true);
                setActiveBookingStatus(activeBooking.status);
            } else {
                setHasActiveBooking(false);
                setActiveBookingStatus(null);
            }
        } catch (e) {
            console.log('Error checking active booking:', e);
        }
    };

    // Toggle favorite
    const toggleFavorite = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (!token) {
                Alert.alert('Login Required', 'Please login to save properties');
                return;
            }

            if (isFavorite) {
                // Remove from favorites
                await axios.delete(`${API_URL}/favorites/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setIsFavorite(false);
                Alert.alert('Removed', 'Property removed from saved list');
            } else {
                // Add to favorites
                await axios.post(`${API_URL}/favorites/`,
                    { property_id: parseInt(id as string) },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setIsFavorite(true);
                Alert.alert('Saved!', 'Property added to your saved list');
            }
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.detail || 'Failed to update favorites');
        }
    };

    // Share property
    const shareProperty = async () => {
        try {
            const result = await Share.share({
                message: `Check out this property: ${property.title}\n\n📍 ${property.city}, ${property.state}\n💰 ₹${property.price?.toLocaleString()}\n🛏️ ${property.bedrooms} beds • 🚿 ${property.bathrooms} baths\n📐 ${property.area} sqft\n\nView on NestFind App!`,
                title: property.title,
            });
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    // Submit offer
    const handleSubmitOffer = async () => {
        if (!offerAmount || isNaN(parseFloat(offerAmount))) {
            Alert.alert('Invalid Amount', 'Please enter a valid offer amount');
            return;
        }

        setSubmittingOffer(true);
        try {
            const token = await AsyncStorage.getItem('auth_token');
            await axios.post(
                `${API_URL}/offers/`,
                {
                    property_id: parseInt(id as string),
                    amount: parseFloat(offerAmount),
                    message: `Offer for ${property.title}`
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setShowOfferModal(false);
            setOfferAmount('');
            Alert.alert('Success! 🎉', 'Your offer has been submitted. The agent will review it shortly.');
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.detail || 'Failed to submit offer');
        } finally {
            setSubmittingOffer(false);
        }
    };

    const handleScheduleVisit = async () => {
        if (!selectedTimeSlot) {
            Alert.alert('Select Time', 'Please select a time slot for your visit');
            return;
        }

        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (!token) {
                Alert.alert('Login Required', 'Please login to schedule a visit');
                router.push('/(auth)/login');
                return;
            }

            setScheduling(true);

            const message = visitMessage
                ? `${visitMessage}\n\n📅 Preferred Date: ${formatDate(selectedDate)}\n⏰ Preferred Time: ${selectedTimeSlot}`
                : `📅 Preferred Date: ${formatDate(selectedDate)}\n⏰ Preferred Time: ${selectedTimeSlot}`;

            await axios.post(
                `${API_URL}/bookings/`,
                {
                    property_id: parseInt(id as string),
                    buyer_message: message,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            Alert.alert(
                'Visit Scheduled! 🎉',
                `Your visit request for ${formatDate(selectedDate)} at ${selectedTimeSlot} has been sent.`
            );
            setShowScheduleModal(false);
            setVisitMessage('');
            setSelectedTimeSlot(null);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to schedule visit');
        } finally {
            setScheduling(false);
        }
    };

    const onDateChange = (event: any, date?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (date) {
            setSelectedDate(date);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getMinDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
    };

    const getCoordinates = () => {
        const city = property?.city || '';
        return CITY_COORDINATES[city] || CITY_COORDINATES['default'];
    };

    const openMapsApp = () => {
        const coords = getCoordinates();
        const address = `${property?.address}, ${property?.city}, ${property?.state}`;
        const url = Platform.select({
            ios: `maps:0,0?q=${encodeURIComponent(address)}`,
            android: `geo:${coords.lat},${coords.lng}?q=${encodeURIComponent(address)}`,
        });
        if (url) {
            Linking.openURL(url);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!property) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Property not found</Text>
            </View>
        );
    }

    const images = property.images || [];
    const currentImage = images[currentImageIndex];
    const imageUrl = currentImage
        ? `${API_URL}/${currentImage.image_path}`
        : null;
    const coords = getCoordinates();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Header / Image Carousel */}
            <View style={styles.headerContainer}>
                <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={(e) => {
                        const offset = e.nativeEvent.contentOffset.x;
                        setCurrentImageIndex(Math.round(offset / width));
                    }}
                    scrollEventThrottle={16}
                >
                    {images.length > 0 ? (
                        images.map((img: any, index: number) => (
                            <Image
                                key={index}
                                source={{ uri: `${API_URL}/${img.image_path}` }}
                                style={styles.headerImage}
                                resizeMode="cover"
                            />
                        ))
                    ) : (
                        <View style={[styles.headerImage, styles.noImageContainer]}>
                            <Ionicons name="image-outline" size={64} color={colors.gray400} />
                            <Text style={styles.noImageText}>No Image Available</Text>
                        </View>
                    )}
                </ScrollView>

                {/* Navbar Overlay */}
                <View style={styles.navbarOverlay}>
                    <TouchableOpacity
                        style={styles.circleBtn}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.gray900} />
                    </TouchableOpacity>

                    <View style={styles.navbarActions}>
                        <TouchableOpacity style={styles.circleBtn} onPress={shareProperty}>
                            <Ionicons name="share-outline" size={24} color={colors.gray900} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.circleBtn} onPress={toggleFavorite}>
                            <Ionicons
                                name={isFavorite ? "heart" : "heart-outline"}
                                size={24}
                                color={isFavorite ? colors.error : colors.gray900}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Image Dots */}
                {images.length > 1 && (
                    <View style={styles.paginationDots}>
                        {images.map((_: any, i: number) => (
                            <View
                                key={i}
                                style={[
                                    styles.dot,
                                    i === currentImageIndex && styles.dotActive
                                ]}
                            />
                        ))}
                    </View>
                )}
            </View>

            {/* Scrollable Content */}
            <ScrollView
                style={styles.contentScroll}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Title & Price Section */}
                <View style={styles.titleSection}>
                    <View>
                        <Text style={styles.propertyTitle}>{property.title}</Text>
                        <View style={styles.locationRow}>
                            <Ionicons name="location-sharp" size={16} color={colors.primary} />
                            <Text style={styles.locationText}>{property.city}, {property.state}</Text>
                        </View>
                    </View>
                    <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={14} color={colors.white} />
                        <Text style={styles.ratingText}>New</Text>
                    </View>
                </View>

                {/* Key Features Grid */}
                <View style={styles.featuresGrid}>
                    <View style={styles.featureItem}>
                        <Ionicons name="bed-outline" size={24} color={colors.gray600} />
                        <Text style={styles.featureValue}>{property.bedrooms || '-'}</Text>
                        <Text style={styles.featureLabel}>Bedrooms</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="water-outline" size={24} color={colors.gray600} />
                        <Text style={styles.featureValue}>{property.bathrooms || '-'}</Text>
                        <Text style={styles.featureLabel}>Bathrooms</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="expand-outline" size={24} color={colors.gray600} />
                        <Text style={styles.featureValue}>{property.area || '-'}</Text>
                        <Text style={styles.featureLabel}>Sq Ft</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="home-outline" size={24} color={colors.gray600} />
                        <Text style={styles.featureValue}>{property.property_type}</Text>
                        <Text style={styles.featureLabel}>Type</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Description */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About this home</Text>
                    <Text style={styles.descriptionText}>
                        {property.description || 'No description provided for this property.'}
                    </Text>
                </View>

                <View style={styles.divider} />

                {/* Host / Agent */}
                {property.owner && (
                    <View style={styles.agentSection}>
                        <Text style={styles.sectionTitle}>Hosted by</Text>
                        <View style={styles.agentRow}>
                            <View style={styles.agentAvatar}>
                                <Text style={styles.agentInitial}>{property.owner.first_name?.[0]}</Text>
                            </View>
                            <View style={styles.agentInfo}>
                                <Text style={styles.agentName}>{property.owner.first_name} {property.owner.last_name}</Text>
                                <Text style={styles.agentRole}>Real Estate Agent</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.contactBtn}
                                onPress={() => {
                                    if (property.owner.phone) Linking.openURL(`tel:${property.owner.phone}`);
                                    else Alert.alert('Info', 'Phone number not available');
                                }}
                            >
                                <Ionicons name="call-outline" size={20} color={colors.gray900} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <View style={styles.divider} />

                {/* Map Preview */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Where you'll be</Text>
                    <Text style={styles.addressText}>{property.address}</Text>
                    <View style={styles.mapPreview}>
                        <MapView
                            style={styles.map}
                            initialRegion={{
                                latitude: coords.lat,
                                longitude: coords.lng,
                                latitudeDelta: 0.01,
                                longitudeDelta: 0.01,
                            }}
                            scrollEnabled={false}
                            zoomEnabled={false}
                        >
                            <Marker
                                coordinate={{
                                    latitude: coords.lat,
                                    longitude: coords.lng
                                }}
                            />
                        </MapView>
                        <TouchableOpacity style={styles.openMapBtn} onPress={openMapsApp}>
                            <Text style={styles.openMapText}>Open in Maps</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Bottom Padding for scroll */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Fixed Bottom Action Bar */}
            <View style={styles.bottomBar}>
                <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Price</Text>
                    <Text style={styles.priceValue}>₹{property.price?.toLocaleString()}</Text>
                </View>

                {currentUser?.role === 'agent' ? (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.editBtn]}
                            onPress={() => router.push(`/agent/edit-property/${id}`)}
                        >
                            <Text style={styles.editBtnText}>Edit</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.actionButtons}>
                        {hasActiveBooking ? (
                            <View style={styles.statusBadge}>
                                <Text style={styles.statusText}>
                                    {activeBookingStatus === 'PENDING' ? 'Request Sent' : activeBookingStatus}
                                </Text>
                            </View>
                        ) : (
                            <>
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.secondaryBtn]}
                                    onPress={() => setShowScheduleModal(true)}
                                >
                                    <Text style={styles.secondaryBtnText}>Schedule</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.primaryBtn]}
                                    onPress={() => setShowOfferModal(true)}
                                >
                                    <Text style={styles.primaryBtnText}>Make Offer</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                )}
            </View>

            {/* Modals remain mostly same but could be styled if needed */}
            <Modal
                visible={showScheduleModal}
                animationType="slide"
                transparent={true}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Schedule Visit</Text>
                            <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
                                <Ionicons name="close" size={24} color={colors.gray500} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Simplified Modal Content structure */}
                            <Text style={styles.label}>Select Date</Text>
                            <TouchableOpacity
                                style={styles.inputBox}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Ionicons name="calendar-outline" size={20} color={colors.gray500} />
                                <Text style={styles.inputText}>{formatDate(selectedDate)}</Text>
                            </TouchableOpacity>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={selectedDate}
                                    mode="date"
                                    minimumDate={getMinDate()}
                                    onChange={onDateChange}
                                />
                            )}

                            <Text style={styles.label}>Select Time</Text>
                            <View style={styles.chipsContainer}>
                                {TIME_SLOTS.map((slot) => (
                                    <TouchableOpacity
                                        key={slot}
                                        style={[
                                            styles.chip,
                                            selectedTimeSlot === slot && styles.chipActive
                                        ]}
                                        onPress={() => setSelectedTimeSlot(slot)}
                                    >
                                        <Text style={[
                                            styles.chipText,
                                            selectedTimeSlot === slot && styles.chipTextActive
                                        ]}>{slot}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[styles.fullWidthBtn, (!selectedTimeSlot || scheduling) && styles.btnDisabled]}
                                onPress={handleScheduleVisit}
                                disabled={!selectedTimeSlot || scheduling}
                            >
                                {scheduling ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.btnText}>Confirm Schedule</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showOfferModal}
                animationType="slide"
                transparent={true}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContainer}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Make an Offer</Text>
                            <TouchableOpacity onPress={() => setShowOfferModal(false)}>
                                <Ionicons name="close" size={24} color={colors.gray500} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.offerSubtitle}>
                            Listed Price: <Text style={{ fontWeight: '700' }}>₹{property.price?.toLocaleString()}</Text>
                        </Text>

                        <View style={styles.amountInputContainer}>
                            <Text style={styles.currencySymbol}>₹</Text>
                            <TextInput
                                style={styles.amountInput}
                                value={offerAmount}
                                onChangeText={setOfferAmount}
                                keyboardType="numeric"
                                placeholder="Enter amount"
                            />
                        </View>

                        <View style={styles.quickAmountRow}>
                            {['-10%', '-5%', 'Full', '+5%'].map((label, idx) => {
                                const multiplier = [0.9, 0.95, 1, 1.05][idx];
                                return (
                                    <TouchableOpacity
                                        key={label}
                                        style={styles.quickChip}
                                        onPress={() => setOfferAmount((property.price * multiplier).toFixed(0))}
                                    >
                                        <Text style={styles.quickChipText}>{label}</Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>

                        <TouchableOpacity
                            style={[styles.fullWidthBtn, (submittingOffer || !offerAmount) && styles.btnDisabled]}
                            onPress={handleSubmitOffer}
                            disabled={submittingOffer || !offerAmount}
                        >
                            {submittingOffer ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.btnText}>Submit Offer</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View >
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.white,
    },
    errorText: {
        fontSize: 16,
        color: colors.gray500,
    },

    // Header & Image Carousel
    headerContainer: {
        height: width * 0.8,
        position: 'relative',
        backgroundColor: colors.gray900,
    },
    headerImage: {
        width: width,
        height: '100%',
    },
    noImageContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.gray100,
    },
    noImageText: {
        marginTop: spacing.sm,
        color: colors.gray500,
        fontSize: 14,
    },
    navbarOverlay: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 48 : 32,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        zIndex: 10,
    },
    navbarActions: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    circleBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    paginationDots: {
        position: 'absolute',
        bottom: 24,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    dotActive: {
        backgroundColor: colors.white,
        width: 20,
    },

    // Content
    contentScroll: {
        flex: 1,
        marginTop: -20, // Overlap the header
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: colors.gray50,
        overflow: 'visible',
    },
    contentContainer: {
        paddingTop: spacing.xl,
        paddingHorizontal: spacing.lg,
    },
    titleSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.lg,
    },
    propertyTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: 4,
        maxWidth: width * 0.7,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationText: {
        fontSize: 14,
        color: colors.gray500,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray900,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
        gap: 4,
    },
    ratingText: {
        color: colors.white,
        fontSize: 12,
        fontWeight: '600',
    },

    // Features
    featuresGrid: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        padding: spacing.md,
        borderRadius: borderRadius.xl,
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    featureItem: {
        alignItems: 'center',
        flex: 1,
    },
    featureValue: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.gray900,
        marginTop: 4,
    },
    featureLabel: {
        fontSize: 12,
        color: colors.gray500,
    },

    divider: {
        height: 1,
        backgroundColor: colors.gray200,
        marginVertical: spacing.xl,
    },

    // Standard Section
    section: {
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: spacing.md,
    },
    descriptionText: {
        fontSize: 15,
        lineHeight: 24,
        color: colors.gray600,
    },

    // Agent Section
    agentSection: {
        marginBottom: spacing.lg,
    },
    agentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    agentAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    agentInitial: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.white,
    },
    agentInfo: {
        flex: 1,
    },
    agentName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.gray900,
    },
    agentRole: {
        fontSize: 12,
        color: colors.gray500,
        marginTop: 2,
    },
    contactBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.gray50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.gray200,
    },

    // Map
    addressText: {
        fontSize: 14,
        color: colors.gray600,
        marginBottom: spacing.md,
    },
    mapPreview: {
        height: 180,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        position: 'relative',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    openMapBtn: {
        position: 'absolute',
        bottom: spacing.md,
        right: spacing.md,
        backgroundColor: colors.white,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: borderRadius.full,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    openMapText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.gray900,
    },

    // Bottom Bar
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.gray200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10,
    },
    priceContainer: {
        flex: 1,
    },
    priceLabel: {
        fontSize: 12,
        color: colors.gray500,
    },
    priceValue: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.gray900,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    actionBtn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtn: {
        backgroundColor: colors.primary,
    },
    primaryBtnText: {
        color: colors.white,
        fontWeight: '600',
        fontSize: 15,
    },
    secondaryBtn: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    secondaryBtnText: {
        color: colors.gray900,
        fontWeight: '600',
        fontSize: 15,
    },
    editBtn: {
        backgroundColor: colors.gray900,
        width: 120,
    },
    editBtnText: {
        color: colors.white,
        fontWeight: '600',
        fontSize: 15,
    },
    statusBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        borderRadius: borderRadius.lg,
    },
    statusText: {
        color: '#166534',
        fontWeight: '700',
    },

    // Modals
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: spacing.xl,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.gray900,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gray700,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray50,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    inputText: {
        marginLeft: spacing.md,
        fontSize: 16,
        color: colors.gray900,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: borderRadius.full,
        backgroundColor: colors.gray50,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    chipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    chipText: {
        fontSize: 14,
        color: colors.gray700,
    },
    chipTextActive: {
        color: colors.white,
        fontWeight: '600',
    },
    fullWidthBtn: {
        backgroundColor: colors.primary,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginTop: spacing.xl,
        marginBottom: Platform.OS === 'ios' ? 20 : 0,
    },
    btnDisabled: {
        backgroundColor: colors.gray200,
    },
    btnText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
    // Offer Modal specific
    offerSubtitle: {
        fontSize: 16,
        color: colors.gray600,
        marginBottom: spacing.lg,
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray50,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.gray200,
        marginBottom: spacing.lg,
    },
    currencySymbol: {
        fontSize: 24,
        fontWeight: '600',
        color: colors.gray900,
        marginRight: spacing.sm,
    },
    amountInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: '600',
        color: colors.gray900,
    },
    quickAmountRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    quickChip: {
        flex: 1,
        paddingVertical: 8,
        backgroundColor: colors.gray100,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    quickChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.gray700,
    },
});
