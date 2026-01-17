'use client';

import { useState } from 'react';
import { Calendar, Clock, Loader2, X } from 'lucide-react';
import { visitsApi } from '@/lib/api/visits';
import { toast } from 'sonner';

interface ScheduleTourModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: string;
    propertyTitle: string;
}

export default function ScheduleTourModal({ isOpen, onClose, propertyId, propertyTitle }: ScheduleTourModalProps) {
    const [date, setDate] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!date) {
            toast.error('Please select a preferred date and time');
            return;
        }

        const selectedDate = new Date(date);
        if (selectedDate < new Date()) {
            toast.error('Please select a future date and time');
            return;
        }

        setLoading(true);
        try {
            const requestData = {
                property_id: propertyId,
                preferred_date: new Date(date).toISOString(),
                buyer_message: message || undefined
            };

            console.log('Sending tour request:', requestData);

            const result = await visitsApi.requestVisit(requestData);

            console.log('Visit request result:', result);

            if (result.success) {
                toast.success('Visit request sent successfully!');
                onClose();
                // Reset form
                setDate('');
                setMessage('');
            } else {
                console.error('Visit request failed:', result.error);
                toast.error(result.error || 'Failed to request visit');
            }
        } catch (error: any) {
            console.error('Tour request exception:', error);
            toast.error(error?.data?.detail || error?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Schedule a Tour</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <p className="text-sm text-gray-500 mb-4">
                            You are requesting a tour for <span className="font-semibold text-gray-900">{propertyTitle}</span>
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Preferred Date & Time
                                </label>
                                <div className="relative">
                                    <input
                                        type="datetime-local"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent transition-all text-gray-900 placeholder-gray-400 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                        required
                                    />
                                    <Calendar className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    The agent will review your request and confirm the time.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Message (Optional)
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Any specific questions or alternative times?"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent transition-all h-32 resize-none"
                                    maxLength={500}
                                />
                                <div className="text-right text-xs text-gray-400 mt-1">
                                    {message.length}/500
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 px-4 bg-[#FF385C] text-white rounded-xl font-medium hover:bg-[#E31C5F] transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                'Request Tour'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
