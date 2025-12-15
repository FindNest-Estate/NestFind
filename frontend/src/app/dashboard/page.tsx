"use client";

import { useAuth } from "@/context/AuthContext";
import AgentDashboard from "@/components/dashboard/AgentDashboard";
import BuyerDashboard from "@/components/dashboard/BuyerDashboard";
import Navbar from "@/components/navbar/Navbar";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [isLoading, user, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-rose-500" size={40} />
            </div>
        );
    }

    if (!user) return null;

    console.log("DashboardPage: Rendering for user:", user);

    return (
        <div className="min-h-screen bg-white">
            {user.role === "agent" ? (
                <AgentDashboard />
            ) : user.role === "buyer" ? (
                <BuyerDashboard />
            ) : (
                <>
                    <Navbar />
                    <div className="pt-24 text-center py-20">
                        <h2 className="text-xl font-bold text-gray-700">Unknown User Role</h2>
                        <p className="text-gray-500">Your account has role: <strong>{user.role}</strong></p>
                    </div>
                </>
            )}
        </div>
    );
}
