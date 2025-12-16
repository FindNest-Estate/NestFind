import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    StatusBar,
    Modal,
    TextInput,
    KeyboardAvoidingView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { api } from '../../lib/api';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { API_URL } from '../../constants/api';
import ScreenHeader from '../../components/common/ScreenHeader';

const { width } = Dimensions.get('window');

export default function AgentProfile() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [agent, setAgent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [hiring, setHiring] = useState(false);

    // Hire Modal State
    const [hireModalVisible, setHireModalVisible] = useState(false);
    const [hireStep, setHireStep] = useState<1 | 2 | 3>(1);
    const [serviceType, setServiceType] = useState<'BUYING' | 'SELLING' | null>(null);
    const [locations, setLocations] = useState('');
    const [budget, setBudget] = useState('');
    const [propertyDetails, setPropertyDetails] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (id) fetchAgentDetails();
    }, [id]);

    const fetchAgentDetails = async () => {
        try {
            const data = await api.agents.get(Number(id));
            setAgent(data);
        } catch (error) {
            console.error('Error fetching agent:', error);
            Alert.alert('Error', 'Failed to load agent profile');
        } finally {
            setLoading(false);
        }
    };

    const openHireModal = () => {
        setHireModalVisible(true);
        setHireStep(1);
        setServiceType(null);
        setLocations('');
        setBudget('');
        setPropertyDetails('');
        setMessage('');
    };

    const handleHireNext = () => {
        if (hireStep === 1 && serviceType) {
            setHireStep(2);
            if (!message) {
                setMessage(serviceType === 'BUYING'
                    ? `Hi ${agent?.first_name}, I'm looking to buy a property in...`
                    : `Hi ${agent?.first_name}, I'm looking to sell my property at...`
                );
            }
        }
    };

    const handleHireSubmit = async () => {
        setHiring(true);
        try {
            const preferences = serviceType === 'BUYING'
                ? { locations, budget }
                : { property_details: propertyDetails };

            await api.agents.hire(Number(id), {
                service_type: serviceType!,
                property_preferences: preferences,
                initial_message: message
            });
            setHireStep(3);
        } catch (error) {
            console.error('Hire error', error);
            Alert.alert('Error', 'Failed to send hire request');
        } finally {
            setHiring(false);
        }
    };

    const resetHireModal = () => {
        setHireModalVisible(false);
        setHireStep(1);
        setServiceType(null);
        setLocations('');
        setBudget('');
        setPropertyDetails('');
        setMessage('');
    };

    const handleCall = () => {
        if (agent?.phone_number) {
            Linking.openURL(`tel:${agent.phone_number}`);
        } else {
            Alert.alert('Info', 'Phone number not available');
        }
    };

    const handleEmail = () => {
        if (agent?.email) {
            Linking.openURL(`mailto:${agent.email}`);
        }
    };

    const handleChat = () => {
        // Navigate to chat
        // router.push(`/messages/${agent.id}`);
        Alert.alert("Coming Soon", "Direct messaging will be available in the next update.");
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!agent) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Agent Profile" />
                <View style={styles.loadingContainer}>
                    <Text>Agent not found</Text>
                </View>
            </View>
        );
    }

    const StatCard = ({ label, value, icon }: { label: string, value: string, icon: any }) => (
        <View style={styles.statCard}>
            <View style={styles.statIcon}>
                <Ionicons name={icon} size={20} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <ScreenHeader
                title="Agent Profile"
                rightAction={{
                    icon: "share-outline",
                    onPress: () => Alert.alert('Share', `Sharing ${agent.first_name}'s profile...`)
                }}
                style={styles.header}
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        {agent.avatar_url ? (
                            <Image source={{ uri: agent.avatar_url }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.placeholderAvatar]}>
                                <Text style={styles.avatarText}>
                                    {agent.first_name?.[0]}{agent.last_name?.[0]}
                                </Text>
                            </View>
                        )}
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                        </View>
                    </View>

                    <Text style={styles.name}>{agent.first_name} {agent.last_name}</Text>
                    <Text style={styles.agency}>{agent.agency_name || 'Independent Agent'}</Text>

                    <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={16} color="#FFD700" />
                        <Text style={styles.rating}>{agent.average_rating || 'N/A'}</Text>
                        <Text style={styles.reviews}>({agent.review_count || 0} reviews)</Text>
                    </View>

                    <View style={styles.tagsContainer}>
                        <View style={styles.tag}>
                            <Text style={styles.tagText}>{agent.specialty || 'Real Estate'}</Text>
                        </View>
                        <View style={styles.tag}>
                            <Text style={styles.tagText}>{agent.experience_years || 0} Years Exp.</Text>
                        </View>
                        <View style={styles.tag}>
                            <Text style={styles.tagText}>Top Rated</Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.iconBtn} onPress={handleCall}>
                            <Ionicons name="call" size={20} color={colors.gray900} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={handleEmail}>
                            <Ionicons name="mail" size={20} color={colors.gray900} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={handleChat}>
                            <Ionicons name="chatbubble" size={20} color={colors.gray900} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <StatCard label="Sales" value={`${agent.sales_count || 0}`} icon="trending-up" />
                    <StatCard label="Clients" value={`${agent.clients_count || 0}`} icon="people" />
                    <StatCard label="Active" value={`${agent.active_listings_count || 0}`} icon="key" />
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <Text style={styles.bioText}>
                        {agent.bio || `${agent.first_name} is a seasoned real estate professional with over ${agent.experience_years || 0} years of experience in the luxury market. specialized in helping first-time buyers and seasoned investors alike.`}
                    </Text>
                </View>

                {/* Service Areas */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Service Areas</Text>
                    <View style={styles.areaRow}>
                        {agent.service_areas ? (
                            agent.service_areas.split(',').map((area: string, index: number) => (
                                <View key={index} style={styles.areaChip}>
                                    <Ionicons name="location-outline" size={12} color={colors.gray600} />
                                    <Text style={styles.areaText}>{area.trim()}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={{ color: colors.gray500 }}>No service areas listed</Text>
                        )}
                    </View>
                </View>

            </ScrollView>

            {/* Bottom Floating Action Button */}
            <View style={styles.footerContainer}>
                <View style={styles.footerContent}>
                    <View>
                        <Text style={styles.commissionLabel}>Commission Rate</Text>
                        <Text style={styles.commissionValue}>{agent.commission_rate || '1.5'}%</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.hireBtn}
                        onPress={openHireModal}
                    >
                        <Text style={styles.hireBtnText}>Hire Agent</Text>
                        <Ionicons name="arrow-forward" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Hire Agent Modal */}
            <Modal
                visible={hireModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={resetHireModal}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Hire {agent.first_name}</Text>
                                <Text style={styles.modalSubtitle}>starts a formal service request</Text>
                            </View>
                            <TouchableOpacity onPress={resetHireModal} style={styles.modalClose}>
                                <Ionicons name="close" size={24} color={colors.gray500} />
                            </TouchableOpacity>
                        </View>

                        {/* Step 1: Service Type Selection */}
                        {hireStep === 1 && (
                            <View style={styles.modalBody}>
                                <Text style={styles.stepTitle}>What are you looking for?</Text>
                                <View style={styles.serviceGrid}>
                                    <TouchableOpacity
                                        style={[styles.serviceCard, serviceType === 'BUYING' && styles.serviceCardActive]}
                                        onPress={() => setServiceType('BUYING')}
                                    >
                                        <View style={[styles.serviceIcon, serviceType === 'BUYING' && styles.serviceIconActive]}>
                                            <Ionicons name="home" size={24} color={serviceType === 'BUYING' ? colors.primary : colors.gray400} />
                                        </View>
                                        <Text style={styles.serviceTitle}>Buy a Home</Text>
                                        <Text style={styles.serviceDesc}>Found my dream place</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.serviceCard, serviceType === 'SELLING' && styles.serviceCardSell]}
                                        onPress={() => setServiceType('SELLING')}
                                    >
                                        <View style={[styles.serviceIcon, serviceType === 'SELLING' && styles.serviceIconSell]}>
                                            <Ionicons name="business" size={24} color={serviceType === 'SELLING' ? '#3B82F6' : colors.gray400} />
                                        </View>
                                        <Text style={styles.serviceTitle}>Sell Property</Text>
                                        <Text style={styles.serviceDesc}>Get the best price</Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                    style={[styles.continueBtn, !serviceType && styles.continueBtnDisabled]}
                                    onPress={handleHireNext}
                                    disabled={!serviceType}
                                >
                                    <Text style={styles.continueBtnText}>Continue</Text>
                                    <Ionicons name="arrow-forward" size={18} color="white" />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Step 2: Details Form */}
                        {hireStep === 2 && (
                            <ScrollView style={styles.modalBody}>
                                {serviceType === 'BUYING' ? (
                                    <>
                                        <Text style={styles.inputLabel}>Preferred Locations</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="e.g. Downtown, West End"
                                            placeholderTextColor={colors.gray400}
                                            value={locations}
                                            onChangeText={setLocations}
                                        />
                                        <Text style={styles.inputLabel}>Budget Range</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="e.g. ₹50L - ₹1Cr"
                                            placeholderTextColor={colors.gray400}
                                            value={budget}
                                            onChangeText={setBudget}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <Text style={styles.inputLabel}>Property Details</Text>
                                        <TextInput
                                            style={[styles.input, styles.textArea]}
                                            placeholder="Address, Type, Expected Price..."
                                            placeholderTextColor={colors.gray400}
                                            value={propertyDetails}
                                            onChangeText={setPropertyDetails}
                                            multiline
                                            numberOfLines={4}
                                        />
                                    </>
                                )}
                                <Text style={styles.inputLabel}>Message</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Tell the agent more..."
                                    placeholderTextColor={colors.gray400}
                                    value={message}
                                    onChangeText={setMessage}
                                    multiline
                                    numberOfLines={4}
                                />
                                <TouchableOpacity
                                    style={styles.submitBtn}
                                    onPress={handleHireSubmit}
                                    disabled={hiring}
                                >
                                    {hiring ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>Send Hire Request</Text>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        )}

                        {/* Step 3: Success */}
                        {hireStep === 3 && (
                            <View style={styles.successContainer}>
                                <View style={styles.successIcon}>
                                    <Ionicons name="checkmark" size={40} color="#16A34A" />
                                </View>
                                <Text style={styles.successTitle}>Request Sent!</Text>
                                <Text style={styles.successText}>
                                    {agent.first_name} will review your request and send a proposal with their terms shortly.
                                </Text>
                                <TouchableOpacity style={styles.closeBtn} onPress={resetHireModal}>
                                    <Text style={styles.closeBtnText}>Close</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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
        backgroundColor: colors.gray50,
        borderBottomWidth: 0,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    profileHeader: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: spacing.md,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: colors.white,
    },
    placeholderAvatar: {
        backgroundColor: colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.gray600,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.white,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.white,
    },
    name: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.gray900,
        marginBottom: 4,
    },
    agency: {
        fontSize: 16,
        color: colors.gray500,
        fontWeight: '500',
        marginBottom: spacing.sm,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: spacing.md,
        backgroundColor: colors.white,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    rating: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.gray900,
    },
    reviews: {
        fontSize: 12,
        color: colors.gray500,
    },
    tagsContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: spacing.lg,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    tag: {
        backgroundColor: colors.gray100,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    tagText: {
        fontSize: 12,
        color: colors.gray700,
        fontWeight: '600',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 16,
    },
    iconBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        gap: 12,
        marginBottom: spacing.xl,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.white,
        padding: spacing.md,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    statIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.gray50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        color: colors.gray500,
    },
    section: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: spacing.md,
    },
    bioText: {
        fontSize: 15,
        color: colors.gray600,
        lineHeight: 24,
    },
    areaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    areaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.white,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    areaText: {
        fontSize: 12,
        color: colors.gray700,
        fontWeight: '500',
    },
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.white,
        paddingTop: spacing.md,
        paddingBottom: Platform.OS === 'ios' ? 34 : spacing.md,
        paddingHorizontal: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10,
    },
    footerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    commissionLabel: {
        fontSize: 12,
        color: colors.gray500,
        marginBottom: 2,
    },
    commissionValue: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.gray900,
    },
    hireBtn: {
        backgroundColor: colors.gray900,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        shadowColor: colors.gray900,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    hireBtnText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.gray900,
    },
    modalSubtitle: {
        fontSize: 12,
        color: colors.gray500,
        marginTop: 2,
    },
    modalClose: {
        padding: 8,
    },
    modalBody: {
        padding: spacing.lg,
    },
    stepTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gray700,
        marginBottom: spacing.md,
    },
    serviceGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    serviceCard: {
        flex: 1,
        padding: spacing.md,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.gray100,
        backgroundColor: colors.white,
    },
    serviceCardActive: {
        borderColor: colors.primary,
        backgroundColor: '#FFF1F2',
    },
    serviceCardSell: {
        borderColor: '#3B82F6',
        backgroundColor: '#EFF6FF',
    },
    serviceIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.gray50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    serviceIconActive: {
        backgroundColor: '#FEE2E2',
    },
    serviceIconSell: {
        backgroundColor: '#DBEAFE',
    },
    serviceTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.gray900,
    },
    serviceDesc: {
        fontSize: 11,
        color: colors.gray500,
        marginTop: 2,
    },
    continueBtn: {
        marginTop: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 50,
        backgroundColor: colors.gray900,
        borderRadius: 14,
    },
    continueBtnDisabled: {
        opacity: 0.5,
    },
    continueBtnText: {
        color: colors.white,
        fontSize: 15,
        fontWeight: '600',
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.gray700,
        textTransform: 'uppercase',
        marginBottom: 6,
        marginTop: spacing.md,
    },
    input: {
        height: 48,
        backgroundColor: colors.gray50,
        borderWidth: 1,
        borderColor: colors.gray200,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 14,
        color: colors.gray900,
    },
    textArea: {
        height: 100,
        paddingTop: 14,
        textAlignVertical: 'top',
    },
    submitBtn: {
        marginTop: spacing.lg,
        height: 50,
        backgroundColor: colors.primary,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    submitBtnText: {
        color: colors.white,
        fontSize: 15,
        fontWeight: '700',
    },
    successContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: spacing.lg,
    },
    successIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#DCFCE7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    successTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: 8,
    },
    successText: {
        fontSize: 14,
        color: colors.gray500,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.xl,
    },
    closeBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: colors.gray100,
        borderRadius: 12,
    },
    closeBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gray900,
    },
});
