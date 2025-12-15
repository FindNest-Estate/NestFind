"use client";

import { useState, useEffect } from "react";
import { Loader2, MapPin, Camera, X, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface VisitReportModalProps {
    visit: any;
    onClose: () => void;
    onComplete: () => void;
}

export default function VisitReportModal({ visit, onClose, onComplete }: VisitReportModalProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form Data
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [locationError, setLocationError] = useState("");
    const [agentNotes, setAgentNotes] = useState("");
    const [images, setImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    // Step 1: Check-in (Get Location)
    useEffect(() => {
        if (step === 1) {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        setLocation({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        });
                    },
                    (error) => {
                        console.error("Error getting location", error);
                        setLocationError("Could not get your location. Please enable location services.");
                    }
                );
            } else {
                setLocationError("Geolocation is not supported by your browser.");
            }
        }
    }, [step]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setUploading(true);
        const file = e.target.files[0];
        try {
            // We just pass the file directly, the API client handles FormData
            const response = await api.bookings.uploadImage(file);

            setImages([...images, response.image_path]);
            toast.success("Image uploaded");
        } catch (error) {
            console.error("Upload failed", error);
            toast.error("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async () => {
        if (!location) {
            toast.error("Location is required to verify visit.");
            return;
        }

        setLoading(true);
        try {
            await api.bookings.completeVisit(visit.id, {
                check_in_location: `${location.lat},${location.lng}`,
                agent_notes: agentNotes,
                visit_images: images
            });
            toast.success("Visit completed successfully!");
            onComplete();
        } catch (error) {
            console.error("Failed to complete visit", error);
            toast.error("Failed to submit report");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Complete Visit Report</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center gap-2 mb-8">
                    <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-rose-500' : 'bg-gray-200'}`} />
                    <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-rose-500' : 'bg-gray-200'}`} />
                    <div className={`h-2 flex-1 rounded-full ${step >= 3 ? 'bg-rose-500' : 'bg-gray-200'}`} />
                </div>

                {step === 1 && (
                    <div className="space-y-6 text-center py-8">
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MapPin size={32} />
                        </div>
                        <h4 className="text-lg font-semibold">Verifying Location</h4>
                        <p className="text-gray-500">We need to verify you are at the property location.</p>

                        {location ? (
                            <div className="flex items-center justify-center gap-2 text-green-600 font-medium bg-green-50 py-3 rounded-lg">
                                <CheckCircle size={20} />
                                Location Verified
                            </div>
                        ) : locationError ? (
                            <div className="text-red-500 bg-red-50 py-3 rounded-lg">
                                {locationError}
                                <button
                                    onClick={() => setStep(1)} // Retry logic effectively
                                    className="block mx-auto mt-2 text-sm underline"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2 text-gray-500">
                                <Loader2 className="animate-spin" size={20} />
                                Getting coordinates...
                            </div>
                        )}

                        <button
                            onClick={() => setStep(2)}
                            disabled={!location}
                            className="w-full bg-rose-500 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-600 transition"
                        >
                            Next: Visit Details
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                How was the visit? (Notes about property/buyer)
                            </label>
                            <textarea
                                value={agentNotes}
                                onChange={(e) => setAgentNotes(e.target.value)}
                                placeholder="E.g. Buyer liked the kitchen, concerned about road noise..."
                                className="w-full border rounded-lg p-3 h-32 resize-none focus:ring-2 focus:ring-rose-500 outline-none"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={!agentNotes.trim()}
                                className="flex-1 bg-rose-500 text-white py-3 rounded-lg font-semibold disabled:opacity-50 hover:bg-rose-600 transition"
                            >
                                Next: Add Photos
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-4">
                                Upload Visit Photos (Optional)
                            </label>

                            <div className="grid grid-cols-3 gap-4 mb-4">
                                {images.map((img, idx) => (
                                    <div key={idx} className="aspect-square rounded-lg overflow-hidden relative bg-gray-100 border">
                                        <img src={`${api.API_URL}/${img}`} alt="Visit" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                                <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-rose-500 hover:bg-rose-50 transition">
                                    {uploading ? (
                                        <Loader2 className="animate-spin text-gray-400" />
                                    ) : (
                                        <>
                                            <Camera className="text-gray-400 mb-2" />
                                            <span className="text-xs text-gray-500">Add Photo</span>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                        disabled={uploading}
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep(2)}
                                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50 hover:bg-green-700 transition flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="animate-spin" size={20} />}
                                Complete Visit
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
