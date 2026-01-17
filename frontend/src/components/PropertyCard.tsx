'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PropertyCard as IPropertyCard } from '@/lib/api/public';
import { saveProperty, unsaveProperty, checkIfSaved } from '@/lib/propertiesApi';
import { Heart, MapPin, Bed, Bath, Square, Home, Building2, Warehouse, TreePine, Loader2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/authApi';

const PROPERTY_TYPES = [
    { value: 'HOUSE', icon: Home },
    { value: 'APARTMENT', icon: Building2 },
    { value: 'LAND', icon: TreePine },
    { value: 'COMMERCIAL', icon: Warehouse },
];

interface PropertyCardProps {
    property: IPropertyCard;
    initialIsSaved?: boolean;
    onToggleSave?: (newState: boolean) => void;
}

function formatPrice(price: number | null): string {
    if (!price) return 'Price on Request';
    if (price >= 10000000) {
        return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    if (price >= 100000) {
        return `₹${(price / 100000).toFixed(2)} L`;
    }
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(price);
}

export default function PropertyCard({ property, initialIsSaved = false, onToggleSave }: PropertyCardProps) {
    const [isSaved, setIsSaved] = useState(initialIsSaved);
    const [isLoading, setIsLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const TypeIcon = PROPERTY_TYPES.find(t => t.value === property.type)?.icon || Home;

    // Check auth status and saved status on mount
    useEffect(() => {
        const init = async () => {
            try {
                // Simple check if we have a token/user
                const user = await getCurrentUser();
                if (user) {
                    setIsAuthenticated(true);
                    if (initialIsSaved === undefined) {
                        const saved = await checkIfSaved(property.id);
                        setIsSaved(saved);
                    }
                }
            } catch {
                // Not logged in
                setIsAuthenticated(false);
            }
        };
        init();
    }, [property.id, initialIsSaved]);

    const handleToggleSave = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent link navigation
        e.stopPropagation();

        if (!isAuthenticated) {
            window.location.href = '/login'; // Or open login modal
            return;
        }

        setIsLoading(true);
        try {
            if (isSaved) {
                await unsaveProperty(property.id);
                setIsSaved(false);
                onToggleSave?.(false);
            } else {
                await saveProperty(property.id);
                setIsSaved(true);
                onToggleSave?.(true);
            }
        } catch (error) {
            console.error('Failed to toggle save:', error);
            alert('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Link
            href={`/properties/${property.id}`}
            className="group bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 block relative"
        >
            {/* Thumbnail */}
            <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                {property.thumbnail_url ? (
                    <img
                        src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${property.thumbnail_url}`}
                        alt={property.title || 'Property'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <TypeIcon className="w-16 h-16 text-gray-300" />
                    </div>
                )}

                {/* Type Badge */}
                <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-gray-700 shadow-sm z-10">
                    {property.type || 'Property'}
                </div>

                {/* Status Badge - RESERVED */}
                {property.status === 'RESERVED' && (
                    <div className="absolute bottom-3 left-3 right-3 z-10">
                        <div className="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-lg">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Reserved
                        </div>
                    </div>
                )}

                {/* Status Badge - SOLD */}
                {property.status === 'SOLD' && (
                    <div className="absolute bottom-3 left-3 right-3 z-10">
                        <div className="px-3 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-lg">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Sold
                        </div>
                    </div>
                )}

                {/* Save Button */}
                <button
                    onClick={handleToggleSave}
                    disabled={isLoading}
                    className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-500 hover:text-[#FF385C] hover:bg-white transition-all shadow-sm z-20"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Heart
                            className={`w-5 h-5 transition-colors ${isSaved ? 'fill-[#FF385C] text-[#FF385C]' : ''}`}
                        />
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Price */}
                <div className="text-xl font-bold text-gray-900 mb-1">
                    {formatPrice(property.price)}
                </div>

                {/* Title */}
                <h3 className="text-gray-800 font-medium mb-2 line-clamp-1 group-hover:text-[#FF385C] transition-colors">
                    {property.title || 'Untitled Property'}
                </h3>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-3">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="line-clamp-1">
                        {[property.city, property.state].filter(Boolean).join(', ') || 'Location not specified'}
                    </span>
                </div>

                {/* Features */}
                <div className="flex items-center gap-4 text-gray-600 text-sm border-t border-gray-100 pt-3">
                    {property.bedrooms !== null && (
                        <div className="flex items-center gap-1.5">
                            <Bed className="w-4 h-4" />
                            <span>{property.bedrooms}</span>
                        </div>
                    )}
                    {property.bathrooms !== null && (
                        <div className="flex items-center gap-1.5">
                            <Bath className="w-4 h-4" />
                            <span>{property.bathrooms}</span>
                        </div>
                    )}
                    {property.area_sqft !== null && (
                        <div className="flex items-center gap-1.5">
                            <Square className="w-4 h-4" />
                            <span>{property.area_sqft.toLocaleString()} sqft</span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}
