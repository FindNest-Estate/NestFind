"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Search, Filter, ShieldCheck, MapPin, List, Map as MapIcon, ChevronDown, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/navbar/Navbar";
import AgentListView from "@/components/agents/AgentListView";
import AgentMapView from "@/components/agents/AgentMapView";

export default function FindAgentPage() {
    const [agents, setAgents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"list" | "map">("list");
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("Recommended");

    // Fetch agents on mount
    useEffect(() => {
        fetchAllAgents();
    }, []);

    const fetchAllAgents = async () => {
        try {
            setLoading(true);
            const data = await api.agents.listAll({ limit: 50 });
            setAgents(data || []);
        } catch (error) {
            console.error("Failed to fetch agents", error);
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
                    setViewMode("map"); // Auto switch to map to show location
                } catch (error) {
                    toast.error("Failed to find nearby agents");
                } finally {
                    toast.dismiss(loadingToast);
                }
            },
            () => {
                toast.dismiss(loadingToast);
                toast.error("Could not access your location");
            }
        );
    };

    const filteredAgents = (agents || []).filter(agent =>
        agent?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent?.agency_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent?.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-rose-100 selection:text-rose-900">
            <Navbar />

            {/* Premium Header Section */}
            <div className="relative pt-32 pb-12 px-4 overflow-hidden bg-gray-900">
                {/* Abstract Background */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/80 to-gray-900" />

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                        <div className="space-y-4 max-w-2xl">
                            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-white/90 text-xs font-medium">
                                <ShieldCheck size={14} className="text-emerald-400" />
                                Verified Professionals
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight">
                                Find the perfect <br />
                                <span className="text-rose-500">Real Estate Partner</span>
                            </h1>
                            <p className="text-lg text-gray-400 max-w-xl">
                                Connect with top-rated agents who know your market inside and out.
                                Compare performance, read reviews, and hire with confidence.
                            </p>
                        </div>

                        {/* Search Control Board */}
                        <div className="w-full lg:w-auto flex-1 lg:max-w-xl">
                            <div className="bg-white p-2 rounded-2xl shadow-xl shadow-black/20 flex flex-col sm:flex-row gap-2">
                                <div className="flex-1 relative bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        placeholder="City, ZIP, or Agent Name"
                                        className="w-full pl-12 pr-4 h-12 bg-transparent outline-none text-gray-900 placeholder:text-gray-400 font-medium"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <button className="bg-rose-500 hover:bg-rose-600 text-white px-6 h-12 rounded-xl font-bold transition-all shadow-lg shadow-rose-500/25 active:scale-95">
                                    Search
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 sticky top-24 z-20 bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => setViewMode("list")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === "list"
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                <List size={18} />
                                List
                            </button>
                            <button
                                onClick={() => setViewMode("map")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === "map"
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                <MapIcon size={18} />
                                Map
                            </button>
                        </div>
                        <div className="h-8 w-px bg-gray-200" />
                        <span className="text-sm font-medium text-gray-500">
                            Showing <span className="text-gray-900 font-bold">{filteredAgents.length}</span> agents
                        </span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={handleFindNearby}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
                        >
                            <MapPin size={16} className="text-rose-500" />
                            Near Me
                        </button>

                        <div className="relative group">
                            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors">
                                <SlidersHorizontal size={16} />
                                Filters
                                <ChevronDown size={14} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="relative group">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors outline-none cursor-pointer"
                            >
                                <option>Recommended</option>
                                <option>Rating: High to Low</option>
                                <option>Experience: High to Low</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Content View */}
                <div className="min-h-[600px]">
                    {viewMode === "list" ? (
                        <AgentListView
                            agents={filteredAgents}
                            loading={loading}
                            searchTerm={searchTerm}
                        />
                    ) : (
                        <AgentMapView
                            agents={filteredAgents}
                            userLocation={userLocation}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
