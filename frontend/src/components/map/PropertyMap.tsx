'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

interface PropertyMapProps {
    latitude: number;
    longitude: number;
    title?: string;
}

export default function PropertyMap({ latitude, longitude, title }: PropertyMapProps) {
    // If no coordinates, don't render map or render placeholder
    if (!latitude || !longitude) {
        return (
            <div className="h-full w-full bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                Map unavailable
            </div>
        );
    }

    const position: L.LatLngExpression = [latitude, longitude];

    return (
        <MapContainer
            center={position}
            zoom={15}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%', borderRadius: '0.75rem', overflow: 'hidden' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={position}>
                {title && (
                    <Popup>
                        <span className="font-medium text-sm">{title}</span>
                    </Popup>
                )}
            </Marker>
        </MapContainer>
    );
}
