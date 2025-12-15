"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Loader2, Search, Filter } from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import PropertyCard from "@/components/listing/PropertyCard";
import Link from "next/link";

export default function PropertiesPage() {
    const searchParams = useSearchParams();
    const listingType = searchParams.get("listing_type") || "sale"; // Default to sale

    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProperties = async () => {
            setLoading(true);
            try {
                // Fetch all properties and filter client-side for now, 
                // or pass params if API supports it.
                // Assuming api.properties.list() takes no args or query params dict.
                const data = await api.properties.list();

                // Filter by listing_type
                // listingType in DB is likely 'sell' or 'rent'
                // URL param is 'sale' -> DB 'sell'
                const dbType = listingType === 'sale' ? 'sell' : listingType;

                const filtered = data.filter((p: any) =>
                    p.listing_type.toLowerCase() === dbType.toLowerCase() &&
                    p.status !== 'ARCHIVED'
                );

                setProperties(filtered);
            } catch (error) {
                console.error("Failed to fetch properties", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProperties();
    }, [listingType]);

    // Title mapping
    const titleMap: Record<string, string> = {
        'sale': 'Properties for Sale',
        'rent': 'Properties for Rent'
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{titleMap[listingType] || "Properties"}</h1>
                        <p className="text-gray-500">Discover your dream home from our curated list.</p>
                    </div>

                    <div className="flex gap-2">
                        <div className="bg-white p-1 rounded-lg border border-gray-200 flex text-sm font-medium">
                            <Link
                                href="/properties?listing_type=sale"
                                className={`px-4 py-2 rounded-md transition ${listingType === 'sale' ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                Buy
                            </Link>
                            <Link
                                href="/properties?listing_type=rent"
                                className={`px-4 py-2 rounded-md transition ${listingType === 'rent' ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                Rent
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-rose-500 mb-4" size={40} />
                        <p className="text-gray-500">Finding best matches...</p>
                    </div>
                ) : properties.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <Search size={24} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No properties found</h3>
                        <p className="text-gray-500">We couldn't find any properties matching "{listingType}".</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {properties.map((property) => (
                            <PropertyCard key={property.id} data={property} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
