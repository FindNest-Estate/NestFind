'use client';

import { useState } from 'react';
import { Calendar, Loader2, X } from 'lucide-react';
import { counterVisit } from '@/lib/api/visits';
import { toast } from 'sonner';

interface CounterVisitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    visitId: string;
    propertyTitle: string;
}

export default function CounterVisitModal({ isOpen, onClose, onSuccess, visitId, propertyTitle }: CounterVisitModalProps) {
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
            const result = await counterVisit(visitId, new Date(date).toISOString(), message || undefined);

            if (result.success) {
                toast.success('Counter offer sent successfully!');
                onSuccess();
                onClose();
                setDate('');
                setMessage('');
            } else {
                console.error('Counter request failed:', result.error);
                toast.error(result.error || 'Failed to send counter offer');
            }
        } catch (error: any) {
            console.error('Counter request exception:', error);
            toast.error(error?.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Propose New Time</h2>
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
                            Proposing a new time for visit to <span className="font-semibold text-gray-900">{propertyTitle}</span>
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    New Date & Time
                                </label>
                                <div className="relative">
                                    <input
                                        type="datetime-local"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent transition-all text-gray-900"
                                        required
                                    />
                                    <Calendar className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Message (Optional)
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Why the change? (e.g. 'I am busy at that time')"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent transition-all h-32 resize-none"
                                    maxLength={500}
                                />
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
                                'Send Counter'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
