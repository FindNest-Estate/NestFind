'use client';

import { useState, useEffect } from 'react';
import { getSavedProperties, SavedProperty } from '@/lib/propertiesApi';
import Link from 'next/link';
import { Heart, ChevronRight, Loader2 } from 'lucide-react';
import PropertyCard from '@/components/PropertyCard';
import { PropertyCard as IPropertyCard } from '@/lib/api/public';

// Adapter to convert SavedProperty to IPropertyCard for component compatibility
function toPropertyCard(saved: SavedProperty): IPropertyCard {
    return {
        id: saved.id,
        title: saved.title,
        type: saved.type,
        price: saved.price,
        city: saved.city,
        state: saved.state,
        bedrooms: saved.bedrooms,
        bathrooms: saved.bathrooms,
        area_sqft: saved.area_sqft,
        thumbnail_url: saved.thumbnail_url,
        latitude: null,
        longitude: null,
        agent_name: null,
        created_at: saved.saved_at
    };
}

export default function SavedPropertiesPage() {
    const [properties, setProperties] = useState<SavedProperty[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadProperties();
    }, []);

    const loadProperties = async () => {
        try {
            const data = await getSavedProperties();
            setProperties(data.properties);
            setError(null);
        } catch (err) {
            console.error(err);
            setError('Failed to load saved properties. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleSave = (id: string, newState: boolean) => {
        if (!newState) {
            // Remove from list if unsaved
            setProperties(prev => prev.filter(p => p.id !== id));
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen pt-24 pb-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Saved Properties</h1>
                    <Link href="/properties" className="text-[#FF385C] font-medium hover:underline flex items-center">
                        Browse More <ChevronRight className="h-4 w-4" />
                    </Link>
                </div>

                {error ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-red-100">
                        <p className="text-red-500 mb-4">{error}</p>
                        <button onClick={() => window.location.reload()} className="text-gray-900 underline">
                            Retry
                        </button>
                    </div>
                ) : properties.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">No saved properties yet</h2>
                        <p className="text-gray-500 mb-6">
                            Start exploring and save your favorite listings to track them here.
                        </p>
                        <Link
                            href="/properties"
                            className="inline-block px-6 py-3 bg-[#FF385C] text-white rounded-xl font-medium hover:bg-[#D93250] transition-colors"
                        >
                            Browse Listings
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {properties.map((property) => (
                            <PropertyCard
                                key={property.id}
                                property={toPropertyCard(property)}
                                initialIsSaved={true}
                                onToggleSave={(state) => handleToggleSave(property.id, state)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
