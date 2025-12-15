import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import BottomNav from '../components/BottomNav';
import { API_URL } from '../constants/api';

type Conversation = {
    id: number;
    other_user: {
        id: number;
        first_name: string;
        last_name: string;
    };
    last_message: {
        content: string;
        created_at: string;
        sender_id: number;
        is_read: boolean;
    };
};

type Message = {
    id: number;
    content: string;
    sender_id: number;
    created_at: string;
    is_read: boolean;
};

export default function ChatScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const partnerId = params.partnerId as string;

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [partner, setPartner] = useState<any>(null);
    const flatListRef = useRef<FlatList>(null);

    useFocusEffect(
        useCallback(() => {
            loadUser();
        }, [])
    );

    useEffect(() => {
        if (user) {
            if (partnerId) {
                fetchMessages();
            } else {
                fetchConversations();
            }
        }
    }, [user, partnerId]);

    const loadUser = async () => {
        const userData = await AsyncStorage.getItem('user');
        if (userData) setUser(JSON.parse(userData));
    };

    const fetchConversations = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            const res = await axios.get(`${API_URL}/messages/conversations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConversations(res.data || []);
        } catch (e) {
            console.log('Conversations fetch error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchMessages = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            const res = await axios.get(`${API_URL}/messages/${partnerId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(res.data.messages || []);
            setPartner(res.data.partner || { first_name: 'User' });
        } catch (e) {
            console.log('Messages fetch error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !partnerId) return;

        try {
            const token = await AsyncStorage.getItem('auth_token');
            await axios.post(
                `${API_URL}/messages/`,
                { receiver_id: parseInt(partnerId), content: newMessage },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNewMessage('');
            fetchMessages();
        } catch (e) {
            console.log('Send message error:', e);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        if (partnerId) {
            fetchMessages();
        } else {
            fetchConversations();
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // Chat view with specific partner
    if (partnerId) {
        return (
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={styles.chatHeader}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.backBtn}>← Back</Text>
                    </TouchableOpacity>
                    <View style={styles.chatHeaderInfo}>
                        <View style={styles.partnerAvatar}>
                            <Text style={styles.partnerInitial}>{partner?.first_name?.[0] || '?'}</Text>
                        </View>
                        <Text style={styles.partnerName}>{partner?.first_name} {partner?.last_name}</Text>
                    </View>
                    <View style={{ width: 50 }} />
                </View>

                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item, index) => item?.id?.toString() || `msg-${index}`}
                    contentContainerStyle={styles.messagesList}
                    inverted
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    renderItem={({ item }) => {
                        const isMe = item.sender_id === user?.id;
                        return (
                            <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                                <Text style={[styles.messageText, isMe && styles.myMessageText]}>
                                    {item.content}
                                </Text>
                                <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
                                    {formatTime(item.created_at)}
                                </Text>
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyEmoji}>💬</Text>
                            <Text style={styles.emptyTitle}>No messages yet</Text>
                            <Text style={styles.emptyText}>Start the conversation!</Text>
                        </View>
                    }
                />

                {/* Input */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.messageInput}
                        placeholder="Type a message..."
                        value={newMessage}
                        onChangeText={setNewMessage}
                        multiline
                    />
                    <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
                        <Text style={styles.sendBtnText}>→</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        );
    }

    // Conversations list view
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>💬 Messages</Text>
            </View>

            <FlatList
                data={conversations}
                keyExtractor={(item, index) => item?.id?.toString() || `conv-${index}`}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                renderItem={({ item }) => {
                    const isUnread = !item.last_message.is_read && item.last_message.sender_id !== user?.id;
                    return (
                        <TouchableOpacity
                            style={styles.conversationCard}
                            onPress={() => router.push(`/chat?partnerId=${item.other_user.id}`)}
                        >
                            <View style={styles.conversationAvatar}>
                                <Text style={styles.conversationInitial}>
                                    {item.other_user.first_name?.[0] || '?'}
                                </Text>
                            </View>
                            <View style={styles.conversationInfo}>
                                <Text style={styles.conversationName}>
                                    {item.other_user.first_name} {item.other_user.last_name}
                                </Text>
                                <Text style={[styles.conversationLastMsg, isUnread && styles.conversationUnread]} numberOfLines={1}>
                                    {item.last_message.content}
                                </Text>
                            </View>
                            <View style={styles.conversationMeta}>
                                <Text style={styles.conversationTime}>
                                    {formatTime(item.last_message.created_at)}
                                </Text>
                                {isUnread && <View style={styles.unreadDot} />}
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>👥</Text>
                        <Text style={styles.emptyTitle}>No conversations yet</Text>
                        <Text style={styles.emptyText}>Your messages will appear here</Text>
                    </View>
                }
            />

            <BottomNav />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gray50,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.md,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
    },
    headerTitle: {
        ...typography.h2,
        color: colors.gray900,
    },
    listContainer: {
        padding: spacing.md,
    },
    conversationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    conversationAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    conversationInitial: {
        color: colors.white,
        fontSize: 18,
        fontWeight: '700',
    },
    conversationInfo: {
        flex: 1,
    },
    conversationName: {
        ...typography.body,
        color: colors.gray900,
        fontWeight: '600',
    },
    conversationLastMsg: {
        ...typography.bodySmall,
        color: colors.gray500,
        marginTop: 2,
    },
    conversationUnread: {
        color: colors.gray900,
        fontWeight: '600',
    },
    conversationMeta: {
        alignItems: 'flex-end',
    },
    conversationTime: {
        ...typography.caption,
        color: colors.gray500,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
        marginTop: spacing.xs,
    },
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.md,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
    },
    backBtn: {
        color: colors.primary,
        fontWeight: '600',
    },
    chatHeaderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    partnerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.xs,
    },
    partnerInitial: {
        color: colors.white,
        fontWeight: '700',
    },
    partnerName: {
        ...typography.body,
        color: colors.gray900,
        fontWeight: '600',
    },
    messagesList: {
        padding: spacing.md,
        paddingBottom: spacing.xl,
    },
    messageBubble: {
        maxWidth: '75%',
        padding: spacing.sm,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.xs,
    },
    myMessage: {
        backgroundColor: colors.primary,
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    theirMessage: {
        backgroundColor: colors.white,
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        ...typography.body,
        color: colors.gray900,
    },
    myMessageText: {
        color: colors.white,
    },
    messageTime: {
        ...typography.caption,
        color: colors.gray500,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    myMessageTime: {
        color: 'rgba(255,255,255,0.7)',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: spacing.md,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
        gap: spacing.sm,
    },
    messageInput: {
        flex: 1,
        backgroundColor: colors.gray50,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        maxHeight: 100,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendBtnText: {
        color: colors.white,
        fontSize: 18,
        fontWeight: '700',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        ...typography.h3,
        color: colors.gray900,
    },
    emptyText: {
        ...typography.body,
        color: colors.gray500,
    },
});
