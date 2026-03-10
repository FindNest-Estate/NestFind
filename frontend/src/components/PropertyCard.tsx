'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PropertyCard as IPropertyCard } from '@/lib/api/public';
import { saveProperty, unsaveProperty, checkIfSaved } from '@/lib/propertiesApi';
import { Heart, MapPin, Bed, Bath, Square, Home, Building2, Warehouse, TreePine, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { getImageUrl } from '@/lib/api';
import { StatusBadge } from '@/components/ui/Badge';

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
    showOverlay?: boolean;
}

function formatPrice(price: number | null): string {
    if (!price) return 'Price on Request';
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
}

export default function PropertyCard({ property, initialIsSaved = false, onToggleSave, showOverlay = true }: PropertyCardProps) {
    const [isSaved, setIsSaved] = useState(initialIsSaved);
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useAuth();
    const TypeIcon = PROPERTY_TYPES.find(t => t.value === property.type)?.icon || Home;

    useEffect(() => {
        const init = async () => {
            if (user && initialIsSaved === undefined) {
                try {
                    const saved = await checkIfSaved(property.id);
                    setIsSaved(saved);
                } catch { /* ignore */ }
            }
        };
        init();
    }, [property.id, initialIsSaved, user]);

    const handleToggleSave = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) { window.location.href = '/login'; return; }
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
        } catch {
            alert('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Link
            href={`/properties/${property.id}`}
            className="group flex flex-col bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-200 relative block"
        >
            {/* Thumbnail */}
            <div className="relative aspect-[4/3] w-full bg-gray-100 overflow-hidden shrink-0">
                {property.thumbnail_url ? (
                    <img
                        src={getImageUrl(property.thumbnail_url) || ''}
                        alt={property.title || 'Property'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <TypeIcon className="w-12 h-12 text-gray-300" />
                    </div>
                )}

                {/* Status overlay */}
                {showOverlay && (
                    <div className="absolute top-2 left-2 z-10">
                        <StatusBadge status={property.status || ''} />
                    </div>
                )}

                {/* Save button - Top Right */}
                <button
                    onClick={handleToggleSave}
                    disabled={isLoading}
                    className="absolute top-2 right-2 p-2 bg-white/50 hover:bg-white/90 backdrop-blur-md rounded-full text-gray-600 hover:text-[#FF385C] transition-all z-20"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Heart className={`w-5 h-5 transition-colors ${isSaved ? 'fill-[#FF385C] text-[#FF385C]' : ''}`} />
                    )}
                </button>
            </div>

            {/* Content Area - High Density Platform Style */}
            <div className="p-4 flex flex-col flex-1">
                {/* Price */}
                <div className="text-[22px] font-bold text-gray-900 leading-none mb-2">
                    {formatPrice(property.price)}
                </div>

                {/* Key Stats (Beds, Baths, Sqft) */}
                <div className="flex items-center flex-wrap text-base text-gray-900 mb-1">
                    {property.bedrooms !== null && (
                        <span className="mr-2 border-r border-gray-300 pr-2">
                            <span className="font-bold">{property.bedrooms}</span> bds
                        </span>
                    )}
                    {property.bathrooms !== null && (
                        <span className="mr-2 border-r border-gray-300 pr-2">
                            <span className="font-bold">{property.bathrooms}</span> ba
                        </span>
                    )}
                    {property.area_sqft !== null && (
                        <span className="mr-2">
                            <span className="font-bold">{property.area_sqft.toLocaleString()}</span> sqft
                        </span>
                    )}
                    {/* Add property type if it fits, e.g "- House for sale" */}
                    <span className="text-gray-500 font-normal text-[13px] ml-1">
                        - {property.type === 'APARTMENT' ? 'Apt' : property.type ? property.type.charAt(0) + property.type.slice(1).toLowerCase() : 'Property'} for sale
                    </span>
                </div>

                {/* Address & Title */}
                <h3 className="text-sm font-semibold text-gray-800 truncate leading-tight mt-1">
                    {property.title || 'Untitled Property'}
                </h3>
                <div className="text-sm text-gray-600 truncate mt-0.5">
                    {[property.city, property.state].filter(Boolean).join(', ') || 'Location not specified'}
                </div>

                {/* Optional Brokerage/Agent Tag line for authenticity */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center shrink-0">
                        <Building2 className="w-3 h-3 text-gray-500" />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider truncate">
                        NestFind Brokerage
                    </span>
                </div>
            </div>
        </Link>
    );
}
