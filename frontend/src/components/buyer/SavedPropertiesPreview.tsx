'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, ChevronRight, MapPin, Grid, Maximize2 } from 'lucide-react';
import { getSavedPropertiesPreview, SavedPropertyPreview } from '@/lib/api/buyer';
import { getImageUrl } from '@/lib/api';

export default function SavedPropertiesPreview() {
    const [properties, setProperties] = useState<SavedPropertyPreview[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSaved = async () => {
            try {
                const data = await getSavedPropertiesPreview();
                setProperties(data);
            } catch (error) {
                console.error("Failed to fetch saved properties", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSaved();
    }, []);

    if (loading) {
        return (
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5 animate-pulse">
                <div className="h-5 w-48 bg-[var(--gray-200)] rounded mb-5"></div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="aspect-[4/3] bg-[var(--gray-100)] rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (properties.length === 0) {
        return (
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-base font-bold text-[var(--gray-900)] flex items-center gap-2">
                        <Heart className="w-5 h-5 text-[var(--color-brand)]" />
                        Saved Properties
                    </h2>
                </div>
                <div className="text-center py-6 bg-[var(--gray-50)] rounded-[var(--radius-sm)] border border-dashed border-[var(--gray-200)]">
                    <Heart className="w-8 h-8 text-[var(--gray-300)] mx-auto mb-2" />
                    <p className="text-sm font-medium text-[var(--gray-900)]">No saved properties</p>
                    <p className="text-xs text-[var(--gray-500)] mt-1 mb-4">Click the heart icon on any property to save it here.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card border border-white/60 p-6 relative overflow-hidden backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 via-transparent to-transparent opacity-50" />
            <div className="flex justify-between items-center mb-6 relative z-10">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-500 fill-rose-500 opacity-20" />
                    <span className="relative -ml-6 mr-1"><Heart className="w-5 h-5 text-rose-500" /></span>
                    Saved Collections
                </h2>
                <div className="flex items-center gap-3">
                    <Link href="/collections" className="text-xs font-bold px-4 py-2 rounded-xl bg-white text-gray-600 hover:text-rose-700 hover:bg-rose-50 shadow-sm border border-gray-100 hover:border-rose-200 transition-all hidden sm:flex items-center gap-1.5">
                        <Grid className="w-3.5 h-3.5" /> Manage
                    </Link>
                    <Link href="/saved" className="text-sm font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center transition-colors">
                        View All <ChevronRight className="w-4 h-4 ml-0.5" />
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 relative z-10">
                {properties.map(property => (
                    <Link href={`/properties/${property.id}`} key={property.id} className="group block relative aspect-[4/3] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div
                            className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                            style={{ backgroundImage: `url(${getImageUrl(property.thumbnail_url || '') || '/placeholder-house.jpg'})` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                        {/* Status Badge */}
                        <div className="absolute top-2 left-2 flex gap-1">
                            <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider rounded-md text-[var(--gray-900)] shadow-sm">
                                {property.status}
                            </span>
                        </div>

                        {/* Details */}
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                            <div className="font-bold text-white text-sm md:text-base leading-tight mb-0.5 group-hover:text-[var(--color-brand-light)] transition-colors">
                                ₹{property.price.toLocaleString('en-IN')}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] md:text-xs text-white/90">
                                <span className="truncate">{property.city}</span>
                                <span className="opacity-50">•</span>
                                <span>{property.bedrooms}B {property.bathrooms}B</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Background Decoration */}
            <div className="absolute -top-10 -right-10 opacity-[0.02] z-0 pointer-events-none text-rose-500">
                <Heart className="w-64 h-64" />
            </div>
        </div>
    );
}
