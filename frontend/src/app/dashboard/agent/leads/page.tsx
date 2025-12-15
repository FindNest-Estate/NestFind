"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import AgentLayout from "@/components/dashboard/AgentLayout";
import { Search, Filter, Phone, Mail, Calendar, Home, Loader2, User } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function LeadsPage() {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            // Aggregate leads from Bookings and Offers
            const [bookings, offers] = await Promise.all([
                api.bookings.list(),
                api.offers.list()
            ]);

            // Map to a common Lead structure
            const leadsMap = new Map();

            // Process Bookings
            bookings.forEach((booking: any) => {
                const userId = booking.user_id;
                if (!leadsMap.has(userId)) {
                    leadsMap.set(userId, {
                        id: userId,
                        user: booking.user,
                        interests: [],
                        last_interaction: booking.created_at,
                        status: 'New',
                        source: 'Visit Request'
                    });
                }
                const lead = leadsMap.get(userId);
                lead.interests.push({
                    type: 'booking',
                    property: booking.property,
                    date: booking.created_at,
                    status: booking.status
                });
                if (new Date(booking.created_at) > new Date(lead.last_interaction)) {
                    lead.last_interaction = booking.created_at;
                }
            });

            // Process Offers
            offers.forEach((offer: any) => {
                const userId = offer.buyer_id;
                if (!leadsMap.has(userId)) {
                    leadsMap.set(userId, {
                        id: userId,
                        user: offer.buyer,
                        interests: [],
                        last_interaction: offer.created_at,
                        status: 'Hot',
                        source: 'Offer Made'
                    });
                }
                const lead = leadsMap.get(userId);
                lead.interests.push({
                    type: 'offer',
                    property: offer.property,
                    date: offer.created_at,
                    status: offer.status,
                    amount: offer.amount
                });
                lead.status = 'Hot'; // Upgrade status if they made an offer
                if (new Date(offer.created_at) > new Date(lead.last_interaction)) {
                    lead.last_interaction = offer.created_at;
                }
            });

            setLeads(Array.from(leadsMap.values()));
        } catch (error) {
            console.error("Failed to fetch leads", error);
            toast.error("Failed to load leads");
        } finally {
            setLoading(false);
        }
    };

    const filteredLeads = leads.filter(lead =>
        lead.user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.user?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <AgentLayout title="Leads Management">
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin text-rose-500" size={32} />
                </div>
            </AgentLayout>
        );
    }

    return (
        <AgentLayout title="Leads Management">
            <div className="space-y-6">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search leads by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                        />
                    </div>
                </div>

                {/* Leads List */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium">
                                <tr>
                                    <th className="px-6 py-4">Lead Name</th>
                                    <th className="px-6 py-4">Contact</th>
                                    <th className="px-6 py-4">Interest</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Last Active</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLeads.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            No leads found matching your search.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLeads.map((lead) => (
                                        <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-medium overflow-hidden">
                                                        {lead.user?.avatar_url ? (
                                                            <img src={lead.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User size={20} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900">
                                                            {lead.user?.first_name} {lead.user?.last_name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {lead.source}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <Mail size={14} />
                                                        {lead.user?.email}
                                                    </div>
                                                    {lead.user?.phone && (
                                                        <div className="flex items-center gap-2 text-gray-600">
                                                            <Phone size={14} />
                                                            {lead.user.phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Home size={16} className="text-gray-400" />
                                                    <span className="font-medium">
                                                        {lead.interests.length} Properties
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${lead.status === 'Hot'
                                                        ? 'bg-rose-100 text-rose-800'
                                                        : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {lead.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">
                                                {new Date(lead.last_interaction).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/dashboard/chat/${lead.id}`}
                                                    className="text-rose-600 hover:text-rose-700 font-medium text-sm"
                                                >
                                                    Message
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AgentLayout>
    );
}
