"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { Loader2, Send, ArrowLeft } from "lucide-react";

interface ChatWindowProps {
    partnerId: number;
    onBack: () => void;
    currentUser?: any;
    partnerName?: string;
    propertyId?: number;
}

export default function ChatWindow({ partnerId, onBack, currentUser, partnerName: initialPartnerName, propertyId }: ChatWindowProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [partnerName, setPartnerName] = useState(initialPartnerName || "User");

    useEffect(() => {
        fetchMessages();
        connectWebSocket();

        return () => {
            if (socket) {
                socket.close();
            }
        };
    }, [partnerId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const data = await api.messages.getConversation(partnerId);
            setMessages(data);

            if (data.length > 0) {
                const firstMsg = data[0];
                const partner = firstMsg.sender_id === partnerId ? firstMsg.sender : firstMsg.receiver;
                if (partner) setPartnerName(partner.full_name || "User");
            }
        } catch (error) {
            console.error("Failed to fetch messages", error);
        } finally {
            setLoading(false);
        }
    };

    const connectWebSocket = () => {
        if (!currentUser) return;

        const wsUrl = `ws://localhost:8000/messages/ws/${currentUser.id}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log("Connected to WebSocket");
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (
                (message.sender_id === partnerId && message.receiver_id === currentUser.id) ||
                (message.sender_id === currentUser.id && message.receiver_id === partnerId)
            ) {
                setMessages((prev) => {
                    if (prev.some(m => m.id === message.id)) return prev;
                    return [...prev, message];
                });
            }
        };

        ws.onclose = () => {
            console.log("Disconnected from WebSocket");
        };

        setSocket(ws);
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket) return;

        const messageData = {
            receiver_id: partnerId,
            message_text: newMessage,
            property_id: propertyId || null
        };

        try {
            socket.send(JSON.stringify(messageData));
            setNewMessage("");
        } catch (error) {
            console.error("Failed to send message via WebSocket", error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-3 shadow-sm z-10">
                <button onClick={onBack} className="md:hidden text-gray-500 hover:text-gray-700">
                    <ArrowLeft size={20} />
                </button>
                <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                    {partnerName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">{partnerName || 'User'}</h3>
                    <span className="text-xs text-green-500 flex items-center gap-1">
                        <span className="h-2 w-2 bg-green-500 rounded-full"></span> Online
                    </span>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                {loading ? (
                    <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-gray-400" /></div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-400 mt-10">
                        <p>No messages yet. Say hello!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender_id === currentUser?.id;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${isMe
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                    }`}>
                                    <p className="text-sm">{msg.message_text}</p>
                                    <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
                <form onSubmit={sendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
}
