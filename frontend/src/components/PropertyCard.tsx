'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PropertyCard as IPropertyCard } from '@/lib/api/public';
import { saveProperty, unsaveProperty, checkIfSaved } from '@/lib/propertiesApi';
import { Heart, MapPin, Bed, Bath, Maximize, Home, Building2, Warehouse, TreePine, Loader2, User, Eye, Flame } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { getImageUrl } from '@/lib/api';
import { StatusBadge } from '@/components/ui/Badge';

const PROPERTY_TYPES = [
    { value: 'HOUSE', label: 'House', icon: Home },
    { value: 'APARTMENT', label: 'Apartment', icon: Building2 },
    { value: 'LAND', label: 'Land', icon: TreePine },
    { value: 'COMMERCIAL', label: 'Commercial', icon: Warehouse },
];

export interface PropertyCardProps {
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
    
    // Calculates the discount dynamically based on the DB original_price vs current price
    const discountPercentage = property.original_price && property.original_price > (property.price || 0) 
        ? Math.round(((property.original_price - (property.price || 0)) / property.original_price) * 100) 
        : 0;

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

    const location = [property.city, property.state].filter(Boolean).join(', ');

    return (
        <Link
            href={`/properties/${property.id}`}
            className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 relative w-full"
        >
            {/* Image Section: 16:9 Aspect Ratio */}
            <div className="relative w-full aspect-video bg-gray-100 overflow-hidden">
                {property.thumbnail_url ? (
                    <Image
                        src={getImageUrl(property.thumbnail_url) || ''}
                        alt={property.title || 'Property'}
                        fill
                        unoptimized
                        className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <TypeIcon className="w-10 h-10 text-gray-300" />
                    </div>
                )}

                {/* Top Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                    {property.is_hot_sale && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-600 text-white text-xs font-bold tracking-wide shadow-sm">
                            <Flame className="w-3.5 h-3.5 fill-current" /> Hot Sale
                        </span>
                    )}
                    {showOverlay && property.status && (
                        <div className="shadow-sm">
                            <StatusBadge status={property.status} dot={false} />
                        </div>
                    )}
                </div>

                {/* Property Type Badge */}
                <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-sm text-white text-xs font-semibold capitalize tracking-wide">
                    <TypeIcon className="w-3.5 h-3.5" />
                    <span>{property.type.replace('_', ' ').toLowerCase()}</span>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleToggleSave}
                    disabled={isLoading}
                    aria-label={isSaved ? "Unsave property" : "Save property"}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors duration-200 shadow-sm disabled:opacity-50"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                    ) : (
                        <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : 'text-gray-600 hover:text-rose-500'}`} />
                    )}
                </button>
            </div>

            {/* Content Body */}
            <div className="flex flex-col flex-grow" style={{ padding: '20px', gap: '16px' }}>
                {/* Header: Price & Title */}
                <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xl font-bold text-blue-900">
                            {formatPrice(property.price)}
                        </span>
                        {discountPercentage > 0 && (
                            <>
                                <span className="text-sm text-gray-400 line-through">
                                    {formatPrice(property.original_price!)}
                                </span>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                    {discountPercentage}% OFF
                                </span>
                            </>
                        )}
                    </div>
                    
                    <h3 className="text-base font-semibold text-gray-800 line-clamp-1 capitalize">
                        {property.title || 'Untitled Property'}
                    </h3>

                    {location && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1.5 capitalize">
                            <MapPin className="w-4 h-4 shrink-0 text-gray-400" />
                            <span className="truncate">{location.toLowerCase()}</span>
                        </div>
                    )}
                </div>

                {/* Specs */}
                <div className="flex items-center gap-4 py-3 border-t border-gray-100 mt-auto">
                    <div className="flex items-center gap-2 text-gray-600">
                        <Bed className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">{property.bedrooms ?? '-'} <span className="text-xs text-gray-400 font-normal">Beds</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                        <Bath className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">{property.bathrooms ?? '-'} <span className="text-xs text-gray-400 font-normal">Baths</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                        <Maximize className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">
                            {property.area_sqft ? property.area_sqft.toLocaleString() : '-'} 
                            <span className="text-xs text-gray-400 font-normal ml-1">sqft</span>
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                            <User className="w-3 h-3 text-blue-500" />
                        </div>
                        <span className="text-xs font-medium text-gray-600 capitalize">
                            {property.agent_name ? property.agent_name.toLowerCase() : 'NestFind Agent'}
                        </span>
                    </div>
                    
                    {property.views_count && property.views_count > 0 ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                            <Eye className="w-3.5 h-3.5" />
                            <span>{property.views_count} Live Buyers</span>
                        </div>
                    ) : (
                        <span className="text-xs text-gray-400 italic">New</span>
                    )}
                </div>
            </div>
        </Link>
    );
}
