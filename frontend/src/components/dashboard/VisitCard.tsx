"use client";

import { Calendar, Clock, MapPin, Check, X, MessageSquare, User } from "lucide-react";
import { api } from "@/lib/api";

interface VisitCardProps {
    visit: any;
    onAction: (action: string, visitId: number, payload?: any) => void;
    onViewHistory: (visit: any) => void;
}

export default function VisitCard({ visit, onAction, onViewHistory }: VisitCardProps) {
    const isPending = visit.status === 'PENDING';
    const isApproved = visit.status === 'APPROVED';
    const isCompleted = visit.status === 'COMPLETED';

    const statusColors = {
        PENDING: "bg-yellow-50 text-yellow-700 border-yellow-100",
        APPROVED: "bg-green-50 text-green-700 border-green-100",
        REJECTED: "bg-red-50 text-red-700 border-red-100",
        COUNTER_PROPOSED: "bg-orange-50 text-orange-700 border-orange-100",
        COMPLETED: "bg-blue-50 text-blue-700 border-blue-100",
        IN_PROGRESS: "bg-purple-50 text-purple-700 border-purple-100",
        CANCELLED: "bg-gray-50 text-gray-700 border-gray-100",
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-4">
            {/* Header: User & Status */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                        {visit.user?.profile_image ? (
                            <img src={visit.user.profile_image} alt="User" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <User size={20} />
                        )}
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900">{visit.user?.first_name} {visit.user?.last_name}</h4>
                        <p className="text-xs text-gray-500">Buyer</p>
                    </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[visit.status as keyof typeof statusColors] || "bg-gray-50 text-gray-600"}`}>
                    {visit.status.replace('_', ' ')}
                </span>
            </div>

            {/* Property Details */}
            <div className="bg-gray-50 rounded-lg p-3 flex gap-3 items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-md flex-shrink-0 overflow-hidden">
                    {visit.property?.images?.[0] ? (
                        <img src={`${api.API_URL}/${visit.property.images[0].image_path}`} alt="Prop" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400"><MapPin size={16} /></div>
                    )}
                </div>
                <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{visit.property?.title}</p>
                    <p className="text-xs text-gray-500 truncate">{visit.property?.address}</p>
                </div>
            </div>

            {/* Time Slots */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="font-medium">Requested Time:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {visit.preferred_time_slots?.map((slot: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600">
                            {new Date(slot).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                    ))}
                </div>
                {visit.approved_slot && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded text-xs text-green-700 flex items-center gap-2">
                        <Check size={12} />
                        Approved: {new Date(visit.approved_slot).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-gray-100 flex gap-2 mt-auto">
                {isPending && (
                    <>
                        <button
                            onClick={() => onAction('APPROVE_MODAL', visit.id, { slot: visit.preferred_time_slots[0] })}
                            className="flex-1 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            Approve
                        </button>
                        <button
                            onClick={() => onAction('COUNTER_MODAL', visit.id)}
                            className="flex-1 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Reschedule
                        </button>
                        <button
                            onClick={() => onAction('REJECT_MODAL', visit.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </>
                )}

                {isApproved && (
                    <button
                        onClick={() => onAction('START', visit.id)}
                        className="flex-1 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Start Visit
                    </button>
                )}

                {visit.status === 'IN_PROGRESS' && (
                    <button
                        onClick={() => onAction('COMPLETE_MODAL', visit.id, { visit })}
                        className="flex-1 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                        Complete Visit
                    </button>
                )}

                {isCompleted && !visit.agent_rating && (
                    <button
                        onClick={() => onAction('RATE_MODAL', visit.id, { visit })}
                        className="flex-1 py-2 bg-rose-500 text-white text-xs font-medium rounded-lg hover:bg-rose-600 transition-colors"
                    >
                        Rate Buyer
                    </button>
                )}

                <button
                    onClick={() => onViewHistory(visit)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors ml-auto"
                    title="View History"
                >
                    <Clock size={18} />
                </button>
            </div>
        </div>
    );
}
