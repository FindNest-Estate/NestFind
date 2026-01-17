import { getAgentProfile } from '@/lib/agentsApi';
import { Star, MapPin, Calendar, Briefcase, Mail, Phone, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function AgentProfilePage({ params }: PageProps) {
    const { id } = await params;

    // Server Component data fetching
    let agent;
    try {
        agent = await getAgentProfile(id);
    } catch (error) {
        return (
            <div className="min-h-screen pt-24 pb-12 px-4 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Agent Not Found</h1>
                <p className="text-gray-600 mb-6">The agent profile you are looking for does not exist or is no longer active.</p>
                <Link href="/agents" className="text-[#FF385C] hover:underline">
                    Back to Find Agents
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Breadcrumb */}
                <div className="mb-6">
                    <Link href="/agents" className="text-sm text-gray-500 hover:text-gray-900">
                        ← Back to Search
                    </Link>
                </div>

                {/* Profile Header */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 mb-8">
                    <div className="bg-gray-900 h-32 w-full"></div>
                    <div className="px-8 pb-8 relative">
                        <div className="flex flex-col sm:flex-row items-end -mt-12 mb-6 gap-6">
                            <div className="h-24 w-24 rounded-xl bg-white p-1 shadow-md">
                                <div className="h-full w-full bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-2xl font-bold">
                                    {agent.name.charAt(0)}
                                </div>
                            </div>
                            <div className="flex-1 pb-1">
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                                    {agent.name}
                                    <ShieldCheck className="h-6 w-6 text-green-500 fill-green-100" />
                                </h1>
                                <div className="flex items-center text-gray-600 mt-1">
                                    <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                                    <span>Serves {agent.service_radius_km}km radius</span>
                                </div>
                            </div>
                            <button className="bg-[#FF385C] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#D93250] transition-colors shadow-sm shadow-red-100">
                                Contact Agent
                            </button>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-t border-gray-100">
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-2 mb-1 text-gray-500 text-sm">
                                    <Star className="h-4 w-4" /> Rating
                                </div>
                                <div className="text-2xl font-bold text-gray-900">{agent.rating.toFixed(1)}</div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-2 mb-1 text-gray-500 text-sm">
                                    <Briefcase className="h-4 w-4" /> Deals
                                </div>
                                <div className="text-2xl font-bold text-gray-900">{agent.completed_transactions || 0}</div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-2 mb-1 text-gray-500 text-sm">
                                    <Calendar className="h-4 w-4" /> Experience
                                </div>
                                <div className="text-2xl font-bold text-gray-900">
                                    {new Date(agent.joined_date).getFullYear()}
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-2 mb-1 text-gray-500 text-sm">
                                    <MapPin className="h-4 w-4" /> Service Area
                                </div>
                                <div className="text-lg font-bold text-gray-900 truncate">
                                    {agent.service_radius_km} km
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* About Section */}
                <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100 mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">About {agent.name}</h2>
                    <p className="text-gray-600 leading-relaxed">
                        An experienced real estate professional dedicated to providing exceptional service.
                        Verified by NestFind for quality and trust. Contact now to get expert assistance
                        with your property needs.
                    </p>
                </div>

                {/* Contact Info */}
                <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Contact Information</h2>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 text-gray-700">
                            <div className="h-10 w-10 bg-gray-50 rounded-full flex items-center justify-center">
                                <Mail className="h-5 w-5 text-gray-500" />
                            </div>
                            <div>
                                <div className="text-sm text-gray-500">Email Address</div>
                                <div className="font-medium">{agent.email}</div>
                            </div>
                        </div>
                        {/* Add phone if available in future */}
                    </div>
                </div>
            </div>
        </div>
    );
}
