import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Image,
    Linking,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { API_URL } from '../../constants/api';

const PROPERTY_TYPES = ['Apartment', 'House', 'Villa', 'Plot', 'Commercial'];
const LISTING_TYPES = ['sale', 'rent'];

export default function AddPropertyScreen() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [images, setImages] = useState<string[]>([]);

    // Form data
    const [form, setForm] = useState({
        title: '',
        property_type: 'Apartment',
        listing_type: 'sale',
        price: '',
        address: '',
        city: '',
        state: '',
        zipcode: '',
        latitude: '',
        longitude: '',
        bedrooms: '',
        bathrooms: '',
        area: '',
        description: '',
        amenities: [] as string[],
    });

    const updateForm = (key: string, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const toggleAmenity = (amenity: string) => {
        setForm(prev => ({
            ...prev,
            amenities: prev.amenities.includes(amenity)
                ? prev.amenities.filter(a => a !== amenity)
                : [...prev.amenities, amenity]
        }));
    };

    const nextStep = () => {
        if (step === 1 && (!form.title || !form.price)) {
            Alert.alert('Error', 'Please fill in title and price');
            return;
        }
        if (step === 2 && (!form.city || !form.address)) {
            Alert.alert('Error', 'Please fill in address and city');
            return;
        }
        setStep(prev => Math.min(prev + 1, 4));
    };

    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async () => {
        if (!form.title || !form.price || !form.city) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('auth_token');

            // Create property first
            const propertyRes = await axios.post(
                `${API_URL}/properties/`,
                {
                    title: form.title,
                    property_type: form.property_type,
                    listing_type: form.listing_type,
                    price: parseFloat(form.price),
                    address: form.address,
                    city: form.city,
                    state: form.state,
                    zipcode: form.zipcode,
                    latitude: form.latitude ? parseFloat(form.latitude) : null,
                    longitude: form.longitude ? parseFloat(form.longitude) : null,
                    bedrooms: parseInt(form.bedrooms) || 0,
                    bathrooms: parseInt(form.bathrooms) || 0,
                    area: parseFloat(form.area) || 0,
                    description: form.description,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const propertyId = propertyRes.data.id;

            // Upload images if any
            if (images.length > 0 && propertyId) {
                for (let i = 0; i < images.length; i++) {
                    const uri = images[i];
                    const formData = new FormData();

                    // Get file extension
                    const ext = uri.split('.').pop() || 'jpg';
                    const fileName = `property_${propertyId}_${i}.${ext}`;

                    formData.append('file', {
                        uri: uri,
                        name: fileName,
                        type: `image/${ext}`,
                    } as any);

                    try {
                        await axios.post(
                            `${API_URL}/properties/${propertyId}/images`,
                            formData,
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    'Content-Type': 'multipart/form-data',
                                },
                            }
                        );
                    } catch (imgErr) {
                        console.log('Image upload error:', imgErr);
                    }
                }
            }

            Alert.alert('Success', 'Property listed successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to create property');
        } finally {
            setLoading(false);
        }
    };

    const AMENITIES = ['Parking', 'Pool', 'Gym', 'Garden', 'Security', 'Elevator', 'Balcony', 'AC'];

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert('Permission Required', 'Please allow access to photos to upload images');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: 10 - images.length,
            quality: 0.8,
        });

        if (!result.canceled && result.assets) {
            const newImages = result.assets.map(asset => asset.uri);
            setImages(prev => [...prev, ...newImages].slice(0, 10));
        }
    };

    const takePhoto = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert('Permission Required', 'Please allow camera access to take photos');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
        });

        if (!result.canceled && result.assets) {
            setImages(prev => [...prev, result.assets[0].uri].slice(0, 10));
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backBtn}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Property</Text>
                <View style={{ width: 50 }} />
            </View>

            {/* Progress */}
            <View style={styles.progressContainer}>
                {[1, 2, 3, 4].map((s, idx) => (
                    <TouchableOpacity key={`step-${s}-${idx}`} style={styles.progressStep} activeOpacity={1}>
                        <View style={[styles.progressDot, step >= s && styles.progressDotActive]}>
                            <Text style={[styles.progressDotText, step >= s && styles.progressDotTextActive]}>
                                {s}
                            </Text>
                        </View>
                        <Text style={styles.progressLabel}>
                            {s === 1 ? 'Basic' : s === 2 ? 'Location' : s === 3 ? 'Details' : 'Review'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
                {/* Step 1: Basic Info */}
                {step === 1 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>
                            <Ionicons name="clipboard-outline" size={20} color={colors.gray900} /> Basic Information
                        </Text>

                        <Text style={styles.label}>Property Title *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Luxury 3BHK Apartment"
                            value={form.title}
                            onChangeText={(v) => updateForm('title', v)}
                        />

                        <Text style={styles.label}>Property Type *</Text>
                        <View style={styles.optionsRow}>
                            {PROPERTY_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.optionBtn, form.property_type === type && styles.optionBtnActive]}
                                    onPress={() => updateForm('property_type', type)}
                                >
                                    <Text style={[styles.optionBtnText, form.property_type === type && styles.optionBtnTextActive]}>
                                        {type}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Listing Type *</Text>
                        <View style={styles.optionsRow}>
                            {LISTING_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.optionBtn, styles.optionBtnWide, form.listing_type === type && styles.optionBtnActive]}
                                    onPress={() => updateForm('listing_type', type)}
                                >
                                    <Text style={[styles.optionBtnText, form.listing_type === type && styles.optionBtnTextActive]}>
                                        {type === 'sale' ? (
                                            <><Ionicons name="home-outline" size={14} /> For Sale</>
                                        ) : (
                                            <><Ionicons name="key-outline" size={14} /> For Rent</>
                                        )}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Price (₹) *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., 5000000"
                            value={form.price}
                            onChangeText={(v) => updateForm('price', v)}
                            keyboardType="numeric"
                        />
                    </View>
                )}

                {/* Step 2: Location */}
                {step === 2 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>
                            <Ionicons name="location-outline" size={20} color={colors.gray900} /> Location Details
                        </Text>

                        <Text style={styles.label}>Address *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Street address"
                            value={form.address}
                            onChangeText={(v) => updateForm('address', v)}
                        />

                        <Text style={styles.label}>City *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Mumbai"
                            value={form.city}
                            onChangeText={(v) => updateForm('city', v)}
                        />

                        <View style={styles.row}>
                            <View style={styles.halfInput}>
                                <Text style={styles.label}>State</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., Maharashtra"
                                    value={form.state}
                                    onChangeText={(v) => updateForm('state', v)}
                                />
                            </View>
                            <View style={styles.halfInput}>
                                <Text style={styles.label}>Zipcode</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., 400001"
                                    value={form.zipcode}
                                    onChangeText={(v) => updateForm('zipcode', v)}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        {/* Map Coordinates */}
                        <View style={styles.mapSection}>
                            <Text style={styles.mapTitle}>
                                <Ionicons name="map-outline" size={16} color={colors.gray900} /> Map Location
                            </Text>
                            <Text style={styles.mapHint}>Use GPS or enter coordinates manually</Text>

                            {/* Use Current Location Button */}
                            <TouchableOpacity
                                style={styles.useLocationBtn}
                                onPress={async () => {
                                    setFetchingLocation(true);
                                    try {
                                        const { status } = await Location.requestForegroundPermissionsAsync();
                                        if (status !== 'granted') {
                                            Alert.alert('Permission Denied', 'Please allow location access to use this feature');
                                            return;
                                        }
                                        const location = await Location.getCurrentPositionAsync({
                                            accuracy: Location.Accuracy.High,
                                        });
                                        updateForm('latitude', location.coords.latitude.toFixed(6));
                                        updateForm('longitude', location.coords.longitude.toFixed(6));
                                        Alert.alert('Success', 'Location captured!');
                                    } catch (e) {
                                        Alert.alert('Error', 'Failed to get location. Please enter manually.');
                                    } finally {
                                        setFetchingLocation(false);
                                    }
                                }}
                                disabled={fetchingLocation}
                            >
                                {fetchingLocation ? (
                                    <ActivityIndicator size="small" color={colors.white} />
                                ) : (
                                    <Text style={styles.useLocationBtnText}>
                                        <Ionicons name="navigate-outline" size={16} color={colors.white} /> Use Current Location
                                    </Text>
                                )}
                            </TouchableOpacity>

                            <Text style={styles.orText}>— or enter manually —</Text>

                            <View style={styles.row}>
                                <View style={styles.halfInput}>
                                    <Text style={styles.label}>Latitude</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g., 19.0760"
                                        value={form.latitude}
                                        onChangeText={(v) => updateForm('latitude', v)}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                                <View style={styles.halfInput}>
                                    <Text style={styles.label}>Longitude</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g., 72.8777"
                                        value={form.longitude}
                                        onChangeText={(v) => updateForm('longitude', v)}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>

                            {/* Map Preview */}
                            {form.latitude && form.longitude && (
                                <TouchableOpacity
                                    style={styles.mapPreview}
                                    onPress={() => Linking.openURL(`https://www.google.com/maps?q=${form.latitude},${form.longitude}`)}
                                >
                                    <View style={styles.mapPlaceholder}>
                                        <Ionicons name="map-outline" size={40} color={colors.gray400} style={{ marginBottom: 8 }} />
                                        <Text style={styles.mapPlaceholderText}>
                                            <Ionicons name="pin" size={14} /> {form.latitude}, {form.longitude}
                                        </Text>
                                        <Text style={styles.mapTapHint}>Tap to view in Google Maps</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                {/* Step 3: Details */}
                {step === 3 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>
                            <Ionicons name="home-outline" size={20} color={colors.gray900} /> Property Details
                        </Text>

                        <View style={styles.row}>
                            <View style={styles.halfInput}>
                                <Text style={styles.label}>Bedrooms</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="3"
                                    value={form.bedrooms}
                                    onChangeText={(v) => updateForm('bedrooms', v)}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={styles.halfInput}>
                                <Text style={styles.label}>Bathrooms</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="2"
                                    value={form.bathrooms}
                                    onChangeText={(v) => updateForm('bathrooms', v)}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Area (sqft)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., 1500"
                            value={form.area}
                            onChangeText={(v) => updateForm('area', v)}
                            keyboardType="numeric"
                        />

                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Describe your property..."
                            value={form.description}
                            onChangeText={(v) => updateForm('description', v)}
                            multiline
                        />

                        <Text style={styles.label}>Amenities</Text>
                        <View style={styles.amenitiesGrid}>
                            {AMENITIES.map((amenity) => (
                                <TouchableOpacity
                                    key={amenity}
                                    style={[styles.amenityBtn, form.amenities.includes(amenity) && styles.amenityBtnActive]}
                                    onPress={() => toggleAmenity(amenity)}
                                >
                                    <Text style={[styles.amenityBtnText, form.amenities.includes(amenity) && styles.amenityBtnTextActive]}>
                                        {amenity}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Image Upload Section */}
                        <View style={styles.imageSection}>
                            <Text style={styles.imageSectionTitle}>
                                <Ionicons name="camera-outline" size={16} color={colors.gray900} /> Property Photos
                            </Text>
                            <Text style={styles.imageSectionHint}>Add up to 10 photos of your property</Text>

                            {/* Upload Buttons */}
                            <View style={styles.imageButtonsRow}>
                                <TouchableOpacity style={styles.imagePickBtn} onPress={pickImage}>
                                    <Ionicons name="images-outline" size={24} color={colors.primary} style={{ marginBottom: 4 }} />
                                    <Text style={styles.imagePickBtnText}>Gallery</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.imagePickBtn} onPress={takePhoto}>
                                    <Ionicons name="camera-outline" size={24} color={colors.primary} style={{ marginBottom: 4 }} />
                                    <Text style={styles.imagePickBtnText}>Camera</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Image Preview Grid */}
                            {images.length > 0 && (
                                <View style={styles.imageGrid}>
                                    {images.map((uri, index) => (
                                        <TouchableOpacity key={`img-${index}`} style={styles.imagePreviewContainer} activeOpacity={1}>
                                            <Image source={{ uri }} style={styles.imagePreview} />
                                            <TouchableOpacity
                                                style={styles.removeImageBtn}
                                                onPress={() => removeImage(index)}
                                            >
                                                <Ionicons name="close" size={14} color={colors.white} />
                                            </TouchableOpacity>
                                            {index === 0 && (
                                                <View style={styles.coverBadge}>
                                                    <Text style={styles.coverBadgeText}>Cover</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            <Text style={styles.imageCount}>{images.length}/10 photos added</Text>
                        </View>
                    </View>
                )}

                {/* Step 4: Review */}
                {step === 4 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>
                            <Ionicons name="checkmark-circle-outline" size={20} color={colors.gray900} /> Review & Submit
                        </Text>

                        <View style={styles.reviewCard}>
                            <Text style={styles.reviewLabel}>Title</Text>
                            <Text style={styles.reviewValue}>{form.title}</Text>

                            <Text style={styles.reviewLabel}>Type</Text>
                            <Text style={styles.reviewValue}>{form.property_type} • {form.listing_type === 'sale' ? 'For Sale' : 'For Rent'}</Text>

                            <Text style={styles.reviewLabel}>Price</Text>
                            <Text style={styles.reviewPrice}>₹{parseInt(form.price || '0').toLocaleString()}</Text>

                            <Text style={styles.reviewLabel}>Location</Text>
                            <Text style={styles.reviewValue}>{form.address}, {form.city}</Text>

                            <Text style={styles.reviewLabel}>Features</Text>
                            <Text style={styles.reviewValue}>
                                <Ionicons name="bed-outline" size={12} /> {form.bedrooms || 0} beds • <Ionicons name="water-outline" size={12} /> {form.bathrooms || 0} baths • <Ionicons name="scan-outline" size={12} /> {form.area || 0} sqft
                            </Text>

                            <Text style={styles.reviewLabel}>Photos</Text>
                            <Text style={styles.reviewValue}><Ionicons name="camera-outline" size={12} /> {images.length} photos added</Text>
                        </View>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Footer Navigation */}
            <View style={styles.footer}>
                {step > 1 && (
                    <TouchableOpacity style={styles.prevBtn} onPress={prevStep}>
                        <Text style={styles.prevBtnText}>← Previous</Text>
                    </TouchableOpacity>
                )}

                {step < 4 ? (
                    <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
                        <Text style={styles.nextBtnText}>Next →</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        <Text style={styles.submitBtnText}>
                            {loading ? 'Submitting...' : <><Ionicons name="rocket-outline" size={18} color={colors.white} /> List Property</>}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gray50,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.md,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
    },
    backBtn: {
        color: colors.primary,
        fontWeight: '600',
    },
    headerTitle: {
        ...typography.h3,
        color: colors.gray900,
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.white,
    },
    progressStep: {
        alignItems: 'center',
    },
    progressDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.gray200,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    progressDotActive: {
        backgroundColor: colors.primary,
    },
    progressDotText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.gray500,
    },
    progressDotTextActive: {
        color: colors.white,
    },
    progressLabel: {
        fontSize: 10,
        color: colors.gray500,
    },
    formContainer: {
        flex: 1,
        padding: spacing.lg,
    },
    stepContent: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
    },
    stepTitle: {
        ...typography.h3,
        color: colors.gray900,
        marginBottom: spacing.lg,
    },
    label: {
        ...typography.bodySmall,
        color: colors.gray700,
        fontWeight: '600',
        marginBottom: spacing.xs,
        marginTop: spacing.sm,
    },
    input: {
        backgroundColor: colors.gray50,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        fontSize: 14,
        color: colors.gray900,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    optionBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        backgroundColor: colors.gray100,
    },
    optionBtnWide: {
        flex: 1,
        alignItems: 'center',
    },
    optionBtnActive: {
        backgroundColor: colors.primary,
    },
    optionBtnText: {
        fontSize: 12,
        color: colors.gray600,
        fontWeight: '600',
    },
    optionBtnTextActive: {
        color: colors.white,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    halfInput: {
        flex: 1,
    },
    amenitiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    amenityBtn: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        backgroundColor: colors.gray100,
    },
    amenityBtnActive: {
        backgroundColor: '#DBEAFE',
    },
    amenityBtnText: {
        fontSize: 11,
        color: colors.gray600,
    },
    amenityBtnTextActive: {
        color: '#3B82F6',
    },
    reviewCard: {
        backgroundColor: colors.gray50,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
    },
    reviewLabel: {
        fontSize: 10,
        color: colors.gray500,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginTop: spacing.sm,
    },
    reviewValue: {
        ...typography.body,
        color: colors.gray900,
    },
    reviewPrice: {
        ...typography.h3,
        color: colors.primary,
    },
    footer: {
        flexDirection: 'row',
        padding: spacing.lg,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
        gap: spacing.md,
    },
    prevBtn: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.gray100,
        alignItems: 'center',
    },
    prevBtnText: {
        color: colors.gray700,
        fontWeight: '600',
    },
    nextBtn: {
        flex: 2,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.gray900,
        alignItems: 'center',
    },
    nextBtnText: {
        color: colors.white,
        fontWeight: '600',
    },
    submitBtn: {
        flex: 2,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.primary,
        alignItems: 'center',
    },
    submitBtnDisabled: {
        opacity: 0.5,
    },
    submitBtnText: {
        color: colors.white,
        fontWeight: '700',
    },
    // Map Section Styles
    mapSection: {
        marginTop: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.gray200,
    },
    mapTitle: {
        ...typography.body,
        color: colors.gray900,
        fontWeight: '600',
    },
    mapHint: {
        ...typography.caption,
        color: colors.gray500,
        marginBottom: spacing.sm,
    },
    mapPreview: {
        marginTop: spacing.md,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: colors.gray100,
    },
    mapImage: {
        width: '100%',
        height: 150,
        backgroundColor: colors.gray200,
    },
    mapOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: spacing.sm,
    },
    mapOverlayText: {
        color: colors.white,
        fontWeight: '600',
        fontSize: 12,
    },
    mapTapHint: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
    },
    useLocationBtn: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    useLocationBtnText: {
        color: colors.white,
        fontWeight: '700',
        fontSize: 14,
    },
    orText: {
        textAlign: 'center',
        color: colors.gray400,
        fontSize: 12,
        marginVertical: spacing.md,
    },
    mapPlaceholder: {
        backgroundColor: colors.gray100,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginTop: spacing.md,
    },
    mapPlaceholderEmoji: {
        fontSize: 32,
        marginBottom: spacing.xs,
    },
    mapPlaceholderText: {
        ...typography.body,
        color: colors.gray900,
        fontWeight: '600',
    },
    getLocationBtn: {
        marginTop: spacing.sm,
        padding: spacing.sm,
        alignItems: 'center',
    },
    getLocationBtnText: {
        color: colors.gray500,
        fontSize: 12,
    },
    // Image Upload Styles
    imageSection: {
        marginTop: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.gray200,
    },
    imageSectionTitle: {
        ...typography.body,
        color: colors.gray900,
        fontWeight: '600',
    },
    imageSectionHint: {
        ...typography.caption,
        color: colors.gray500,
        marginBottom: spacing.md,
    },
    imageButtonsRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    imagePickBtn: {
        flex: 1,
        backgroundColor: colors.gray100,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.gray200,
        borderStyle: 'dashed',
    },
    imagePickBtnIcon: {
        fontSize: 28,
        marginBottom: spacing.xs,
    },
    imagePickBtnText: {
        ...typography.bodySmall,
        color: colors.gray600,
        fontWeight: '600',
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    imagePreviewContainer: {
        width: '30%',
        aspectRatio: 1,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    removeImageBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeImageBtnText: {
        color: colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
    coverBadge: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    coverBadgeText: {
        color: colors.white,
        fontSize: 8,
        fontWeight: '700',
    },
    imageCount: {
        ...typography.caption,
        color: colors.gray500,
        textAlign: 'center',
        marginTop: spacing.md,
    },
});
