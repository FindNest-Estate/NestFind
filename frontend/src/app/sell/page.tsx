"use client";

import Navbar from "@/components/navbar/Navbar";
import Container from "@/components/Container";
import { CheckCircle, DollarSign, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function SellPage() {
    return (
        <main className="min-h-screen bg-white">
            <Navbar />
            <div className="pt-28 pb-20">
                <Container>
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-16">
                            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6">
                                Sell Your Home with <span className="text-rose-500">Confidence</span>
                            </h1>
                            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                                Get the best price for your property with our expert agents and cutting-edge technology.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-xl transition-shadow">
                                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-500 mb-6">
                                    <TrendingUp size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Market Analysis</h3>
                                <p className="text-gray-600">
                                    Get a free, comprehensive market analysis to understand your home's true value.
                                </p>
                            </div>
                            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-xl transition-shadow">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 mb-6">
                                    <CheckCircle size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Verified Buyers</h3>
                                <p className="text-gray-600">
                                    Connect with pre-approved buyers who are ready to make an offer on your home.
                                </p>
                            </div>
                            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-xl transition-shadow">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-500 mb-6">
                                    <DollarSign size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Maximum Value</h3>
                                <p className="text-gray-600">
                                    Our strategies are designed to get you the highest possible price in the shortest time.
                                </p>
                            </div>
                        </div>

                        <div className="bg-gray-900 rounded-3xl p-10 md:p-16 text-center text-white relative overflow-hidden">
                            <div className="relative z-10">
                                <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to list your property?</h2>
                                <p className="text-lg text-gray-300 mb-8 max-w-xl mx-auto">
                                    Join thousands of satisfied sellers who have trusted NestFind with their home sale.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Link href="/dashboard" className="px-8 py-4 bg-rose-500 text-white font-bold rounded-full hover:bg-rose-600 transition-colors shadow-lg">
                                        List Your Property
                                    </Link>
                                    <Link href="/find-agent" className="px-8 py-4 bg-white text-gray-900 font-bold rounded-full hover:bg-gray-100 transition-colors shadow-lg">
                                        Find an Agent
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </Container>
            </div>
        </main>
    );
}
