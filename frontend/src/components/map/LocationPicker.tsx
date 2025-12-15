'use client';

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Search, Loader2, Crosshair } from 'lucide-react';
import L from 'leaflet';
import { toast } from 'sonner';

interface LocationPickerProps {
    initialLat?: number;
    initialLng?: number;
    onLocationSelect: (lat: number, lng: number, address?: string) => void;
}

// Component to handle map clicks and updates
function LocationMarker({ position, setPosition, onLocationSelect }: any) {
    const map = useMap();

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    useMapEvents({
        click(e) {
            setPosition(e.latlng);
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });

    return position === null ? null : (
        <Marker
            position={position}
            draggable={true}
            eventHandlers={{
                dragend: (e) => {
                    const marker = e.target;
                    const newPos = marker.getLatLng();
                    setPosition(newPos);
                    onLocationSelect(newPos.lat, newPos.lng);
                }
            }}
        />
    );
}

export default function LocationPicker({ initialLat, initialLng, onLocationSelect }: LocationPickerProps) {
    const [position, setPosition] = useState<L.LatLng | null>(
        initialLat && initialLng ? new L.LatLng(initialLat, initialLng) : null
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isLocating, setIsLocating] = useState(false);

    // Use current location via Geolocation API
    const useCurrentLocation = async () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser.");
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (geoPosition) => {
                const lat = geoPosition.coords.latitude;
                const lng = geoPosition.coords.longitude;
                const newPos = new L.LatLng(lat, lng);

                setPosition(newPos);

                // Reverse geocode to get address
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
                    );
                    const data = await response.json();
                    if (data.display_name) {
                        setSearchQuery(data.display_name);
                        onLocationSelect(lat, lng, data.display_name);
                    } else {
                        onLocationSelect(lat, lng);
                    }
                    toast.success("Location detected successfully!");
                } catch (error) {
                    console.error("Reverse geocoding error:", error);
                    onLocationSelect(lat, lng);
                    toast.success("Location detected!");
                }
                setIsLocating(false);
            },
            (error) => {
                setIsLocating(false);
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        toast.error("Location permission denied. Please enable location access.");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        toast.error("Location information is unavailable.");
                        break;
                    case error.TIMEOUT:
                        toast.error("Location request timed out.");
                        break;
                    default:
                        toast.error("An error occurred while getting your location.");
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    // Debounce search
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length > 3) {
                setIsSearching(true);
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
                    );
                    const data = await response.json();
                    setSearchResults(data);
                } catch (error) {
                    console.error("Geocoding error:", error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 1000);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleSelectResult = (result: any) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        const newPos = new L.LatLng(lat, lon);

        setPosition(newPos);
        onLocationSelect(lat, lon, result.display_name);
        setSearchQuery(result.display_name); // Update input but don't trigger search again immediately if we could avoid it
        setSearchResults([]); // Clear results
    };

    return (
        <div className="space-y-4">
            <div className="relative">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search address, city, or landmark..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                        />
                        {isSearching && (
                            <div className="absolute right-3 top-3">
                                <Loader2 className="animate-spin text-gray-400" size={20} />
                            </div>
                        )}
                    </div>
                    {/* Use Current Location Button */}
                    <button
                        type="button"
                        onClick={useCurrentLocation}
                        disabled={isLocating}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium transition disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
                        title="Use Current Location"
                    >
                        {isLocating ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            <Crosshair size={18} />
                        )}
                        <span className="hidden sm:inline">Use Current Location</span>
                    </button>
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                    <div className="absolute z-[1000] w-full bg-white mt-1 rounded-lg shadow-xl border max-h-60 overflow-y-auto">
                        {searchResults.map((result, index) => (
                            <button
                                key={index}
                                onClick={() => handleSelectResult(result)}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 text-sm"
                            >
                                {result.display_name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="h-[400px] w-full rounded-xl overflow-hidden border-2 border-gray-100 shadow-inner relative z-0">
                <MapContainer
                    center={position || [20.5937, 78.9629]} // Default to India center
                    zoom={position ? 15 : 5}
                    scrollWheelZoom={true}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker
                        position={position}
                        setPosition={setPosition}
                        onLocationSelect={onLocationSelect}
                    />
                </MapContainer>

                {!position && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 px-4 py-2 rounded-full shadow-lg text-sm font-medium text-gray-600 z-[400]">
                        Click on map or search to pin location
                    </div>
                )}
            </div>

            <div className="text-xs text-gray-500 text-center">
                Drag the marker to pinpoint the exact entrance or location.
            </div>
        </div>
    );
}
