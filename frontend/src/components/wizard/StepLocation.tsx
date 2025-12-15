import { useFormContext } from "react-hook-form";
import dynamic from 'next/dynamic';

// Dynamically import MapProvider to avoid SSR issues with Leaflet
const MapProvider = dynamic(() => import('../map/MapProvider'), {
    ssr: false
});

const LocationPicker = dynamic(() => import('../map/LocationPicker'), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full bg-gray-100 animate-pulse rounded-xl" />
});

export default function StepLocation() {
    const { register, setValue, watch } = useFormContext();
    const address = watch('address');
    const city = watch('city');
    const latitude = watch('latitude');
    const longitude = watch('longitude');

    const handleLocationSelect = (lat: number, lng: number, displayAddress?: string) => {
        setValue('latitude', lat);
        setValue('longitude', lng);

        // Optional: Auto-fill address if provided by map and fields are empty
        if (displayAddress) {
            if (!address) setValue('address', displayAddress.split(',')[0]);
            if (!city) {
                const parts = displayAddress.split(',');
                if (parts.length > 2) setValue('city', parts[parts.length - 3].trim());
            }
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Where is it located?</h2>
                <p className="text-gray-500">Help buyers find your property easily.</p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Street Address</label>
                    <input
                        {...register("address")}
                        type="text"
                        placeholder="e.g. 123 Main St, Sector 45"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900">City</label>
                        <input
                            {...register("city")}
                            type="text"
                            placeholder="e.g. Hyderabad"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900">State</label>
                        <input
                            {...register("state")}
                            type="text"
                            placeholder="e.g. Telangana"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                        />
                    </div>
                </div>
            </div>

            {/* Map Location Picker */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Pinpoint Location on Map</label>
                <MapProvider>
                    <LocationPicker
                        initialLat={latitude}
                        initialLng={longitude}
                        onLocationSelect={handleLocationSelect}
                    />
                </MapProvider>
            </div>
        </div>
    );
}
