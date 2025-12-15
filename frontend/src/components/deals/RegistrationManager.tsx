"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Check, MapPin, ShieldCheck, Upload, CalendarClock, Lock, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface RegistrationManagerProps {
    deal: any;
    isBuyer: boolean;
    isAgent: boolean;
    onUpdate: () => void;
}

export function RegistrationManager({ deal, isBuyer, isAgent, onUpdate }: RegistrationManagerProps) {
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState("");
    const [verificationStep, setVerificationStep] = useState<'IDLE' | 'OTP_SENT' | 'VERIFYING'>('IDLE');
    const [otp, setOtp] = useState("");
    const [isRescheduling, setIsRescheduling] = useState(false);

    // Status Checks
    const hasProposedSlot = !!deal.registration_slot_proposed;
    const isSlotAccepted = deal.registration_slot_accepted;
    const isVerified = !!deal.registration_verified_at;
    const isDocUploaded = !!deal.final_registration_doc_url;

    const safeFormat = (dateStr: string, fmt: string) => {
        if (!dateStr) return "N/A";
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? "Invalid Date" : format(d, fmt);
    };

    // handlers
    const handleProposeSlot = async () => {
        if (!selectedDate) return;
        setLoading(true);
        try {
            await api.offers.scheduleRegistrationSlot(deal.id, selectedDate);
            toast.success("Registration slot proposed!");
            setIsRescheduling(false); // Reset rescheduling mode
            onUpdate();
        } catch (e) {
            toast.error("Failed to propose slot");
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptSlot = async () => {
        setLoading(true);
        try {
            await api.offers.acceptRegistrationSlot(deal.id);
            toast.success("Slot confirmed!");
            onUpdate();
        } catch (e) {
            toast.error("Failed to accept slot");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateOTP = async () => {
        setLoading(true);
        try {
            const res = await api.offers.generateRegistrationOTP(deal.id);
            setVerificationStep('OTP_SENT');
            toast.success("OTP sent to buyer! (For Demo: Check console/network or backend log)");
            console.log("DEMO OTP:", res.debug_otp); // For testing
        } catch (e) {
            toast.error("Failed to generate OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (!otp) return;
        setLoading(true);

        // Get Geolocation
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                await api.offers.verifyRegistrationOTP(deal.id, {
                    otp,
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                toast.success("Verification Successful!");
                setVerificationStep('IDLE');
                onUpdate();
            } catch (e) {
                toast.error("Invalid OTP or Verification Failed");
            } finally {
                setLoading(false);
            }
        }, () => {
            toast.error("Location access denied. Please enable location services.");
            setLoading(false);
        });
    };

    const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        setLoading(true);
        try {
            await api.offers.uploadFinalDoc(deal.id, e.target.files[0]);
            toast.success("Document uploaded successfully!");
            onUpdate();
        } catch (e) {
            toast.error("Upload failed");
        } finally {
            setLoading(false);
        }
    };

    // Determine Active Step
    let activeStep = 1;
    if (isSlotAccepted) activeStep = 2;
    if (isVerified) activeStep = 3;
    if (isDocUploaded) activeStep = 4; // Completed

    // Minimal Header
    const getStepTitle = () => {
        switch (activeStep) {
            case 1: return "Step 1/3: Schedule Slot";
            case 2: return "Step 2/3: On-Site Verification";
            case 3: return "Step 3/3: Document Upload";
            default: return "Registration Complete";
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

            {/* Minimal Header (only if not complete) */}
            {activeStep < 4 && (
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{getStepTitle()}</span>
                    <div className="flex gap-1">
                        {[1, 2, 3].map(s => (
                            <div key={s} className={`h-1.5 w-1.5 rounded-full ${s <= activeStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="p-6 min-h-[250px] flex flex-col justify-center items-center text-center">

                {/* STEP 1: SCHEDULING */}
                {activeStep === 1 && (
                    <div className="w-full max-w-md space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {isAgent ? (
                            (hasProposedSlot && !isRescheduling) ? (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-gray-900">Waiting for Buyer</h3>
                                    <p className="text-sm text-gray-500">Proposed: <span className="font-semibold text-gray-900">{safeFormat(deal.registration_slot_proposed, "PPp")}</span></p>
                                    <button onClick={() => { setSelectedDate(deal.registration_slot_proposed); setIsRescheduling(true); }} className="text-xs text-blue-600 hover:underline">Reschedule</button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-gray-900">Propose Registration Slot</h3>
                                    <div className="flex gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                                        <input
                                            type="datetime-local"
                                            className="bg-transparent border-none flex-1 text-sm font-medium focus:ring-0 px-2 py-2 text-gray-700"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                        />
                                        <button onClick={handleProposeSlot} disabled={loading || !selectedDate} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition disabled:opacity-50">
                                            {loading ? <Loader2 className="animate-spin" size={16} /> : "Propose"}
                                        </button>
                                    </div>
                                    {isRescheduling && <button onClick={() => setIsRescheduling(false)} className="text-xs text-red-500">Cancel</button>}
                                </div>
                            )
                        ) : (
                            hasProposedSlot ? (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-gray-900">Confirm Registration Slot</h3>
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <p className="text-2xl font-bold text-blue-900 mb-1">{safeFormat(deal.registration_slot_proposed, "MMMM do, h:mm a")}</p>
                                        <p className="text-xs text-blue-600 uppercase font-bold tracking-wide">Proposed Time</p>
                                    </div>
                                    <button onClick={handleAcceptSlot} disabled={loading} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition">
                                        {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Confirm Slot"}
                                    </button>
                                </div>
                            ) : (
                                <div className="text-gray-400 text-sm">Waiting for agent to propose a time...</div>
                            )
                        )}
                    </div>
                )}


                {/* STEP 2: VERIFICATION */}
                {activeStep === 2 && (
                    <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {isAgent ? (
                            verificationStep === 'IDLE' ? (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-gray-900">Verify Buyer Identity</h3>
                                    <p className="text-sm text-gray-500">Send an OTP to the buyer when you meet at the office.</p>
                                    <button onClick={handleGenerateOTP} disabled={loading} className="w-full bg-amber-500 text-white py-2.5 rounded-lg font-bold hover:bg-amber-600 transition shadow-sm flex items-center justify-center gap-2">
                                        <ShieldCheck size={16} /> Send OTP
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-gray-900">Enter Verification Code</h3>
                                    <input
                                        type="text" maxLength={6} placeholder="000 000"
                                        className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-2xl text-center tracking-[0.5em] font-bold outline-none focus:border-amber-500"
                                        value={otp} onChange={(e) => setOtp(e.target.value)}
                                    />
                                    <button onClick={handleVerifyOTP} disabled={loading || otp.length !== 6} className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-green-700 transition">
                                        {loading ? "Verifying..." : "Verify"}
                                    </button>
                                </div>
                            )
                        ) : (
                            <div className="bg-amber-50 p-6 rounded-xl border border-amber-100 text-center">
                                {deal.registration_otp ? (
                                    <>
                                        <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">VERIFICATION CODE</p>
                                        <p className="text-3xl font-bold text-gray-900 tracking-[0.2em]">{deal.registration_otp}</p>
                                        <p className="text-xs text-amber-600 mt-2">Show this to the agent on-site.</p>
                                    </>
                                ) : (
                                    <p className="text-sm text-amber-800 font-medium">Waiting for agent to initiate verification...</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 3: UPLOAD */}
                {activeStep === 3 && (
                    <div className="w-full max-w-md space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-gray-900">Upload Final Deed</h3>
                            <p className="text-xs text-gray-400 mt-1">Upload the signed and registered PDF.</p>
                        </div>
                        <label className={`block group relative cursor-pointer border-2 border-dashed border-gray-200 hover:border-blue-500 rounded-xl p-8 transition-all hover:bg-blue-50 ${loading ? 'opacity-50' : ''}`}>
                            <input type="file" className="hidden" onChange={handleUploadDoc} accept="application/pdf" />
                            <div className="flex flex-col items-center gap-2">
                                <Upload size={24} className="text-gray-300 group-hover:text-blue-500" />
                                <span className="text-sm font-bold text-gray-600 group-hover:text-blue-700">Choose PDF</span>
                            </div>
                        </label>
                    </div>
                )}

                {/* FINAL STATE: MINIMAL SUCCESS */}
                {activeStep === 4 && (
                    <div className="w-full animate-in zoom-in duration-300 flex items-center gap-4 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 size={20} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-bold text-emerald-900">Registration Complete</h3>
                            <p className="text-xs text-emerald-700">Proceeding to handover...</p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
