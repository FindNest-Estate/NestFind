"use client";

import { useState, useEffect } from "react";
import { getReservations } from "@/lib/api/reservations";
import { Reservation, ReservationStatus } from "@/lib/types/reservation";
import { CountdownTimer } from "@/components/CountdownTimer";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Loader2, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export default function ReservationsPage() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getReservations().then(data => setReservations(data.reservations)).finally(() => setIsLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 pt-24">
                <h1 className="text-2xl font-bold text-gray-900 mb-8">My Reservations</h1>

                {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : (
                    <div className="space-y-4">
                        {reservations.map(res => (
                            <div key={res.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                                {res.status === ReservationStatus.ACTIVE && (
                                    <div className="absolute top-0 right-0 p-4">
                                        <CountdownTimer targetDate={res.reserved_until} />
                                    </div>
                                )}

                                <h3 className="font-bold text-lg mb-2">{res.property?.title}</h3>
                                <p className="text-gray-500 mb-4">Reserved until: {format(new Date(res.reserved_until), "PPp")}</p>

                                <div className="flex gap-4">
                                    <Link
                                        href={`/transactions?reservation_id=${res.id}`}
                                        className="text-emerald-600 font-medium flex items-center gap-1 hover:underline"
                                    >
                                        Registration Process <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                        {reservations.length === 0 && <p>No active reservations.</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
