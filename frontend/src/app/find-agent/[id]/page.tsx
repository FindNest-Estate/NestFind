"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { User, MapPin, Star, ShieldCheck, Mail, Phone, Building, Award, MessageSquare, ExternalLink, Calendar } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/navbar/Navbar";
import PropertyCard from "@/components/listing/PropertyCard";

export default function AgentDetailsPage() {
    const params = useParams();
    const [agent, setAgent] = useState<any>(null);
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'about' | 'listings' | 'reviews'>('about');
    const [hireModalOpen, setHireModalOpen] = useState(false);
    const [hireMessage, setHireMessage] = useState("");

    useEffect(() => {
        if (params.id) {
            fetchAgentDetails(Number(params.id));
        }
    }, [params.id]);

    const fetchAgentDetails = async (id: number) => {
        try {
            setLoading(true);
            const agentData = await api.agents.get(id);
            setAgent(agentData);

            // Fetch properties for this agent
            // Assuming agentData.user_id is available, otherwise try with agent id
            const userId = agentData.user_id || agentData.id;
            const propertiesData = await api.properties.list({ user_id: userId });
            setProperties(propertiesData);
        } catch (error) {
            console.error("Failed to fetch agent details", error);
            toast.error("Failed to load agent details");
        } finally {
            setLoading(false);
        }
    };

    const handleHire = async () => {
        if (!agent) return;
        try {
            await api.agents.hire(agent.id, hireMessage);
            toast.success(`Request sent to ${agent.first_name}!`);
            setHireModalOpen(false);
        } catch (error) {
            toast.error("Failed to send hire request");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-full max-w-4xl px-4 space-y-8 animate-pulse">
                        <div className="h-64 bg-gray-200 rounded-2xl" />
                        <div className="space-y-4">
                            <div className="h-8 bg-gray-200 rounded w-1/3" />
                            <div className="h-4 bg-gray-200 rounded w-2/3" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!agent) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="pt-24 pb-20 px-4">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Header Profile Card */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                        {/* Cover Image */}
                        <div className="h-48 bg-gradient-to-r from-gray-900 to-gray-800 relative">
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1032&q=80')] opacity-20 bg-cover bg-center mix-blend-overlay" />
                        </div>

                        <div className="px-8 pb-8">
                            <div className="relative flex flex-col md:flex-row gap-6 items-start -mt-16">
                                {/* Avatar */}
                                <div className="w-32 h-32 rounded-3xl border-4 border-white bg-white shadow-lg overflow-hidden flex-shrink-0">
                                    {agent.avatar_url ? (
                                        <img src={agent.avatar_url} alt={agent.first_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                            <User size={40} />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 pt-6 md:pt-16 space-y-4">
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h1 className="text-3xl font-bold text-gray-900">{agent.first_name} {agent.last_name}</h1>
                                                <span className="bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border border-blue-100">
                                                    <ShieldCheck size={12} /> Verified Agent
                                                </span>
                                            </div>
                                            <p className="text-gray-500 font-medium flex items-center gap-2">
                                                {agent.agency_name || "Independent Real Estate Agent"}
                                            </p>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setHireModalOpen(true)}
                                                className="px-6 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition shadow-lg shadow-rose-500/20"
                                            >
                                                Hire Agent
                                            </button>
                                            <button className="px-6 py-3 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition flex items-center gap-2">
                                                <MessageSquare size={18} />
                                                Message
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stats Row */}
                                    <div className="flex flex-wrap gap-6 text-sm text-gray-600 pt-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-yellow-50 text-yellow-600 rounded-lg">
                                                <Star size={16} fill="currentColor" />
                                            </div>
                                            <div>
                                                <span className="font-bold text-gray-900 block">4.9/5</span>
                                                <span className="text-xs">Rating</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                                <Building size={16} />
                                            </div>
                                            <div>
                                                <span className="font-bold text-gray-900 block">{properties.length}</span>
                                                <span className="text-xs">Active Listings</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-green-50 text-green-600 rounded-lg">
                                                <Award size={16} />
                                            </div>
                                            <div>
                                                <span className="font-bold text-gray-900 block">{agent.experience_years || 2}+ Years</span>
                                                <span className="text-xs">Experience</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-t border-gray-100 px-8">
                            <button
                                onClick={() => setActiveTab('about')}
                                className={`px-4 py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'about' ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                About
                            </button>
                            <button
                                onClick={() => setActiveTab('listings')}
                                className={`px-4 py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'listings' ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Listings ({properties.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('reviews')}
                                className={`px-4 py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'reviews' ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Reviews
                            </button>
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content Info */}
                        <div className="lg:col-span-2 space-y-8">
                            {activeTab === 'about' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <section className="bg-white rounded-2xl p-6 border border-gray-100">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4">About {agent.first_name}</h3>
                                        <p className="text-gray-600 leading-relaxed">
                                            {agent.bio || `${agent.first_name} is a dedicated real estate professional with over ${agent.experience_years || 2} years of experience in the local market. Specializing in ${agent.specialty || "residential"} properties, they have helped hundreds of clients find their dream homes. Known for their integrity and attention to detail.`}
                                        </p>
                                    </section>

                                    <section className="bg-white rounded-2xl p-6 border border-gray-100">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4">Specialties & Skills</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {(agent.specialty || "Residential,Luxury,Commercial,Rentals").split(',').map((tag: string, i: number) => (
                                                <span key={i} className="px-3 py-1.5 bg-gray-100 text-gray-700 font-medium text-sm rounded-lg">
                                                    {tag.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            )}

                            {activeTab === 'listings' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {properties.length === 0 ? (
                                        <div className="col-span-2 text-center py-12 text-gray-500 bg-white rounded-2xl border border-dashed">
                                            No active listings found.
                                        </div>
                                    ) : (
                                        properties.map(property => (
                                            <PropertyCard key={property.id} data={property} />
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'reviews' && (
                                <div className="bg-white rounded-2xl p-6 border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="text-center py-12 text-gray-500">
                                        <p>Reviews coming soon.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar Info */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm sticky top-24">
                                <h3 className="font-bold text-gray-900 mb-4">Contact Information</h3>
                                <div className="space-y-4">
                                    {agent.phone && (
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <div className="p-2 bg-gray-50 rounded-lg">
                                                <Phone size={18} />
                                            </div>
                                            <span className="font-medium">{agent.phone}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 text-gray-600">
                                        <div className="p-2 bg-gray-50 rounded-lg">
                                            <Mail size={18} />
                                        </div>
                                        <span className="font-medium">{agent.email || "Email Hidden"}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-600">
                                        <div className="p-2 bg-gray-50 rounded-lg">
                                            <MapPin size={18} />
                                        </div>
                                        <span className="font-medium">Serves {agent.location || "Local Area"}</span>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100">
                                        <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">License</p>
                                        <p className="text-sm font-mono bg-gray-50 px-3 py-1.5 rounded-lg inline-block text-gray-700">
                                            {agent.license_number || "RERA-PENDING"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Hire Modal */}
            {hireModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Hire {agent.first_name}</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Send a request to hire this agent. They will get back to you shortly.
                        </p>

                        <textarea
                            value={hireMessage}
                            onChange={(e) => setHireMessage(e.target.value)}
                            placeholder="Hi, I'm interested in buying a property..."
                            className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 min-h-[120px] mb-4"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setHireModalOpen(false)}
                                className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleHire}
                                className="flex-1 py-2.5 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600"
                            >
                                Send Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
