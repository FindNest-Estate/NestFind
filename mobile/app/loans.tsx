import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius } from '../constants/theme';
import ScreenHeader from '../components/common/ScreenHeader';
import { API_URL } from '../constants/api';

const { width } = Dimensions.get('window');

export default function Loans() {
    const [amount, setAmount] = useState('5000000');
    const [rate, setRate] = useState('8.5');
    const [tenure, setTenure] = useState('20');
    const [emi, setEmi] = useState(0);

    const [banks, setBanks] = useState<any[]>([]);

    const calculateEmi = () => {
        const p = parseFloat(amount);
        const r = parseFloat(rate) / 12 / 100;
        const n = parseFloat(tenure) * 12;

        if (p && r && n) {
            const e = p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
            setEmi(Math.round(e));
        } else {
            setEmi(0);
        }
    };

    const fetchBankOffers = async () => {
        try {
            // No auth needed for public bank offers potentially, but using token if avail
            const token = await AsyncStorage.getItem('auth_token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const response = await axios.get(`${API_URL}/loans/offers`, { headers });
            setBanks(response.data);
        } catch (error) {
            console.error('Error fetching bank offers:', error);
        }
    };

    useEffect(() => {
        calculateEmi();
        fetchBankOffers();
    }, [amount, rate, tenure]);

    return (
        <View style={styles.container}>
            <ScreenHeader title="Home Loans" />

            <ScrollView contentContainerStyle={styles.content}>

                {/* Calculator Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>EMI Calculator</Text>

                    <View style={styles.resultContainer}>
                        <Text style={styles.resultLabel}>Monthly EMI</Text>
                        <Text style={styles.resultValue}>₹{emi.toLocaleString()}</Text>
                        <View style={styles.breakdown}>
                            <Text style={styles.breakdownText}>Principal: ₹{amount}</Text>
                            <Text style={styles.breakdownText}>Interest: {rate}%</Text>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Loan Amount (₹)</Text>
                        <TextInput
                            style={styles.input}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>Interest Rate (%)</Text>
                            <TextInput
                                style={styles.input}
                                value={rate}
                                onChangeText={setRate}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.label}>Tenure (Years)</Text>
                            <TextInput
                                style={styles.input}
                                value={tenure}
                                onChangeText={setTenure}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                </View>

                {/* Bank Offers */}
                <Text style={styles.sectionTitle}>Top Bank Offers</Text>
                {banks.map((bank) => (
                    <TouchableOpacity key={bank.id} style={styles.bankCard} activeOpacity={0.8}>
                        <View style={styles.bankIcon}>
                            <Ionicons name={bank.bank_logo_icon as any} size={24} color={colors.white} />
                        </View>
                        <View style={styles.bankInfo}>
                            <Text style={styles.bankName}>{bank.bank_name}</Text>
                            <Text style={styles.bankMeta}>Processing Fee: {bank.processing_fee}</Text>
                        </View>
                        <View style={styles.bankRate}>
                            <Text style={styles.rateValue}>{bank.interest_rate}</Text>
                            <Text style={styles.rateLabel}>Interest</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
                    </TouchableOpacity>
                ))}

                {/* Pre-approval CTA */}
                <View style={styles.ctaContainer}>
                    <View style={styles.ctaContent}>
                        <Text style={styles.ctaTitle}>Get Pre-Approved</Text>
                        <Text style={styles.ctaText}>Check your eligibility instantly without affecting your credit score.</Text>
                    </View>
                    <TouchableOpacity style={styles.ctaButton}>
                        <Text style={styles.ctaButtonText}>Check Now</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gray50,
    },
    content: {
        padding: spacing.md,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 4,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: spacing.lg,
    },
    resultContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
        backgroundColor: colors.primary + '10', // 10% opacity
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
    },
    resultLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.gray600,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    resultValue: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: 8,
    },
    breakdown: {
        flexDirection: 'row',
        gap: 16,
    },
    breakdownText: {
        fontSize: 12,
        color: colors.gray500,
    },
    inputGroup: {
        marginBottom: spacing.md,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.gray700,
        marginBottom: 6,
    },
    input: {
        backgroundColor: colors.gray50,
        borderWidth: 1,
        borderColor: colors.gray200,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: 16,
        fontWeight: '600',
        color: colors.gray900,
    },
    row: {
        flexDirection: 'row',
    },

    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: spacing.md,
        marginLeft: spacing.xs,
    },
    bankCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.sm,
        gap: spacing.md,
    },
    bankIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.gray900,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bankInfo: {
        flex: 1,
    },
    bankName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.gray900,
    },
    bankMeta: {
        fontSize: 12,
        color: colors.gray500,
    },
    bankRate: {
        alignItems: 'flex-end',
        marginRight: spacing.sm,
    },
    rateValue: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.success,
    },
    rateLabel: {
        fontSize: 10,
        color: colors.gray400,
    },

    ctaContainer: {
        marginTop: spacing.lg,
        backgroundColor: '#1E1B4B', // indigo-950
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    ctaContent: {
        flex: 1,
        marginRight: spacing.md,
    },
    ctaTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.white,
        marginBottom: 4,
    },
    ctaText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        lineHeight: 18,
    },
    ctaButton: {
        backgroundColor: colors.white,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    ctaButtonText: {
        color: '#1E1B4B',
        fontWeight: '700',
        fontSize: 12,
    },
});
