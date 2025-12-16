import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    Linking,
    StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius } from '../../../constants/theme';
import { API_URL } from '../../../constants/api';
import ScreenHeader from '../../../components/common/ScreenHeader';
import DealTimeline from '../../../components/deals/DealTimeline';
import NegotiationRoom from '../../../components/deals/NegotiationRoom';

export default function DealRoom() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [deal, setDeal] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchDeal();
    }, [id]);

    const fetchDeal = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            const response = await axios.get(`${API_URL}/offers/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDeal(response.data);
        } catch (error) {
            console.error('Error fetching deal:', error);
            Alert.alert('Error', 'Failed to load deal details');
        } finally {
            setLoading(false);
        }
    };

    const handleNegotiationAction = async (action: 'ACCEPT' | 'REJECT' | 'COUNTER', data?: any) => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            // Backend expects PUT /offers/{id} with { status: string, amount?: number }
            const endpoint = `${API_URL}/offers/${id}`;

            let payload: any = {};

            if (action === 'ACCEPT') {
                payload = { status: 'accepted' };
            } else if (action === 'REJECT') {
                payload = { status: 'rejected' };
            } else if (action === 'COUNTER') {
                // For Buyer, countering means setting status to 'pending' with new amount
                payload = {
                    status: 'pending',
                    amount: parseFloat(data.amount)
                };
            }

            await axios.put(endpoint, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Alert.alert('Success', `Offer ${action.toLowerCase()}ed successfully`);
            fetchDeal();
        } catch (error: any) {
            console.error('Negotiation error:', error);
            const msg = error.response?.data?.detail || 'Failed to update offer';
            Alert.alert('Error', msg);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'accepted': return colors.success;
            case 'pending': return '#F59E0B';
            case 'countered': return '#8B5CF6';
            case 'rejected': return colors.error;
            case 'completed': return colors.secondary;
            default: return colors.gray500;
        }
    };

    // Assuming Web Steps parity
    const steps = ['accepted', 'token_paid', 'registration', 'commission', 'completed'];

    // Calculate index based on status mapping
    let currentStepIndex = -1;
    if (deal) {
        if (deal.status === 'completed') currentStepIndex = 4;
        else if (deal.sale_deed_url) currentStepIndex = 3; // Commission/Docs done
        else if (deal.status === 'token_paid') currentStepIndex = 1;
        else if (deal.status === 'accepted') currentStepIndex = 0;
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!deal) return null;

    const isNegotiating = ['pending', 'countered', 'rejected'].includes(deal.status);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <ScreenHeader title="Deal Room" subtitle={`#${deal.id} • ${deal.property?.city}`} />

            <ScrollView contentContainerStyle={styles.content}>

                {/* Status Banner */}
                <View style={[styles.statusBanner, { backgroundColor: getStatusColor(deal.status) + '15' }]}>
                    <Ionicons name="information-circle" size={20} color={getStatusColor(deal.status)} />
                    <Text style={[styles.statusBannerText, { color: getStatusColor(deal.status) }]}>
                        Status: {deal.status.toUpperCase()}
                    </Text>
                </View>

                {/* Property Context */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.propertyCard}
                        onPress={() => router.push(`/property/${deal.property?.id}`)} // Fixed route
                        activeOpacity={0.8}
                    >
                        <View style={styles.propertyIcon}>
                            <Ionicons name="home" size={24} color={colors.gray500} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.propTitle} numberOfLines={1}>{deal.property?.title}</Text>
                            <Text style={styles.propAddress}>{deal.property?.address}</Text>
                            <Text style={styles.propPrice}>Listing: ₹{deal.property?.price?.toLocaleString()}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
                    </TouchableOpacity>
                </View>

                {/* Workflow Area */}
                <View style={styles.section}>
                    {isNegotiating ? (
                        <NegotiationRoom deal={deal} onAction={handleNegotiationAction} />
                    ) : (
                        <DealTimeline currentStepIndex={currentStepIndex} steps={steps} />
                    )}
                </View>

                {/* Document Vault (simplified) */}
                {!isNegotiating && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Document Vault</Text>

                        {/* Static / Dynamic Docs */}
                        <TouchableOpacity style={styles.docItem} onPress={() => Alert.alert('Preview', 'Offer Letter preview')}>
                            <View style={[styles.docIcon, { backgroundColor: colors.blue50 }]}>
                                <Ionicons name="document-text-outline" size={20} color={colors.blue500} />
                            </View>
                            <Text style={styles.docName}>Offer Letter.pdf</Text>
                            <Ionicons name="cloud-download-outline" size={18} color={colors.gray400} />
                        </TouchableOpacity>

                        {deal.sale_deed_url && (
                            <TouchableOpacity
                                style={styles.docItem}
                                onPress={() => Linking.openURL(`${API_URL}/${deal.sale_deed_url}`)}
                            >
                                <View style={[styles.docIcon, { backgroundColor: colors.green50 }]}>
                                    <Ionicons name="ribbon-outline" size={20} color={colors.success} />
                                </View>
                                <Text style={styles.docName}>Sale Deed</Text>
                                <Ionicons name="open-outline" size={18} color={colors.gray400} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Financials (If not negotiating) */}
                {!isNegotiating && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Financial Snapshot</Text>
                        <View style={styles.card}>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>Agreed Amount</Text>
                                <Text style={styles.statValue}>₹{deal.amount?.toLocaleString()}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>Token Paid</Text>
                                <Text style={[styles.statValue, { color: colors.success }]}>
                                    {deal.status !== 'accepted' ? 'Yes' : 'Pending'}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

            </ScrollView>
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
    content: {
        padding: spacing.md,
        paddingBottom: 40,
    },
    section: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: spacing.md,
    },

    // Status Banner
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: 16,
        marginBottom: spacing.lg,
        gap: 8,
    },
    statusBannerText: {
        fontWeight: '700',
        fontSize: 14,
    },

    // Property Card
    propertyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        padding: spacing.md,
        borderRadius: 20,
        gap: spacing.md,
        borderWidth: 1,
        borderColor: colors.gray100,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    propertyIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: colors.gray50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    propTitle: {
        fontWeight: '700',
        fontSize: 15,
        color: colors.gray900,
        marginBottom: 2,
    },
    propAddress: {
        color: colors.gray500,
        fontSize: 12,
        marginBottom: 4,
    },
    propPrice: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: '700',
    },

    // Docs
    docItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        padding: spacing.sm,
        paddingRight: spacing.md,
        borderRadius: 16,
        marginBottom: spacing.sm,
        gap: spacing.md,
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    docIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    docName: {
        flex: 1,
        color: colors.gray900,
        fontSize: 14,
        fontWeight: '500',
    },

    // Financial Card
    card: {
        backgroundColor: colors.white,
        padding: spacing.lg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 14,
        color: colors.gray500,
        fontWeight: '500',
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.gray900,
    },
    divider: {
        height: 1,
        backgroundColor: colors.gray100,
        marginVertical: spacing.md,
    },
});
