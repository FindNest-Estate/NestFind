import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { API_URL } from '../../constants/api';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);

            const response = await axios.post(`${API_URL}/auth/login`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const { access_token } = response.data;
            await AsyncStorage.setItem('auth_token', access_token);

            // Fetch user details
            const userResponse = await axios.get(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${access_token}` }
            });
            await AsyncStorage.setItem('user', JSON.stringify(userResponse.data));

            router.replace('/home');
        } catch (error: any) {
            console.error(error);
            Alert.alert('Login Failed', error.response?.data?.detail || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Logo Area */}
                <View style={styles.logoContainer}>
                    <Text style={styles.logo}>🏠</Text>
                    <Text style={styles.appName}>NestFind</Text>
                    <Text style={styles.tagline}>Find your perfect home</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your email"
                        placeholderTextColor={colors.gray400}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <Text style={[styles.label, { marginTop: spacing.md }]}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your password"
                        placeholderTextColor={colors.gray400}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={true}
                    />

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.white} />
                        ) : (
                            <Text style={styles.buttonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => router.push('/(auth)/register')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.secondaryButtonText}>Create Account</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xxl,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    logo: {
        fontSize: 64,
        marginBottom: spacing.sm,
    },
    appName: {
        ...typography.h1,
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    tagline: {
        ...typography.body,
        color: colors.gray500,
    },
    form: {
        width: '100%',
    },
    label: {
        ...typography.bodySmall,
        color: colors.gray700,
        marginBottom: spacing.xs,
    },
    input: {
        width: '100%',
        backgroundColor: colors.gray50,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.gray200,
        fontSize: 16,
        color: colors.gray900,
    },
    button: {
        width: '100%',
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        marginTop: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: colors.white,
        fontWeight: '600',
        fontSize: 16,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.gray200,
    },
    dividerText: {
        ...typography.bodySmall,
        color: colors.gray400,
        marginHorizontal: spacing.md,
    },
    secondaryButton: {
        width: '100%',
        backgroundColor: colors.white,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.gray900,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: colors.gray900,
        fontWeight: '600',
        fontSize: 16,
    },
});
