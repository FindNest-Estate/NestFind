import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';

export default function Register() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backButton}>← Back</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Registration coming soon!</Text>
                <Text style={styles.hint}>For now, please use the web app to register.</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
        paddingHorizontal: spacing.xl,
    },
    header: {
        paddingTop: spacing.xl,
    },
    backButton: {
        ...typography.body,
        color: colors.primary,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        ...typography.h1,
        color: colors.gray900,
        marginBottom: spacing.md,
    },
    subtitle: {
        ...typography.h3,
        color: colors.gray500,
        marginBottom: spacing.sm,
    },
    hint: {
        ...typography.body,
        color: colors.gray400,
        textAlign: 'center',
    },
});
