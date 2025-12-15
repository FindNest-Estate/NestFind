import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Image,
    StatusBar,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNav from '../components/BottomNav';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { API_URL } from '../constants/api';

type Message = {
    id: number;
    message_text: string;
    created_at: string;
    is_read: boolean;
};

type User = {
    id: number;
    first_name: string;
    last_name: string;
    avatar_url: string;
    role: string;
};

type Conversation = {
    partner: User;
    last_message: Message;
};

export default function Messages() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();
    const insets = useSafeAreaInsets();

    useFocusEffect(
        useCallback(() => {
            fetchConversations();
        }, [])
    );

    const fetchConversations = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (!token) {
                setLoading(false);
                return;
            }

            const response = await axios.get(`${API_URL}/messages/conversations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConversations(response.data);
        } catch (error: any) {
            console.error('Error fetching conversations:', error);
            if (error.response?.status === 401) {
                await AsyncStorage.removeItem('auth_token');
                router.replace('/(auth)/login');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchConversations();
    };

    const formatTime = (dateString: string) => {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

            if (diffInSeconds < 60) return 'Just now';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
            if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
            return date.toLocaleDateString();
        } catch (e) {
            return '';
        }
    };

    const renderItem = ({ item }: { item: Conversation }) => {
        const { partner, last_message } = item;
        const fullName = `${partner.first_name} ${partner.last_name || ''}`.trim();
        const avatarUrl = partner.avatar_url
            ? `${API_URL}${partner.avatar_url}`
            : null;

        return (
            <TouchableOpacity
                style={styles.conversationItem}
                onPress={() => router.push({
                    pathname: '/agent/chat', // Reusing chat screen, passing params needs check
                    params: { id: partner.id, name: fullName }
                })}
                activeOpacity={0.7}
            >
                <View style={styles.avatarContainer}>
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarInitial}>
                                {partner.first_name[0].toUpperCase()}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.itemHeader}>
                        <Text style={styles.name}>{fullName}</Text>
                        <Text style={styles.time}>{formatTime(last_message.created_at)}</Text>
                    </View>
                    <Text
                        style={[
                            styles.message,
                            !last_message.is_read && styles.unreadMessage
                        ]}
                        numberOfLines={1}
                    >
                        {last_message.message_text}
                    </Text>
                </View>

                {!last_message.is_read && (
                    <View style={styles.unreadDot} />
                )}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.gray900} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Messages</Text>
                </View>
            </View>

            <FlatList
                data={conversations}
                keyExtractor={(item) => item.partner.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubbles-outline" size={64} color={colors.gray400} style={{ marginBottom: spacing.md }} />
                        <Text style={styles.emptyTitle}>No messages yet</Text>
                        <Text style={styles.emptyText}>History of your conversations will appear here.</Text>
                    </View>
                )}
            />
            <BottomNav />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.gray900,
        letterSpacing: -0.5,
    },
    listContent: {
        padding: spacing.md,
    },
    conversationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
    },
    avatarContainer: {
        marginRight: spacing.md,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarPlaceholder: {
        backgroundColor: colors.gray200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.gray600,
    },
    contentContainer: {
        flex: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.gray900,
    },
    time: {
        fontSize: 12,
        color: colors.gray500,
    },
    message: {
        fontSize: 14,
        color: colors.gray500,
    },
    unreadMessage: {
        color: colors.gray900,
        fontWeight: '600',
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
        marginLeft: spacing.sm,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.xxl * 2,
    },
    emptyTitle: {
        ...typography.h3,
        color: colors.gray900,
        marginBottom: spacing.sm,
    },
    emptyText: {
        ...typography.body,
        color: colors.gray500,
        textAlign: 'center',
    },
});
