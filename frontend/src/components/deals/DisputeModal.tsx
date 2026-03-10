import { useState } from "react";
import { X, AlertTriangle, Send } from "lucide-react";
import { RaiseDisputeRequest, DisputeType, DISPUTE_TYPE_LABELS } from "@/lib/types/disputes";
import { raiseDispute } from "@/lib/api/disputes";
import { useToast } from "@/components/ui/Toast";

interface DisputeModalProps {
    dealId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUserRole: string; // To filter allowed types
}

export function DisputeModal({ dealId, isOpen, onClose, onSuccess, currentUserRole }: DisputeModalProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState<DisputeType>('OTHER');
    const [description, setDescription] = useState("");

    if (!isOpen) return null;

    // Filter types based on role (Simple logic for now)
    const allowedTypes: DisputeType[] = currentUserRole === 'BUYER'
        ? ['BOOKING_PROOF_DISPUTED', 'AMOUNT_MISMATCH', 'OTHER']
        : currentUserRole === 'AGENT'
            ? ['DOCUMENT_INCOMPLETE', 'AMOUNT_MISMATCH', 'OTHER']
            : ['OTHER']; // Fallback

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) {
            showToast("Please describe the issue.", "error");
            return;
        }

        setLoading(true);
        try {
            const payload: RaiseDisputeRequest = {
                type,
                description,
                evidence_urls: [] // Future: File Upload
            };
            const res = await raiseDispute(dealId, payload);
            if (res.success) {
                showToast("Dispute raised. The deal has been frozen for review.", "success");
                onSuccess();
                onClose();
            } else {
                showToast(res.error || "Failed to raise dispute", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("An unexpected error occurred.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-red-50">
                    <h3 className="font-semibold text-red-900 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        Report an Issue
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Issue Type
                        </label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as DisputeType)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        >
                            {allowedTypes.map((t) => (
                                <option key={t} value={t}>
                                    {DISPUTE_TYPE_LABELS[t]}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 placeholder:text-gray-400"
                            placeholder="Please provide details about the issue..."
                        />
                    </div>

                    <div className="pt-2 flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? "Submitting..." : (
                                <>
                                    Submit Report <Send className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
