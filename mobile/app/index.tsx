import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    StatusBar,
    Animated,
    Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius, typography } from '../constants/theme';

const { width, height } = Dimensions.get('window');

export default function Index() {
    const [checking, setChecking] = useState(true);
    const [showSplash, setShowSplash] = useState(true);
    const router = useRouter();

    // Netflix-style animation values
    const logoScale = useRef(new Animated.Value(0.3)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const splashFade = useRef(new Animated.Value(1)).current;

    // Bubble animations
    const bubble1Y = useRef(new Animated.Value(0)).current;
    const bubble2Y = useRef(new Animated.Value(0)).current;
    const bubble3Y = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        startSplashAnimation();
        startBubbleAnimations();
    }, []);

    const startBubbleAnimations = () => {
        // Bubble 1 - slow float
        Animated.loop(
            Animated.sequence([
                Animated.timing(bubble1Y, {
                    toValue: -20,
                    duration: 3000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(bubble1Y, {
                    toValue: 0,
                    duration: 3000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Bubble 2 - medium float
        Animated.loop(
            Animated.sequence([
                Animated.timing(bubble2Y, {
                    toValue: -15,
                    duration: 2500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(bubble2Y, {
                    toValue: 0,
                    duration: 2500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Bubble 3 - fast float
        Animated.loop(
            Animated.sequence([
                Animated.timing(bubble3Y, {
                    toValue: -12,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(bubble3Y, {
                    toValue: 0,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const startSplashAnimation = () => {
        // Netflix-style: fade in + scale up, then slight zoom in
        Animated.sequence([
            // 1. Fade in and scale up from small
            Animated.parallel([
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.spring(logoScale, {
                    toValue: 1,
                    friction: 5,
                    tension: 60,
                    useNativeDriver: true,
                }),
            ]),
            // 2. Hold for a moment
            Animated.delay(500),
            // 3. Slight zoom in (Netflix effect)
            Animated.timing(logoScale, {
                toValue: 1.15,
                duration: 600,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
            }),
            // 4. Brief hold
            Animated.delay(300),
        ]).start(() => {
            checkAuthAndTransition();
        });
    };

    const checkAuthAndTransition = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            // Fade out splash
            Animated.timing(splashFade, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setShowSplash(false);
                if (token) {
                    router.replace('/home');
                } else {
                    setChecking(false);
                }
            });
        } catch (e) {
            setShowSplash(false);
            setChecking(false);
        }
    };

    // Netflix-style Splash: White background, Red "NestFind" text, no icons
    if (showSplash) {
        return (
            <Animated.View style={[styles.splashContainer, { opacity: splashFade }]}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

                <Animated.Text
                    style={[
                        styles.splashLogo,
                        {
                            opacity: logoOpacity,
                            transform: [{ scale: logoScale }]
                        }
                    ]}
                >
                    NestFind
                </Animated.Text>
            </Animated.View>
        );
    }

    if (checking) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Animated Bubbles */}
            <Animated.View style={[styles.bubble1, { transform: [{ translateY: bubble1Y }] }]} />
            <Animated.View style={[styles.bubble2, { transform: [{ translateY: bubble2Y }] }]} />
            <Animated.View style={[styles.bubble3, { transform: [{ translateY: bubble3Y }] }]} />

            {/* Content */}
            <View style={styles.content}>
                {/* Branding */}
                <View style={styles.hero}>
                    <Text style={styles.appName}>NestFind</Text>
                    <Text style={styles.tagline}>Discover Your Dream Home</Text>
                </View>

                {/* CTA Buttons */}
                <View style={styles.cta}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.push('/(auth)/login')}
                        activeOpacity={0.9}
                    >
                        <Text style={styles.primaryButtonText}>Sign In</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => router.push('/(auth)/register')}
                        activeOpacity={0.9}
                    >
                        <Text style={styles.secondaryButtonText}>Create Account</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.guestButton}
                        onPress={() => router.push('/home')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.guestButtonText}>Browse as Guest →</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // Netflix-style Splash Screen
    splashContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    splashLogo: {
        fontSize: 52,
        fontWeight: '800',
        color: colors.primary, // Red color
        letterSpacing: -1,
    },
    // Main Screen Styles
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    // Animated Bubbles
    bubble1: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: 'rgba(255, 56, 92, 0.08)',
        top: -80,
        right: -80,
    },
    bubble2: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255, 56, 92, 0.06)',
        bottom: 150,
        left: -60,
    },
    bubble3: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255, 56, 92, 0.05)',
        top: height * 0.35,
        right: -40,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxl,
    },
    hero: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    appName: {
        fontSize: 52,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: -1,
    },
    tagline: {
        fontSize: 16,
        color: colors.gray500,
        marginTop: spacing.xs,
    },
    features: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.lg,
        marginTop: spacing.lg,
    },
    featureItem: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        minWidth: 90,
    },
    featureIcon: {
        fontSize: 28,
        marginBottom: spacing.xs,
    },
    featureText: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
    },
    cta: {
        width: '100%',
    },
    primaryButton: {
        width: '100%',
        backgroundColor: colors.primary,
        paddingVertical: 18,
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        marginBottom: spacing.md,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    primaryButtonText: {
        color: colors.white,
        fontWeight: '700',
        fontSize: 18,
    },
    secondaryButton: {
        width: '100%',
        backgroundColor: 'transparent',
        paddingVertical: 18,
        borderRadius: borderRadius.xl,
        borderWidth: 2,
        borderColor: colors.gray200,
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    secondaryButtonText: {
        color: colors.gray700,
        fontWeight: '600',
        fontSize: 16,
    },
    guestButton: {
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    guestButtonText: {
        color: colors.gray500,
        fontSize: 15,
    },
});
