"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getTransactionById, scheduleRegistration, sendBuyerOtp, verifyBuyerOtp } from "@/lib/api/transactions";
import { Transaction, TransactionStatus } from "@/lib/types/transaction";
import { OTPInput } from "@/components/OTPInput";
import { TimelineStep } from "@/components/TimelineStep";
import Navbar from "@/components/Navbar";
import { Loader2, Calendar, CheckCircle } from "lucide-react";

export default function TransactionsPage() {
    const searchParams = useSearchParams();
    const reservationId = searchParams.get("reservation_id");
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // OTP State
    const [showOtp, setShowOtp] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        // Mock loading or fetching if ID exists
        // In real app we might verify if transaction exists for this reservation
        setIsLoading(false);
    }, []);

    const handleSchedule = async () => {
        // Logic to schedule registration
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />
            <div className="max-w-3xl mx-auto px-4 pt-24">
                <h1 className="text-2xl font-bold text-gray-900 mb-8">Registration & Transaction</h1>

                <div className="bg-white rounded-2xl p-8 border border-gray-200">
                    <div className="space-y-0">
                        <TimelineStep
                            title="Reservation Confirmed"
                            status="completed"
                            date="Jan 12"
                            description="Property reserved for 30 days"
                        />
                        <TimelineStep
                            title="Registration Scheduled"
                            status="current"
                            description="Waiting for agent schedule"
                        />
                        <TimelineStep
                            title="Buyer Verification"
                            status="pending"
                        />
                        <TimelineStep
                            title="Final Transfer"
                            status="pending"
                            isLast
                        />
                    </div>

                    <div className="mt-8 p-6 bg-gray-50 rounded-xl text-center">
                        <p className="text-gray-600 mb-4">Registration not yet scheduled.</p>
                        <button className="px-6 py-2 bg-emerald-600 text-white rounded-lg">
                            Schedule Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
