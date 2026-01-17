'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { Agent } from '@/types/agent';
import { Star, MapPin, Briefcase, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface AgentSearchMapProps {
    agents: Agent[];
    center: [number, number];
    radiusKm: number;
}

// Custom agent marker icon (like Uber/Rapido style)
const createAgentIcon = (rating: number) => {
    const isTopRated = rating >= 4.5;
    const color = isTopRated ? '#10B981' : '#FF385C'; // Green for top rated, Red for others

    return L.divIcon({
        className: 'custom-agent-marker',
        html: `
            <div style="
                position: relative;
                width: 44px;
                height: 44px;
            ">
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 44px;
                    height: 44px;
                    background: ${color};
                    border-radius: 50%;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 3px solid white;
                    animation: pulse 2s infinite;
                ">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>
                <div style="
                    position: absolute;
                    bottom: -4px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 8px solid transparent;
                    border-right: 8px solid transparent;
                    border-top: 10px solid ${color};
                "></div>
                ${isTopRated ? `
                    <div style="
                        position: absolute;
                        top: -8px;
                        right: -8px;
                        background: #FBBF24;
                        border-radius: 50%;
                        width: 20px;
                        height: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border: 2px solid white;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    ">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                    </div>
                ` : ''}
            </div>
        `,
        iconSize: [44, 54],
        iconAnchor: [22, 54],
        popupAnchor: [0, -54],
    });
};

// User location marker
const userLocationIcon = L.divIcon({
    className: 'user-location-marker',
    html: `
        <div style="
            width: 24px;
            height: 24px;
            background: #3B82F6;
            border-radius: 50%;
            border: 4px solid white;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(0,0,0,0.3);
        "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

function MapUpdater({ center, radiusKm }: { center: [number, number]; radiusKm: number }) {
    const map = useMap();

    useEffect(() => {
        // Calculate appropriate zoom based on radius
        let zoom = 12;
        if (radiusKm <= 25) zoom = 11;
        else if (radiusKm <= 50) zoom = 10;
        else if (radiusKm <= 100) zoom = 9;
        else if (radiusKm <= 200) zoom = 8;
        else zoom = 7;

        map.setView(center, zoom);
    }, [center, radiusKm, map]);

    return null;
}

export default function AgentSearchMap({ agents, center, radiusKm }: AgentSearchMapProps) {
    // Add custom CSS for animations
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
                50% { box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
                100% { box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
            }
            .custom-agent-marker {
                background: transparent !important;
                border: none !important;
            }
            .user-location-marker {
                background: transparent !important;
                border: none !important;
            }
            .leaflet-popup-content-wrapper {
                border-radius: 12px !important;
                padding: 0 !important;
                overflow: hidden;
            }
            .leaflet-popup-content {
                margin: 0 !important;
                min-width: 240px;
            }
            .leaflet-popup-tip {
                background: white !important;
            }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    return (
        <div className="h-full w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm z-0 relative">
            <MapContainer
                center={center}
                zoom={10}
                scrollWheelZoom={true}
                className="h-full w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapUpdater center={center} radiusKm={radiusKm} />

                {/* Search Radius Circle */}
                <Circle
                    center={center}
                    radius={radiusKm * 1000}
                    pathOptions={{
                        color: '#FF385C',
                        fillColor: '#FF385C',
                        fillOpacity: 0.05,
                        weight: 2,
                        dashArray: '8, 8',
                    }}
                />

                {/* User Location Marker */}
                <Marker position={center} icon={userLocationIcon}>
                    <Popup>
                        <div className="p-3 text-center">
                            <p className="font-medium text-gray-900">Your Location</p>
                            <p className="text-sm text-gray-500">Searching within {radiusKm} km</p>
                        </div>
                    </Popup>
                </Marker>

                {/* Agent Markers */}
                {agents.map((agent) => (
                    <Marker
                        key={agent.id}
                        position={[agent.latitude, agent.longitude]}
                        icon={createAgentIcon(agent.rating)}
                    >
                        <Popup>
                            <div className="min-w-[240px]">
                                {/* Header */}
                                <div className={`p-4 ${agent.rating >= 4.5 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-[#FF385C] to-pink-500'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold">
                                            {agent.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-lg">{agent.name}</h3>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Star className="h-3.5 w-3.5 text-yellow-300 fill-yellow-300" />
                                                <span className="text-white/90 text-sm font-medium">{agent.rating.toFixed(1)}</span>
                                                {agent.rating >= 4.5 && (
                                                    <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded text-white">Top Rated</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="p-4 space-y-2">
                                    <div className="flex items-center text-sm text-gray-600">
                                        <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                                        <span>Serves {agent.service_radius_km} km area</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Briefcase className="h-4 w-4 text-gray-400 mr-2" />
                                        <span>{agent.completed_transactions || agent.completed_cases || 0} deals completed</span>
                                    </div>
                                    {agent.distance_km != null && (
                                        <div className="flex items-center text-sm font-medium text-[#FF385C]">
                                            <span>{agent.distance_km.toFixed(1)} km from you</span>
                                        </div>
                                    )}
                                </div>

                                {/* CTA */}
                                <div className="px-4 pb-4">
                                    <Link
                                        href={`/agents/${agent.id}`}
                                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                                    >
                                        View Full Profile
                                        <ChevronRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[1000]">
                <p className="text-xs font-medium text-gray-700 mb-2">Legend</p>
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="w-4 h-4 rounded-full bg-[#FF385C]"></div>
                        <span>Agent</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
                        <span>Top Rated (4.5+)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                        <span>Your Location</span>
                    </div>
                </div>
            </div>

            {/* Agent Count Badge */}
            {agents.length > 0 && (
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-full shadow-lg px-4 py-2 z-[1000]">
                    <span className="text-sm font-semibold text-gray-900">{agents.length} agents nearby</span>
                </div>
            )}
        </div>
    );
}
