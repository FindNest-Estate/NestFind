'use client';

import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

export default function MapProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Fix for default marker icon missing in Leaflet + Next.js
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl;
        // @ts-ignore
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
    }, []);

    return <>{children}</>;
}
