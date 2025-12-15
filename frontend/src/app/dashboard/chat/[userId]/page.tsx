"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import ChatWindow from "@/components/chat/ChatWindow";
import Navbar from "@/components/navbar/Navbar";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import AgentLayout from "@/components/dashboard/AgentLayout";

export default function ChatPage() {
    const { user } = useAuth();
    const params = useParams();
    const userId = Number(params.userId);
    const [partnerName, setPartnerName] = useState("User");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPartnerInfo = async () => {
            try {
                // We can try to get the name from the conversation history
                const messages = await api.messages.getConversation(userId);
                if (messages.length > 0) {
                    const firstMsg = messages[0];
                    if (firstMsg.sender_id === userId) {
                        setPartnerName(firstMsg.sender.first_name + " " + firstMsg.sender.last_name);
                    } else if (firstMsg.receiver_id === userId) {
                        setPartnerName(firstMsg.receiver.first_name + " " + firstMsg.receiver.last_name);
                    }
                } else {
                    // If no messages, we might want to fetch user info differently, 
                    // but for now default to "User" or maybe we can't easily get it without a new endpoint.
                    // In a real app, we'd have a getUser(id) endpoint.
                }
            } catch (error) {
                console.error("Failed to fetch chat info", error);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchPartnerInfo();
        }
    }, [userId]);

    if (loading) {
        return (
            <div className="min-h-screen flex justify-center items-center">
                <Loader2 className="animate-spin text-rose-500" size={40} />
            </div>
        );
    }

    if (user?.role === 'agent') {
        return (
            <AgentLayout title={`Chat with ${partnerName}`}>
                <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)]">
                    <ChatWindow
                        partnerId={userId}
                        partnerName={partnerName}
                        onBack={() => window.history.back()}
                    />
                </div>
            </AgentLayout>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-3xl mx-auto px-4 py-8 pt-28">
                <ChatWindow
                    partnerId={userId}
                    partnerName={partnerName}
                    onBack={() => window.location.href = '/dashboard/chat'}
                />
            </div>
        </div>
    );
}
