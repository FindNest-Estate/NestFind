'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, DollarSign, Percent, ChevronDown, ChevronUp } from 'lucide-react';

export default function AffordabilityCalculator() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [homePrice, setHomePrice] = useState(400000);
    const [downPayment, setDownPayment] = useState(20); // percentage
    const [interestRate, setInterestRate] = useState(7.0);
    const [loanTerm, setLoanTerm] = useState(30);

    // Calculate monthly payment
    const principal = homePrice * (1 - downPayment / 100);
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTerm * 12;
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);

    // Estimate additional monthly costs
    const propertyTax = (homePrice * 0.012) / 12; // 1.2% annual
    const homeInsurance = (homePrice * 0.005) / 12; // 0.5% annual
    const pmi = downPayment < 20 ? (principal * 0.005) / 12 : 0;

    const totalMonthly = monthlyPayment + propertyTax + homeInsurance + pmi;
    const downPaymentAmount = homePrice * (downPayment / 100);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card overflow-hidden"
        >
            {/* Header */}
            <div
                className="p-6 cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <Calculator className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Affordability Calculator</h3>
                            <p className="text-sm text-gray-500">Estimate your monthly payment</p>
                        </div>
                    </div>
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    </motion.div>
                </div>

                {/* Quick Summary (always visible) */}
                <div className="mt-4 flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
                    <div>
                        <p className="text-sm font-medium text-gray-600">Estimated Monthly Payment</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-1">
                            ${Math.round(totalMonthly).toLocaleString()}
                            <span className="text-sm font-normal text-gray-500">/mo</span>
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">Home Price</p>
                        <p className="text-lg font-bold text-gray-900">${(homePrice / 1000).toFixed(0)}K</p>
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-gray-100"
                    >
                        <div className="p-6 space-y-6">
                            {/* Home Price Slider */}
                            <div>
                                <label className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <DollarSign className="w-4 h-4" />
                                        Home Price
                                    </span>
                                    <input
                                        type="number"
                                        value={homePrice}
                                        onChange={(e) => setHomePrice(Number(e.target.value))}
                                        className="w-32 px-3 py-1.5 text-sm font-medium text-right border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                    />
                                </label>
                                <input
                                    type="range"
                                    min="100000"
                                    max="2000000"
                                    step="10000"
                                    value={homePrice}
                                    onChange={(e) => setHomePrice(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                />
                                <div className="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>$100K</span>
                                    <span>$2M</span>
                                </div>
                            </div>

                            {/* Down Payment Slider */}
                            <div>
                                <label className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <Percent className="w-4 h-4" />
                                        Down Payment
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={downPayment}
                                            onChange={(e) => setDownPayment(Number(e.target.value))}
                                            className="w-16 px-3 py-1.5 text-sm font-medium text-right border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                        />
                                        <span className="text-sm text-gray-500">
                                            (${(downPaymentAmount / 1000).toFixed(0)}K)
                                        </span>
                                    </div>
                                </label>
                                <input
                                    type="range"
                                    min="3"
                                    max="50"
                                    step="1"
                                    value={downPayment}
                                    onChange={(e) => setDownPayment(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                />
                                <div className="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>3%</span>
                                    <span>50%</span>
                                </div>
                            </div>

                            {/* Interest Rate */}
                            <div>
                                <label className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-700">Interest Rate</span>
                                    <input
                                        type="number"
                                        value={interestRate}
                                        onChange={(e) => setInterestRate(Number(e.target.value))}
                                        step="0.1"
                                        className="w-24 px-3 py-1.5 text-sm font-medium text-right border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                    />
                                </label>
                                <input
                                    type="range"
                                    min="3"
                                    max="12"
                                    step="0.1"
                                    value={interestRate}
                                    onChange={(e) => setInterestRate(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                />
                            </div>

                            {/* Payment Breakdown */}
                            <div className="pt-4 border-t border-gray-100">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Monthly Payment Breakdown</h4>
                                <div className="space-y-2">
                                    <PaymentRow label="Principal & Interest" amount={monthlyPayment} />
                                    <PaymentRow label="Property Tax" amount={propertyTax} />
                                    <PaymentRow label="Home Insurance" amount={homeInsurance} />
                                    {pmi > 0 && <PaymentRow label="PMI" amount={pmi} badge="Remove with 20% down" />}
                                    <div className="pt-2 border-t border-gray-200">
                                        <PaymentRow label="Total Monthly" amount={totalMonthly} isTotal />
                                    </div>
                                </div>
                            </div>

                            {/* Affordability Assessment */}
                            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                                <p className="text-xs font-medium text-gray-600 mb-1">Income Recommendation</p>
                                <p className="text-sm text-gray-700">
                                    Suggested annual income: <span className="font-bold text-indigo-700">
                                        ${Math.round((totalMonthly * 12) / 0.28).toLocaleString()}
                                    </span>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Based on 28% debt-to-income ratio</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function PaymentRow({ label, amount, isTotal = false, badge }: { label: string; amount: number; isTotal?: boolean; badge?: string }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className={`text-sm ${isTotal ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                    {label}
                </span>
                {badge && (
                    <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                        {badge}
                    </span>
                )}
            </div>
            <span className={`text-sm ${isTotal ? 'font-bold text-emerald-700 text-lg' : 'font-medium text-gray-900'}`}>
                ${Math.round(amount).toLocaleString()}
            </span>
        </div>
    );
}
