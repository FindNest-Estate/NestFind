import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface NegotiationRoomProps {
    deal: any;
    onAction: (action: 'ACCEPT' | 'REJECT' | 'COUNTER', data?: any) => Promise<void>;
}

export default function NegotiationRoom({ deal, onAction }: NegotiationRoomProps) {
    const [loading, setLoading] = useState(false);
    const [counterModal, setCounterModal] = useState({ show: false, amount: '', message: '' });

    const handleActionPress = async (action: 'ACCEPT' | 'REJECT' | 'COUNTER', data?: any) => {
        if (action === 'COUNTER' && !data) {
            setCounterModal({ show: true, amount: deal.amount.toString(), message: '' });
            return;
        }

        try {
            setLoading(true);
            await onAction(action, data);
            setCounterModal({ show: false, amount: '', message: '' });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const isCountered = deal.status === 'countered';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconBox}>
                    <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
                </View>
                <View>
                    <Text style={styles.title}>Negotiation Room</Text>
                    <Text style={styles.subtitle}>
                        {isCountered ? 'Counter offer received' : 'Review current offer'}
                    </Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>Current Offer Amount</Text>
                <Text style={styles.price}>₹{deal.amount?.toLocaleString()}</Text>

                {isCountered && (
                    <View style={styles.alertBox}>
                        <Ionicons name="alert-circle" size={16} color="#B45309" />
                        <Text style={styles.alertText}>Action Required</Text>
                    </View>
                )}

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => handleActionPress('REJECT')}
                        disabled={loading}
                    >
                        <Text style={styles.rejectText}>Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => handleActionPress('COUNTER')}
                        disabled={loading}
                    >
                        <Text style={styles.counterText}>Counter</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => handleActionPress('ACCEPT')}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <Text style={styles.acceptText}>Accept Offer</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Counter Modal */}
            <Modal visible={counterModal.show} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Counter Offer</Text>
                            <TouchableOpacity onPress={() => setCounterModal({ ...counterModal, show: false })}>
                                <Ionicons name="close" size={24} color={colors.gray400} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>New Price (₹)</Text>
                        <TextInput
                            style={styles.input}
                            value={counterModal.amount}
                            onChangeText={t => setCounterModal(p => ({ ...p, amount: t }))}
                            keyboardType="numeric"
                            placeholder="Enter amount"
                        />

                        <Text style={styles.inputLabel}>Message (Optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={counterModal.message}
                            onChangeText={t => setCounterModal(p => ({ ...p, message: t }))}
                            multiline
                            placeholder="Add a note..."
                            textAlignVertical="top"
                        />

                        <TouchableOpacity
                            style={styles.submitBtn}
                            onPress={() => handleActionPress('COUNTER', counterModal)}
                            disabled={loading || !counterModal.amount}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.white} />
                            ) : (
                                <Text style={styles.submitText}>Send Counter Offer</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
        gap: 12,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.gray50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.gray900,
    },
    subtitle: {
        fontSize: 13,
        color: colors.gray500,
    },
    card: {
        backgroundColor: colors.white,
        padding: spacing.lg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.gray100,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    label: {
        fontSize: 12,
        color: colors.gray500,
        fontWeight: '600',
        marginBottom: 4,
    },
    price: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.gray900,
        marginBottom: spacing.lg,
    },
    alertBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        padding: 10,
        borderRadius: 10,
        marginBottom: spacing.lg,
        gap: 8,
    },
    alertText: {
        color: '#B45309',
        fontSize: 13,
        fontWeight: '600',
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
    },
    rejectBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.gray50,
        alignItems: 'center',
    },
    rejectText: {
        color: colors.error,
        fontWeight: '700',
        fontSize: 13,
    },
    counterBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#FFFBEB',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    counterText: {
        color: '#D97706',
        fontWeight: '700',
        fontSize: 13,
    },
    acceptBtn: {
        flex: 1.5,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.gray900,
        alignItems: 'center',
    },
    acceptText: {
        color: colors.white,
        fontWeight: '700',
        fontSize: 13,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: spacing.lg,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.gray900,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.gray700,
        marginBottom: 8,
    },
    input: {
        backgroundColor: colors.gray50,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    submitBtn: {
        backgroundColor: colors.primary,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
    },
    submitText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
});
