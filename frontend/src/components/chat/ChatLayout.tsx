"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Loader2, MessageSquare, User } from "lucide-react";
import ChatWindow from "./ChatWindow";

export default function ChatLayout() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchConversations();
        }
    }, [user]);

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

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="flex h-[calc(100vh-100px)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Sidebar: Conversations List */}
            <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col ${selectedPartnerId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <MessageSquare size={20} /> Messages
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No conversations yet.
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <div
                                key={conv.partner.id}
                                onClick={() => setSelectedPartnerId(conv.partner.id)}
                                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${selectedPartnerId === conv.partner.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                                        <User size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="font-semibold text-gray-900 truncate">{conv.partner.full_name}</h3>
                                            <span className="text-xs text-gray-400">{new Date(conv.last_message.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-500 truncate">
                                            {conv.last_message.sender_id === user?.id ? 'You: ' : ''}{conv.last_message.message_text}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Area: Chat Window */}
            <div className={`w-full md:w-2/3 flex flex-col ${!selectedPartnerId ? 'hidden md:flex' : 'flex'}`}>
                {selectedPartnerId ? (
                    <ChatWindow
                        partnerId={selectedPartnerId}
                        onBack={() => setSelectedPartnerId(null)}
                        currentUser={user}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                        <MessageSquare size={48} className="mb-4 opacity-20" />
                        <p>Select a conversation to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
}
