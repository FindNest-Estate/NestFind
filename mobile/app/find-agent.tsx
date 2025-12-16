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

import { api } from '../lib/api';
import ScreenHeader from '../components/common/ScreenHeader'; // We might use a custom header here instead
import BottomNav from '../components/BottomNav';
import AgentCard from '../components/agent/AgentCard';
import HireAgentModal from '../components/agent/HireAgentModal';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '../constants/theme';

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

    // Modal State
    const [selectedAgent, setSelectedAgent] = useState<any>(null);
    const [isHireModalVisible, setIsHireModalVisible] = useState(false);

    // Initial Region (Bangalore or Default)
    const initialRegion = {
        latitude: 12.9716,
        longitude: 77.5946,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAgents(searchQuery);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        // Initial load happens via the searchQuery effect with empty string
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

    const fetchAgents = async (query = '') => {
        setLoading(true);
        try {
            const data = await api.agents.list({ search: query });
            setAgents(data);
        } catch (error) {
            console.error('Error fetching agents:', error);
            Alert.alert('Error', 'Failed to load agents');
        } finally {
            setLoading(false);
        }
    };

    const handleHire = (agent: any) => {
        setSelectedAgent(agent);
        setIsHireModalVisible(true);
    };

    // No more client-side filtering needed
    const filteredAgents = agents;

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
                {filteredAgents
                    .filter(a => a.latitude && a.longitude)
                    .map((agent) => (
                        <Marker
                            key={agent.id}
                            coordinate={{
                                latitude: agent.latitude,
                                longitude: agent.longitude
                            }}
                        >
                            <View style={styles.markerContainer}>
                                <View style={styles.markerBubble}>
                                    {agent.avatar_url ? (
                                        <View style={styles.markerAvatar} />
                                    ) : (
                                        <Ionicons name="person" size={10} color={colors.white} />
                                    )}
                                    <Text style={styles.markerText}>{agent.rating || 'N/A'}★</Text>
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
                    ))}
            </MapView>
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
            <StatusBar barStyle="dark-content" />

            <ScreenHeader
                title="Find Agent"
                subtitle="Verified professionals nearby"
                showBack={false}
                rightAction={{
                    icon: "options-outline",
                    onPress: () => { }
                }}
            />

            <View style={styles.searchSection}>
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={colors.gray400} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search name, city, or specialty..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={colors.gray400}
                    />
                </View>

                {/* View Toggle */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
                        onPress={() => setViewMode('list')}
                        activeOpacity={0.9}
                    >
                        <Ionicons name="list" size={18} color={viewMode === 'list' ? colors.gray900 : colors.gray500} />
                        <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>List</Text>
                    </TouchableOpacity>
                    <View style={styles.toggleDivider} />
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
                        onPress={() => setViewMode('map')}
                        activeOpacity={0.9}
                    >
                        <Ionicons name="map" size={18} color={viewMode === 'map' ? colors.gray900 : colors.gray500} />
                        <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>Map</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <View style={styles.contentContainer}>
                    {viewMode === 'map' ? renderMapHandler() : renderListHandler()}
                </View>
            )}
            <BottomNav />

            <HireAgentModal
                visible={isHireModalVisible}
                onClose={() => setIsHireModalVisible(false)}
                agent={selectedAgent}
                onSuccess={() => {
                    // Refresh or show confirmation
                    fetchAgents(searchQuery);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gray50,
    },
    searchSection: {
        backgroundColor: colors.white,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
        zIndex: 5,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray100,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: 12,
        marginBottom: spacing.md,
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
        backgroundColor: colors.gray100,
        borderRadius: 12,
        padding: 4,
    },
    toggleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 10,
        gap: 6,
    },
    toggleBtnActive: {
        backgroundColor: colors.white,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    toggleDivider: {
        width: 1,
        backgroundColor: colors.gray200,
        marginVertical: 6,
        marginHorizontal: 4,
        display: 'none', // Hidden since we use button active state styling
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gray500,
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
