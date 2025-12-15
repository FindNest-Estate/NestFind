import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing } from '../constants/theme';
import { API_URL } from '../constants/api';

const { width } = Dimensions.get('window');
// Calculate card width based on home screen padding (usually spacing.lg * 2 for container + spacing.md for gap)
// We'll default to the home screen calculation but allow override if needed via style
const DEFAULT_CARD_WIDTH = (width - spacing.lg * 2 - spacing.md) / 2;

interface PropertyCardProps {
    property: {
        id: number;
        title: string;
        price: number;
        city?: string;
        state?: string;
        address?: string;
        bedrooms?: number;
        bathrooms?: number;
        area?: number;
        images?: { image_path: string }[];
        property_type?: string;
    };
    onPress: () => void;
    style?: any;
    width?: number;
}

export default function PropertyCard({ property, onPress, style, width: cardWidth }: PropertyCardProps) {
    const imageUrl = property.images && property.images.length > 0
        ? `${API_URL}/${property.images[0].image_path}`
        : null;

    const formatPrice = (price: number) => {
        if (!price) return '₹0';
        if (price >= 10000000) {
            return `₹${(price / 10000000).toFixed(1)}Cr`;
        } else if (price >= 100000) {
            return `₹${(price / 100000).toFixed(1)}L`;
        }
        return `₹${price.toLocaleString()}`;
    };

    const finalWidth = cardWidth || DEFAULT_CARD_WIDTH;

    return (
        <TouchableOpacity
            style={[styles.container, { width: finalWidth }, style]}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <View style={styles.imageContainer}>
                {imageUrl ? (
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.placeholder}>
                        <Ionicons name="image-outline" size={32} color={colors.gray400} />
                    </View>
                )}

                {/* Favorite Button Overlay */}
                <TouchableOpacity style={styles.heartButton} activeOpacity={0.8}>
                    <Ionicons name="heart-outline" size={18} color={colors.gray900} />
                </TouchableOpacity>

                {/* Price Badge Overlay */}
                <View style={styles.priceBadge}>
                    <Text style={styles.priceText}>{formatPrice(property.price)}</Text>
                </View>
            </View>

            <View style={styles.details}>
                <Text style={styles.title} numberOfLines={1}>{property.title}</Text>

                <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={12} color={colors.gray500} style={{ marginRight: 2 }} />
                    <Text style={styles.location} numberOfLines={1}>
                        {property.city || 'Unknown Location'}
                    </Text>
                </View>

                {/* Meta Info (Beds/Baths) */}
                <View style={styles.featuresRow}>
                    <View style={styles.featureItem}>
                        <Ionicons name="bed-outline" size={12} color={colors.gray500} />
                        <Text style={styles.feature}>{property.bedrooms || 0}</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="water-outline" size={12} color={colors.gray500} />
                        <Text style={styles.feature}>{property.bathrooms || 0}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
        backgroundColor: colors.white,
        borderRadius: 16, // Matching Home
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 4 / 3, // Standard Aspect Ratio
        backgroundColor: colors.gray100,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.gray100,
    },
    heartButton: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        zIndex: 2,
    },
    priceBadge: {
        position: 'absolute',
        bottom: spacing.sm,
        left: spacing.sm,
        backgroundColor: 'rgba(0,0,0,0.75)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: 8,
    },
    priceText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.white,
    },
    details: {
        padding: spacing.sm,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gray900,
        marginBottom: 2,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    location: {
        fontSize: 12,
        color: colors.gray500,
        flex: 1,
    },
    featuresRow: {
        flexDirection: 'row',
        gap: 12,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    feature: {
        fontSize: 12,
        color: colors.gray600,
        fontWeight: '500',
    },
});
