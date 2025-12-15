"use client";

import Navbar from "@/components/navbar/Navbar";
import ChatLayout from "@/components/chat/ChatLayout";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MessagesPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    if (isLoading) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 h-screen">
                <ChatLayout />
            </div>
        </div>
    );
}
