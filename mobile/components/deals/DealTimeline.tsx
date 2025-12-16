import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface DealTimelineProps {
    currentStepIndex: number;
    steps: string[];
}

export default function DealTimeline({ currentStepIndex, steps }: DealTimelineProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Timeline</Text>
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
                                {isCompleted && (
                                    <Ionicons name="checkmark" size={10} color={colors.white} />
                                )}
                            </View>

                            {/* Connect Line (except for last item) */}
                            {index < steps.length - 1 && (
                                <View style={[
                                    styles.timelineLine,
                                    index < currentStepIndex && styles.timelineLineCompleted
                                ]} />
                            )}

                            <Text style={[
                                styles.timelineText,
                                isCompleted && styles.timelineTextCompleted,
                                isCurrent && styles.timelineTextCurrent
                            ]}>
                                {step.replace('_', ' ').toUpperCase()}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.lg,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: spacing.md,
    },
    timelineContainer: {
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
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48, // Fixed height for consistent lines
        position: 'relative',
    },
    timelineDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.gray100,
        marginRight: spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
        borderWidth: 2,
        borderColor: colors.white,
    },
    timelineDotCompleted: {
        backgroundColor: colors.success,
    },
    timelineDotCurrent: {
        backgroundColor: colors.white,
        borderColor: colors.primary,
        borderWidth: 5,
    },
    timelineLine: {
        position: 'absolute',
        left: 11, // Center of dot (24/2) -> 12 - 1 (width/2) -> 11
        top: 24,
        height: 24, // Connect to next item
        width: 2,
        backgroundColor: colors.gray100,
        zIndex: 1,
    },
    timelineLineCompleted: {
        backgroundColor: colors.success,
    },
    timelineText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.gray400,
        letterSpacing: 0.5,
    },
    timelineTextCompleted: {
        color: colors.gray900,
    },
    timelineTextCurrent: {
        color: colors.primary,
        fontWeight: '700',
    },
});
