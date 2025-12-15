import { Wallet, TrendingUp } from "lucide-react";

interface FinancialBreakdownProps {
    deal: any;
}

export function FinancialBreakdown({ deal }: FinancialBreakdownProps) {
    const tokenAmount = deal.amount * 0.001;
    const commissionAmount = deal.amount * 0.009;

    // Calculate progress
    const isCompleted = deal.status === 'completed';
    const isTokenPaid = deal.status === 'token_paid' || deal.sale_deed_url || isCompleted;

    const progress = isCompleted ? 100 : isTokenPaid ? 10 : 0;

    return (
        <div className="space-y-6">
            {/* Payment Progress Widget */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex justify-between text-xs mb-2">
                    <span className="font-bold text-gray-500 uppercase tracking-wider">Payment Status</span>
                    <span className="font-bold text-gray-900">{progress}% Paid</span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gray-900 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.max(progress, 5)}%` }}
                    />
                </div>
            </div>

            {/* Receipt / Invoice Area */}
            <div className="relative">
                {/* Receipt ZigZap Top Effect (Optional, simulated with border) */}
                <div className="space-y-4">

                    {/* Item 1: Token */}
                    <div className="flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${isTokenPaid ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Booking Token</p>
                                <p className="text-[10px] text-gray-400 font-medium">0.1% of Deal Value</p>
                            </div>
                        </div>
                        <div className="text-right">
                            {isTokenPaid ? (
                                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md border border-emerald-100">
                                    PAID
                                </span>
                            ) : (
                                <p className="text-sm font-bold text-gray-900">₹{tokenAmount.toLocaleString()}</p>
                            )}
                        </div>
                    </div>

                    {/* Dotted Separator */}
                    <div className="border-b border-dashed border-gray-200" />

                    {/* Item 2: Commission */}
                    <div className="flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Platform Commission</p>
                                <p className="text-[10px] text-gray-400 font-medium">0.9% Service Fee</p>
                            </div>
                        </div>
                        <div className="text-right">
                            {isCompleted ? (
                                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md border border-emerald-100">
                                    PAID
                                </span>
                            ) : (
                                <p className="text-sm font-bold text-gray-900">₹{commissionAmount.toLocaleString()}</p>
                            )}
                        </div>
                    </div>

                    {/* Dotted Separator */}
                    <div className="border-b border-dashed border-gray-200" />

                    {/* Item 3: Balance */}
                    <div className="flex justify-between items-center opacity-60">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-gray-300" />
                            <p className="text-sm font-semibold text-gray-900">Final Settlement</p>
                        </div>
                        <p className="text-sm font-medium text-gray-900">₹{(deal.amount - tokenAmount - commissionAmount).toLocaleString()}</p>
                    </div>

                </div>

                {/* Total Footer */}
                <div className="mt-6 pt-4 border-t-2 border-gray-100 flex justify-between items-end">
                    <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Value</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-bold text-gray-900 tracking-tight">₹{deal.amount.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Includes taxes & fees</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
