"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, Users } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import AgentLayout from "@/components/dashboard/AgentLayout";

export default function AgentChatPage() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const data = await api.messages.getConversations();
                setConversations(data);
            } catch (error) {
                console.error("Failed to fetch conversations", error);
            } finally {
                setLoading(false);
            }
        };
        fetchConversations();

        const interval = setInterval(fetchConversations, 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <AgentLayout title="Messages">
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin text-rose-500" size={32} />
                </div>
            </AgentLayout>
        );
    }

    return (
        <AgentLayout title="Messages">
            <div className="max-w-4xl mx-auto">
                {conversations.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-xl border border-dashed">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="text-gray-400" size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No messages yet</h3>
                        <p className="text-gray-500">Your conversations will appear here</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="divide-y">
                            {conversations.map((conversation) => (
                                <Link
                                    key={conversation.id}
                                    href={`/dashboard/chat/${conversation.other_user.id}`}
                                    className="block p-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 font-bold">
                                                {conversation.other_user.first_name?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900">
                                                    {conversation.other_user.first_name} {conversation.other_user.last_name}
                                                </h4>
                                                <p className={`text-sm truncate ${!conversation.last_message.is_read && conversation.last_message.sender_id !== user?.id ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                                                    {conversation.last_message.content}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                                            {new Date(conversation.last_message.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AgentLayout>
    );
}
