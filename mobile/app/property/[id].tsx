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
    useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { API_URL } from '../../constants/api';

// Available time slots
const TIME_SLOTS = [
    '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '02:00 PM', '03:00 PM',
    '04:00 PM', '05:00 PM', '06:00 PM'
];

// Sample coordinates for Indian cities
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

// Amenities Icon Mapping
const AMENITY_ICONS: { [key: string]: keyof typeof Ionicons.glyphMap } = {
    'Pool': 'water-outline',
    'Gym': 'barbell-outline',
    'Parking': 'car-outline',
    'Security': 'shield-checkmark-outline',
    'WiFi': 'wifi-outline',
    'AC': 'snow-outline',
    'Garden': 'leaf-outline',
    'Elevator': 'arrow-up-circle-outline',
};

export default function PropertyDetail() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const { id } = params;
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();

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

    // Image Viewer State
    const [showImageModal, setShowImageModal] = useState(false);

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
                setCurrentUser(parsed);
            }
        } catch (e) {
            console.log('Error loading user:', e);
        }
    };

    const fetchProperty = async () => {
        try {
            const response = await axios.get(`${API_URL}/properties/${id}`);
            setProperty(response.data);
        } catch (error) {
            console.error('Error fetching property:', error);
            Alert.alert('Error', 'Failed to load property details');
        } finally {
            setLoading(false);
        }
    };

    const checkFavoriteStatus = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (!token) return;
            const res = await axios.get(`${API_URL}/users/favorites/check/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsFavorite(res.data.is_favorite);
        } catch (e: any) {
            if (e.response?.status === 401) {
                await AsyncStorage.removeItem('auth_token');
                setCurrentUser(null);
            }
        }
    };

    const checkActiveBooking = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (!token) return;

            const res = await axios.get(`${API_URL}/bookings/my-visits`, {
                headers: { Authorization: `Bearer ${token}` }
            });

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
        } catch (e: any) {
            if (e.response?.status === 401) {
                await AsyncStorage.removeItem('auth_token');
                setCurrentUser(null);
            }
        }
    };

    const toggleFavorite = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (!token) {
                Alert.alert('Login Required', 'Please login to save properties');
                return;
            }

            if (isFavorite) {
                await axios.delete(`${API_URL}/users/favorites/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setIsFavorite(false);
            } else {
                await axios.post(`${API_URL}/users/favorites/${id}`,
                    {}, // Empty body for POST
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setIsFavorite(true);
                Alert.alert('Saved!', 'Property added to your saved list');
            }
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.detail || 'Failed to update favorites');
        }
    };

    const shareProperty = async () => {
        try {
            await Share.share({
                message: `Check out ${property.title} in ${property.city} on NestFind! Price: ₹${property.price?.toLocaleString()}`,
                title: property.title,
            });
        } catch (error) { }
    };

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
            Alert.alert('Success! 🎉', 'Your offer has been submitted.');
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.detail || 'Failed to submit offer');
        } finally {
            setSubmittingOffer(false);
        }
    };

    const handleScheduleVisit = async () => {
        if (!selectedTimeSlot) {
            Alert.alert('Select Time', 'Please select a time slot');
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
                ? `${visitMessage}\n\n📅 Date: ${formatDate(selectedDate)}\n⏰ Time: ${selectedTimeSlot}`
                : `📅 Date: ${formatDate(selectedDate)}\n⏰ Time: ${selectedTimeSlot}`;

            await axios.post(
                `${API_URL}/bookings/`,
                {
                    property_id: parseInt(id as string),
                    buyer_message: message,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            Alert.alert('Scheduled! 🎉', 'Your visit request has been sent to the agent.');
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
        if (date) setSelectedDate(date);
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-IN', {
            weekday: 'short', day: 'numeric', month: 'short'
        });
    };

    const getMinDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
    };

    const getCoordinates = () => {
        if (property?.latitude && property?.longitude) {
            return { lat: property.latitude, lng: property.longitude };
        }
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
        if (url) Linking.openURL(url);
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
    const specs = property.specifications || {};
    const amenities = property.amenities || [];
    const coords = getCoordinates();

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Navbar Overlay - Permanent */}
            <View style={[styles.navbarOverlay, { top: insets.top + 10 }]}>
                <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color={colors.gray900} />
                </TouchableOpacity>
                <View style={styles.navbarActions}>
                    <TouchableOpacity style={styles.circleBtn} onPress={shareProperty}>
                        <Ionicons name="share-outline" size={20} color={colors.gray900} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.circleBtn} onPress={toggleFavorite}>
                        <Ionicons
                            name={isFavorite ? "heart" : "heart-outline"}
                            size={20}
                            color={isFavorite ? colors.error : colors.gray900}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }} // Space for fixed bottom bar
            >
                {/* Image Header */}
                <View style={[styles.headerContainer, { height: width * 0.75 }]}>
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
                                <TouchableOpacity key={index} activeOpacity={0.9} onPress={() => setShowImageModal(true)}>
                                    <Image
                                        source={{ uri: `${API_URL}/${img.image_path}` }}
                                        style={{ width, height: '100%' }}
                                        resizeMode="cover"
                                    />
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={[styles.noImageContainer, { width }]}>
                                <Ionicons name="image-outline" size={48} color={colors.gray400} />
                                <Text style={styles.noImageText}>No Images</Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Dots */}
                    {images.length > 1 && (
                        <View style={styles.paginationDots}>
                            {images.map((_: any, i: number) => (
                                <View
                                    key={i}
                                    style={[styles.dot, i === currentImageIndex && styles.dotActive]}
                                />
                            ))}
                        </View>
                    )}
                </View>

                {/* Main Content Sheet */}
                <View style={styles.contentSheet}>
                    <View style={styles.handleBar}>
                        <View style={styles.handle} />
                    </View>

                    {/* Title Section */}
                    <View style={styles.section}>
                        <View style={styles.titleRow}>
                            <Text style={styles.propertyTitle}>{property.title}</Text>
                            {/* <View style={styles.badge}>
                                <Text style={styles.badgeText}>New</Text>
                            </View> */}
                        </View>
                        <View style={styles.locationRow}>
                            <Ionicons name="location-sharp" size={16} color={colors.gray500} />
                            <Text style={styles.locationText}>{property.city}, {property.state}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Dynamic Stats Grid */}
                    <View style={styles.statsGrid}>
                        {(() => {
                            const type = property.property_type?.toLowerCase() || 'residential';
                            const isPlot = ['land', 'plot'].includes(type);
                            const isCommercial = ['commercial', 'office', 'shop'].includes(type);

                            if (isPlot) {
                                return (
                                    <>
                                        <View style={styles.statItem}>
                                            <View style={styles.statIconContainer}>
                                                <Ionicons name="expand-outline" size={20} color={colors.primary} />
                                            </View>
                                            <Text style={styles.statValue}>{specs.area || specs.area_sqft || '-'}</Text>
                                            <Text style={styles.statLabel}>Area</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <View style={styles.statIconContainer}>
                                                <Ionicons name="resize-outline" size={20} color={colors.primary} />
                                            </View>
                                            <Text style={styles.statValue}>{specs.dimensions || '-'}</Text>
                                            <Text style={styles.statLabel}>Dimensions</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <View style={styles.statIconContainer}>
                                                <Ionicons name="compass-outline" size={20} color={colors.primary} />
                                            </View>
                                            <Text style={styles.statValue}>{specs.facing || '-'}</Text>
                                            <Text style={styles.statLabel}>Facing</Text>
                                        </View>
                                    </>
                                );
                            }

                            if (isCommercial) {
                                return (
                                    <>
                                        <View style={styles.statItem}>
                                            <View style={styles.statIconContainer}>
                                                <Ionicons name="scan-outline" size={20} color={colors.primary} />
                                            </View>
                                            <Text style={styles.statValue}>{specs.area_sqft || '-'}</Text>
                                            <Text style={styles.statLabel}>Sqft</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <View style={styles.statIconContainer}>
                                                <Ionicons name="car-outline" size={20} color={colors.primary} />
                                            </View>
                                            <Text style={styles.statValue}>{specs.parking || '-'}</Text>
                                            <Text style={styles.statLabel}>Parking</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <View style={styles.statIconContainer}>
                                                <Ionicons name="water-outline" size={20} color={colors.primary} />
                                            </View>
                                            <Text style={styles.statValue}>{specs.washrooms || '-'}</Text>
                                            <Text style={styles.statLabel}>Washrooms</Text>
                                        </View>
                                    </>
                                );
                            }

                            // Default: Residential
                            return (
                                <>
                                    <View style={styles.statItem}>
                                        <View style={styles.statIconContainer}>
                                            <Ionicons name="bed-outline" size={20} color={colors.primary} />
                                        </View>
                                        <Text style={styles.statValue}>{specs.bedrooms || '-'}</Text>
                                        <Text style={styles.statLabel}>Beds</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <View style={styles.statIconContainer}>
                                            <Ionicons name="water-outline" size={20} color={colors.primary} />
                                        </View>
                                        <Text style={styles.statValue}>{specs.bathrooms || '-'}</Text>
                                        <Text style={styles.statLabel}>Baths</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <View style={styles.statIconContainer}>
                                            <Ionicons name="expand-outline" size={20} color={colors.primary} />
                                        </View>
                                        <Text style={styles.statValue}>{specs.area_sqft || '-'}</Text>
                                        <Text style={styles.statLabel}>Sqft</Text>
                                    </View>
                                </>
                            );
                        })()}

                        <View style={styles.statItem}>
                            <View style={[styles.statIconContainer, { backgroundColor: '#F3E8FF' }]}>
                                <Ionicons name="home-outline" size={20} color="#7C3AED" />
                            </View>
                            <Text style={styles.statValue} numberOfLines={1}>{property.property_type}</Text>
                            <Text style={styles.statLabel}>Type</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About this home</Text>
                        <Text style={styles.description}>
                            {property.description || 'No description provided.'}
                        </Text>
                    </View>

                    <View style={styles.divider} />

                    {/* Detailed Specifications */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Property Details</Text>
                        <View style={styles.detailsGrid}>
                            {Object.entries(specs).map(([key, value]) => {
                                // Skip generic keys if already shown or irrelevant
                                if (['bedrooms', 'bathrooms', 'area_sqft'].includes(key) && ['apartment', 'villa', 'house'].includes(property.property_type?.toLowerCase())) return null;
                                if (!value) return null;

                                return (
                                    <View key={key} style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                                        <Text style={styles.detailValue}>{String(value)}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Amenities */}
                    {amenities.length > 0 && (
                        <>
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Amenities</Text>
                                <View style={styles.amenitiesContainer}>
                                    {amenities.map((amenity: string, idx: number) => (
                                        <View key={idx} style={styles.amenityChip}>
                                            <Ionicons
                                                name={AMENITY_ICONS[amenity] || 'checkmark-circle-outline'}
                                                size={18}
                                                color={colors.gray700}
                                            />
                                            <Text style={styles.amenityText}>{amenity}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                            <View style={styles.divider} />
                        </>
                    )}

                    {/* Host Info */}
                    {property.owner && (
                        <>
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Hosted by</Text>
                                <View style={styles.hostCard}>
                                    <View style={styles.hostAvatar}>
                                        <Text style={styles.hostInitial}>{property.owner.first_name?.[0]}</Text>
                                    </View>
                                    <View style={styles.hostInfo}>
                                        <Text style={styles.hostName}>
                                            {property.owner.first_name} {property.owner.last_name}
                                        </Text>
                                        <Text style={styles.hostRole}>
                                            {property.owner.agency_name || 'Individual Agent'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.contactBtn}
                                        onPress={() => {
                                            if (property.owner.phone) Linking.openURL(`tel:${property.owner.phone}`);
                                            else Alert.alert('Info', 'Phone unavailable');
                                        }}
                                    >
                                        <Ionicons name="call" size={20} color={colors.gray900} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.divider} />
                        </>
                    )}

                    {/* Map */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Where you'll be</Text>
                        <Text style={styles.addressText}>{property.address}</Text>
                        <View style={styles.mapContainer}>
                            <MapView
                                style={StyleSheet.absoluteFill}
                                initialRegion={{
                                    latitude: coords.lat,
                                    longitude: coords.lng,
                                    latitudeDelta: 0.01,
                                    longitudeDelta: 0.01,
                                }}
                                scrollEnabled={false}
                                zoomEnabled={false}
                            >
                                <Marker coordinate={{ latitude: coords.lat, longitude: coords.lng }} />
                            </MapView>
                            <TouchableOpacity style={styles.mapBtn} onPress={openMapsApp}>
                                <Text style={styles.mapBtnText}>Open in Maps</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Bar */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.lg }]}>
                <View style={styles.priceMeta}>
                    <Text style={styles.priceLabel}>Total Price</Text>
                    <Text style={styles.priceValue}>₹{property.price?.toLocaleString()}</Text>
                </View>

                {currentUser?.role === 'agent' ? (
                    <TouchableOpacity
                        style={styles.primaryActionBtn}
                        onPress={() => router.push(`/agent/edit-property/${id}`)}
                    >
                        <Text style={styles.primaryBtnText}>Edit Property</Text>
                    </TouchableOpacity>
                ) : (
                    hasActiveBooking ? (
                        <View style={styles.statusBadgeFull}>
                            <Text style={styles.statusTextFull}>
                                {activeBookingStatus === 'PENDING' ? 'Req Sent' : activeBookingStatus}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.actionsRow}>
                            <TouchableOpacity
                                style={styles.secondaryActionBtn}
                                onPress={() => setShowScheduleModal(true)}
                            >
                                <Text style={styles.secondaryBtnText}>Schedule</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.primaryActionBtn}
                                onPress={() => setShowOfferModal(true)}
                            >
                                <Text style={styles.primaryBtnText}>Offer</Text>
                            </TouchableOpacity>
                        </View>
                    )
                )}
            </View>

            {/* Modals reused */}
            <Modal visible={showScheduleModal} animationType="slide" transparent={true}>
                <View style={[styles.modalOverlay, { paddingBottom: insets.bottom }]}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Schedule Visit</Text>
                            <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
                                <Ionicons name="close" size={24} color={colors.gray500} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>Select Date</Text>
                            <TouchableOpacity style={styles.inputBox} onPress={() => setShowDatePicker(true)}>
                                <Ionicons name="calendar-outline" size={20} color={colors.gray900} />
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
                                        style={[styles.chip, selectedTimeSlot === slot && styles.chipActive]}
                                        onPress={() => setSelectedTimeSlot(slot)}
                                    >
                                        <Text style={[styles.chipText, selectedTimeSlot === slot && styles.chipTextActive]}>{slot}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TouchableOpacity
                                style={[styles.fullWidthBtn, (!selectedTimeSlot || scheduling) && styles.btnDisabled]}
                                onPress={handleScheduleVisit}
                            >
                                {scheduling ? (
                                    <ActivityIndicator color={colors.white} />
                                ) : (
                                    <Text style={styles.fullWidthBtnText}>Confirm Visit</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Full Screen Image Viewer Modal */}
            {/* Full Screen Image Viewer Modal */}
            <Modal visible={showImageModal} animationType="fade" transparent={true}>
                <View style={styles.imageModalContainer}>
                    <StatusBar hidden />
                    <TouchableOpacity
                        style={[styles.closeImageBtn, { top: insets.top + 20 }]}
                        onPress={() => setShowImageModal(false)}
                    >
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>

                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ alignItems: 'center' }}
                    >
                        {images.map((img: any, index: number) => (
                            <View key={index} style={{ width, height: '100%', justifyContent: 'center' }}>
                                <Image
                                    source={{ uri: `${API_URL}/${img.image_path}` }}
                                    style={{ width, height: width * 0.75 }} // Maintain aspect ratio or contain
                                    resizeMode="contain"
                                />
                            </View>
                        ))}
                    </ScrollView>

                    <View style={styles.imagePagination}>
                        <Text style={styles.imagePaginationText}>
                            Swipe to view • {images.length} photos
                        </Text>
                    </View>
                </View>
            </Modal>

            <Modal visible={showOfferModal} animationType="slide" transparent={true}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={[styles.modalOverlay, { paddingBottom: insets.bottom }]}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Make Offer</Text>
                            <TouchableOpacity onPress={() => setShowOfferModal(false)}>
                                <Ionicons name="close" size={24} color={colors.gray500} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.subtext}>Listing: ₹{property.price?.toLocaleString()}</Text>
                        <View style={styles.amountInputContainer}>
                            <Text style={styles.currencySymbol}>₹</Text>
                            <TextInput
                                style={styles.amountInput}
                                value={offerAmount}
                                onChangeText={setOfferAmount}
                                keyboardType="numeric"
                                placeholder="Amount"
                            />
                        </View>
                        <View style={styles.chipsContainer}>
                            {['-10%', '-5%', 'Fair', '+5%'].map((l, i) => (
                                <TouchableOpacity
                                    key={l}
                                    style={styles.chip}
                                    onPress={() => setOfferAmount((property.price * [0.9, 0.95, 1, 1.05][i]).toFixed(0))}
                                >
                                    <Text style={styles.chipText}>{l}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity
                            style={[styles.fullWidthBtn, (submittingOffer || !offerAmount) && styles.btnDisabled]}
                            onPress={handleSubmitOffer}
                            disabled={submittingOffer || !offerAmount}
                        >
                            {submittingOffer ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Submit</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

        </View >
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: colors.gray50,
    },
    scrollView: {
        flex: 1,
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
    },
    errorText: {
        color: colors.gray500,
        fontSize: 16,
    },

    // Header
    headerContainer: {
        width: '100%',
        backgroundColor: colors.gray900,
        position: 'relative',
    },
    noImageContainer: {
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.gray200,
    },
    noImageText: {
        marginTop: 8,
        color: colors.gray500,
    },
    paginationDots: {
        position: 'absolute',
        bottom: 24,
        alignSelf: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    dotActive: {
        width: 20,
        backgroundColor: '#fff',
    },

    // Navbar
    navbarOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
    },
    navbarActions: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    circleBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },

    // Content Sheet
    contentSheet: {
        marginTop: -24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: colors.white,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        minHeight: 500,
    },
    handleBar: {
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.gray200,
    },

    // Title
    section: {
        marginTop: spacing.md,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    propertyTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.gray900,
        flex: 1,
        marginRight: spacing.sm,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    locationText: {
        fontSize: 15,
        color: colors.gray500,
    },
    badge: {
        backgroundColor: colors.gray900,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 100,
    },
    badgeText: {
        color: colors.white,
        fontSize: 12,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: colors.gray100,
        marginVertical: spacing.md,
    },

    // Grid
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: colors.white,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.gray100,
        paddingHorizontal: spacing.sm,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#E0F2FE', // Light blue bg
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.gray900,
    },
    statLabel: {
        fontSize: 11,
        color: colors.gray500,
        fontWeight: '500',
    },

    // Details List
    detailsGrid: {
        backgroundColor: colors.gray50,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        gap: spacing.sm,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.03)',
    },
    detailLabel: {
        fontSize: 14,
        color: colors.gray600,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 14,
        color: colors.gray900,
        fontWeight: '600',
    },

    // Text
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: 8,
    },
    description: {
        fontSize: 15,
        lineHeight: 24,
        color: colors.gray600,
    },

    // Amenities
    amenitiesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    amenityChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray50,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: colors.gray200,
        gap: 6,
    },
    amenityText: {
        fontSize: 14,
        color: colors.gray700,
    },

    // Host
    hostCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray50,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    hostAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    hostInitial: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.white,
    },
    hostInfo: {
        flex: 1,
    },
    hostName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.gray900,
    },
    hostRole: {
        fontSize: 13,
        color: colors.gray500,
    },
    contactBtn: {
        padding: 8,
        backgroundColor: colors.white,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.gray200,
    },

    // Map
    addressText: {
        fontSize: 14,
        color: colors.gray500,
        marginBottom: spacing.md,
    },
    mapContainer: {
        height: 180,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        position: 'relative',
    },
    mapBtn: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: colors.white,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        elevation: 3,
    },
    mapBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.gray900,
    },

    // Bottom Bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.white,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.gray200,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        elevation: 8,
    },
    priceMeta: {
        flex: 1,
    },
    priceLabel: {
        fontSize: 12,
        color: colors.gray500,
    },
    priceValue: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.gray900,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    primaryActionBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: borderRadius.lg,
    },
    secondaryActionBtn: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.gray200,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: borderRadius.lg,
    },
    primaryBtnText: {
        color: colors.white,
        fontWeight: '600',
        fontSize: 14,
    },
    secondaryBtnText: {
        color: colors.gray900,
        fontWeight: '600',
        fontSize: 14,
    },
    statusBadgeFull: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: borderRadius.lg,
    },
    statusTextFull: {
        color: '#166534',
        fontWeight: '700',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: spacing.xl,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    label: {
        marginTop: spacing.md,
        marginBottom: 8,
        fontWeight: '600',
        color: colors.gray700,
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.gray200,
        borderRadius: borderRadius.lg,
        gap: 12,
    },
    inputText: {
        fontSize: 16,
        color: colors.gray900,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    chipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    chipText: {
        color: colors.gray700,
    },
    chipTextActive: {
        color: colors.white,
        fontWeight: '600',
    },
    fullWidthBtn: {
        marginTop: spacing.xl,
        backgroundColor: colors.primary,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    btnDisabled: {
        backgroundColor: colors.gray200,
    },
    btnText: {
        color: colors.white,
        fontWeight: '700',
        fontSize: 16,
    },
    subtext: {
        color: colors.gray500,
        marginBottom: spacing.lg,
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.gray200,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.lg,
    },
    currencySymbol: {
        fontSize: 24,
        fontWeight: '600',
        color: colors.gray900,
    },
    amountInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: '600',
        padding: spacing.md,
        color: colors.gray900,
    },
    fullWidthBtnText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.white,
    },
    // Image Modal Styles
    imageModalContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
    },
    closeImageBtn: {
        position: 'absolute',
        right: 20,
        zIndex: 50,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    imagePagination: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
    },
    imagePaginationText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
});
