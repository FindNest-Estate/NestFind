export interface Agent {
    id: string;
    name: string;
    email: string;
    latitude: number;
    longitude: number;
    service_radius_km: number;
    rating: number;
    completed_cases?: number;
    completed_transactions?: number;
    active_listings?: number;
    joined_date: string;
    distance_km?: number;
}
