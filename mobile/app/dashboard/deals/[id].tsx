import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    Modal,
    TextInput,
    Linking
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius, typography } from '../../../constants/theme';
import { API_URL } from '../../../constants/api';
import ScreenHeader from '../../../components/common/ScreenHeader';

export default function DealRoom() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [deal, setDeal] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [counterModal, setCounterModal] = useState({ show: false, amount: '', message: '' });

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

    const handleAction = async (action: 'ACCEPT' | 'REJECT' | 'COUNTER', data?: any) => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            const endpoint = action === 'COUNTER'
                ? `${API_URL}/offers/${id}/negotiate`
                : `${API_URL}/offers/${id}/${action.toLowerCase()}`;

            const payload = action === 'COUNTER'
                ? {
                    counter_price: parseFloat(data.amount),
                    message: data.message
                }
                : {}; // Accept/Reject might not need body or might need reasoning

            await axios.post(endpoint, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Alert.alert('Success', `Offer ${action.toLowerCase()}ed successfully`);
            setCounterModal({ show: false, amount: '', message: '' });
            fetchDeal();
        } catch (e) {
            Alert.alert('Error', 'Failed to process action');
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

    const steps = ['submitted', 'negotiating', 'accepted', 'token_paid', 'registration', 'completed'];
    const currentStepIndex = deal ? steps.indexOf(deal.status === 'countered' || deal.status === 'pending' ? 'negotiating' : deal.status) : 0;

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!deal) return null;

    return (
        <View style={styles.container}>
            <ScreenHeader title="Deal Room" subtitle={`#${deal.id} • ${deal.property?.title}`} />

            <ScrollView contentContainerStyle={styles.content}>

                {/* Status Banner */}
                <View style={[styles.statusBanner, { backgroundColor: getStatusColor(deal.status) + '15' }]}>
                    <Ionicons name="information-circle" size={20} color={getStatusColor(deal.status)} />
                    <Text style={[styles.statusBannerText, { color: getStatusColor(deal.status) }]}>
                        Status: {deal.status.toUpperCase()}
                    </Text>
                </View>

                {/* Property Card */}
                <View style={styles.section}>
                    <View style={styles.propertyCard}>
                        {/* Image placeholder since backend might not send image in this payload directly or its nested */}
                        <View style={styles.propertyIcon}>
                            <Ionicons name="home" size={24} color={colors.gray500} />
                        </View>
                        <View>
                            <Text style={styles.propTitle}>{deal.property?.title}</Text>
                            <Text style={styles.propAddress}>{deal.property?.city}</Text>
                            <Text style={styles.propPrice}>Listing: ₹{deal.property?.price?.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>

                {/* Timeline */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Timeline</Text>
                    <View style={styles.timelineContainer}>
                        {steps.map((step, index) => {
                            const isCompleted = index <= currentStepIndex;
                            const isCurrent = index === currentStepIndex;
                            return (
                                <View key={step} style={styles.timelineItem}>
                                    <View style={[
                                        styles.timelineDot,
                                        isCompleted && styles.timelineDotCompleted,
                                        isCurrent && styles.timelineDotCurrent
                                    ]}>
                                        {isCompleted && <Ionicons name="checkmark" size={12} color={colors.white} />}
                                    </View>
                                    <View style={styles.timelineLine} />
                                    <Text style={[
                                        styles.timelineText,
                                        isCompleted && styles.timelineTextCompleted
                                    ]}>
                                        {step.replace('_', ' ').toUpperCase()}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Negotiation / Current Offer */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Current Terms</Text>
                    <View style={styles.card}>
                        <Text style={styles.offerLabel}>Offer Amount</Text>
                        <Text style={styles.offerAmount}>₹{deal.amount.toLocaleString()}</Text>
                        {deal.status === 'countered' && (
                            <Text style={styles.counterAlert}>Counter Offer Received</Text>
                        )}

                        {['pending', 'countered'].includes(deal.status) && (
                            <View style={styles.actionButtons}>
                                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleAction('REJECT')}>
                                    <Text style={styles.btnText}>Reject</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.counterBtn}
                                    onPress={() => setCounterModal({ show: true, amount: deal.amount.toString(), message: '' })}
                                >
                                    <Text style={styles.btnText}>Counter</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAction('ACCEPT')}>
                                    <Text style={styles.btnText}>Accept</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                {/* Documents */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Documents</Text>
                    {/* Placeholder docs */}
                    <TouchableOpacity style={styles.docItem} onPress={() => Alert.alert('Preview', 'Document preview coming soon')}>
                        <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                        <Text style={styles.docName}>Offer Letter.pdf</Text>
                        <Ionicons name="cloud-download-outline" size={20} color={colors.gray400} />
                    </TouchableOpacity>
                    {deal.sale_deed_url && (
                        <TouchableOpacity
                            style={styles.docItem}
                            onPress={() => Linking.openURL(`${API_URL}/${deal.sale_deed_url}`)}
                        >
                            <Ionicons name="ribbon-outline" size={24} color={colors.success} />
                            <Text style={styles.docName}>Sale Deed</Text>
                            <Ionicons name="open-outline" size={20} color={colors.gray400} />
                        </TouchableOpacity>
                    )}
                </View>

            </ScrollView>

            {/* Counter Modal */}
            <Modal visible={counterModal.show} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Counter Offer</Text>
                        <Text style={styles.label}>New Price (₹)</Text>
                        <TextInput
                            style={styles.input}
                            value={counterModal.amount}
                            onChangeText={t => setCounterModal(p => ({ ...p, amount: t }))}
                            keyboardType="numeric"
                        />
                        <Text style={styles.label}>Message</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={counterModal.message}
                            onChangeText={t => setCounterModal(p => ({ ...p, message: t }))}
                            multiline
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setCounterModal({ show: false, amount: '', message: '' })}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.submitBtn}
                                onPress={() => handleAction('COUNTER', counterModal)}
                            >
                                <Text style={styles.submitBtnText}>Send Offer</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
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
        marginBottom: spacing.sm,
    },

    // Status Banner
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
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
        borderRadius: borderRadius.lg,
        gap: spacing.md,
    },
    propertyIcon: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.md,
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    propTitle: {
        fontWeight: '700',
        fontSize: 16,
        color: colors.gray900,
    },
    propAddress: {
        color: colors.gray500,
        fontSize: 12,
    },
    propPrice: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },

    // Timeline
    timelineContainer: {
        backgroundColor: colors.white,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
        overflow: 'hidden',
    },
    timelineDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.gray200,
        marginRight: spacing.sm,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    timelineDotCompleted: {
        backgroundColor: colors.success,
    },
    timelineDotCurrent: {
        borderColor: colors.primary,
        borderWidth: 2,
        backgroundColor: colors.white,
    },
    timelineLine: {
        position: 'absolute',
        left: 9,
        top: 20,
        bottom: -20,
        width: 2,
        backgroundColor: colors.gray200,
        zIndex: 1,
    },
    timelineText: {
        color: colors.gray400,
        fontSize: 12,
        fontWeight: '600',
    },
    timelineTextCompleted: {
        color: colors.gray900,
    },

    // Card
    card: {
        backgroundColor: colors.white,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
    },
    offerLabel: {
        fontSize: 12,
        color: colors.gray500,
        marginBottom: 4,
    },
    offerAmount: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: spacing.md,
    },
    counterAlert: {
        color: '#D97706',
        fontWeight: '600',
        marginBottom: spacing.md,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    rejectBtn: {
        flex: 1,
        backgroundColor: colors.error,
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    counterBtn: {
        flex: 1,
        backgroundColor: '#F59E0B',
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    acceptBtn: {
        flex: 1,
        backgroundColor: colors.success,
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    btnText: {
        color: colors.white,
        fontWeight: '600',
        fontSize: 12,
    },

    // Docs
    docItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
        gap: spacing.sm,
    },
    docName: {
        flex: 1,
        color: colors.gray900,
        fontSize: 14,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
        color: colors.gray700,
    },
    input: {
        backgroundColor: colors.gray50,
        borderWidth: 1,
        borderColor: colors.gray200,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    modalActions: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    cancelBtn: {
        flex: 1,
        padding: spacing.md,
        alignItems: 'center',
    },
    cancelBtnText: {
        color: colors.gray500,
        fontWeight: '600',
    },
    submitBtn: {
        flex: 1,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
    },
    submitBtnText: {
        color: colors.white,
        fontWeight: '600',
    },
});
