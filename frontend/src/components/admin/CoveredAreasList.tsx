'use client';

import React, { useEffect, useState } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { getAgentCoverage } from '@/lib/api/admin';

interface CoveredAreasListProps {
    lat: number;
    lng: number;
    radiusKm: number;
}

interface Place {
    name: string;
    type: string;
    distance?: number;
}

export default function CoveredAreasList({ lat, lng, radiusKm }: CoveredAreasListProps) {
    const [places, setPlaces] = useState<Place[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchPlaces = async () => {
            setLoading(true);
            setError(null);

            try {
                // Overpass API Query
                // Find nodes with place=city|town|village within radius
                const radiusMeters = radiusKm * 1000;
                const query = `
                    [out:json][timeout:25];
                    (
                      node["place"~"city|town|village"](around:${radiusMeters},${lat},${lng});
                    );
                    out body;
                    >;
                    out skel qt;
                `;

                const response = await fetch('https://overpass-api.de/api/interpreter', {
                    method: 'POST',
                    body: query
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch location data');
                }

                const data = await response.json();

                if (isMounted) {
                    const foundPlaces: Place[] = data.elements
                        .filter((el: any) => el.tags && el.tags.name)
                        .map((el: any) => ({
                            name: el.tags.name,
                            type: el.tags.place,
                            // Verify distance just in case
                            // dist: ... (optional)
                        }))
                        .sort((a: Place, b: Place) => {
                            // Sort priority: City > Town > Village
                            const priority: Record<string, number> = { city: 1, town: 2, village: 3 };
                            return (priority[a.type] || 4) - (priority[b.type] || 4);
                        });

                    setPlaces(foundPlaces);
                }
            } catch (err) {
                console.error(err);
                if (isMounted) {
                    setError('Could not load covered areas list.');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchPlaces();

        return () => {
            isMounted = false;
        };
    }, [lat, lng, radiusKm]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span>Identifying covered locations...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center text-red-500 p-4 bg-red-50 rounded-lg">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error}
            </div>
        );
    }

    if (places.length === 0) {
        return <div className="p-4 text-gray-500 italic">No major settlements found within this radius.</div>;
    }

    // Group by type
    const cities = places.filter(p => p.type === 'city');
    const towns = places.filter(p => p.type === 'town');
    const villages = places.filter(p => p.type === 'village');

    return (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {cities.length > 0 && (
                <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 sticky top-0 bg-white py-1">Cities ({cities.length})</h4>
                    <div className="flex flex-wrap gap-2">
                        {cities.map((place, i) => (
                            <span key={`city-${i}`} className="px-2 py-1 bg-emerald-50 text-emerald-700 text-sm rounded border border-emerald-100">
                                {place.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {towns.length > 0 && (
                <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 sticky top-0 bg-white py-1">Towns ({towns.length})</h4>
                    <div className="flex flex-wrap gap-2">
                        {towns.map((place, i) => (
                            <span key={`town-${i}`} className="px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded border border-blue-100">
                                {place.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {villages.length > 0 && (
                <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 sticky top-0 bg-white py-1">Villages ({villages.length})</h4>
                    <div className="flex flex-wrap gap-2">
                        {villages.map((place, i) => (
                            <span key={`village-${i}`} className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded border border-gray-100">
                                {place.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="text-xs text-gray-400 pt-2 border-t mt-4">
                Data provided by OpenStreetMap. List serves as an assignment guide.
            </div>
        </div>
    );
}
