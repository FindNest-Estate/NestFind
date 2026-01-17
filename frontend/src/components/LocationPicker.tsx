'use client';

/**
 * Location Picker Component
 * 
 * Map-based location selector using Leaflet/OpenStreetMap.
 * Click to select location, displays coordinates.
 * 
 * Note: Must be dynamically imported to avoid SSR issues with Leaflet.
 */

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the map to avoid SSR issues
const MapWithNoSSR = dynamic(() => import('./LocationPickerMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center">
            <div className="text-gray-500 text-sm">Loading map...</div>
        </div>
    ),
});

// Location data returned from reverse geocoding
export interface LocationData {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
}

interface LocationPickerProps {
    onLocationSelect: (lat: number, lng: number, locationData?: LocationData) => void;
    initialLat?: number;
    initialLng?: number;
    disabled?: boolean;
    showCurrentLocationButton?: boolean;
}

export default function LocationPicker({
    onLocationSelect,
    initialLat,
    initialLng,
    disabled = false,
    showCurrentLocationButton = false,
}: LocationPickerProps) {
    const [selectedLocation, setSelectedLocation] = useState<{
        lat: number;
        lng: number;
    } | null>(
        initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
    );
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [locationError, setLocationError] = useState('');

    const handleMapClick = (lat: number, lng: number) => {
        if (disabled) return;
        setSelectedLocation({ lat, lng });
        onLocationSelect(lat, lng);
        setLocationError('');
    };

    // Reverse geocoding using OpenStreetMap Nominatim
    const reverseGeocode = async (lat: number, lng: number): Promise<LocationData> => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
                { headers: { 'User-Agent': 'NestFind/1.0' } }
            );
            const data = await response.json();
            const addr = data.address || {};

            // Log full response for debugging
            console.log('[LocationPicker] Full Nominatim address object:', JSON.stringify(addr, null, 2));

            // Extract fields with comprehensive fallbacks for Indian addresses
            // Nominatim uses different field names depending on location type
            const extractedCity = addr.city || addr.town || addr.village || addr.suburb || addr.county || addr.state_district || addr.municipality;
            const extractedState = addr.state || addr['ISO3166-2-lvl4']?.split('-')[1] || addr.region || addr.province;
            const extractedPincode = addr.postcode || addr.postal_code || addr.pincode;

            const locationData = {
                address: data.display_name,
                city: extractedCity,
                state: extractedState,
                pincode: extractedPincode
            };

            console.log('[LocationPicker] Extracted:', { city: extractedCity, state: extractedState, pincode: extractedPincode });
            return locationData;
        } catch (error) {
            console.error('Reverse geocoding failed:', error);
            return {};
        }
    };

    const handleUseCurrentLocation = async () => {
        if (disabled || !navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser');
            return;
        }

        setIsGettingLocation(true);
        setLocationError('');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setSelectedLocation({ lat: latitude, lng: longitude });

                // Reverse geocode to get address details
                const locationData = await reverseGeocode(latitude, longitude);
                onLocationSelect(latitude, longitude, locationData);
                setIsGettingLocation(false);
            },
            (error) => {
                setIsGettingLocation(false);
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setLocationError('Location permission denied');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setLocationError('Location unavailable');
                        break;
                    case error.TIMEOUT:
                        setLocationError('Location request timed out');
                        break;
                    default:
                        setLocationError('Unable to get location');
                }
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    return (
        <div className="space-y-2">
            {/* Use Current Location Button - Only shown for agents */}
            {showCurrentLocationButton && (
                <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={disabled || isGettingLocation}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#FF385C] bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGettingLocation ? (
                        <>
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                            <span>Getting location...</span>
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                            </svg>
                            <span>Use Current Location</span>
                        </>
                    )}
                </button>
            )}

            {locationError && (
                <p className="text-sm text-red-500">{locationError}</p>
            )}

            <div className={`rounded-xl overflow-hidden border-2 ${selectedLocation ? 'border-green-300' : 'border-gray-200'
                } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <MapWithNoSSR
                    selectedLocation={selectedLocation}
                    onMapClick={handleMapClick}
                />
            </div>

            {selectedLocation ? (
                <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    <span>Location selected: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</span>
                </div>
            ) : (
                <p className="text-sm text-gray-500">
                    Click on the map to select your location
                </p>
            )}
        </div>
    );
}

