"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Search, Filter, ShieldCheck, MapPin, ArrowRight, User } from "lucide-react";
import { toast } from "sonner";
import AgentCard from "@/components/agents/AgentCard";
import Navbar from "@/components/navbar/Navbar";
import Link from "next/link";

export default function FindAgentPage() {
    const [agents, setAgents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);

    useEffect(() => {
        fetchAllAgents();
    }, []);

    const fetchAllAgents = async () => {
        try {
            setLoading(true);
            setError(false);
            const data = await api.agents.listAll({
                limit: 50
            });
            setAgents(data || []);
        } catch (error) {
            console.error("Failed to fetch agents", error);
            setError(true);
            toast.error("Failed to load agents");
        } finally {
            setLoading(false);
        }
    };

    const handleFindNearby = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }

        const loadingToast = toast.loading("Locating you...");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setUserLocation({ lat: latitude, lng: longitude });

                try {
                    const data = await api.agents.findNearby(latitude, longitude);
                    setAgents(data || []);
                    toast.success(`Found ${data.length} agents near you`);
                } catch (error) {
                    console.error("Failed to find nearby agents", error);
                    toast.error("Failed to find nearby agents");
                } finally {
                    toast.dismiss(loadingToast);
                }
            },
            (error) => {
                toast.dismiss(loadingToast);
                toast.error("Could not access your location");
                console.error("Geolocation error", error);
            }
        );
    };

    const filteredAgents = (agents || []).filter(agent =>
        agent?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent?.agency_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent?.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (error) {
        return (
            <div className="min-h-screen bg-white">
                <Navbar />
                <div className="pt-32 pb-20 px-4 text-center">
                    <div className="max-w-md mx-auto">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShieldCheck size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to load agents</h2>
                        <p className="text-gray-500 mb-6">Something went wrong while fetching the agent list. Please try again later.</p>
                        <button
                            onClick={fetchAllAgents}
                            className="bg-rose-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-rose-600 transition"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Hero Section */}
            <div className="relative pt-32 pb-20 px-4 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-gray-800 -z-20" />
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1032&q=80')] opacity-20 bg-cover bg-center mix-blend-overlay -z-10" />

                <div className="max-w-4xl mx-auto text-center space-y-6">
                    {/* Trust Badge */}
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 px-4 py-1.5 rounded-full text-white font-medium text-sm shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <ShieldCheck size={16} className="text-rose-400" />
                        Trusted by 10,000+ Homeowners
                    </div>

                    {/* Headline */}
                    <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.1] animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100">
                        Find your perfect <span className="text-rose-400">Real Estate Partner</span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-lg text-gray-300 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
                        Connect with top-rated local agents, vetted for quality and performance. <br className="hidden md:block" />
                        Compare rates, read reviews, and hire the best.
                    </p>

                    {/* Search Bar */}
                    <div className="mt-8 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 relative z-10">
                        <div className="p-2 bg-white rounded-2xl shadow-xl ring-1 ring-black/5 flex flex-col md:flex-row gap-2">
                            <div className="flex-1 relative flex items-center">
                                <Search className="absolute left-4 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by city, neighborhood, or agent name..."
                                    className="w-full pl-12 pr-4 py-3 md:py-4 bg-transparent outline-none text-gray-900 placeholder:text-gray-400"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-gray-100 pt-2 md:pt-0 pl-0 md:pl-2">
                                <button className="px-4 py-3 md:py-4 flex items-center gap-2 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition">
                                    <Filter size={18} />
                                    <span>Filters</span>
                                </button>
                                <button className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-3 md:py-4 rounded-xl font-bold text-lg transition shadow-lg shadow-rose-500/20 flex items-center gap-2">
                                    Search
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Section */}
            <div className="max-w-7xl mx-auto px-4 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-baseline gap-3">
                        <h2 className="text-2xl font-bold text-gray-900">Top Agents</h2>
                        <span className="text-gray-500 font-medium">{filteredAgents.length} results</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 hidden sm:inline">Sort by:</span>
                        <select className="bg-white border-none text-sm font-semibold text-gray-900 ring-1 ring-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-rose-500">
                            <option>Recommended</option>
                            <option>Highest Rated</option>
                            <option>Most Experience</option>
                        </select>
                        <button
                            onClick={handleFindNearby}
                            className="bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-sm"
                        >
                            <MapPin size={16} />
                            Find nearby
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="h-[320px] bg-gray-100 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredAgents.map((agent) => (
                            <Link href={`/find-agent/${agent.id}`} key={agent.id} className="block group">
                                <AgentCard
                                    agent={agent}
                                    variant="full"
                                />
                            </Link>
                        ))}
                    </div>
                )}

                {!loading && filteredAgents.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                            <User className="text-gray-300" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">No agents found</h3>
                        <p className="text-gray-500">Try adjusting your search terms or filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
