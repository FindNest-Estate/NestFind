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
    Platform,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { api } from '../../lib/api';

interface HireAgentModalProps {
    visible: boolean;
    onClose: () => void;
    agent: any;
    onSuccess: () => void;
}

export default function HireAgentModal({ visible, onClose, agent, onSuccess }: HireAgentModalProps) {
    const [step, setStep] = useState(1);
    const [serviceType, setServiceType] = useState<'BUYING' | 'SELLING' | null>(null);
    const [preferences, setPreferences] = useState({
        budget: '',
        locations: '',
        property_details: '' // For sellers
    });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleNext = () => {
        if (step === 1 && !serviceType) {
            Alert.alert('Required', 'Please select a service type');
            return;
        }
        setStep(step + 1);
    };

    const handleSubmit = async () => {
        if (!message.trim()) {
            Alert.alert('Required', 'Please add a short message');
            return;
        }

        try {
            setLoading(true);
            await api.agents.hire(agent.id, {
                service_type: serviceType!,
                property_preferences: preferences,
                initial_message: message
            });

            Alert.alert('Success', 'Request sent successfully!');
            onSuccess();
            handleClose();
        } catch (error: any) {
            const msg = error.response?.data?.detail || 'Failed to send request';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setServiceType(null);
        setPreferences({ budget: '', locations: '', property_details: '' });
        setMessage('');
        onClose();
    };

    if (!agent) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <View style={styles.overlay}>
                    <View style={styles.content}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={colors.gray500} />
                            </TouchableOpacity>
                            <Text style={styles.title}>
                                {step === 1 ? 'Select Service' : step === 2 ? 'Details' : 'Message'}
                            </Text>
                            <View style={{ width: 40 }} />
                        </View>

                        {/* Progress Bar */}
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
                        </View>

                        <ScrollView contentContainerStyle={styles.scrollContent}>
                            {/* Step 1: Service Type */}
                            {step === 1 && (
                                <View style={styles.stepContainer}>
                                    <Text style={styles.stepTitle}>How can {agent.first_name} help you?</Text>

                                    <TouchableOpacity
                                        style={[styles.optionCard, serviceType === 'BUYING' && styles.optionSelected]}
                                        onPress={() => setServiceType('BUYING')}
                                    >
                                        <View style={[styles.optionIcon, { backgroundColor: '#EFF6FF' }]}>
                                            <Ionicons name="search" size={24} color={colors.blue500} />
                                        </View>
                                        <View style={styles.optionText}>
                                            <Text style={styles.optionTitle}>I want to Buy</Text>
                                            <Text style={styles.optionDesc}>Find a dream home within my budget</Text>
                                        </View>
                                        {serviceType === 'BUYING' && <Ionicons name="checkmark-circle" size={24} color={colors.blue500} />}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.optionCard, serviceType === 'SELLING' && styles.optionSelected]}
                                        onPress={() => setServiceType('SELLING')}
                                    >
                                        <View style={[styles.optionIcon, { backgroundColor: '#F0FDF4' }]}>
                                            <Ionicons name="home" size={24} color={colors.green500} />
                                        </View>
                                        <View style={styles.optionText}>
                                            <Text style={styles.optionTitle}>I want to Sell</Text>
                                            <Text style={styles.optionDesc}>List and market my property</Text>
                                        </View>
                                        {serviceType === 'SELLING' && <Ionicons name="checkmark-circle" size={24} color={colors.green500} />}
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Step 2: Preferences */}
                            {step === 2 && (
                                <View style={styles.stepContainer}>
                                    <Text style={styles.stepTitle}>Tell us more</Text>

                                    {serviceType === 'BUYING' ? (
                                        <>
                                            <View style={styles.inputGroup}>
                                                <Text style={styles.label}>Your Budget</Text>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="e.g. $500k - $700k"
                                                    value={preferences.budget}
                                                    onChangeText={(t) => setPreferences({ ...preferences, budget: t })}
                                                />
                                            </View>
                                            <View style={styles.inputGroup}>
                                                <Text style={styles.label}>Preferred Locations</Text>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="e.g. Downtown, Suburbs"
                                                    value={preferences.locations}
                                                    onChangeText={(t) => setPreferences({ ...preferences, locations: t })}
                                                />
                                            </View>
                                        </>
                                    ) : (
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Property Details</Text>
                                            <TextInput
                                                style={[styles.input, { height: 100 }]}
                                                multiline
                                                placeholder="Address, type, approximate size..."
                                                value={preferences.property_details}
                                                onChangeText={(t) => setPreferences({ ...preferences, property_details: t })}
                                            />
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* Step 3: Message */}
                            {step === 3 && (
                                <View style={styles.stepContainer}>
                                    <Text style={styles.stepTitle}>Add a personal note</Text>
                                    <TextInput
                                        style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
                                        multiline
                                        placeholder={`Hi ${agent.first_name}, I'd like to hire you because...`}
                                        value={message}
                                        onChangeText={setMessage}
                                    />
                                    <Text style={styles.helperText}>
                                        Sending this request will notify the agent. They will review and propose their commission terms.
                                    </Text>
                                </View>
                            )}
                        </ScrollView>

                        {/* Footer */}
                        <View style={styles.footer}>
                            {step > 1 && (
                                <TouchableOpacity
                                    style={styles.backBtn}
                                    onPress={() => setStep(step - 1)}
                                >
                                    <Text style={styles.backBtnText}>Back</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[styles.mainBtn, { flex: 1 }]}
                                onPress={step === 3 ? handleSubmit : handleNext}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.mainBtnText}>
                                        {step === 3 ? 'Send Request' : 'Next'}
                                    </Text>
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
    content: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
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
    closeBtn: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.gray900,
    },
    progressBar: {
        height: 4,
        backgroundColor: colors.gray100,
        width: '100%',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.gray900,
        borderRadius: 2,
    },
    scrollContent: {
        padding: spacing.lg,
    },
    stepContainer: {
        gap: 20,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.gray900,
        marginBottom: 8,
    },

    // Options
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.gray200,
        borderRadius: 16,
        gap: 16,
    },
    optionSelected: {
        borderColor: colors.gray900,
        backgroundColor: colors.gray50,
        borderWidth: 2,
    },
    optionIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionText: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: 2,
    },
    optionDesc: {
        fontSize: 13,
        color: colors.gray500,
    },

    // Inputs
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gray700,
        marginBottom: 8,
    },
    input: {
        backgroundColor: colors.gray50,
        borderWidth: 1,
        borderColor: colors.gray200,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: colors.gray900,
    },
    helperText: {
        fontSize: 13,
        color: colors.gray500,
        lineHeight: 20,
    },

    // Footer
    footer: {
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
        flexDirection: 'row',
        gap: 12,
    },
    backBtn: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 14,
        backgroundColor: colors.gray100,
    },
    backBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.gray900,
    },
    mainBtn: {
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: colors.gray900,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mainBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.white,
    },
});
