'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Home, BarChart3 } from 'lucide-react';

interface ComparisonData {
    currentPrice: number;
    pricePerSqft: number;
    comparables: {
        address: string;
        price: number;
        pricePerSqft: number;
        beds: number;
        baths: number;
        sqft: number;
        soldDate?: string;
        status: 'sold' | 'active' | 'pending';
    }[];
    marketStats: {
        avgPrice: number;
        avgPricePerSqft: number;
        medianDaysOnMarket: number;
    };
    priceHistory: {
        date: string;
        price: number;
        event: string;
    }[];
}

export default function PriceComparison({ propertyId, currentPrice, sqft }: { propertyId: string; currentPrice: number; sqft: number }) {
    const [data, setData] = useState<ComparisonData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // TODO: Connect to backend API
        setTimeout(() => {
            setData({
                currentPrice: currentPrice,
                pricePerSqft: Math.round(currentPrice / sqft),
                comparables: [
                    {
                        address: '456 Oak Avenue',
                        price: 435000,
                        pricePerSqft: 289,
                        beds: 3,
                        baths: 2,
                        sqft: 1505,
                        soldDate: '2026-01-10',
                        status: 'sold'
                    },
                    {
                        address: '789 Maple Street',
                        price: 425000,
                        pricePerSqft: 283,
                        beds: 3,
                        baths: 2,
                        sqft: 1502,
                        status: 'active'
                    },
                    {
                        address: '321 Pine Road',
                        price: 445000,
                        pricePerSqft: 295,
                        beds: 3,
                        baths: 2.5,
                        sqft: 1508,
                        soldDate: '2025-12-28',
                        status: 'sold'
                    }
                ],
                marketStats: {
                    avgPrice: 435000,
                    avgPricePerSqft: 289,
                    medianDaysOnMarket: 28
                },
                priceHistory: [
                    { date: '2026-01-15', price: 425000, event: 'Listed' },
                    { date: '2025-08-20', price: 415000, event: 'Previous Sale' },
                    { date: '2023-03-10', price: 385000, event: 'Previous Sale' }
                ]
            });
            setIsLoading(false);
        }, 500);
    }, [propertyId, currentPrice, sqft]);

    if (isLoading) {
        return (
            <div className="glass-card p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-32 bg-gray-200 rounded"></div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const priceDiff = data.currentPrice - data.marketStats.avgPrice;
    const priceDiffPercent = ((priceDiff / data.marketStats.avgPrice) * 100).toFixed(1);
    const isAboveMarket = priceDiff > 0;

    return (
        <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-6 h-6 text-rose-500" />
                <h3 className="text-2xl font-bold text-gray-900">Price Analysis</h3>
            </div>

            {/* Price Comparison Summary */}
            <div className="mb-8 p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">This Property</p>
                        <p className="text-3xl font-bold text-gray-900">${data.currentPrice.toLocaleString()}</p>
                        <p className="text-sm text-gray-500 mt-1">${data.pricePerSqft}/sqft</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Market Average</p>
                        <p className="text-3xl font-bold text-gray-900">${data.marketStats.avgPrice.toLocaleString()}</p>
                        <p className="text-sm text-gray-500 mt-1">${data.marketStats.avgPricePerSqft}/sqft</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Comparison</p>
                        <div className="flex items-center gap-2">
                            {isAboveMarket ? (
                                <TrendingUp className="w-5 h-5 text-red-600" />
                            ) : (
                                <TrendingDown className="w-5 h-5 text-emerald-600" />
                            )}
                            <p className={`text-2xl font-bold ${isAboveMarket ? 'text-red-600' : 'text-emerald-600'}`}>
                                {isAboveMarket ? '+' : ''}{priceDiffPercent}%
                            </p>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            {isAboveMarket ? 'Above' : 'Below'} market average
                        </p>
                    </div>
                </div>
            </div>

            {/* Comparable Properties */}
            <div className="mb-8">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Comparable Properties</h4>
                <div className="space-y-3">
                    {data.comparables.map((comp, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-4 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                        <Home className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{comp.address}</p>
                                        <p className="text-sm text-gray-500">
                                            {comp.beds} bed • {comp.baths} bath • {comp.sqft.toLocaleString()} sqft
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${comp.status === 'sold' ? 'bg-emerald-100 text-emerald-700' :
                                        comp.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                            'bg-blue-100 text-blue-700'
                                    }`}>
                                    {comp.status.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">${comp.price.toLocaleString()}</p>
                                    <p className="text-sm text-gray-500">${comp.pricePerSqft}/sqft</p>
                                </div>
                                {comp.soldDate && (
                                    <p className="text-xs text-gray-400">
                                        Sold {new Date(comp.soldDate).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Price History */}
            <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4">Price History</h4>
                <div className="relative">
                    {data.priceHistory.map((item, index) => (
                        <div key={index} className="relative pl-8 pb-6 last:pb-0">
                            <div className="absolute left-0 top-2 w-4 h-4 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 border-2 border-white shadow-lg" />
                            {index < data.priceHistory.length - 1 && (
                                <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-gray-200" />
                            )}
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-gray-900">{item.event}</p>
                                    <p className="text-sm text-gray-500">{new Date(item.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                                <p className="text-lg font-bold text-gray-900">${item.price.toLocaleString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Market Insights */}
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900 mb-1">Market Insight</p>
                        <p className="text-sm text-gray-600">
                            Properties in this area typically sell in {data.marketStats.medianDaysOnMarket} days.
                            This property is priced {isAboveMarket ? 'above' : 'competitively compared to'} similar homes.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
