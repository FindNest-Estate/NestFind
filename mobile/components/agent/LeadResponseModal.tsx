import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { api } from '../../lib/api';

interface LeadResponseModalProps {
    visible: boolean;
    onClose: () => void;
    request: any;
    onSuccess: () => void;
}

export default function LeadResponseModal({ visible, onClose, request, onSuccess }: LeadResponseModalProps) {
    const [commission, setCommission] = useState('2.0');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        const rate = parseFloat(commission);
        if (isNaN(rate) || rate <= 0) {
            Alert.alert('Invalid Input', 'Please enter a valid commission rate');
            return;
        }

        try {
            setLoading(true);
            await api.agents.proposeTerms(request.id, { commission_rate: rate });
            Alert.alert('Success', 'Proposal sent!');
            onSuccess();
            onClose();
        } catch (error: any) {
            Alert.alert('Error', 'Failed to send proposal');
        } finally {
            setLoading(false);
        }
    };

    if (!request) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <View style={styles.overlay}>
                    <TouchableOpacity style={styles.backdrop} onPress={onClose} />

                    <View style={styles.content}>
                        <View style={styles.header}>
                            <Text style={styles.title}>Propose Terms</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color={colors.gray500} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.body}>
                            {/* Request Summary */}
                            <View style={styles.summaryCard}>
                                <Text style={styles.label}>Client Request</Text>
                                <Text style={styles.clientName}>
                                    {request.client?.first_name} {request.client?.last_name}
                                </Text>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{request.service_type}</Text>
                                </View>
                                <Text style={styles.message}>"{request.initial_message}"</Text>
                            </View>

                            {/* Input */}
                            <Text style={styles.inputLabel}>Your Commission Rate (%)</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.prefix}>%</Text>
                                <TextInput
                                    style={styles.input}
                                    value={commission}
                                    onChangeText={setCommission}
                                    keyboardType="numeric"
                                    maxLength={4}
                                />
                            </View>
                            <Text style={styles.helper}>Standard market rate: 1.5% - 2.5%</Text>

                            <TouchableOpacity
                                style={styles.submitBtn}
                                onPress={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.submitBtnText}>Send Proposal</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    backdrop: {
        flex: 1,
    },
    content: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.gray900,
    },
    body: {
        padding: spacing.md,
    },
    summaryCard: {
        backgroundColor: colors.gray50,
        padding: spacing.md,
        borderRadius: 16,
        marginBottom: 20,
    },
    label: {
        fontSize: 12,
        color: colors.gray500,
        marginBottom: 4,
    },
    clientName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: 8,
    },
    badge: {
        backgroundColor: colors.blue100,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 8,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.blue600,
    },
    message: {
        fontSize: 14,
        color: colors.gray600,
        fontStyle: 'italic',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray50,
        borderWidth: 1,
        borderColor: colors.gray200,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
    },
    prefix: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.gray400,
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 24,
        fontWeight: '700',
        color: colors.gray900,
    },
    helper: {
        fontSize: 12,
        color: colors.gray500,
        marginTop: 6,
        marginBottom: 24,
    },
    submitBtn: {
        backgroundColor: colors.gray900,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    submitBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.white,
    },
});
