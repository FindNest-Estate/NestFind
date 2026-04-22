import { getAgentProfile } from '@/lib/agentsApi';
import { Star, MapPin, Calendar, Briefcase, Mail, Phone, ShieldCheck, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function AgentProfilePage({ params }: PageProps) {
    const { id } = await params;

    let agent;
    try {
        agent = await getAgentProfile(id);
    } catch (error) {
        return (
            <div className="min-h-screen pt-32 pb-12 px-4 flex flex-col justify-center items-center bg-gray-50">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <ShieldCheck className="h-10 w-10 text-gray-400" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">Agent Not Found</h1>
                <p className="text-lg text-gray-500 mb-8 max-w-md text-center">We couldn't locate this agent profile. They may be inactive or have been removed.</p>
                <Link href="/agents" className="px-6 py-3 bg-[#FF385C] text-white font-medium rounded-xl hover:bg-[#E31C5F] transition-all shadow-md">
                    Return to Agent Search
                </Link>
            </div>
        );
    }

    if (!agent) return notFound();

    const initials = agent.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            {/* Dynamic Mesh Cover */}
            <div className="relative h-64 md:h-80 w-full bg-gradient-to-br from-gray-900 via-gray-800 to-[#1a0b16] overflow-hidden">
                <div className="absolute inset-0 opacity-40">
                    <div className="absolute top-0 right-[10%] w-[40%] h-[150%] rounded-full bg-gradient-to-l from-[#FF385C]/60 to-orange-500/30 blur-[100px] animate-pulse"></div>
                    <div className="absolute -bottom-10 -left-10 w-[50%] h-[100%] rounded-full bg-gradient-to-r from-purple-500/40 to-[#FF385C]/40 blur-[80px]"></div>
                </div>
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative h-full flex flex-col justify-between pt-24 pb-4 z-10">
                    <Link href="/agents" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors w-fit bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="text-sm font-medium">Back to Search</span>
                    </Link>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-20">
                {/* Main Profile Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-gray-200/50 border border-white p-6 md:p-10 mb-8">
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 -mt-20 md:-mt-24 mb-8">
                        {/* Floating Avatar */}
                        <div className="relative">
                            <div className="h-32 w-32 md:h-40 md:w-40 rounded-3xl bg-white p-1.5 shadow-2xl shadow-gray-300/40">
                                <div className="h-full w-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center text-[#FF385C] text-5xl md:text-6xl font-black inner-shadow">
                                    {initials}
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-xl shadow-lg border-2 border-white" title="Verified Agent">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                        </div>

                        {/* Name and Core Info */}
                        <div className="flex-1 text-center md:text-left pt-2">
                            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight flex flex-col md:flex-row items-center md:items-end gap-3 mb-2">
                                {agent.name}
                                <span className="px-3 py-1 bg-[#FF385C]/10 text-[#FF385C] text-sm font-bold rounded-lg uppercase tracking-wider">
                                    Trusted Agent
                                </span>
                            </h1>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-5 text-gray-600 font-medium">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    <span>Serves {agent.service_radius_km} km radius</span>
                                </div>
                                <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span>Joined {new Date(agent.joined_date).getFullYear()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Desktop Contact CTA */}
                        <div className="hidden md:block">
                            <button className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-gray-800 transition-all shadow-xl shadow-gray-900/20 active:scale-95 flex items-center gap-2">
                                <Mail className="h-5 w-5" />
                                Contact Now
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pt-8 border-t border-gray-100/60">
                        <div className="p-5 bg-gradient-to-br from-orange-50 to-rose-50 rounded-2xl border border-rose-100/50 hover:-translate-y-1 transition-transform">
                            <div className="flex items-center gap-2 mb-2 text-rose-600 font-semibold text-sm">
                                <Star className="h-5 w-5 fill-rose-600" /> Rating
                            </div>
                            <div className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">{agent.rating.toFixed(1)}</div>
                        </div>
                        
                        <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/50 hover:-translate-y-1 transition-transform">
                            <div className="flex items-center gap-2 mb-2 text-blue-600 font-semibold text-sm">
                                <Briefcase className="h-5 w-5" /> Total Deals
                            </div>
                            <div className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">{agent.completed_transactions || agent.completed_cases || 0}</div>
                        </div>

                        <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100/50 hover:-translate-y-1 transition-transform">
                            <div className="flex items-center gap-2 mb-2 text-emerald-600 font-semibold text-sm">
                                <Home className="h-5 w-5" /> Active Listings
                            </div>
                            <div className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">{agent.active_listings || 0}</div>
                        </div>

                        <div className="p-5 bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-2xl border border-purple-100/50 hover:-translate-y-1 transition-transform">
                            <div className="flex items-center gap-2 mb-2 text-purple-600 font-semibold text-sm">
                                <MapPin className="h-5 w-5" /> Service Area
                            </div>
                            <div className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight flex items-baseline gap-1">
                                {agent.service_radius_km} <span className="text-lg font-bold text-gray-500">km</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2-Column Layout for Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Main Content Column */}
                    <div className="md:col-span-2 space-y-8">
                        <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/40 p-8 border border-gray-100">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-[#FF385C]/10 rounded-xl">
                                    <ShieldCheck className="h-6 w-6 text-[#FF385C]" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">About {agent.name.split(' ')[0]}</h2>
                            </div>
                            <div className="prose prose-lg text-gray-600 leading-relaxed max-w-none">
                                <p>
                                    As a verified NestFind agent, <strong>{agent.name}</strong> has passed our comprehensive background checks and quality standards. With over {agent.completed_transactions || agent.completed_cases || 0} successfully closed property transactions, they bring exceptional local market knowledge and negotiation expertise to every deal.
                                </p>
                                <p className="mt-4">
                                    Whether you're looking to buy your dream home, invest in real estate, or sell your property for top value, {agent.name.split(' ')[0]} is dedicated to providing a seamless, stress-free experience from the initial search all the way through to closing.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar / Contact Info */}
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/40 p-8 border border-gray-100 sticky top-28">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Contact Information</h2>
                            
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 border border-gray-100 shadow-sm">
                                        <Mail className="h-5 w-5 text-[#FF385C]" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="text-sm font-medium text-gray-500 mb-0.5">Direct Email</div>
                                        <a href={`mailto:${agent.email}`} className="font-semibold text-gray-900 hover:text-[#FF385C] transition-colors truncate block">
                                            {agent.email}
                                        </a>
                                    </div>
                                </div>
                                
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 border border-gray-100 shadow-sm">
                                        <Phone className="h-5 w-5 text-[#FF385C]" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-500 mb-0.5">Phone Number</div>
                                        <div className="font-semibold text-gray-900 italic">Hidden for privacy</div>
                                    </div>
                                </div>
                            </div>
                            
                            <hr className="my-6 border-gray-100" />
                            
                            <p className="text-sm text-gray-500 mb-6 text-center">
                                Connect with {agent.name.split(' ')[0]} directly to schedule a property visit or discuss your real estate needs.
                            </p>
                            
                            <button className="w-full bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white px-6 py-4 rounded-2xl font-bold hover:shadow-lg hover:shadow-[#FF385C]/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                                <Mail className="h-5 w-5" />
                                Send Message
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Mobile Sticky CTA */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-200/60 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                <button className="w-full bg-gray-900 text-white px-6 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-colors shadow-xl shadow-gray-900/20 active:scale-95 flex items-center justify-center gap-2">
                    <Mail className="h-5 w-5" />
                    Contact Agent
                </button>
            </div>
        </div>
    );
}
