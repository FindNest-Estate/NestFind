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
    StatusBar,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import axios from 'axios';
import BottomNav from '../components/BottomNav';
import PropertyCard from '../components/PropertyCard';
import { colors, spacing, typography } from '../constants/theme';
import { API_URL } from '../constants/api';
import ScreenHeader from '../components/common/ScreenHeader';

export default function Rent() {
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        fetchProperties();
    }, []);

    const fetchProperties = async () => {
        try {
            // Fetch all and filter client side or use query param if supported
            // Using logic from home.tsx but tailored for Rent
            const response = await axios.get(`${API_URL}/properties/`);
            // Client side filter for simplicity as per existing patterns
            const rentProperties = response.data.filter((p: any) =>
                p.listing_type === 'rent' || p.listing_type === 'RENT' // Handle case sensitivity
            );
            setProperties(rentProperties);
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

    const filteredProperties = properties.filter(p => {
        const matchesSearch =
            p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.city?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const renderPropertyCard = ({ item }: { item: any }) => (
        <PropertyCard
            property={item}
            onPress={() => router.push(`/property/${item.id}`)}
        />
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header Area */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>Rent a Home</Text>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={colors.gray500} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search rental properties..."
                        placeholderTextColor={colors.gray400}
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

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredProperties}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderPropertyCard}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                        />
                    }
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="key-outline" size={48} color={colors.gray400} style={{ marginBottom: 16 }} />
                            <Text style={styles.emptyText}>No rentals found</Text>
                            <Text style={styles.emptySubtext}>Try adjusting your search</Text>
                        </View>
                    )}
                />
            )}

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
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
    },
    headerTop: {
        paddingBottom: spacing.sm,
        justifyContent: 'center',
        height: 44, // Standard nav height
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.gray900,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray50,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: colors.gray900,
    },
    listContent: {
        padding: spacing.md,
        paddingBottom: 100, // Space for bottom nav
    },
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
