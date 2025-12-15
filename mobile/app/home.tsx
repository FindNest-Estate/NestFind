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
    ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNav from '../components/BottomNav';
import PropertyCard from '../components/PropertyCard';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { API_URL } from '../constants/api';

const { width } = Dimensions.get('window');

const categories = [
    { id: 'all', label: 'All', iconName: 'grid-outline' },
    { id: 'apartment', label: 'Apartment', iconName: 'business-outline' },
    { id: 'house', label: 'House', iconName: 'home-outline' },
    { id: 'villa', label: 'Villa', iconName: 'leaf-outline' },
    { id: 'land', label: 'Land', iconName: 'map-outline' },
    { id: 'commercial', label: 'Commercial', iconName: 'storefront-outline' },
];

export default function Home() {
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const router = useRouter();
    const insets = useSafeAreaInsets();

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

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const renderPropertyCard = ({ item }: { item: any }) => (
        <PropertyCard
            property={item}
            onPress={() => router.push(`/property/${item.id}`)}
        />
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Header / Hero Section */}
            <View style={styles.heroContainer}>
                <ImageBackground
                    source={{ uri: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80' }} // High quality hero
                    style={[styles.heroImage, { paddingTop: insets.top + (Platform.OS === 'android' ? 12 : 0) }]}
                    imageStyle={styles.heroImageStyle}
                >
                    <View style={styles.heroOverlay}>
                        {/* Brand & User Greeting */}
                        <View style={styles.headerTop}>
                            <View style={styles.logoContainer}>
                                <Text style={styles.logoText}>Nest<Text style={styles.logoTextHighlight}>Find</Text></Text>
                            </View>
                            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/messages' as any)}>
                                <Ionicons name="chatbubbles-outline" size={24} color={colors.white} />
                                {/* Optional: Add badge if unread */}
                            </TouchableOpacity>
                        </View>

                        {/* Hero Text */}
                        <View style={styles.heroContent}>
                            <Text style={styles.heroTitle}>Find your home.</Text>
                            <Text style={styles.heroSubtitle}>Perfect properties, tailored for you.</Text>
                        </View>

                        {/* Floating Search Bar */}
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color={colors.gray900} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by city, locality..."
                                placeholderTextColor={colors.gray500}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={20} color={colors.gray400} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </ImageBackground>
            </View>

            {/* Scrollable Content */}
            <FlatList
                data={filteredProperties}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderPropertyCard}
                numColumns={1}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListHeaderComponent={() => (
                    <View>
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
                                        <Ionicons
                                            name={cat.iconName as any}
                                            size={20}
                                            color={activeCategory === cat.id ? colors.white : colors.gray600}
                                        />
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

                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                {activeCategory === 'all' ? 'Featured Homes' : `${categories.find(c => c.id === activeCategory)?.label}s`}
                            </Text>
                            <Text style={styles.sectionCount}>{filteredProperties.length} found</Text>
                        </View>
                    </View>
                )}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="home-outline" size={48} color={colors.gray400} style={{ marginBottom: 16 }} />
                        <Text style={styles.emptyText}>No properties found</Text>
                        <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
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
        backgroundColor: colors.white,
    },

    // Hero
    heroContainer: {
        height: 250, // Reduced from 280
        backgroundColor: colors.gray900,
        overflow: 'hidden',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        marginBottom: spacing.xs,
    },
    heroImage: {
        flex: 1,
        justifyContent: 'space-between',
    },
    heroImageStyle: {
        opacity: 0.7,
    },
    heroOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md, // Reduced from xl
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoText: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.white,
        letterSpacing: -0.5,
    },
    logoTextHighlight: {
        color: colors.primary,
    },
    iconButton: {
        width: 44,
        height: 44,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroContent: {
        marginBottom: spacing.md, // Reduced from lg
    },
    heroTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: colors.white,
        marginBottom: 4,
    },
    heroSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '500',
    },

    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 100,
        paddingHorizontal: spacing.md,
        paddingVertical: Platform.OS === 'ios' ? 14 : 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: colors.gray900,
        marginLeft: spacing.sm,
    },

    // Categories
    categoriesContainer: {
        marginTop: spacing.md, // Reduced from lg
        paddingBottom: spacing.xs, // Reduced from md
    },
    categoriesScroll: {
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: colors.white,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: colors.gray200,
        gap: 6,
    },
    categoryChipActive: {
        backgroundColor: colors.gray900,
        borderColor: colors.gray900,
    },
    categoryLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gray600,
    },
    categoryLabelActive: {
        color: colors.white,
    },

    // List
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: 100,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.xs, // Reduced from md
        marginTop: spacing.sm,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.gray900,
    },
    sectionCount: {
        fontSize: 14,
        color: colors.gray500,
        fontWeight: '500',
    },

    // Empty
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
        marginTop: spacing.xl,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.gray900,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.gray500,
        marginTop: 4,
    },
});
