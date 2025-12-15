import React, { useState, useEffect } from 'react';
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
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius, typography } from '../../../constants/theme';
import { API_URL } from '../../../constants/api';

const PROPERTY_TYPES = ['Apartment', 'House', 'Villa', 'Plot', 'Commercial'];
const LISTING_TYPES = ['sale', 'rent'];
const AMENITIES = ['Parking', 'Pool', 'Gym', 'Garden', 'Security', 'Elevator', 'Balcony', 'AC'];

export default function EditPropertyScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    // Handle id as array (expo-router can return array for dynamic routes)
    const propertyId = Array.isArray(id) ? id[0] : id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [images, setImages] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<any[]>([]);

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

    useEffect(() => {
        if (propertyId) {
            loadProperty();
        }
    }, [propertyId]);

    const loadProperty = async () => {
        try {
            console.log('Loading property with ID:', propertyId);

            const response = await axios.get(`${API_URL}/properties/${propertyId}`);
            const prop = response.data;

            setForm({
                title: prop.title || '',
                property_type: prop.property_type || 'Apartment',
                listing_type: prop.listing_type || 'sale',
                price: prop.price?.toString() || '',
                address: prop.address || '',
                city: prop.city || '',
                state: prop.state || '',
                zipcode: prop.zipcode || '',
                latitude: prop.latitude?.toString() || '',
                longitude: prop.longitude?.toString() || '',
                bedrooms: prop.bedrooms?.toString() || '',
                bathrooms: prop.bathrooms?.toString() || '',
                area: prop.area?.toString() || '',
                description: prop.description || '',
                amenities: prop.amenities || [],
            });

            if (prop.images) {
                setExistingImages(prop.images);
            }
        } catch (error) {
            console.error('Error loading property:', error);
            Alert.alert('Error', 'Failed to load property data');
            router.back();
        } finally {
            setLoading(false);
        }
    };

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

    const getCurrentLocation = async () => {
        setFetchingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Please enable location access');
                return;
            }
            const location = await Location.getCurrentPositionAsync({});
            updateForm('latitude', location.coords.latitude.toString());
            updateForm('longitude', location.coords.longitude.toString());
            Alert.alert('Success', 'Location updated!');
        } catch (error) {
            Alert.alert('Error', 'Failed to get location');
        } finally {
            setFetchingLocation(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets) {
            const newImages = result.assets.map(asset => asset.uri);
            setImages(prev => [...prev, ...newImages].slice(0, 10 - existingImages.length));
        }
    };

    const removeNewImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingImage = async (imageId: number) => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            await axios.delete(`${API_URL}/properties/${propertyId}/images/${imageId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setExistingImages(prev => prev.filter(img => img.id !== imageId));
        } catch (e) {
            Alert.alert('Error', 'Failed to remove image');
        }
    };

    const handleSubmit = async () => {
        if (!form.title || !form.price || !form.city) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        setSaving(true);
        try {
            const token = await AsyncStorage.getItem('auth_token');

            // Update property
            await axios.put(
                `${API_URL}/properties/${propertyId}`,
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

            // Upload new images if any
            if (images.length > 0) {
                for (let i = 0; i < images.length; i++) {
                    const uri = images[i];
                    const formData = new FormData();
                    const ext = uri.split('.').pop() || 'jpg';
                    formData.append('file', {
                        uri: uri,
                        name: `property_${propertyId}_new_${i}.${ext}`,
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

            Alert.alert('Success', 'Property updated successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to update property');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading property...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backBtn}><Ionicons name="arrow-back" size={16} /> Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Property</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
                {/* Basic Info Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        <Ionicons name="clipboard-outline" size={20} color={colors.gray900} /> Basic Information
                    </Text>

                    <Text style={styles.label}>Title *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., Luxury 3BHK Apartment"
                        value={form.title}
                        onChangeText={(v) => updateForm('title', v)}
                    />

                    <Text style={styles.label}>Property Type</Text>
                    <View style={styles.typeRow}>
                        {PROPERTY_TYPES.map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[styles.typeBtn, form.property_type === type && styles.typeBtnActive]}
                                onPress={() => updateForm('property_type', type)}
                            >
                                <Text style={[styles.typeBtnText, form.property_type === type && styles.typeBtnTextActive]}>
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Listing Type</Text>
                    <View style={styles.typeRow}>
                        {LISTING_TYPES.map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[styles.listingTypeBtn, form.listing_type === type && styles.listingTypeBtnActive]}
                                onPress={() => updateForm('listing_type', type)}
                            >
                                <Text style={[styles.listingTypeBtnText, form.listing_type === type && styles.listingTypeBtnTextActive]}>
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

                {/* Location Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        <Ionicons name="location-outline" size={20} color={colors.gray900} /> Location
                    </Text>

                    <Text style={styles.label}>Address</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Street address"
                        value={form.address}
                        onChangeText={(v) => updateForm('address', v)}
                    />

                    <View style={styles.row}>
                        <View style={styles.halfInput}>
                            <Text style={styles.label}>City *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Mumbai"
                                value={form.city}
                                onChangeText={(v) => updateForm('city', v)}
                            />
                        </View>
                        <View style={styles.halfInput}>
                            <Text style={styles.label}>State</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Maharashtra"
                                value={form.state}
                                onChangeText={(v) => updateForm('state', v)}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.locationBtn}
                        onPress={getCurrentLocation}
                        disabled={fetchingLocation}
                    >
                        {fetchingLocation ? (
                            <ActivityIndicator color={colors.white} />
                        ) : (
                            <Text style={styles.locationBtnText}>
                                <Ionicons name="navigate-outline" size={16} color={colors.white} /> Update Current Location
                            </Text>
                        )}
                    </TouchableOpacity>

                    {form.latitude && form.longitude && (
                        <Text style={styles.coordsText}>
                            Coordinates: {form.latitude}, {form.longitude}
                        </Text>
                    )}
                </View>

                {/* Details Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        <Ionicons name="home-outline" size={20} color={colors.gray900} /> Property Details
                    </Text>

                    <View style={styles.row}>
                        <View style={styles.thirdInput}>
                            <Text style={styles.label}>Beds</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="3"
                                value={form.bedrooms}
                                onChangeText={(v) => updateForm('bedrooms', v)}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.thirdInput}>
                            <Text style={styles.label}>Baths</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="2"
                                value={form.bathrooms}
                                onChangeText={(v) => updateForm('bathrooms', v)}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.thirdInput}>
                            <Text style={styles.label}>Area (sqft)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="1500"
                                value={form.area}
                                onChangeText={(v) => updateForm('area', v)}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Describe your property..."
                        value={form.description}
                        onChangeText={(v) => updateForm('description', v)}
                        multiline
                        numberOfLines={4}
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
                </View>

                {/* Images Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        <Ionicons name="camera-outline" size={20} color={colors.gray900} /> Property Photos
                    </Text>

                    {/* Existing Images */}
                    {existingImages.length > 0 && (
                        <View style={styles.imageGrid}>
                            {existingImages.map((img, index) => (
                                <TouchableOpacity key={`existing-${img.id}`} style={styles.imageContainer} activeOpacity={1}>
                                    <Image
                                        source={{ uri: `${API_URL}/${img.image_path}` }}
                                        style={styles.imagePreview}
                                    />
                                    <TouchableOpacity
                                        style={styles.removeImageBtn}
                                        onPress={() => removeExistingImage(img.id)}
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

                    {/* New Images */}
                    {images.length > 0 && (
                        <View style={styles.imageGrid}>
                            {images.map((uri, index) => (
                                <TouchableOpacity key={`new-${index}`} style={styles.imageContainer} activeOpacity={1}>
                                    <Image source={{ uri }} style={styles.imagePreview} />
                                    <TouchableOpacity
                                        style={styles.removeImageBtn}
                                        onPress={() => removeNewImage(index)}
                                    >
                                        <Ionicons name="close" size={14} color={colors.white} />
                                    </TouchableOpacity>
                                    <View style={styles.newBadge}>
                                        <Text style={styles.newBadgeText}>New</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                        <Text style={styles.addImageBtnText}>
                            <Ionicons name="add" size={16} /> Add More Photos
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <Text style={styles.saveBtnText}>
                            <Ionicons name="save-outline" size={18} color={colors.white} /> Save Changes
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
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
        backgroundColor: colors.gray50,
    },
    loadingText: {
        ...typography.body,
        color: colors.gray500,
        marginTop: spacing.md,
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
        borderBottomColor: colors.gray200,
    },
    backBtn: {
        color: colors.error,
        fontWeight: '600',
    },
    headerTitle: {
        ...typography.h3,
        color: colors.gray900,
    },
    content: {
        flex: 1,
        padding: spacing.md,
    },
    section: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.gray900,
        marginBottom: spacing.md,
    },
    label: {
        ...typography.bodySmall,
        color: colors.gray600,
        marginBottom: spacing.xs,
        marginTop: spacing.sm,
    },
    input: {
        backgroundColor: colors.gray50,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: 16,
        color: colors.gray900,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    halfInput: {
        flex: 1,
    },
    thirdInput: {
        flex: 1,
    },
    typeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    typeBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: colors.gray100,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    typeBtnActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    typeBtnText: {
        ...typography.bodySmall,
        color: colors.gray700,
    },
    typeBtnTextActive: {
        color: colors.white,
        fontWeight: '600',
    },
    listingTypeBtn: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: colors.gray100,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    listingTypeBtnActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    listingTypeBtnText: {
        ...typography.body,
        color: colors.gray700,
    },
    listingTypeBtnTextActive: {
        color: colors.white,
        fontWeight: '600',
    },
    locationBtn: {
        backgroundColor: colors.primary,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        marginTop: spacing.md,
    },
    locationBtnText: {
        color: colors.white,
        fontWeight: '600',
    },
    coordsText: {
        ...typography.caption,
        color: colors.gray500,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    amenitiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    amenityBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: colors.gray100,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    amenityBtnActive: {
        backgroundColor: '#E0F2FE',
        borderColor: '#0EA5E9',
    },
    amenityBtnText: {
        ...typography.bodySmall,
        color: colors.gray600,
    },
    amenityBtnTextActive: {
        color: '#0284C7',
        fontWeight: '600',
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    imageContainer: {
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
    removeImageText: {
        color: colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
    coverBadge: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        backgroundColor: colors.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    coverBadgeText: {
        color: colors.white,
        fontSize: 8,
        fontWeight: '700',
    },
    newBadge: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        backgroundColor: colors.success,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    newBadgeText: {
        color: colors.white,
        fontSize: 8,
        fontWeight: '700',
    },
    addImageBtn: {
        backgroundColor: colors.gray100,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.gray200,
        borderStyle: 'dashed',
    },
    addImageBtnText: {
        color: colors.gray600,
        fontWeight: '600',
    },
    footer: {
        backgroundColor: colors.white,
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.gray200,
    },
    saveBtn: {
        backgroundColor: colors.primary,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    saveBtnDisabled: {
        opacity: 0.5,
    },
    saveBtnText: {
        color: colors.white,
        fontWeight: '700',
        fontSize: 16,
    },
});
