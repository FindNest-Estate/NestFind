import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { colors, borderRadius, spacing } from '../constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

interface PropertyCardProps {
    property: {
        id: number;
        title: string;
        price: number;
        city?: string;
        state?: string;
        address?: string;
        property_type?: string;
        bedrooms?: number;
        bathrooms?: number;
        area?: number;
        images?: { image_path: string }[];
    };
    onPress: () => void;
    apiUrl: string;
}

export default function PropertyCard({ property, onPress, apiUrl }: PropertyCardProps) {
    const hasImage = property.images && property.images.length > 0;
    const imageUrl = hasImage
        ? `${apiUrl}/${property.images![0].image_path}`
        : null;

    return (
        <TouchableOpacity
            style={styles.container}
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
                        <Text style={styles.placeholderIcon}>🏠</Text>
                        <Text style={styles.placeholderText}>No Image</Text>
                    </View>
                )}
                <TouchableOpacity style={styles.heartButton} activeOpacity={0.8}>
                    <Text style={styles.heartIcon}>♡</Text>
                </TouchableOpacity>
                {/* Property Type Badge */}
                {property.property_type && (
                    <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>{property.property_type}</Text>
                    </View>
                )}
            </View>

            <View style={styles.details}>
                <Text style={styles.title} numberOfLines={1}>{property.title}</Text>

                {/* Location with icon */}
                <View style={styles.locationRow}>
                    <Text style={styles.locationIcon}>📍</Text>
                    <Text style={styles.location} numberOfLines={1}>
                        {property.city}{property.state ? `, ${property.state}` : ''}
                    </Text>
                </View>

                {/* Features */}
                {(property.bedrooms || property.bathrooms || property.area) && (
                    <View style={styles.featuresRow}>
                        {property.bedrooms && (
                            <Text style={styles.feature}>{property.bedrooms} 🛏️</Text>
                        )}
                        {property.bathrooms && (
                            <Text style={styles.feature}>{property.bathrooms} 🚿</Text>
                        )}
                        {property.area && (
                            <Text style={styles.feature}>{property.area} sqft</Text>
                        )}
                    </View>
                )}

                <Text style={styles.price}>₹{property.price?.toLocaleString()}</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: CARD_WIDTH,
        marginBottom: spacing.lg,
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: colors.gray100,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.gray50,
    },
    placeholderIcon: {
        fontSize: 32,
        marginBottom: spacing.xs,
    },
    placeholderText: {
        color: colors.gray400,
        fontSize: 12,
    },
    heartButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heartIcon: {
        fontSize: 16,
        color: colors.gray700,
    },
    typeBadge: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
    },
    typeText: {
        color: colors.white,
        fontSize: 10,
        fontWeight: '600',
    },
    details: {
        padding: spacing.sm,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gray900,
        marginBottom: 4,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    locationIcon: {
        fontSize: 12,
        marginRight: 4,
    },
    location: {
        fontSize: 12,
        color: colors.gray500,
        flex: 1,
    },
    featuresRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: 4,
    },
    feature: {
        fontSize: 11,
        color: colors.gray500,
    },
    price: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.primary,
    },
});
