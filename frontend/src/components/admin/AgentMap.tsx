'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const fixLeafletIcons = () => {
    // Only run on client
    if (typeof window === 'undefined') return;

    // @ts-expect-error - Deleting internal Leaflet property for icon configuration
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
};

interface AgentMapProps {
    lat: number;
    lng: number;
    radiusKm: number;
    agentName: string;
}

export default function AgentMap({ lat, lng, radiusKm, agentName }: AgentMapProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        fixLeafletIcons();
        // Defer state update to avoid synchronous setState in effect
        const timer = setTimeout(() => setIsClient(true), 0);
        return () => clearTimeout(timer);
    }, []);

    if (!isClient) {
        return <div className="h-96 w-full bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">Loading Map...</div>;
    }

    // Unique key forces remount when coordinates change, avoiding some Leaflet state issues
    const mapKey = `map-${lat}-${lng}`;

    return (
        <div className="h-96 w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm z-0 relative">
            <MapContainer
                key={mapKey}
                center={[lat, lng]}
                zoom={10}
                scrollWheelZoom={false}
                className="h-full w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Marker position={[lat, lng]}>
                    <Popup>
                        <div className="text-center font-semibold">
                            {agentName}
                            <div className="text-xs font-normal text-gray-500">Service Area Center</div>
                        </div>
                    </Popup>
                </Marker>

                <Circle
                    center={[lat, lng]}
                    radius={radiusKm * 1000}
                    pathOptions={{
                        color: '#10b981',
                        fillColor: '#10b981',
                        fillOpacity: 0.1
                    }}
                >
                    <Popup>
                        Service Radius: {radiusKm} km
                    </Popup>
                </Circle>
            </MapContainer>
        </div>
    );
}
