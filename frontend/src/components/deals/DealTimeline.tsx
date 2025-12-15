import { CheckCircle2, Circle, Clock, ArrowRight, Lock, CreditCard, FileSignature, Building, PartyPopper } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";
import { PaymentGateway } from "@/components/deals/PaymentGateway";
import { RegistrationManager } from "@/components/deals/RegistrationManager";

interface DealTimelineProps {
    deal: any;
    isBuyer: boolean;
    isAgent: boolean;
    onUpdate: () => void;
}

export function DealTimeline({ deal, isBuyer, isAgent, onUpdate }: DealTimelineProps) {
    const [loading, setLoading] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [paymentConfig, setPaymentConfig] = useState<{ type: 'TOKEN' | 'COMMISSION', amount: number } | null>(null);

    // Precise Status Logic strictly from DB data
    const isTokenPaid = deal.status === 'token_paid' || deal.status === 'completed' || deal.sale_deed_url;
    const isRegistrationDone = !!deal.final_registration_doc_url;
    const isCompleted = deal.status === 'completed';

    const steps = [
        {
            id: 'accepted',
            title: 'Offer Accepted',
            subtitle: 'Transaction Initiated',
            description: `Agent accepted the offer of ₹${deal.amount.toLocaleString()}.`,
            status: 'completed',
            date: deal.created_at,
            icon: CheckCircle2,
            color: 'text-green-600 bg-green-50'
        },
        {
            id: 'token_paid',
            title: 'Booking Token',
            subtitle: 'Secure the property',
            description: 'Buyer pays 0.1% token amount to freeze the property and start legal work.',
            status: isTokenPaid ? 'completed' : 'current',
            date: null,
            icon: CreditCard,
            color: isTokenPaid ? 'text-green-600 bg-green-50' : 'text-blue-600 bg-blue-50',
            action: !isTokenPaid && isBuyer ? 'Pay Token' : null,
            waiting: !isTokenPaid && !isBuyer ? 'Waiting for buyer payment...' : null,
            amount: deal.amount * 0.001
        },
        {
            id: 'registration',
            title: 'Sale Deed Registration',
            subtitle: 'Legal ownership transfer',
            description: isAgent
                ? 'Register the slot for registration day, verify buyer via OTP, and upload deed.'
                : 'Accept the registration slot proposed by the agent and complete physical verification.',
            status: isRegistrationDone || isCompleted ? 'completed' : isTokenPaid ? 'current' : 'pending',
            date: deal.registration_slot_final,
            icon: FileSignature,
            color: (isRegistrationDone || isCompleted) ? 'text-green-600 bg-green-50' : isTokenPaid ? 'text-blue-600 bg-blue-50' : 'text-gray-400 bg-gray-50',
            component: <RegistrationManager deal={deal} isBuyer={isBuyer} isAgent={isAgent} onUpdate={onUpdate} />
        },
        {
            id: 'commission',
            title: 'Deal Completion',
            subtitle: 'Finalize transaction',
            description: 'Final commission payment (0.9%) and handover.',
            status: isCompleted ? 'completed' : isRegistrationDone ? 'current' : 'pending',
            date: null,
            icon: Building,
            color: isCompleted ? 'text-green-600 bg-green-50' : isRegistrationDone ? 'text-blue-600 bg-blue-50' : 'text-gray-400 bg-gray-50',
            action: isRegistrationDone && !isCompleted && !isBuyer ? 'Pay Commission' : null,
            waiting: isRegistrationDone && !isCompleted && isBuyer ? 'Waiting for final formality...' : null,
            amount: deal.amount * 0.009
        }
    ];

    const handleAction = async (stepId: string, amount?: number) => {
        if (stepId === 'token_paid') {
            setPaymentConfig({ type: 'TOKEN', amount: amount || 0 });
            setShowPayment(true);
            return;
        }
        if (stepId === 'commission') {
            setPaymentConfig({ type: 'COMMISSION', amount: amount || 0 });
            setShowPayment(true);
            return;
        }

        setLoading(true);
        try {
            onUpdate();
        } catch (error: any) {
            console.error("Action failed", error);
            toast.error(error.message || "Action failed");
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSuccess = async (paymentDetails: any) => {
        try {
            if (paymentConfig?.type === 'TOKEN') {
                await api.offers.payToken(deal.id, paymentDetails);
                toast.success("Token paid! Generating Sale Deed Draft...");

                try {
                    await api.offers.generateSaleDeed(deal.id);
                    toast.success("Sale Deed Draft generated!");
                } catch (e) {
                    console.error("Failed to generate deed", e);
                    toast.error("Failed to generate deed draft");
                }
            } else if (paymentConfig?.type === 'COMMISSION') {
                await api.offers.payCommission(deal.id);
                toast.success("Commission Paid! Deal Completed.");
            }
            setShowPayment(false);
            setPaymentConfig(null);
            onUpdate();
        } catch (error) {
            console.error(error);
            toast.error("Payment processing failed");
        }
    };

    return (
        <div className="space-y-8">
            {/* Completion Celebration - Premium Design */}
            {isCompleted && (
                <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 rounded-3xl p-8 text-center text-white shadow-xl shadow-emerald-900/10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,rgba(255,255,255,0.15),transparent_50%)]" />
                    <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity">
                        <PartyPopper size={120} strokeWidth={1} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-center mb-5">
                            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm border border-white/30 shadow-inner">
                                <PartyPopper size={32} className="text-white" strokeWidth={1.5} />
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold mb-2 tracking-tight">Congratulations!</h2>
                        <p className="text-emerald-100 text-lg font-medium">Property successfully sold and recorded.</p>
                    </div>
                </div>
            )}

            {showPayment && paymentConfig && (
                <PaymentGateway
                    amount={paymentConfig.amount}
                    propertyTitle={deal.property.title}
                    onClose={() => { setShowPayment(false); setPaymentConfig(null); }}
                    onSuccess={handlePaymentSuccess}
                />
            )}

            {/* Timeline - Linear Style */}
            <div className="relative pl-6 space-y-10">
                {/* Vertical Line */}
                <div className="absolute left-[9px] top-6 bottom-6 w-[2px] bg-gray-100 rounded-full" />

                {steps.map((step, index) => {
                    const isActive = step.status === 'current';
                    const isDone = step.status === 'completed';

                    return (
                        <div key={step.id} className={`relative pl-8 group ${isDone ? 'opacity-70 hover:opacity-100 transition-opacity' : isActive ? 'opacity-100' : 'opacity-40'}`}>

                            {/* Dot Indicator */}
                            <div className={`absolute left-0 top-1.5 flex items-center justify-center w-5 h-5 rounded-full border-[3px] bg-white transition-colors duration-300 z-10 ${isActive ? 'border-gray-900 scale-110' :
                                isDone ? 'border-emerald-500' :
                                    'border-gray-200'
                                }`}>
                                {isDone && <div className="w-2 h-2 bg-emerald-500 rounded-full" />}
                                {isActive && <div className="w-2 h-2 bg-gray-900 rounded-full animate-pulse" />}
                            </div>

                            {/* Content Body */}
                            <div className="relative">
                                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-2">
                                    <h3 className={`text-base font-bold ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                                        {step.title}
                                    </h3>
                                    {step.date && (
                                        <div className="text-xs font-medium text-gray-400 font-mono">
                                            {!isNaN(new Date(step.date).getTime()) ? new Date(step.date).toLocaleDateString() : 'Pending'}
                                        </div>
                                    )}
                                </div>
                                <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                                    {step.subtitle}
                                </p>

                                {isActive ? (
                                    <div className="p-5 rounded-2xl border bg-white border-gray-200 shadow-lg shadow-gray-200/50 transition-all duration-300">
                                        <p className="text-gray-600 text-sm leading-relaxed mb-4">
                                            {step.description}
                                        </p>

                                        {/* Action Area */}
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            {step.component ? (
                                                <div className="w-full animate-in fade-in duration-300">
                                                    {step.component}
                                                </div>
                                            ) : step.action ? (
                                                <button
                                                    onClick={() => handleAction(step.id, step.amount)}
                                                    disabled={loading}
                                                    className="group inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-all shadow-sm hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                                                >
                                                    {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : null}
                                                    {step.action}
                                                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
                                                </button>
                                            ) : (
                                                <div className="inline-flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                                                    <Clock size={12} className="text-amber-600" />
                                                    <span>{step.waiting || "Waiting for action..."}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    /* Completed State - Minimal */
                                    <div className="py-2">
                                        <p className="text-xs text-green-600 font-medium flex items-center gap-1.5">
                                            <CheckCircle2 size={12} /> Completed
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
