import React from 'react';
import { Search, MapPin, Star, ShieldCheck, Scale, Award, FileText, FileSignature, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

// Dummy data for simple frontend demonstration
const DUMMY_LAWYERS = [
    {
        id: "1",
        name: "Eleanor Vance",
        specialty: "Property Registration & Verification",
        rating: 4.9,
        reviews: 124,
        experience: "15 Years",
        location: "Downtown District",
        avatar: "EV",
    },
    {
        id: "2",
        name: "Marcus Sterling",
        specialty: "Legal Dispute Resolution",
        rating: 4.7,
        reviews: 89,
        experience: "10 Years",
        location: "Westside Valley",
        avatar: "MS",
    },
    {
        id: "3",
        name: "Sophia Chen",
        specialty: "Title & Escrow Services",
        rating: 5.0,
        reviews: 210,
        experience: "20 Years",
        location: "Central Court",
        avatar: "SC",
    },
    {
        id: "4",
        name: "James Wilson",
        specialty: "Commercial Property Zoning",
        rating: 4.6,
        reviews: 56,
        experience: "8 Years",
        location: "North Hills",
        avatar: "JW",
    },
    {
        id: "5",
        name: "Rachel Dawes",
        specialty: "Tenant-Landlord Law",
        rating: 4.8,
        reviews: 142,
        experience: "12 Years",
        location: "Southside Legal Center",
        avatar: "RD",
    },
    {
        id: "6",
        name: "Harvey Specter",
        specialty: "High-Value Real Estate Closings",
        rating: 5.0,
        reviews: 500,
        experience: "25 Years",
        location: "Financial District",
        avatar: "HS",
    }
];

export default function LawyersPage() {
    return (
        <div className="min-h-screen bg-gray-50/50 font-sans">
            {/* Hero Header Section */}
            <div className="relative pt-28 pb-16 overflow-hidden bg-gradient-to-br from-rose-50 via-white to-orange-50/50">
                <div className="absolute inset-0 z-0 opacity-60">
                    <div className="absolute top-0 right-[15%] w-[40%] h-[120%] bg-gradient-to-br from-[#FF385C]/20 to-orange-300/20 blur-[100px] rounded-full mix-blend-multiply animate-pulse"></div>
                    <div className="absolute -bottom-20 -left-10 w-[50%] h-[80%] bg-gradient-to-tr from-purple-300/20 to-[#FF385C]/20 blur-[120px] rounded-full mix-blend-multiply"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <div className="inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-[#FF385C]/20 shadow-sm mb-6">
                        <Scale className="h-4 w-4 text-[#FF385C]" />
                        <span className="text-sm font-semibold text-gray-800 tracking-wide uppercase">Verified Legal Partners</span>
                    </div>
                    
                    <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tight mb-6">
                        Secure your property with <br className="hidden md:block"/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF385C] to-orange-500">expert legal guidance</span>
                    </h1>
                    
                    <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-12 font-medium">
                        Connect with specialized real estate lawyers in your area to verify documents, handle registrations, and resolve legal disputes seamlessly.
                    </p>

                    {/* Enhanced Search Bar */}
                    <div className="max-w-3xl mx-auto">
                        <div className="group relative bg-white/90 backdrop-blur-xl p-2 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100/80 hover:shadow-[0_12px_40px_rgb(0,0,0,0.12)] hover:border-[#FF385C]/30 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-r from-[#FF385C]/5 to-orange-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            
                            <div className="relative flex flex-col md:flex-row items-center divide-y md:divide-y-0 md:divide-x divide-gray-100">
                                <div className="flex-1 flex items-center px-6 py-3 md:py-4 w-full">
                                    <MapPin className="w-5 h-5 text-gray-400 mr-3 group-focus-within:text-[#FF385C] transition-colors" />
                                    <input 
                                        type="text" 
                                        placeholder="Enter your city or area..." 
                                        className="w-full bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 font-medium text-lg"
                                    />
                                </div>
                                <div className="flex-1 flex items-center px-6 py-3 md:py-4 w-full">
                                    <FileSignature className="w-5 h-5 text-gray-400 mr-3 group-focus-within:text-[#FF385C] transition-colors" />
                                    <input 
                                        type="text" 
                                        placeholder="Specialty (e.g. Verification)" 
                                        className="w-full bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 font-medium text-lg"
                                    />
                                </div>
                                <div className="px-2 py-2 md:py-0 w-full md:w-auto">
                                    <button className="w-full md:w-auto bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white px-8 py-4 rounded-2xl font-bold hover:shadow-lg hover:shadow-[#FF385C]/30 active:scale-95 transition-all text-lg flex items-center justify-center gap-2">
                                        <Search className="w-5 h-5" />
                                        Find Lawyers
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Filters / Info Bar */}
            <div className="sticky top-16 z-30 bg-white/80 backdrop-blur-lg border-y border-gray-200/60 shadow-sm py-4">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-gray-800 font-semibold text-lg">
                        <span className="text-[#FF385C] bg-[#FF385C]/10 px-3 py-1 rounded-lg">6</span>
                        Lawyers Found
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
                {/* Lawyer Grid with Staggered Animations */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {DUMMY_LAWYERS.map((lawyer, index) => (
                        <div 
                            key={lawyer.id} 
                            className="bg-white rounded-3xl shadow-sm hover:shadow-xl hover:shadow-[#FF385C]/10 transition-all duration-300 overflow-hidden border border-gray-100 group flex flex-col h-full transform hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-8 fill-mode-both"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            {/* Card Header with Top Gradient overlay */}
                            <div className="p-6 pb-5 relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#FF385C]/10 to-transparent rounded-bl-full z-0 transition-opacity group-hover:opacity-100 opacity-50"></div>
                                
                                <div className="flex items-start gap-4 relative z-10">
                                    {/* Avatar */}
                                    <div className="relative shrink-0">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 shadow-sm flex items-center justify-center text-[#FF385C] text-xl font-black overflow-hidden group-hover:border-[#FF385C]/30 transition-colors">
                                            {lawyer.avatar}
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white p-1 rounded-lg shadow-sm border-2 border-white" title="Verified Expert">
                                            <ShieldCheck className="h-4 w-4" />
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0 pt-1">
                                        <h3 className="text-xl font-bold text-gray-900 truncate group-hover:text-[#FF385C] transition-colors">
                                            {lawyer.name}
                                        </h3>
                                        
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 border border-yellow-200/50 text-xs font-bold px-2 py-0.5 rounded-md shadow-sm">
                                                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                                {lawyer.rating.toFixed(1)}
                                            </span>
                                            <span className="text-xs font-semibold text-gray-500">
                                                Based on {lawyer.reviews} reviews
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Specialty / Service Area */}
                            <div className="px-6 py-4 bg-gray-50/50 border-t border-b border-gray-100 flex-1">
                                <div className="mb-4">
                                    <div className="text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wider flex items-center gap-1">
                                        <Scale className="w-3.5 h-3.5 text-indigo-400" /> Primary Specialty
                                    </div>
                                    <div className="font-semibold text-gray-900 leading-snug">
                                        {lawyer.specialty}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-xs text-gray-400 font-medium mb-1 uppercase tracking-wider flex items-center gap-1">
                                            <Award className="w-3.5 h-3.5 text-orange-400" /> Experience
                                        </div>
                                        <div className="font-semibold text-gray-900 text-sm">
                                            {lawyer.experience}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400 font-medium mb-1 uppercase tracking-wider flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5 text-blue-400" /> Location
                                        </div>
                                        <div className="font-semibold text-gray-900 text-sm truncate">
                                            {lawyer.location}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Checkmark Features */}
                            <div className="px-6 py-4 bg-white flex flex-col gap-2 border-b border-gray-100">
                                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Document Verification
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Handled the Deal closing
                                </div>
                            </div>

                            {/* Footer Action */}
                            <div className="p-4 bg-white mt-auto">
                                <button className="w-full flex items-center justify-center py-3.5 rounded-2xl bg-gray-900 text-white font-bold hover:bg-[#FF385C] transition-colors shadow-md active:scale-95 group-hover:shadow-[#FF385C]/20 text-sm">
                                    View Full Profile
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
