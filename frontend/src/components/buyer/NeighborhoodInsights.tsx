'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { School, Train, ShoppingCart, Coffee, Trees, Star, MapPin, Navigation } from 'lucide-react';

interface Amenity {
    name: string;
    distance: string;
    rating?: number;
    icon: any;
    category: 'education' | 'transit' | 'shopping' | 'dining' | 'recreation';
}

interface NeighborhoodData {
    walkScore: number;
    transitScore: number;
    bikeScore: number;
    schools: Amenity[];
    transit: Amenity[];
    amenities: Amenity[];
}

export default function NeighborhoodInsights({ propertyId }: { propertyId: string }) {
    const [data, setData] = useState<NeighborhoodData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // TODO: Connect to backend API
        setTimeout(() => {
            setData({
                walkScore: 85,
                transitScore: 72,
                bikeScore: 68,
                schools: [
                    { name: 'Lincoln Elementary School', distance: '0.3 mi', rating: 4.5, icon: School, category: 'education' },
                    { name: 'Madison High School', distance: '0.8 mi', rating: 4.2, icon: School, category: 'education' }
                ],
                transit: [
                    { name: 'Metro Station - Downtown', distance: '0.2 mi', icon: Train, category: 'transit' },
                    { name: 'Bus Stop - Main St', distance: '0.1 mi', icon: Train, category: 'transit' }
                ],
                amenities: [
                    { name: 'Whole Foods Market', distance: '0.5 mi', rating: 4.3, icon: ShoppingCart, category: 'shopping' },
                    { name: 'Central Park', distance: '0.4 mi', rating: 4.8, icon: Trees, category: 'recreation' },
                    { name: 'Starbucks', distance: '0.2 mi', rating: 4.0, icon: Coffee, category: 'dining' }
                ]
            });
            setIsLoading(false);
        }, 500);
    }, [propertyId]);

    if (isLoading) {
        return (
            <div className="glass-card p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-20 bg-gray-200 rounded"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const getScoreColor = (score: number) => {
        if (score >= 70) return 'text-emerald-600 bg-emerald-50';
        if (score >= 50) return 'text-amber-600 bg-amber-50';
        return 'text-red-600 bg-red-50';
    };

    const getScoreLabel = (score: number) => {
        if (score >= 90) return 'Excellent';
        if (score >= 70) return 'Very Good';
        if (score >= 50) return 'Good';
        return 'Fair';
    };

    return (
        <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-6">
                <MapPin className="w-6 h-6 text-rose-500" />
                <h3 className="text-2xl font-bold text-gray-900">Neighborhood Insights</h3>
            </div>

            {/* Walkability Scores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <ScoreCard
                    label="Walk Score"
                    score={data.walkScore}
                    description="Daily errands do not require a car"
                    icon={Navigation}
                />
                <ScoreCard
                    label="Transit Score"
                    score={data.transitScore}
                    description="Excellent public transportation"
                    icon={Train}
                />
                <ScoreCard
                    label="Bike Score"
                    score={data.bikeScore}
                    description="Bikeable with some bike infrastructure"
                    icon={Navigation}
                />
            </div>

            {/* Schools */}
            <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <School className="w-5 h-5 text-blue-600" />
                    Nearby Schools
                </h4>
                <div className="space-y-3">
                    {data.schools.map((school, index) => (
                        <AmenityCard key={index} amenity={school} />
                    ))}
                </div>
            </div>

            {/* Transit */}
            <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Train className="w-5 h-5 text-indigo-600" />
                    Public Transit
                </h4>
                <div className="space-y-3">
                    {data.transit.map((stop, index) => (
                        <AmenityCard key={index} amenity={stop} />
                    ))}
                </div>
            </div>

            {/* Amenities */}
            <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Coffee className="w-5 h-5 text-amber-600" />
                    Nearby Amenities
                </h4>
                <div className="space-y-3">
                    {data.amenities.map((amenity, index) => (
                        <AmenityCard key={index} amenity={amenity} />
                    ))}
                </div>
            </div>

            {/* Map placeholder */}
            <div className="mt-6 h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center border border-gray-200">
                <div className="text-center">
                    <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Interactive Map Coming Soon</p>
                    <p className="text-sm text-gray-500 mt-1">View all nearby points of interest</p>
                </div>
            </div>
        </div>
    );
}

function ScoreCard({ label, score, description, icon: Icon }: { label: string; score: number; description: string; icon: any }) {
    const getScoreColor = (score: number) => {
        if (score >= 70) return { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-500' };
        if (score >= 50) return { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-500' };
        return { bg: 'bg-red-50', text: 'text-red-600', ring: 'ring-red-500' };
    };

    const colors = getScoreColor(score);

    return (
        <div className={`p-4 rounded-xl ${colors.bg} border border-gray-100`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">{label}</span>
                <Icon className={`w-5 h-5 ${colors.text}`} />
            </div>
            <div className="flex items-baseline gap-2 mb-2">
                <span className={`text-3xl font-bold ${colors.text}`}>{score}</span>
                <span className="text-sm text-gray-500">/ 100</span>
            </div>
            <p className="text-xs text-gray-600">{description}</p>
        </div>
    );
}

function AmenityCard({ amenity }: { amenity: Amenity }) {
    const Icon = amenity.icon;

    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                    <p className="font-semibold text-gray-900 text-sm">{amenity.name}</p>
                    <p className="text-xs text-gray-500">{amenity.distance} away</p>
                </div>
            </div>
            {amenity.rating && (
                <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-bold text-amber-700">{amenity.rating}</span>
                </div>
            )}
        </div>
    );
}
