'use client';

/**
 * LocationPickerMap - The actual Leaflet map component
 * 
 * Separated from LocationPicker to be dynamically imported without SSR.
 * Uses a unique container ID to avoid React 18 StrictMode issues.
 */

import { useEffect, useRef, useId } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet with webpack/Next.js
const customIcon = new Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

interface LocationPickerMapProps {
    selectedLocation: { lat: number; lng: number } | null;
    onMapClick: (lat: number, lng: number) => void;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click: (e) => {
            onMapClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

// Component to recenter map when location changes
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], 13);
    }, [lat, lng, map]);
    return null;
}

export default function LocationPickerMap({
    selectedLocation,
    onMapClick,
}: LocationPickerMapProps) {
    // Default center: India (approximate center)
    const defaultCenter: [number, number] = [20.5937, 78.9629];
    const defaultZoom = 5;

    // Use a unique ID for this instance to prevent container reuse
    const mapId = useId();
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={containerRef}
            id={`map-container-${mapId}`}
            className="w-full h-64 rounded-xl overflow-hidden"
        >
            <MapContainer
                center={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : defaultCenter}
                zoom={selectedLocation ? 13 : defaultZoom}
                className="w-full h-full"
                style={{ zIndex: 1 }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler onMapClick={onMapClick} />
                {selectedLocation && (
                    <>
                        <MapRecenter lat={selectedLocation.lat} lng={selectedLocation.lng} />
                        <Marker
                            position={[selectedLocation.lat, selectedLocation.lng]}
                            icon={customIcon}
                        />
                    </>
                )}
            </MapContainer>
        </div>
    );
}
