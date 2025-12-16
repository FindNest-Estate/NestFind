import axios from 'axios';
import { API_URL } from '../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to add auth token
client.interceptors.request.use(async (config) => {
    try {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (error) {
        console.error('Error getting token', error);
    }
    return config;
});

export const api = {
    agents: {
        list: async (params?: any) => {
            const { data } = await client.get('/agents/all', { params });
            return data;
        },
        get: async (id: number) => {
            const { data } = await client.get(`/agents/${id}`);
            return data;
        },
        hire: async (agentId: number, data: { service_type: string, property_preferences?: any, initial_message?: string }) => {
            const { data: response } = await client.post(`/agents/${agentId}/hire`, data);
            return response;
        },
        getRequests: async () => {
            const { data } = await client.get('/agents/client-requests');
            return data;
        },
        proposeTerms: async (requestId: number, data: { commission_rate: number }) => {
            const { data: response } = await client.post(`/agents/client-requests/${requestId}/propose`, data);
            return response;
        },
        acceptProposal: async (requestId: number) => {
            const { data: response } = await client.post(`/agents/client-requests/${requestId}/accept`);
            return response;
        }
    },
    // Add other namespaces as needed
};

export default api;
