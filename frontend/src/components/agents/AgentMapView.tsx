"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import AgentCard from './AgentCard';
import { useRouter } from 'next/navigation';
// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in Next.js
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const customIcon = new L.Icon({
    iconUrl: iconUrl,
    iconRetinaUrl: iconRetinaUrl,
    shadowUrl: shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface AgentMapViewProps {
    agents: any[];
    userLocation?: { lat: number, lng: number } | null;
}

export default function AgentMapView({ agents, userLocation }: AgentMapViewProps) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    // Default center (San Francisco) if no user location
    const defaultCenter: [number, number] = [37.7749, -122.4194];
    const center: [number, number] = userLocation
        ? [userLocation.lat, userLocation.lng]
        : (agents.length > 0 && agents[0].latitude && agents[0].longitude
            ? [agents[0].latitude, agents[0].longitude]
            : defaultCenter);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="w-full h-[600px] bg-gray-100 rounded-3xl animate-pulse flex items-center justify-center text-gray-400">
                Loading Map...
            </div>
        );
    }

    return (
        <div className="w-full h-[600px] rounded-3xl overflow-hidden border border-gray-200 shadow-xl relative z-0">
            <MapContainer
                center={center}
                zoom={12}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                {agents.map((agent) => (
                    agent.latitude && agent.longitude && (
                        <Marker
                            key={agent.id}
                            position={[agent.latitude, agent.longitude]}
                            icon={customIcon}
                        >
                            <Popup className="agent-popup" minWidth={300}>
                                <div className="p-1">
                                    <AgentCard
                                        agent={agent}
                                        variant="map"
                                        onSelect={() => router.push(`/find-agent/${agent.id}`)}
                                    />
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}
            </MapContainer>
        </div>
    );
}
