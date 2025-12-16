import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { API_URL } from '../../constants/api';

const { width } = Dimensions.get('window');

interface AgentCardProps {
    agent: any;
    onPress: () => void;
    onHire: () => void;
    layout?: 'list' | 'map-callout';
}

export default function AgentCard({ agent, onPress, onHire, layout = 'list' }: AgentCardProps) {
    const imageUrl = agent.profile_image
        ? `${API_URL}/${agent.profile_image}`
        : null;

    // Real data from backend (with fallbacks only if 0/null)
    const rating = agent.average_rating || 0;
    const reviewCount = agent.review_count || 0;
    const experience = agent.experience_years || 0; // Backend field is experience_years
    const sales = agent.sales_count || 0;

    if (layout === 'map-callout') {
        return (
            <View style={styles.calloutContainer}>
                <View style={styles.calloutHeader}>
                    {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.calloutImage} />
                    ) : (
                        <View style={[styles.calloutImage, styles.placeholderImage]}>
                            <Ionicons name="person" size={20} color={colors.primary} />
                        </View>
                    )}
                    <View style={styles.calloutInfo}>
                        <View style={styles.calloutNameRow}>
                            <Text style={styles.calloutName} numberOfLines={1}>
                                {agent.first_name} {agent.last_name}
                            </Text>
                            {agent.is_verified && (
                                <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
                            )}
                        </View>
                        <Text style={styles.calloutSpecialty} numberOfLines={1}>
                            {agent.specialty || 'Real Estate Agent'}
                        </Text>
                        <View style={styles.calloutRating}>
                            <Ionicons name="star" size={10} color="#F59E0B" />
                            <Text style={styles.calloutRatingText}>{rating} ({reviewCount})</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity style={styles.calloutBtn} onPress={onPress}>
                    <Text style={styles.calloutBtnText}>View Details</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // LIST LAYOUT - Premium Design
    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
            {/* Header Section */}
            <View style={styles.headerSection}>
                <View style={styles.imageWrapper}>
                    {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.image} />
                    ) : (
                        <View style={[styles.image, styles.placeholderImage]}>
                            <Ionicons name="person" size={28} color={colors.gray400} />
                        </View>
                    )}
                    {agent.is_available && (
                        <View style={styles.onlineBadge}>
                            <View style={styles.onlineDot} />
                            <Text style={styles.onlineText}>ONLINE</Text>
                        </View>
                    )}
                </View>

                <View style={styles.infoColumn}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name} numberOfLines={1}>
                            {agent.first_name} {agent.last_name}
                        </Text>
                        <Ionicons name="checkmark-circle" size={16} color={colors.blue500} />
                    </View>

                    <Text style={styles.agencyName} numberOfLines={1}>
                        {agent.agency_name || "Premier Estate Agent"}
                    </Text>

                    <View style={styles.badgesScroll}>
                        <View style={styles.badge}>
                            <Ionicons name="ribbon-outline" size={12} color={colors.primary} />
                            <Text style={styles.badgeText}>{experience} Yrs Exp.</Text>
                        </View>
                        <View style={styles.badge}>
                            <Ionicons name="trending-up-outline" size={12} color={colors.blue500} />
                            <Text style={styles.badgeText}>{sales} Sales</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.ratingColumn}>
                    <View style={styles.ratingBox}>
                        <Text style={styles.ratingScore}>{rating}</Text>
                    </View>
                    <Text style={styles.reviewCount}>{reviewCount} reviews</Text>
                </View>
            </View>

            {/* Specialties - Horizontal list */}
            {agent.specialty && (
                <View style={styles.specialtiesContainer}>
                    {agent.specialty.split(',').slice(0, 3).map((tag: string, index: number) => (
                        <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>{tag.trim()}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                    <View style={[styles.iconBox, { backgroundColor: colors.red50 }]}>
                        <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
                    </View>
                    <View>
                        <Text style={styles.statLabel}>Commission</Text>
                        <Text style={styles.statValue}>{agent.commission_rate || '1.5'}%</Text>
                    </View>
                </View>
                <View style={styles.statItem}>
                    <View style={[styles.iconBox, { backgroundColor: colors.blue50 }]}>
                        <Ionicons name="location-outline" size={14} color={colors.blue500} />
                    </View>
                    <View>
                        <Text style={styles.statLabel}>Service Area</Text>
                        <Text style={styles.statValue}>{agent.service_radius || 50} km</Text>
                    </View>
                </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
                <TouchableOpacity
                    style={styles.hireBtn}
                    onPress={(e) => {
                        e.stopPropagation();
                        onPress();
                    }}
                >
                    <Text style={styles.hireBtnText}>View Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.msgBtn}
                    onPress={(e) => {
                        e.stopPropagation();
                        // Message logic would go here
                    }}
                >
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.gray600} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    // CONTAINER
    container: {
        backgroundColor: colors.white,
        borderRadius: 24,
        padding: spacing.md,
        marginBottom: spacing.md,
        // Premium Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: colors.gray100,
    },

    // HEADER
    headerSection: {
        flexDirection: 'row',
        marginBottom: spacing.md,
    },
    imageWrapper: {
        position: 'relative',
        marginRight: spacing.md,
    },
    image: {
        width: 64,
        height: 64,
        borderRadius: 18,
        backgroundColor: colors.gray100,
    },
    placeholderImage: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.gray50,
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    onlineBadge: {
        position: 'absolute',
        bottom: -6,
        right: -6,
        backgroundColor: colors.green500,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 100,
        borderWidth: 2,
        borderColor: colors.white,
        gap: 3,
    },
    onlineDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.white,
    },
    onlineText: {
        color: colors.white,
        fontSize: 8,
        fontWeight: '800',
    },
    infoColumn: {
        flex: 1,
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.gray900,
        flexShrink: 1,
    },
    agencyName: {
        fontSize: 13,
        color: colors.gray500,
        fontWeight: '500',
        marginBottom: 8,
    },
    badgesScroll: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray50,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 3,
    },
    badgeText: {
        fontSize: 10,
        color: colors.gray600,
        fontWeight: '600',
    },
    ratingColumn: {
        alignItems: 'flex-end',
        paddingLeft: 8,
    },
    ratingBox: {
        backgroundColor: '#FFFBEB', // amber-50
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    ratingScore: {
        fontSize: 14,
        fontWeight: '800',
        color: '#B45309', // amber-700
    },
    reviewCount: {
        fontSize: 10,
        color: colors.gray400,
        fontWeight: '500',
    },

    // TAGS
    specialtiesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 16,
    },
    tag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    tagText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.gray600,
    },

    // STATS GRID
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
        padding: 10,
        backgroundColor: colors.gray50,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    statItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconBox: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statLabel: {
        fontSize: 9,
        color: colors.gray400,
        textTransform: 'uppercase',
        fontWeight: '600',
        marginBottom: 1,
    },
    statValue: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.gray900,
    },

    // ACTIONS
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    hireBtn: {
        flex: 1,
        backgroundColor: colors.white,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.gray900,
        // Removed shadow for secondary look
    },
    hireBtnText: {
        color: colors.gray900,
        fontWeight: '700',
        fontSize: 14,
    },
    msgBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.gray200,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // MAP CALLOUT STYLES
    calloutContainer: {
        width: 220,
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    calloutHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
        gap: 10,
    },
    calloutImage: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.gray100,
    },
    calloutInfo: {
        flex: 1,
    },
    calloutNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    calloutName: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.gray900,
        flexShrink: 1,
    },
    calloutSpecialty: {
        fontSize: 10,
        color: colors.gray500,
        marginBottom: 2,
    },
    calloutRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    calloutRatingText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.gray600,
    },
    calloutBtn: {
        backgroundColor: colors.primary,
        paddingVertical: 6,
        borderRadius: 8,
        alignItems: 'center',
    },
    calloutBtnText: {
        fontSize: 11,
        color: colors.white,
        fontWeight: '700',
    },
});
