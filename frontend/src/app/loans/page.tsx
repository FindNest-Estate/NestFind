"use client";

import Navbar from "@/components/navbar/Navbar";
import Container from "@/components/Container";
import { Calculator, CheckCircle, DollarSign, Percent } from "lucide-react";

export default function LoansPage() {
    return (
        <main className="min-h-screen bg-white">
            <Navbar />
            <div className="pt-28 pb-20">
                <Container>
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-16">
                            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6">
                                Finance Your <span className="text-rose-500">Dream Home</span>
                            </h1>
                            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                                Compare rates from top lenders and get pre-approved in minutes. Simple, transparent, and fast.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-xl transition-shadow">
                                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-500 mb-6">
                                    <Percent size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Low Interest Rates</h3>
                                <p className="text-gray-600">
                                    Get competitive rates starting from 3.5% APR. We negotiate with lenders so you don't have to.
                                </p>
                            </div>
                            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-xl transition-shadow">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 mb-6">
                                    <Calculator size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Mortgage Calculator</h3>
                                <p className="text-gray-600">
                                    Calculate your monthly payments with taxes and insurance included. No hidden fees.
                                </p>
                            </div>
                            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-xl transition-shadow">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-500 mb-6">
                                    <DollarSign size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Fast Pre-Approval</h3>
                                <p className="text-gray-600">
                                    Get a pre-approval letter in as little as 24 hours to make your offer stand out.
                                </p>
                            </div>
                        </div>

                        <div className="bg-rose-500 rounded-3xl p-10 md:p-16 text-center text-white relative overflow-hidden">
                            <div className="relative z-10">
                                <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to get started?</h2>
                                <p className="text-lg text-rose-100 mb-8 max-w-xl mx-auto">
                                    Our loan experts are standing by to help you find the best financing options for your situation.
                                </p>
                                <button className="px-8 py-4 bg-white text-rose-600 font-bold rounded-full hover:bg-gray-100 transition-colors shadow-lg">
                                    Apply Now
                                </button>
                            </div>
                            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                                <div className="absolute -top-20 -left-20 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl"></div>
                                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl"></div>
                            </div>
                        </div>
                    </div>
                </Container>
            </div>
        </main>
    );
}
