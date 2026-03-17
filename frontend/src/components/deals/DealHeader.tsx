import { DealDetail, DEAL_STATUS_LABELS } from "@/lib/types/deal";
import { MapPin, IndianRupee, Hash, Star } from "lucide-react";
import { motion } from "framer-motion";

interface DealHeaderProps {
    deal: DealDetail;
}

export function DealHeader({ deal }: DealHeaderProps) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card mb-8 overflow-hidden relative"
        >
            {/* Soft decorative accent */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600" />

            <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                    
                    {/* Left: Property & Status */}
                    <div className="space-y-4 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm border ${
                                deal.is_active 
                                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}>
                                {DEAL_STATUS_LABELS[deal.status]}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded-md border border-gray-100 uppercase">
                                <Hash className="w-3 h-3" />
                                {deal.id.slice(0, 8)}
                            </span>
                        </div>
                        
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2 leading-tight">
                                {deal.property.title}
                            </h1>
                            <div className="flex items-center text-sm text-gray-500 gap-1.5 font-medium">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                {deal.property.address}, <span className="text-gray-900">{deal.property.city}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Valuation Highlight & Participants */}
                    <div className="flex flex-col items-start md:items-end gap-6 min-w-[280px]">
                        
                        {/* High-Contrast Price Highlight */}
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 px-6 py-4 rounded-2xl border border-emerald-100 shadow-sm w-full md:w-auto">
                            <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-1 block opacity-80">Agreed Valuation</span>
                            <div className="flex items-center gap-1.5 text-emerald-700">
                                <span className="text-3xl font-black">₹{(deal.agreed_price || 0).toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        {/* Participants Row */}
                        <div className="flex flex-wrap items-center gap-4">
                            {[
                                { role: 'Buyer', data: deal.parties.buyer, color: 'blue' },
                                { role: 'Seller', data: deal.parties.seller, color: 'orange' },
                                { role: 'Agent', data: deal.parties.agent, color: 'purple', rating: deal.parties.agent.rating }
                            ].map(({ role, data, color, rating }) => (
                                <div key={role} className={`flex items-center gap-2.5 p-2 rounded-xl border border-${color}-100 bg-${color}-50/30 hover:bg-${color}-50 transition-colors`}>
                                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-${color}-400 to-${color}-600 flex items-center justify-center text-white font-bold text-lg shadow-sm border-2 border-white`}>
                                        {data.name.charAt(0)}
                                    </div>
                                    <div className="flex flex-col pr-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-[9px] font-black uppercase tracking-widest text-${color}-600 opacity-80`}>{role}</span>
                                            {rating && (
                                                <span className="flex items-center text-[10px] font-bold text-amber-500 bg-amber-50 px-1 rounded">
                                                    <Star className="w-2.5 h-2.5 fill-amber-500 mr-0.5" /> {rating}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-sm font-bold text-gray-900 leading-tight">{data.name.split(' ')[0]}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </motion.div>
    );
}
