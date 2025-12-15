import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Image,
    Dimensions,
    StatusBar,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNav from '../components/BottomNav';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { API_URL } from '../constants/api';

const { width } = Dimensions.get('window');
// Wider cards for Saved page for better visibility
const CARD_WIDTH = width - spacing.lg * 2;

export default function Saved() {
    const [favorites, setFavorites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();
    const insets = useSafeAreaInsets();

    useFocusEffect(
        useCallback(() => {
            fetchFavorites();
        }, [])
    );

    const fetchFavorites = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (!token) {
                // Determine logic for no token - maybe redirect or show empty
                setLoading(false);
                return;
            }

            // Corrected endpoint
            const response = await axios.get(`${API_URL}/users/favorites`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFavorites(response.data);
        } catch (error: any) {
            console.error('Error fetching favorites:', error);
            if (error.response?.status === 401) {
                await AsyncStorage.removeItem('auth_token');
                router.replace('/(auth)/login');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleUnsave = async (propertyId: number) => {
        Alert.alert(
            "Remove from Saved",
            "Are you sure you want to remove this property?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('auth_token');
                            await axios.delete(`${API_URL}/users/favorites/${propertyId}`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            // Optimistic update
                            setFavorites(prev => prev.filter(item => (item.id || item.property?.id) !== propertyId));
                        } catch (error) {
                            Alert.alert("Error", "Failed to remove property");
                        }
                    }
                }
            ]
        );
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchFavorites();
    };

    const formatPrice = (price: number) => {
        if (!price) return '₹0';
        if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
        if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
        return `₹${price.toLocaleString()}`;
    };

    const renderPropertyCard = ({ item }: { item: any }) => {
        // Handle direct property object (since get_favorites returns PropertyOut list)
        // or wrapper if that changes.
        // Based on backend schemas: get_favorites -> List[PropertyOut]
        const property = item;

        if (!property) return null;

        const imageUrl = property.images && property.images.length > 0
            ? `${API_URL}/${property.images[0].image_path}` // Assuming images are loaded this way
            : null;

        return (
            <TouchableOpacity
                style={styles.propertyCard}
                onPress={() => router.push(`/property/${property.id}`)}
                activeOpacity={0.9}
            >
                <View style={styles.cardImageContainer}>
                    {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.cardImage} />
                    ) : (
                        <View style={styles.cardImagePlaceholder}>
                            <Ionicons name="image-outline" size={48} color={colors.gray400} />
                        </View>
                    )}
                    <View style={styles.priceBadge}>
                        <Text style={styles.priceText}>{formatPrice(property.price)}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.unsaveBtn}
                        onPress={() => handleUnsave(property.id)}
                    >
                        <Ionicons name="heart" size={20} color={colors.error} />
                    </TouchableOpacity>
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{property.title}</Text>
                        {property.status === 'SOLD' && (
                            <View style={styles.soldBadge}>
                                <Text style={styles.soldText}>SOLD</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.locationRow}>
                        <Ionicons name="location-sharp" size={14} color={colors.gray500} />
                        <Text style={styles.cardLocation} numberOfLines={1}>
                            {property.city}, {property.state}
                        </Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.cardMeta}>
                        <View style={styles.cardMetaItem}>
                            <Ionicons name="bed-outline" size={16} color={colors.gray600} />
                            <Text style={styles.cardMetaText}>{property.specifications?.bedrooms || 0} Beds</Text>
                        </View>
                        <View style={styles.cardMetaItem}>
                            <Ionicons name="water-outline" size={16} color={colors.gray600} />
                            <Text style={styles.cardMetaText}>{property.specifications?.bathrooms || 0} Baths</Text>
                        </View>
                        <View style={styles.cardMetaItem}>
                            <Ionicons name="expand-outline" size={16} color={colors.gray600} />
                            <Text style={styles.cardMetaText}>{property.specifications?.area || property.specifications?.area_sqft || 0} sqft</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
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
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Custom Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.gray900} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Saved Homes</Text>
                        <Text style={styles.headerSubtitle}>{favorites.length} properties</Text>
                    </View>
                </View>
            </View>

            <FlatList
                data={favorites}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderPropertyCard}
                contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]} // Space for bottom nav
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBg}>
                            <Ionicons name="heart" size={48} color={colors.gray400} />
                        </View>
                        <Text style={styles.emptyTitle}>No saved properties yet</Text>
                        <Text style={styles.emptyText}>
                            Properties you like will appear here for quick access.
                        </Text>
                        <TouchableOpacity
                            style={styles.browseButton}
                            onPress={() => router.push('/home')}
                        >
                            <Text style={styles.browseButtonText}>Start Exploring</Text>
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
        backgroundColor: colors.gray50,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        backgroundColor: colors.white,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
        zIndex: 10,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.gray900,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.gray500,
        fontWeight: '500',
        marginTop: 4,
    },
    listContent: {
        padding: spacing.lg,
    },
    propertyCard: {
        width: '100%',
        backgroundColor: colors.white,
        borderRadius: 20,
        marginBottom: spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    cardImageContainer: {
        width: '100%',
        height: 220,
        position: 'relative',
        backgroundColor: colors.gray200,
    },
    cardImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    cardImagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    priceBadge: {
        position: 'absolute',
        bottom: spacing.md,
        left: spacing.md,
        backgroundColor: 'rgba(0,0,0,0.85)', // Darker for premium feel
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    priceText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.white,
    },
    unsaveBtn: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    cardContent: {
        padding: spacing.lg,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.gray900,
        flex: 1,
        marginRight: spacing.sm,
    },
    soldBadge: {
        backgroundColor: colors.error,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    soldText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    cardLocation: {
        fontSize: 14,
        color: colors.gray500,
        marginLeft: 4,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: colors.gray100,
        marginBottom: spacing.md,
    },
    cardMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cardMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cardMetaText: {
        fontSize: 13,
        color: colors.gray600,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xxl * 2,
        paddingHorizontal: spacing.xl,
    },
    emptyIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.gray100,
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
        fontSize: 15,
        color: colors.gray500,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
    },
    browseButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: 14,
        borderRadius: 30,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    browseButtonText: {
        color: colors.white,
        fontWeight: '700',
        fontSize: 16,
    },
});
