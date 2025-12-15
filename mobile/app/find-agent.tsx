import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Dimensions,
    ActivityIndicator,
    Alert,
    Platform,
    StatusBar,
    SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { colors, spacing, borderRadius } from '../constants/theme';
import { API_URL } from '../constants/api';
import ScreenHeader from '../components/common/ScreenHeader'; // We might use a custom header here instead
import AgentCard from '../components/agent/AgentCard';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function FindAgent() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Default to 'list' view as requested
    const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
    const [agents, setAgents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [userLocation, setUserLocation] = useState<{
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    } | null>(null);

    // Initial Region (Bangalore or Default)
    const initialRegion = {
        latitude: 12.9716,
        longitude: 77.5946,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    useEffect(() => {
        fetchAgents();
        getUserLocation();
    }, []);

    const getUserLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const location = await Location.getCurrentPositionAsync({});
            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            });
        } catch (e) {
            console.log('Error getting location', e);
        }
    };

    const fetchAgents = async () => {
        try {
            const response = await axios.get(`${API_URL}/agents/all`);
            setAgents(response.data);
        } catch (error) {
            console.error('Error fetching agents:', error);
            Alert.alert('Error', 'Failed to load agents');
        } finally {
            setLoading(false);
        }
    };

    const handleHire = (agent: any) => {
        Alert.alert(
            'Hire Agent',
            `Send a hire request to ${agent.first_name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send Request',
                    onPress: () => Alert.alert('Success', 'Hire request sent!')
                }
            ]
        );
    };

    const filteredAgents = agents.filter(agent => {
        const query = searchQuery.toLowerCase();
        return (
            agent.first_name?.toLowerCase().includes(query) ||
            agent.last_name?.toLowerCase().includes(query) ||
            agent.agency_name?.toLowerCase().includes(query) ||
            agent.specialty?.toLowerCase().includes(query)
        );
    });

    // Custom Header Component for this Page
    const RenderHeader = () => (
        <View style={styles.headerWrapper}>
            <LinearGradient
                colors={[colors.gray900, colors.gray700]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.headerContainer, { paddingTop: insets.top }]}
            >
                <View style={styles.headerTopRow}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.white} />
                    </TouchableOpacity>

                    <View style={styles.titleContainer}>
                        <Text style={styles.headerTitle}>Find Agent</Text>
                        <Text style={styles.headerSubtitle}>Verified professionals nearby</Text>
                    </View>

                    <TouchableOpacity style={styles.filterBtn}>
                        <Ionicons name="options-outline" size={20} color={colors.white} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color={colors.gray400} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search name, city, or specialty..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor={colors.gray400}
                        />
                    </View>
                </View>

                {/* View Toggle - Segmented Control Style */}
                <View style={styles.toggleContainer}>
                    <View style={styles.toggleBg}>
                        <TouchableOpacity
                            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
                            onPress={() => setViewMode('list')}
                            activeOpacity={0.9}
                        >
                            <Ionicons name="list" size={16} color={viewMode === 'list' ? colors.gray900 : colors.gray400} />
                            <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>List View</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
                            onPress={() => setViewMode('map')}
                            activeOpacity={0.9}
                        >
                            <Ionicons name="map" size={16} color={viewMode === 'map' ? colors.gray900 : colors.gray400} />
                            <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>Map View</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );

    const renderMapHandler = () => (
        <View style={styles.mapContainer}>
            <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                region={userLocation || initialRegion}
                showsUserLocation={true}
                showsMyLocationButton={true}
                rotateEnabled={false}
            >
                {filteredAgents.map((agent) => {
                    const lat = agent.latitude || (initialRegion.latitude + (Math.random() - 0.5) * 0.05);
                    const lng = agent.longitude || (initialRegion.longitude + (Math.random() - 0.5) * 0.05);

                    return (
                        <Marker
                            key={agent.id}
                            coordinate={{ latitude: lat, longitude: lng }}
                        >
                            <View style={styles.markerContainer}>
                                <View style={styles.markerBubble}>
                                    {agent.avatar_url ? (
                                        <View style={styles.markerAvatar} />
                                    ) : (
                                        <Ionicons name="person" size={10} color={colors.white} />
                                    )}
                                    <Text style={styles.markerText}>{agent.rating || '4.9'}★</Text>
                                </View>
                                <View style={styles.markerArrow} />
                            </View>
                            <Callout tooltip onPress={() => router.push(`/agent/profile?id=${agent.id}`)}>
                                <AgentCard
                                    agent={agent}
                                    layout="map-callout"
                                    onPress={() => { }}
                                    onHire={() => { }}
                                />
                            </Callout>
                        </Marker>
                    );
                })}
            </MapView>

            {/* Floating 'Search Area' Button could go here */}
        </View>
    );

    const renderListHandler = () => (
        <FlatList
            data={filteredAgents}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
                <AgentCard
                    agent={item}
                    onPress={() => router.push(`/agent/profile?id=${item.id}`)}
                    onHire={() => handleHire(item)}
                />
            )}
            ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="search" size={32} color={colors.gray400} />
                    </View>
                    <Text style={styles.emptyText}>No agents found</Text>
                    <Text style={styles.emptySubText}>Try adjusting your search terms</Text>
                </View>
            )}
        />
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <RenderHeader />

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <View style={styles.contentContainer}>
                    {viewMode === 'map' ? renderMapHandler() : renderListHandler()}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gray50,
    },

    // CUSTOM HEADER
    headerWrapper: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
        zIndex: 10,
        backgroundColor: colors.gray900, // Fallback
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerContainer: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.sm,
        marginBottom: spacing.md,
        gap: 12,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.white,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.gray400,
        fontWeight: '500',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleContainer: {
        flex: 1,
    },
    filterBtn: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
    },
    searchContainer: {
        marginBottom: spacing.md,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 16,
        paddingHorizontal: spacing.md,
        paddingVertical: 12,
        borderWidth: 0,
    },
    searchInput: {
        flex: 1,
        marginLeft: spacing.sm,
        fontSize: 15,
        color: colors.gray900,
        fontWeight: '500',
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    toggleBg: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.15)',
        padding: 4,
        borderRadius: 14,
        width: '100%',
    },
    toggleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    toggleBtnActive: {
        backgroundColor: colors.white,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    toggleText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.gray400,
    },
    toggleTextActive: {
        color: colors.gray900,
    },

    // CONTENT
    contentContainer: {
        flex: 1,
        overflow: 'hidden',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // LIST VIEW
    listContent: {
        padding: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: 100, // Space for bottom nav
    },
    emptyState: {
        padding: spacing.xl,
        alignItems: 'center',
        marginTop: 40,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    emptyText: {
        color: colors.gray900,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    emptySubText: {
        color: colors.gray500,
        fontSize: 14,
    },

    // MAP VIEW
    mapContainer: {
        flex: 1,
    },
    map: {
        width: width,
        height: '100%',
    },

    // MAP MARKERS
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerBubble: {
        backgroundColor: colors.gray900,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
        borderWidth: 2,
        borderColor: colors.white,
    },
    markerAvatar: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: colors.gray400,
    },
    markerText: {
        color: colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
    markerArrow: {
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 6,
        borderStyle: 'solid',
        backgroundColor: 'transparent',
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: colors.gray900,
        marginTop: -2,
    },
});
