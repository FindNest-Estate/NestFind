'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PropertyCard as IPropertyCard } from '@/lib/api/public';
import { saveProperty, unsaveProperty, checkIfSaved } from '@/lib/propertiesApi';
import { Heart, MapPin, Bed, Bath, Maximize, Home, Building2, Warehouse, TreePine, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { getImageUrl } from '@/lib/api';
import { StatusBadge } from '@/components/ui/Badge';

const PROPERTY_TYPES = [
    { value: 'HOUSE', label: 'House', icon: Home },
    { value: 'APARTMENT', label: 'Apartment', icon: Building2 },
    { value: 'LAND', label: 'Land', icon: TreePine },
    { value: 'COMMERCIAL', label: 'Commercial', icon: Warehouse },
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

function getTypeLabel(type: string | null): string {
    if (!type) return 'Property';
    const found = PROPERTY_TYPES.find(t => t.value === type);
    return found ? found.label : type.charAt(0) + type.slice(1).toLowerCase();
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

    const location = [property.city, property.state].filter(Boolean).join(', ');

    return (
        <Link
            href={`/properties/${property.id}`}
            className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 relative"
        >
            {/* Image */}
            <div className="relative aspect-[16/10] w-full bg-gray-50 overflow-hidden">
                {property.thumbnail_url ? (
                    <img
                        src={getImageUrl(property.thumbnail_url) || ''}
                        alt={property.title || 'Property'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                        <TypeIcon className="w-16 h-16 text-gray-200" />
                    </div>
                )}

                {/* Gradient overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Status badge */}
                {showOverlay && (
                    <div className="absolute top-3 left-3 z-10">
                        <StatusBadge status={property.status || ''} />
                    </div>
                )}

                {/* Save button */}
                <button
                    onClick={handleToggleSave}
                    disabled={isLoading}
                    className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-white/70 hover:bg-white backdrop-blur-sm rounded-full text-gray-500 hover:text-[#FF385C] transition-all duration-200 z-20 shadow-sm"
                >
                    {isLoading ? (
                        <Loader2 className="w-[18px] h-[18px] animate-spin" />
                    ) : (
                        <Heart className={`w-[18px] h-[18px] transition-colors ${isSaved ? 'fill-[#FF385C] text-[#FF385C]' : ''}`} />
                    )}
                </button>

                {/* Property type chip */}
                <div className="absolute bottom-3 left-3 z-10">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 backdrop-blur-sm text-xs font-semibold text-gray-700 shadow-sm">
                        <TypeIcon className="w-3 h-3" />
                        {getTypeLabel(property.type)}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-1 gap-2">
                {/* Price */}
                <div className="text-xl font-extrabold text-gray-900 tracking-tight">
                    {formatPrice(property.price)}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 text-[13px] text-gray-500 font-medium">
                    {property.bedrooms !== null && (
                        <span className="flex items-center gap-1">
                            <Bed className="w-3.5 h-3.5 text-gray-400" />
                            {property.bedrooms} {property.bedrooms === 1 ? 'Bed' : 'Beds'}
                        </span>
                    )}
                    {property.bathrooms !== null && (
                        <span className="flex items-center gap-1">
                            <Bath className="w-3.5 h-3.5 text-gray-400" />
                            {property.bathrooms} {property.bathrooms === 1 ? 'Bath' : 'Baths'}
                        </span>
                    )}
                    {property.area_sqft !== null && (
                        <span className="flex items-center gap-1">
                            <Maximize className="w-3.5 h-3.5 text-gray-400" />
                            {property.area_sqft.toLocaleString()} sqft
                        </span>
                    )}
                </div>

                {/* Title */}
                <h3 className="text-[15px] font-semibold text-gray-800 truncate leading-snug">
                    {property.title || 'Untitled Property'}
                </h3>

                {/* Location */}
                {location && (
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{location}</span>
                    </div>
                )}

                {/* Agent / Brokerage */}
                <div className="mt-auto pt-3 border-t border-gray-50 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#FF385C]/10 to-[#FF385C]/5 flex items-center justify-center shrink-0">
                        <Building2 className="w-3 h-3 text-[#FF385C]" />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest truncate">
                        {property.agent_name ? `Agent: ${property.agent_name}` : 'NestFind Brokerage'}
                    </span>
                </div>
            </div>
        </Link>
    );
}
