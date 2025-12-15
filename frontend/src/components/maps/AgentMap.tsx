"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

// Fix for default marker icon missing in Leaflet with Next.js
const icon = L.icon({
    iconUrl: "/images/marker-icon.png",
    shadowUrl: "/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Custom marker for selected agent
const selectedIcon = L.icon({
    iconUrl: "/images/marker-icon-red.png", // Assuming you have a red marker or use CSS filter
    shadowUrl: "/images/marker-shadow.png",
    iconSize: [30, 46],
    iconAnchor: [15, 46],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to update map center when props change
function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
}

interface AgentMapProps {
    center: [number, number];
    zoom: number;
    agents: any[];
    selectedAgent: any | null;
    onSelectAgent: (agent: any) => void;
}

export default function AgentMap({ center, zoom, agents, selectedAgent, onSelectAgent }: AgentMapProps) {
    return (
        <MapContainer
            center={center}
            zoom={zoom}
            style={{ height: "100%", width: "100%", zIndex: 0 }}
            scrollWheelZoom={true}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={center} />

            {/* User Location Marker */}
            <Marker position={center} icon={icon}>
                <Popup>You are here</Popup>
            </Marker>

            {/* Agent Markers */}
            {agents.filter((agent) => agent.latitude != null && agent.longitude != null).map((agent) => (
                <Marker
                    key={agent.id}
                    position={[agent.latitude, agent.longitude]}
                    icon={selectedAgent?.id === agent.id ? selectedIcon : icon}
                    eventHandlers={{
                        click: () => onSelectAgent(agent),
                    }}
                >
                    <Popup>
                        <div className="font-bold">{agent.first_name} {agent.last_name}</div>
                        <div className="text-xs text-gray-500">{agent.agency_name}</div>
                        <div className="text-xs mt-1">
                            Rate: {agent.commission_rate}%
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
