import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../../constants/theme';
import { api } from '../../../lib/api';
import ScreenHeader from '../../../components/common/ScreenHeader';
import LeadResponseModal from '../../../components/agent/LeadResponseModal';

export default function AgentLeads() {
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Modal State
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [isResponseModalVisible, setIsResponseModalVisible] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const data = await api.agents.getRequests();
            setRequests(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchRequests();
    };

    const handleRespond = (request: any) => {
        setSelectedRequest(request);
        setIsResponseModalVisible(true);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'REQUESTED': return { bg: '#FEF3C7', text: '#D97706' }; // Yellow
            case 'OFFER_SENT': return { bg: '#DBEAFE', text: '#2563EB' }; // Blue
            case 'ACTIVE': return { bg: '#D1FAE5', text: '#059669' }; // Green
            case 'REJECTED': return { bg: '#FEE2E2', text: '#DC2626' }; // Red
            default: return { bg: '#F3F4F6', text: '#4B5563' }; // Gray
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const statusStyle = getStatusColor(item.status);
        
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.userInfo}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {item.client?.first_name?.[0] || 'U'}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.userName}>
                                {item.client?.first_name} {item.client?.last_name}
                            </Text>
                            <Text style={styles.date}>
                                {new Date(item.created_at).toLocaleDateString()}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>
                            {item.status.replace('_', ' ')}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.serviceRow}>
                        <Ionicons 
                            name={item.service_type === 'BUYING' ? 'search' : 'home'} 
                            size={16} 
                            color={colors.gray500} 
                        />
                        <Text style={styles.serviceText}>
                            Looking to {item.service_type === 'BUYING' ? 'Buy' : 'Sell'}
                        </Text>
                    </View>
                    
                    <Text style={styles.message} numberOfLines={2}>
                        "{item.initial_message}"
                    </Text>

                    {item.status === 'REQUESTED' && (
                        <TouchableOpacity 
                            style={styles.respondBtn}
                            onPress={() => handleRespond(item)}
                        >
                            <Text style={styles.respondBtnText}>Respond Now</Text>
                            <Ionicons name="arrow-forward" size={16} color={colors.white} />
                        </TouchableOpacity>
                    )}

                    {item.status === 'OFFER_SENT' && (
                        <View style={styles.pendingInfo}>
                            <Text style={styles.pendingText}>
                                Proposal sent: {item.commission_rate}% Commission
                            </Text>
                        </View>
                    )}

                    {item.status === 'ACTIVE' && (
                        <TouchableOpacity style={styles.chatBtn}>
                            <Ionicons name="chatbubbles-outline" size={18} color={colors.gray700} />
                            <Text style={styles.chatBtnText}>Message Client</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <ScreenHeader title="Leads" subtitle="Manage client requests" />
            
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={requests}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                    }
                    ListEmptyComponent={() => (
                        <View style={styles.empty}>
                            <Ionicons name="people-outline" size={48} color={colors.gray300} />
                            <Text style={styles.emptyText}>No leads yet</Text>
                            <Text style={styles.emptySub}>Incoming requests will appear here</Text>
                        </View>
                    )}
                />
            )}

            <LeadResponseModal 
                visible={isResponseModalVisible}
                onClose={() => setIsResponseModalVisible(false)}
                request={selectedRequest}
                onSuccess={() => {
                    fetchRequests();
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gray50,
    },
    list: {
        padding: spacing.md,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    // Card
    card: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: spacing.md,
        marginBottom: spacing.md,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.gray500,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.gray900,
    },
    date: {
        fontSize: 12,
        color: colors.gray400,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    
    // Body
    cardBody: {
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
        paddingTop: 12,
    },
    serviceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    serviceText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.gray500,
        textTransform: 'uppercase',
    },
    message: {
        fontSize: 14,
        color: colors.gray800,
        lineHeight: 20,
        marginBottom: 16,
    },
    
    // Actions
    respondBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.gray900,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    respondBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.white,
    },
    chatBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.gray200,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    chatBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gray700,
    },
    pendingInfo: {
        alignItems: 'center',
        backgroundColor: colors.gray50,
        padding: 8,
        borderRadius: 8,
    },
    pendingText: {
        fontSize: 12,
        color: colors.gray500,
        fontStyle: 'italic',
    },

    // Empty State
    empty: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.gray900,
        marginTop: 16,
    },
    emptySub: {
        fontSize: 14,
        color: colors.gray500,
        marginTop: 4,
    },
});
