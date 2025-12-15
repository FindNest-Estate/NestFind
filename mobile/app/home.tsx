import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    TouchableOpacity,
    Image,
    Dimensions,
    ScrollView,
    StatusBar,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNav from '../components/BottomNav';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { API_URL } from '../constants/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 2 - spacing.md) / 2;

const categories = [
    { id: 'all', label: 'All', icon: '🏠' },
    { id: 'apartment', label: 'Apartment', icon: '🏢' },
    { id: 'house', label: 'House', icon: '🏡' },
    { id: 'villa', label: 'Villa', icon: '🏰' },
    { id: 'land', label: 'Land', icon: '🌳' },
    { id: 'commercial', label: 'Commercial', icon: '🏪' },
];

export default function Home() {
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const router = useRouter();

    useEffect(() => {
        loadUser();
        fetchProperties();
    }, []);

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

    const fetchProperties = async () => {
        try {
            const response = await axios.get(`${API_URL}/properties/`);
            setProperties(response.data);
        } catch (error) {
            console.error('Error fetching properties:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchProperties();
    };

    // Filter properties based on search and category
    const filteredProperties = properties.filter(p => {
        const matchesSearch =
            p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.city?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
            activeCategory === 'all' ||
            p.property_type?.toLowerCase() === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const getFirstImage = (property: any) => {
        if (property.images && property.images.length > 0) {
            return `${API_URL}/${property.images[0].image_path}`;
        }
        return null;
    };

    const formatPrice = (price: number) => {
        if (price >= 10000000) {
            return `₹${(price / 10000000).toFixed(1)}Cr`;
        } else if (price >= 100000) {
            return `₹${(price / 100000).toFixed(1)}L`;
        }
        return `₹${price.toLocaleString()}`;
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const renderPropertyCard = ({ item }: { item: any }) => {
        const imageUrl = getFirstImage(item);

        return (
            <TouchableOpacity
                style={styles.propertyCard}
                onPress={() => router.push(`/property/${item.id}`)}
                activeOpacity={0.9}
            >
                <View style={styles.cardImageContainer}>
                    {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.cardImage} />
                    ) : (
                        <View style={styles.cardImagePlaceholder}>
                            <Text style={styles.placeholderEmoji}>🏠</Text>
                        </View>
                    )}

                    {/* Favorite button */}
                    <TouchableOpacity style={styles.favoriteBtn}>
                        <Text style={styles.favoriteIcon}>🤍</Text>
                    </TouchableOpacity>

                    {/* Price badge */}
                    <View style={styles.priceBadge}>
                        <Text style={styles.priceText}>{formatPrice(item.price)}</Text>
                    </View>
                </View>

                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.cardLocation} numberOfLines={1}>
                        📍 {item.city}
                    </Text>
                    <View style={styles.cardMeta}>
                        <Text style={styles.cardMetaText}>
                            {item.bedrooms ? `${item.bedrooms} 🛏️` : ''}
                            {item.bathrooms ? ` ${item.bathrooms} 🚿` : ''}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <>
            <StatusBar barStyle="light-content" />
            <View style={styles.container}>
                {/* Modern Header */}
                <View style={styles.header}>
                    {/* Top Row - Logo */}
                    <View style={styles.headerTop}>
                        <View style={styles.logoContainer}>
                            <View style={styles.logoBadge}>
                                <Text style={styles.logoBadgeText}>N</Text>
                            </View>
                            <View>
                                <Text style={styles.logoText}>NestFind</Text>
                            </View>
                        </View>
                    </View>

                    {/* Search Bar - White pill */}
                    <TouchableOpacity style={styles.searchContainer} activeOpacity={0.9}>
                        <View style={styles.searchLeft}>
                            <Text style={styles.searchIcon}>🔍</Text>
                            <View style={styles.searchTextContainer}>
                                <Text style={styles.searchPlaceholder}>Search Properties</Text>
                                <Text style={styles.searchSubtext}>Buy • Rent • Commercial</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Categories */}
                <View style={styles.categoriesContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoriesScroll}
                    >
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.categoryChip,
                                    activeCategory === cat.id && styles.categoryChipActive
                                ]}
                                onPress={() => setActiveCategory(cat.id)}
                            >
                                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                                <Text style={[
                                    styles.categoryLabel,
                                    activeCategory === cat.id && styles.categoryLabelActive
                                ]}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Properties List */}
                <FlatList
                    data={filteredProperties}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    renderItem={renderPropertyCard}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                        />
                    }
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={() => (
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                {activeCategory === 'all' ? 'All Properties' : categories.find(c => c.id === activeCategory)?.label}
                            </Text>
                            <Text style={styles.sectionCount}>{filteredProperties.length} found</Text>
                        </View>
                    )}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>🏠</Text>
                            <Text style={styles.emptyText}>No properties found</Text>
                            <Text style={styles.emptySubtext}>Check back later for new listings</Text>
                        </View>
                    )}
                />
            </View>
            <BottomNav />
        </>
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

    // Header
    header: {
        backgroundColor: colors.primary,
        paddingTop: Platform.OS === 'android' ? 12 : 12, // Reduced padding
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md, // Reduced margin
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    logoBadge: {
        width: 36, // Smaller badge
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    logoBadgeText: {
        fontSize: 18, // Smaller text
        fontWeight: '800',
        color: colors.primary,
    },
    logoText: {
        fontSize: 20, // Smaller text
        fontWeight: '700',
        color: colors.white,
        letterSpacing: -0.3,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    locationIcon: {
        fontSize: 12,
    },
    locationText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.85)',
        marginLeft: 2,
        fontWeight: '500',
    },
    tagline: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },

    // Search - Airbnb style white pill
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.white,
        borderRadius: 100, // Full pill shape
        paddingLeft: spacing.md,
        paddingRight: spacing.xs,
        paddingVertical: spacing.sm,
        // Reduced shadow for cleaner look
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    searchLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    searchIcon: {
        fontSize: 20,
        marginRight: spacing.sm,
    },
    searchTextContainer: {
        flex: 1,
    },
    searchPlaceholder: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.gray900,
    },
    searchSubtext: {
        fontSize: 12,
        color: colors.gray500,
        marginTop: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: colors.gray900,
        paddingVertical: spacing.xs,
    },

    // Categories
    categoriesContainer: {
        backgroundColor: colors.white,
        paddingVertical: spacing.md,
        marginTop: -12,
        marginHorizontal: spacing.md,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    categoriesScroll: {
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.gray50,
        borderRadius: 24,
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    categoryChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    categoryIcon: {
        fontSize: 16,
        marginRight: spacing.xs,
    },
    categoryLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.gray700,
    },
    categoryLabelActive: {
        color: colors.white,
    },

    // Section
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xs,
        marginBottom: spacing.md,
        marginTop: spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.gray900,
    },
    sectionCount: {
        fontSize: 13,
        color: colors.gray500,
    },

    // List
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },
    row: {
        justifyContent: 'space-between',
    },

    // Property Card
    propertyCard: {
        width: CARD_WIDTH,
        marginBottom: spacing.md,
        backgroundColor: colors.white,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
    },
    cardImageContainer: {
        width: '100%',
        height: CARD_WIDTH * 0.75,
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    cardImagePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderEmoji: {
        fontSize: 32,
        opacity: 0.5,
    },
    favoriteBtn: {
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
    },
    favoriteIcon: {
        fontSize: 16,
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
    cardContent: {
        padding: spacing.sm,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gray900,
        marginBottom: 2,
    },
    cardLocation: {
        fontSize: 12,
        color: colors.gray500,
        marginBottom: 4,
    },
    cardMeta: {
        flexDirection: 'row',
    },
    cardMetaText: {
        fontSize: 11,
        color: colors.gray400,
    },

    // Empty
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: spacing.md,
        opacity: 0.5,
    },
    emptyText: {
        ...typography.body,
        color: colors.gray700,
        fontWeight: '600',
    },
    emptySubtext: {
        ...typography.caption,
        color: colors.gray400,
        marginTop: spacing.xs,
    },
});
