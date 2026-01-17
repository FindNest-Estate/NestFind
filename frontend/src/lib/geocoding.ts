/**
 * Geocoding API utilities using OpenStreetMap Nominatim (free, no API key required)
 */

export interface GeocodingResult {
    lat: number;
    lng: number;
    displayName: string;
    type: string;
}

/**
 * Search for a location by name and return coordinates
 */
export async function geocodeAddress(query: string): Promise<GeocodingResult | null> {
    if (!query.trim()) return null;

    try {
        // Use Nominatim API (OpenStreetMap) - free and no API key required
        // Add country code bias for India for better results
        const params = new URLSearchParams({
            q: query,
            format: 'json',
            limit: '1',
            countrycodes: 'in', // Bias towards India
        });

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?${params}`,
            {
                headers: {
                    'User-Agent': 'NestFind/1.0 (real-estate-app)',
                    'Accept-Language': 'en',
                },
            }
        );

        if (!response.ok) {
            console.error('Geocoding API error:', response.status);
            return null;
        }

        const data = await response.json();

        if (data.length === 0) {
            return null;
        }

        const result = data[0];
        return {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            displayName: result.display_name,
            type: result.type,
        };
    } catch (error) {
        console.error('Geocoding failed:', error);
        return null;
    }
}

/**
 * Search for multiple location suggestions (for autocomplete)
 */
export async function searchLocations(query: string): Promise<GeocodingResult[]> {
    if (!query.trim() || query.length < 3) return [];

    try {
        const params = new URLSearchParams({
            q: query,
            format: 'json',
            limit: '5',
            countrycodes: 'in',
        });

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?${params}`,
            {
                headers: {
                    'User-Agent': 'NestFind/1.0 (real-estate-app)',
                    'Accept-Language': 'en',
                },
            }
        );

        if (!response.ok) return [];

        const data = await response.json();

        return data.map((result: any) => ({
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            displayName: result.display_name,
            type: result.type,
        }));
    } catch (error) {
        console.error('Location search failed:', error);
        return [];
    }
}

/**
 * Reverse geocode coordinates to get location name
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
        const params = new URLSearchParams({
            lat: lat.toString(),
            lon: lng.toString(),
            format: 'json',
        });

        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?${params}`,
            {
                headers: {
                    'User-Agent': 'NestFind/1.0 (real-estate-app)',
                    'Accept-Language': 'en',
                },
            }
        );

        if (!response.ok) return null;

        const data = await response.json();

        // Return a simplified location name
        const address = data.address;
        if (address) {
            const parts = [
                address.suburb || address.neighbourhood,
                address.city || address.town || address.village,
                address.state,
            ].filter(Boolean);
            return parts.join(', ');
        }

        return data.display_name?.split(',').slice(0, 3).join(',') || null;
    } catch (error) {
        console.error('Reverse geocoding failed:', error);
        return null;
    }
}
