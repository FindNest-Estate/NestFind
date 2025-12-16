"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { User, ShieldCheck, Mail, Phone, MessageSquare, Twitter, Linkedin, Globe, MapPin, BadgeCheck, ArrowRight, Share2, Star } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/navbar/Navbar";
import PropertyCard from "@/components/listing/PropertyCard";
import { StatCard, ActionBtn, SocialBtn, ContactRow, InfoChip, SectionTitle, AreaChip } from "@/components/agents/AgentProfileComponents";

export default function AgentDetailsPage() {
    const params = useParams();
    const [agent, setAgent] = useState<any>(null);
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [hireModalOpen, setHireModalOpen] = useState(false);
    const [hireMessage, setHireMessage] = useState("");
    const [serviceType, setServiceType] = useState<"Buying" | "Selling" | "Renting" | "Other">("Buying");

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
            await api.agents.hire(agent.id, {
                service_type: serviceType,
                initial_message: hireMessage
            });
            toast.success(`Request sent to ${agent.first_name}!`);
            setHireModalOpen(false);
            setHireMessage("");
        } catch (error) {
            toast.error("Failed to send hire request");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navbar />
                <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-4 space-y-4">
                        <div className="aspect-[3/4] bg-gray-200 rounded-3xl animate-pulse" />
                    </div>
                    <div className="lg:col-span-8 space-y-8">
                        <div className="h-8 bg-gray-200 rounded w-1/3" />
                        <div className="h-32 bg-gray-200 rounded-2xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (!agent) return null;

    return (
        <div className="min-h-screen bg-[#FAFAFA] font-sans selection:bg-rose-100 selection:text-rose-900">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

                    {/* --- Left Column: Sticky Sidebar (The "Card") --- */}
                    <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
                        <div className="bg-white rounded-[32px] p-3 border border-gray-100 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] transition-transform duration-500">
                            {/* Avatar Section */}
                            <div className="relative aspect-square rounded-[24px] overflow-hidden bg-gray-100 ring-1 ring-black/5">
                                {agent.avatar_url ? (
                                    <img src={agent.avatar_url} alt={agent.first_name} className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                        <User size={80} strokeWidth={1} />
                                    </div>
                                )}
                                {/* Verified Badge */}
                                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/50 shadow-sm">
                                    <ShieldCheck size={14} className="text-blue-500 fill-blue-500/10" />
                                    <span className="text-xs font-bold text-gray-900">Verified Pro</span>
                                </div>
                                {/* Rating Badge (New) */}
                                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/50 shadow-sm">
                                    <Star size={12} className="fill-yellow-400 text-yellow-400" />
                                    <span className="text-xs font-bold text-gray-900">{agent.average_rating || "5.0"}</span>
                                    <span className="text-[10px] text-gray-500">({agent.review_count || 12})</span>
                                </div>
                            </div>

                            {/* Identity & Actions */}
                            <div className="px-3 md:px-5 py-6">
                                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">
                                    {agent.first_name} {agent.last_name}
                                </h1>
                                <p className="text-gray-500 font-medium mb-8 flex items-center gap-2 text-sm">
                                    {agent.agency_name || "Independent Design Agent"}
                                    <BadgeCheck size={16} className="text-blue-500" />
                                </p>

                                <div className="space-y-3 mb-8">
                                    <ActionBtn
                                        icon={ArrowRight}
                                        label="Hire Agent"
                                        primary
                                        fullWidth
                                        onClick={() => setHireModalOpen(true)}
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <ActionBtn icon={MessageSquare} label="Message" onClick={() => toast("Chat coming soon")} fullWidth />
                                        <ActionBtn icon={Share2} label="Share" onClick={() => toast("Copied to clipboard")} fullWidth />
                                    </div>
                                </div>

                                {/* Contact Details */}
                                <div className="space-y-1 pt-2">
                                    <ContactRow icon={MapPin} label="Location" value={agent.city || agent.location || "Location not set"} />
                                    <ContactRow icon={Mail} label="Email" value={agent.email || "Email Hidden"} href={agent.email ? `mailto:${agent.email}` : undefined} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- Right Column: The "Feed" --- */}
                    <div className="lg:col-span-8 space-y-12 pt-2">

                        {/* Stats Strip */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard label="Total Sales" value={agent.sales_count ?? 0} subtext="Properties sold" />
                            <StatCard label="Experience" value={`${agent.experience_years ?? 0} Yrs`} />
                            <StatCard label="Rating" value={agent.average_rating ?? "-"} subtext={`(${agent.review_count ?? 0} reviews)`} />
                            <StatCard label="Commission" value={`${agent.commission_rate ?? 1.5}%`} subtext="Listing Fee" />
                        </div>

                        {/* About */}
                        <section>
                            <SectionTitle title="About" />
                            <div className="prose prose-lg text-gray-600 leading-relaxed max-w-none">
                                <p>
                                    {agent.bio || `${agent.first_name} is a dedicated real estate professional with ${agent.experience_years ?? 0} years of experience.`}
                                </p>
                            </div>
                        </section>

                        {/* Specialties */}
                        <section>
                            <SectionTitle title="Expertise & Focus" />
                            <div className="flex flex-wrap gap-3">
                                {agent.specialty ? (
                                    agent.specialty.split(',').map((tag: string, i: number) => (
                                        <InfoChip key={i} text={tag.trim()} />
                                    ))
                                ) : (
                                    <span className="text-gray-400 text-sm italic">No specialties listed</span>
                                )}
                            </div>
                        </section>

                        {/* Service Areas */}
                        <section>
                            <SectionTitle title="Service Areas" />
                            <div className="flex flex-wrap gap-3">
                                {agent.service_areas ? (
                                    agent.service_areas.split(',').map((area: string, i: number) => (
                                        <AreaChip key={i} text={area.trim()} />
                                    ))
                                ) : (
                                    <span className="text-gray-400 text-sm italic">No service areas listed</span>
                                )}
                            </div>
                        </section>

                        {/* Active Listings */}
                        <section>
                            <SectionTitle
                                title={`Active Listings (${properties.length})`}
                                action={
                                    <button className="text-sm font-bold text-gray-900 border-b border-gray-900 pb-0.5 hover:text-blue-600 hover:border-blue-600 transition-all">
                                        View All Properties
                                    </button>
                                }
                            />

                            {properties.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {properties.slice(0, 4).map(property => (
                                        <PropertyCard key={property.id} data={property} />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                        <MapPin size={24} />
                                    </div>
                                    <h4 className="text-gray-900 font-bold mb-1">No active listings</h4>
                                    <p className="text-gray-400 font-medium text-sm">This agent has no public listings at the moment.</p>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </main>

            {/* --- Hire Modal (Reused) --- */}
            {hireModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md p-8 transform transition-all scale-100 border border-white/20 relative overflow-hidden">
                        {/* Decorative bg blob */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-gray-50 to-white -z-10" />

                        <div className="text-center mb-8 pt-4">
                            <div className="w-24 h-24 bg-white rounded-[24px] mx-auto mb-4 overflow-hidden border-4 border-white shadow-lg shadow-gray-200/50">
                                {agent.avatar_url && <img src={agent.avatar_url} className="w-full h-full object-cover" />}
                            </div>
                            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Hire {agent.first_name}</h2>
                            <p className="text-gray-500 mt-2 font-medium">What allow you looking for?</p>
                        </div>

                        {/* Service Type Selection */}
                        <div className="grid grid-cols-4 gap-2 mb-4 p-1 bg-gray-100/50 rounded-xl border border-gray-100">
                            {["Buying", "Selling", "Renting", "Other"].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setServiceType(type as any)}
                                    className={`py-2 text-xs font-bold rounded-lg transition-all ${serviceType === type
                                        ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                                        : "text-gray-500 hover:text-gray-900"
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

                        <textarea
                            value={hireMessage}
                            onChange={(e) => setHireMessage(e.target.value)}
                            placeholder={`Hi, I'm interested in ${serviceType.toLowerCase()}...`}
                            className="w-full p-5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 min-h-[140px] mb-6 bg-gray-50/50 resize-none font-medium text-gray-700 placeholder:text-gray-400"
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setHireModalOpen(false)}
                                className="w-full h-14 rounded-2xl font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleHire}
                                className="w-full h-14 rounded-2xl font-bold text-white bg-gray-900 hover:bg-black transition-all shadow-xl shadow-gray-900/20 active:scale-95"
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
