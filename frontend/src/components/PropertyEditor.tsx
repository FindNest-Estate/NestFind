'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
    ArrowLeft, ArrowRight, Send, Trash2, Loader2, Save,
    Home, Building2, Trees, Briefcase,
    MapPin, DollarSign, Camera, FileText,
    CheckSquare, Users, Star, Check
} from 'lucide-react';
import PropertyProgress from '@/components/PropertyProgress';
import {
    getProperty,
    updateProperty,
    deleteProperty,
    hireAgent
} from '@/lib/api/seller';
import {
    PropertyDetail, PropertyType, PropertySubType,
    UpdatePropertyRequest,
    FurnishingStatus, FacingDirection, OwnershipType, AvailabilityStatus, LandType
} from '@/lib/types/property';
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
    ssr: false,
    loading: () => (
        <div className="h-72 rounded-xl border border-gray-200 bg-gray-50 animate-pulse" />
    ),
});

const MediaUpload = dynamic(() => import('@/components/MediaUpload'), {
    ssr: false,
    loading: () => (
        <div className="rounded-xl border border-gray-200 p-6 text-sm text-gray-500">
            Loading media tools...
        </div>
    ),
});

// ─────────────────────────────────────────────
// STEP DEFINITIONS
// ─────────────────────────────────────────────
const STEPS = [
    { id: 1, key: 'type', label: 'Property Type', icon: Home },
    { id: 2, key: 'location', label: 'Location', icon: MapPin },
    { id: 3, key: 'details', label: 'Property Details', icon: Building2 },
    { id: 4, key: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 5, key: 'photos', label: 'Photos & Video', icon: Camera },
    { id: 6, key: 'description', label: 'Description', icon: FileText },
    { id: 7, key: 'amenities', label: 'Amenities', icon: CheckSquare },
    { id: 8, key: 'ownership', label: 'Ownership', icon: Users },
    { id: 9, key: 'review', label: 'Review & Submit', icon: Star },
];

// ─────────────────────────────────────────────
// AMENITY OPTIONS
// ─────────────────────────────────────────────
const AMENITY_OPTIONS = [
    { key: 'PARKING', label: 'Parking', icon: '🚗' },
    { key: 'LIFT', label: 'Lift / Elevator', icon: '🛗' },
    { key: 'SECURITY', label: '24/7 Security', icon: '🔒' },
    { key: 'SWIMMING_POOL', label: 'Swimming Pool', icon: '🏊' },
    { key: 'GYM', label: 'Gym / Fitness', icon: '🏋️' },
    { key: 'POWER_BACKUP', label: 'Power Backup', icon: '⚡' },
    { key: 'PLAY_AREA', label: "Children's Play Area", icon: '🛝' },
    { key: 'CLUB_HOUSE', label: 'Club House', icon: '🏠' },
    { key: 'INTERNET', label: 'Internet / WiFi', icon: '📶' },
    { key: 'CCTV', label: 'CCTV Cameras', icon: '📹' },
    { key: 'GARDEN', label: 'Garden / Park', icon: '🌳' },
    { key: 'RAIN_HARVEST', label: 'Rain Water Harvesting', icon: '💧' },
    { key: 'SOLAR', label: 'Solar Panels', icon: '☀️' },
    { key: 'VISITOR_PARKING', 'label': 'Visitor Parking', icon: '🅿️' },
    { key: 'INTERCOM', label: 'Intercom', icon: '📞' },
    { key: 'MAINTENANCE', label: 'Maintenance Staff', icon: '🔧' },
];

// Sub-type options per property type
const SUB_TYPES: Record<string, { value: PropertySubType; label: string }[]> = {
    APARTMENT: [
        { value: PropertySubType.FLAT, label: 'Flat / Apartment' },
        { value: PropertySubType.STUDIO, label: 'Studio' },
        { value: PropertySubType.PENTHOUSE, label: 'Penthouse' },
        { value: PropertySubType.DUPLEX, label: 'Duplex' },
    ],
    HOUSE: [
        { value: PropertySubType.INDEPENDENT_HOUSE, label: 'Independent House' },
        { value: PropertySubType.VILLA, label: 'Villa' },
        { value: PropertySubType.BUNGALOW, label: 'Bungalow' },
        { value: PropertySubType.ROW_HOUSE, label: 'Row House' },
    ],
    LAND: [
        { value: PropertySubType.PLOT, label: 'Plot / Residential Land' },
        { value: PropertySubType.FARMLAND, label: 'Farmland' },
        { value: PropertySubType.PLANTATION, label: 'Plantation Land' },
        { value: PropertySubType.INDUSTRIAL_PLOT, label: 'Industrial Plot' },
    ],
    COMMERCIAL: [
        { value: PropertySubType.OFFICE, label: 'Office Space' },
        { value: PropertySubType.SHOP, label: 'Shop / Retail' },
        { value: PropertySubType.WAREHOUSE, label: 'Warehouse' },
        { value: PropertySubType.CO_WORKING, label: 'Co-Working Space' },
    ],
};

const PROPERTY_CATEGORIES = [
    { type: PropertyType.APARTMENT, label: 'Apartment / Flat', icon: Building2, color: 'blue', desc: 'Flats, studios, duplexes in multi-storey buildings' },
    { type: PropertyType.HOUSE, label: 'House / Villa', icon: Home, color: 'emerald', desc: 'Independent houses, villas, bungalows' },
    { type: PropertyType.LAND, label: 'Plot / Land', icon: Trees, color: 'amber', desc: 'Plots, farmland, agricultural and industrial land' },
    { type: PropertyType.COMMERCIAL, label: 'Commercial Space', icon: Briefcase, color: 'purple', desc: 'Offices, shops, warehouses, co-working spaces' },
];

const PROPERTY_CACHE_TTL_MS = 30_000;
const propertyCache = new Map<string, { data: PropertyDetail; ts: number }>();
const inflightPropertyRequests = new Map<string, Promise<PropertyDetail>>();

function toLocalValues(data: PropertyDetail): Record<string, any> {
    return {
        title: data.title || '',
        description: data.description || '',
        type: data.type || '',
        property_sub_type: data.property_sub_type || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        bedrooms: data.bedrooms ?? '',
        bathrooms: data.bathrooms ?? '',
        area_sqft: data.area_sqft ?? '',
        floor_number: data.floor_number ?? '',
        total_floors: data.total_floors ?? '',
        balconies: data.balconies ?? '',
        furnishing_status: data.furnishing_status || '',
        facing_direction: data.facing_direction || '',
        parking_available: data.parking_available ?? false,
        parking_count: data.parking_count ?? '',
        road_access: data.road_access ?? false,
        land_type: data.land_type || '',
        price: data.price ?? '',
        price_negotiable: data.price_negotiable ?? true,
        maintenance_charges: data.maintenance_charges ?? '',
        listing_type: data.listing_type || 'SALE',
        availability_status: data.availability_status || '',
        property_age_years: data.property_age_years ?? '',
        ownership_type: data.ownership_type || '',
        amenities: data.amenities || [],
    };
}

function setCachedProperty(propertyId: string, data: PropertyDetail) {
    const payload = { data, ts: Date.now() };
    propertyCache.set(propertyId, payload);

    if (typeof window !== 'undefined') {
        try {
            sessionStorage.setItem(`property_editor:${propertyId}`, JSON.stringify(payload));
        } catch {
            // Ignore session storage failures.
        }
    }
}

function getCachedProperty(propertyId: string): PropertyDetail | null {
    const now = Date.now();
    const memory = propertyCache.get(propertyId);
    if (memory && now - memory.ts < PROPERTY_CACHE_TTL_MS) {
        return memory.data;
    }

    if (typeof window === 'undefined') return null;

    try {
        const raw = sessionStorage.getItem(`property_editor:${propertyId}`);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as { data: PropertyDetail; ts: number };
        if (now - parsed.ts >= PROPERTY_CACHE_TTL_MS) {
            return null;
        }

        propertyCache.set(propertyId, parsed);
        return parsed.data;
    } catch {
        return null;
    }
}

async function getPropertyFast(propertyId: string, forceFresh = false): Promise<PropertyDetail> {
    if (!forceFresh) {
        const cached = getCachedProperty(propertyId);
        if (cached) return cached;
    }

    const inflight = inflightPropertyRequests.get(propertyId);
    if (inflight) return inflight;

    const request = getProperty(propertyId)
        .then((data) => {
            setCachedProperty(propertyId, data);
            return data;
        })
        .finally(() => {
            inflightPropertyRequests.delete(propertyId);
        });

    inflightPropertyRequests.set(propertyId, request);
    return request;
}
interface PropertyEditorProps {
    propertyId: string;
}

export default function PropertyEditor({ propertyId }: PropertyEditorProps) {
    const router = useRouter();
    const [property, setProperty] = useState<PropertyDetail | null>(null);
    const [localValues, setLocalValues] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState(1);

    const completeness = property?.completeness || {
        level: 'BASIC' as const,
        percentage: 0,
        can_hire_agent: false,
        missing_fields: []
    };

    const loadProperty = useCallback(async (isActive?: () => boolean) => {
        const cached = getCachedProperty(propertyId);

        if (cached) {
            setProperty(cached);
            setLocalValues(toLocalValues(cached));
            setLoading(false);
        }

        try {
            if (!cached) {
                setLoading(true);
            }

            const data = await getPropertyFast(propertyId, !!cached);
            if (isActive && !isActive()) return;

            setProperty(data);
            setLocalValues(toLocalValues(data));
            setError(null);
        } catch (err: any) {
            if (!cached) {
                setError(err.message || 'Failed to load property');
            }
        } finally {
            if (!isActive || isActive()) {
                setLoading(false);
            }
        }
    }, [propertyId]);

    // Load property data
    useEffect(() => {
        let active = true;
        void loadProperty(() => active);

        return () => {
            active = false;
        };
    }, [loadProperty]);

    const handleLocalChange = (field: string, value: any) => {
        setLocalValues(prev => ({ ...prev, [field]: value }));
    };

    const handleFieldUpdate = async (field: keyof UpdatePropertyRequest, value: any) => {
        if (!property) return;
        // For text fields: skip empty strings; for booleans: always send
        if (typeof value !== 'boolean' && (value === null || value === '' || (typeof value === 'number' && isNaN(value)))) return;
        try {
            setSaving(true);
            await updateProperty(propertyId, { [field]: value });
            const updated = await getPropertyFast(propertyId, true);
            setProperty(updated);
            setError(null);
        } catch (err: any) {
            setError(err.message || `Failed to update ${field}`);
        } finally {
            setSaving(false);
        }
    };

    const handleAmenitiesToggle = async (amenityKey: string) => {
        const current: string[] = localValues.amenities || [];
        const updated = current.includes(amenityKey)
            ? current.filter(a => a !== amenityKey)
            : [...current, amenityKey];
        handleLocalChange('amenities', updated);
        try {
            setSaving(true);
            await updateProperty(propertyId, { amenities: updated });
            const updatedProp = await getPropertyFast(propertyId, true);
            setProperty(updatedProp);
        } catch (err: any) {
            setError(err.message || 'Failed to update amenities');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Delete this draft? This cannot be undone.')) return;
        try {
            setSaving(true);
            await deleteProperty(propertyId);
            router.push('/sell/dashboard');
        } catch (err: any) {
            setError(err.message || 'Failed to delete property');
            setSaving(false);
        }
    };

    const handleHireAgent = async () => {
        if (!completeness.can_hire_agent) {
            alert('Please complete all required fields before hiring an agent.');
            return;
        }
        try {
            setSaving(true);
            await hireAgent(propertyId);
            router.push('/sell/dashboard?success=agent_requested');
        } catch (err: any) {
            setError(err.message || 'Failed to request agent');
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Loading your listing...</p>
                </div>
            </div>
        );
    }

    if (!property) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error || 'Property not found'}</p>
                    <Link href="/sell/dashboard" className="text-emerald-600 hover:underline">
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ── Sticky Header ── */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <Link
                        href="/sell/dashboard"
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Dashboard</span>
                    </Link>

                    <div className="flex items-center gap-3">
                        {saving && (
                            <span className="text-xs text-gray-400 flex items-center gap-1.5">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Saving…
                            </span>
                        )}
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                            {property.display_status}
                        </span>
                        <button
                            onClick={handleDelete}
                            disabled={saving}
                            title="Delete draft"
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-gray-100">
                    <div
                        className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${completeness.percentage}%` }}
                    />
                </div>
            </header>

            {/* ── Error Banner ── */}
            {error && (
                <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
                        <p className="text-red-700 text-sm">{error}</p>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-3 text-lg leading-none">×</button>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                    {/* ── Left: Step Navigator ── */}
                    <aside className="lg:col-span-1">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sticky top-24">
                            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Steps</h2>
                            <nav className="space-y-1">
                                {STEPS.map(step => {
                                    const Icon = step.icon;
                                    const isActive = currentStep === step.id;
                                    return (
                                        <button
                                            key={step.id}
                                            onClick={() => setCurrentStep(step.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${isActive
                                                    ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                                                }`}
                                        >
                                            <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold transition-colors ${isActive ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'
                                                }`}>
                                                {step.id}
                                            </span>
                                            <span className="leading-tight">{step.label}</span>
                                        </button>
                                    );
                                })}
                            </nav>

                            {/* Completeness summary */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <PropertyProgress
                                    percentage={completeness.percentage}
                                    canHireAgent={completeness.can_hire_agent}
                                    level={completeness.level}
                                    missingFields={completeness.missing_fields}
                                />
                            </div>
                        </div>
                    </aside>

                    {/* ── Right: Step Content ── */}
                    <main className="lg:col-span-3 space-y-6">

                        {/* ─── STEP 1: Property Type ─── */}
                        {currentStep === 1 && (
                            <StepCard title="What type of property are you listing?" step={1}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                    {PROPERTY_CATEGORIES.map(({ type, label, icon: Icon, color, desc }) => {
                                        const isSelected = localValues.type === type;
                                        const colorMap: Record<string, string> = {
                                            blue: 'border-blue-400 bg-blue-50 ring-blue-200',
                                            emerald: 'border-emerald-500 bg-emerald-50 ring-emerald-200',
                                            amber: 'border-amber-500 bg-amber-50 ring-amber-200',
                                            purple: 'border-purple-500 bg-purple-50 ring-purple-200',
                                        };
                                        const iconColorMap: Record<string, string> = {
                                            blue: 'text-blue-600', emerald: 'text-emerald-600',
                                            amber: 'text-amber-600', purple: 'text-purple-600',
                                        };
                                        return (
                                            <button
                                                key={type}
                                                onClick={() => {
                                                    handleLocalChange('type', type);
                                                    handleLocalChange('property_sub_type', '');
                                                    handleFieldUpdate('type', type);
                                                }}
                                                className={`relative p-5 rounded-2xl border-2 text-left transition-all ${isSelected
                                                        ? `${colorMap[color]} ring-2 shadow-md`
                                                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                                                    }`}
                                            >
                                                {isSelected && (
                                                    <div className="absolute top-3 right-3 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                                                        <Check className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                                <Icon className={`w-7 h-7 mb-3 ${isSelected ? iconColorMap[color] : 'text-gray-400'}`} />
                                                <div className={`font-semibold text-base ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{label}</div>
                                                <div className="text-xs text-gray-500 mt-1 leading-snug">{desc}</div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Sub-type selection */}
                                {localValues.type && SUB_TYPES[localValues.type] && (
                                    <div className="mt-6">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Select Sub-Type
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {SUB_TYPES[localValues.type].map(({ value, label }) => {
                                                const isSel = localValues.property_sub_type === value;
                                                return (
                                                    <button
                                                        key={value}
                                                        onClick={() => {
                                                            handleLocalChange('property_sub_type', value);
                                                            handleFieldUpdate('property_sub_type', value as any);
                                                        }}
                                                        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${isSel
                                                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                                                : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700'
                                                            }`}
                                                    >
                                                        {label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Listing type (Sale vs Rent) */}
                                <div className="mt-6">
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        Listing Purpose
                                    </label>
                                    <div className="flex gap-3">
                                        {['SALE', 'RENT'].map(lt => (
                                            <button
                                                key={lt}
                                                onClick={() => { handleLocalChange('listing_type', lt); handleFieldUpdate('listing_type', lt); }}
                                                className={`flex-1 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${localValues.listing_type === lt
                                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                                    }`}
                                            >{lt === 'SALE' ? '🏷️ For Sale' : '🔑 For Rent'}</button>
                                        ))}
                                    </div>
                                </div>

                                <StepNav step={1} onNext={() => setCurrentStep(2)} />
                            </StepCard>
                        )}

                        {/* ─── STEP 2: Location ─── */}
                        {currentStep === 2 && (
                            <StepCard title="Where is your property located?" step={2}>
                                <LocationPicker
                                    initialLat={property.latitude || undefined}
                                    initialLng={property.longitude || undefined}
                                    showCurrentLocationButton={true}
                                    onLocationSelect={async (lat, lng, locationData) => {
                                        try {
                                            setSaving(true);
                                            const updates: any = { latitude: lat, longitude: lng };
                                            if (locationData?.address) { updates.address = locationData.address; handleLocalChange('address', locationData.address); }
                                            if (locationData?.city) { updates.city = locationData.city; handleLocalChange('city', locationData.city); }
                                            if (locationData?.state) { updates.state = locationData.state; handleLocalChange('state', locationData.state); }
                                            if (locationData?.pincode) { updates.pincode = locationData.pincode; handleLocalChange('pincode', locationData.pincode); }
                                            await updateProperty(propertyId, updates);
                                            const updated = await getPropertyFast(propertyId, true);
                                            setProperty(updated);
                                            setError(null);
                                        } catch (err: any) {
                                            setError(err.message || 'Failed to update location');
                                        } finally {
                                            setSaving(false);
                                        }
                                    }}
                                />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                                    <FormField label="Area / Locality">
                                        <input type="text" value={localValues.address ?? ''} placeholder="e.g., Koramangala, HSR Layout"
                                            onChange={e => handleLocalChange('address', e.target.value)}
                                            onBlur={e => handleFieldUpdate('address', e.target.value)}
                                            className={inputCls} />
                                    </FormField>
                                    <FormField label="City *">
                                        <input type="text" value={localValues.city ?? ''} placeholder="e.g., Bangalore"
                                            onChange={e => handleLocalChange('city', e.target.value)}
                                            onBlur={e => handleFieldUpdate('city', e.target.value)}
                                            className={inputCls} />
                                    </FormField>
                                    <FormField label="State">
                                        <input type="text" value={localValues.state ?? ''} placeholder="e.g., Karnataka"
                                            onChange={e => handleLocalChange('state', e.target.value)}
                                            onBlur={e => handleFieldUpdate('state', e.target.value)}
                                            className={inputCls} />
                                    </FormField>
                                    <FormField label="Pincode">
                                        <input type="text" value={localValues.pincode ?? ''} placeholder="560001"
                                            onChange={e => handleLocalChange('pincode', e.target.value)}
                                            onBlur={e => handleFieldUpdate('pincode', e.target.value)}
                                            maxLength={10} className={inputCls} />
                                    </FormField>
                                </div>

                                <StepNav step={2} onPrev={() => setCurrentStep(1)} onNext={() => setCurrentStep(3)} />
                            </StepCard>
                        )}

                        {/* ─── STEP 3: Property Details ─── */}
                        {currentStep === 3 && (
                            <StepCard title="Tell us about the property" step={3}>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {/* Area */}
                                    <FormField label={property.type === PropertyType.LAND ? 'Land Area (sq ft) *' : 'Built-up Area (sq ft) *'} className="col-span-2 sm:col-span-1">
                                        <input type="number" min="0" value={localValues.area_sqft ?? ''} placeholder="1200"
                                            onChange={e => handleLocalChange('area_sqft', e.target.value)}
                                            onBlur={e => handleFieldUpdate('area_sqft', parseFloat(e.target.value) || null as any)}
                                            className={inputCls} />
                                    </FormField>

                                    {/* Bedrooms – Apartments / Houses */}
                                    {(localValues.type === PropertyType.HOUSE || localValues.type === PropertyType.APARTMENT) && (<>
                                        <FormField label="Bedrooms (BHK) *">
                                            <select value={localValues.bedrooms ?? ''} onChange={e => { handleLocalChange('bedrooms', e.target.value); handleFieldUpdate('bedrooms', e.target.value ? parseInt(e.target.value) : null); }} className={inputCls}>
                                                <option value="">Select</option>
                                                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} BHK</option>)}
                                            </select>
                                        </FormField>
                                        <FormField label="Bathrooms *">
                                            <select value={localValues.bathrooms ?? ''} onChange={e => { handleLocalChange('bathrooms', e.target.value); handleFieldUpdate('bathrooms', e.target.value ? parseInt(e.target.value) : null); }} className={inputCls}>
                                                <option value="">Select</option>
                                                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                        </FormField>
                                        <FormField label="Balconies">
                                            <select value={localValues.balconies ?? ''} onChange={e => { handleLocalChange('balconies', e.target.value); handleFieldUpdate('balconies', e.target.value ? parseInt(e.target.value) : null); }} className={inputCls}>
                                                <option value="">Select</option>
                                                {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                        </FormField>
                                        <FormField label="Furnishing Status *">
                                            <select value={localValues.furnishing_status ?? ''} onChange={e => { handleLocalChange('furnishing_status', e.target.value); handleFieldUpdate('furnishing_status', e.target.value || null); }} className={inputCls}>
                                                <option value="">Select</option>
                                                <option value="UNFURNISHED">Unfurnished</option>
                                                <option value="SEMI_FURNISHED">Semi-Furnished</option>
                                                <option value="FULLY_FURNISHED">Fully Furnished</option>
                                            </select>
                                        </FormField>
                                        <FormField label="Facing Direction">
                                            <select value={localValues.facing_direction ?? ''} onChange={e => { handleLocalChange('facing_direction', e.target.value); handleFieldUpdate('facing_direction', e.target.value || null); }} className={inputCls}>
                                                <option value="">Select</option>
                                                {['NORTH', 'SOUTH', 'EAST', 'WEST', 'NE', 'NW', 'SE', 'SW'].map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </FormField>
                                    </>)}

                                    {/* Floor – Apartments only */}
                                    {localValues.type === PropertyType.APARTMENT && (<>
                                        <FormField label="Floor Number">
                                            <input type="number" min="0" value={localValues.floor_number ?? ''} placeholder="e.g., 5"
                                                onChange={e => handleLocalChange('floor_number', e.target.value)}
                                                onBlur={e => { const val = parseInt(e.target.value); handleFieldUpdate('floor_number', isNaN(val) ? null : val); }}
                                                className={inputCls} />
                                        </FormField>
                                        <FormField label="Total Floors *">
                                            <input type="number" min="1" value={localValues.total_floors ?? ''} placeholder="e.g., 12"
                                                onChange={e => handleLocalChange('total_floors', e.target.value)}
                                                onBlur={e => { const val = parseInt(e.target.value); handleFieldUpdate('total_floors', isNaN(val) ? null : val); }}
                                                className={inputCls} />
                                        </FormField>
                                    </>)}

                                    {/* Land-specific */}
                                    {localValues.type === PropertyType.LAND && (<>
                                        <FormField label="Land Type">
                                            <select value={localValues.land_type ?? ''} onChange={e => { handleLocalChange('land_type', e.target.value); handleFieldUpdate('land_type', e.target.value as LandType); }} className={inputCls}>
                                                <option value="">Select</option>
                                                <option value="RESIDENTIAL">Residential</option>
                                                <option value="COMMERCIAL">Commercial</option>
                                                <option value="AGRICULTURAL">Agricultural</option>
                                                <option value="INDUSTRIAL">Industrial</option>
                                            </select>
                                        </FormField>
                                        <FormField label="Facing Direction">
                                            <select value={localValues.facing_direction ?? ''} onChange={e => { handleLocalChange('facing_direction', e.target.value); handleFieldUpdate('facing_direction', e.target.value as FacingDirection); }} className={inputCls}>
                                                <option value="">Select</option>
                                                {['NORTH', 'SOUTH', 'EAST', 'WEST', 'NE', 'NW', 'SE', 'SW'].map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </FormField>
                                        <FormField label="Road Access" className="col-span-2 sm:col-span-1">
                                            <ToggleField
                                                checked={localValues.road_access ?? false}
                                                onChange={val => { handleLocalChange('road_access', val); handleFieldUpdate('road_access', val); }}
                                                label="Yes, road access available"
                                            />
                                        </FormField>
                                    </>)}

                                    {/* Parking – all types */}
                                    <FormField label="Parking" className="col-span-2 sm:col-span-1">
                                        <ToggleField
                                            checked={localValues.parking_available ?? false}
                                            onChange={val => { handleLocalChange('parking_available', val); handleFieldUpdate('parking_available', val); }}
                                            label="Parking available"
                                        />
                                    </FormField>
                                    {localValues.parking_available && (
                                        <FormField label="No. of Parking Spots">
                                            <input type="number" min="0" value={localValues.parking_count ?? ''} placeholder="1"
                                                onChange={e => handleLocalChange('parking_count', e.target.value)}
                                                onBlur={e => handleFieldUpdate('parking_count', parseInt(e.target.value) || 0)}
                                                className={inputCls} />
                                        </FormField>
                                    )}
                                </div>

                                {!localValues.type && (
                                    <p className="mt-4 text-sm text-amber-600 bg-amber-50 border border-amber-200 p-3 rounded-xl">
                                        ← Go back to Step 1 and select a property type first.
                                    </p>
                                )}

                                <StepNav step={3} onPrev={() => setCurrentStep(2)} onNext={() => setCurrentStep(4)} />
                            </StepCard>
                        )}

                        {/* ─── STEP 4: Pricing ─── */}
                        {currentStep === 4 && (
                            <StepCard title="Set your asking price" step={4}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <FormField label="Expected Price (₹) *" className="sm:col-span-2">
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                                            <input type="number" min="0" value={localValues.price ?? ''} placeholder="e.g., 50,00,000"
                                                onChange={e => handleLocalChange('price', e.target.value)}
                                                onBlur={e => handleFieldUpdate('price', parseFloat(e.target.value) || null as any)}
                                                className={`${inputCls} pl-8`} />
                                        </div>
                                        {localValues.price && (
                                            <p className="text-xs text-gray-500 mt-1 pl-1">
                                                ≈ {formatIndianPrice(Number(localValues.price))}
                                            </p>
                                        )}
                                    </FormField>

                                    <FormField label="Price Negotiable?">
                                        <ToggleField
                                            checked={localValues.price_negotiable ?? true}
                                            onChange={val => { handleLocalChange('price_negotiable', val); handleFieldUpdate('price_negotiable', val); }}
                                            label="Yes, price is negotiable"
                                        />
                                    </FormField>

                                    {(localValues.type === PropertyType.APARTMENT) && (
                                        <FormField label="Monthly Maintenance (₹)">
                                            <input type="number" min="0" value={localValues.maintenance_charges ?? ''} placeholder="e.g., 3000"
                                                onChange={e => handleLocalChange('maintenance_charges', e.target.value)}
                                                onBlur={e => handleFieldUpdate('maintenance_charges', parseFloat(e.target.value) || null as any)}
                                                className={inputCls} />
                                        </FormField>
                                    )}
                                </div>
                                <StepNav step={4} onPrev={() => setCurrentStep(3)} onNext={() => setCurrentStep(5)} />
                            </StepCard>
                        )}

                        {/* ─── STEP 5: Photos & Videos ─── */}
                        {currentStep === 5 && (
                            <StepCard title="Add photos & videos" step={5}
                                subtitle="Upload at least 5 clear photos. Listings with 10+ photos get 3× more inquiries.">
                                <MediaUpload
                                    propertyId={propertyId}
                                    media={property.media || []}
                                    onMediaChange={() => loadProperty()}
                                    disabled={saving}
                                />
                                <StepNav step={5} onPrev={() => setCurrentStep(4)} onNext={() => setCurrentStep(6)} />
                            </StepCard>
                        )}

                        {/* ─── STEP 6: Description ─── */}
                        {currentStep === 6 && (
                            <StepCard title="Describe your property" step={6}
                                subtitle="A good description highlights unique features and attracts serious buyers.">
                                <FormField label="Property Title *">
                                    <input type="text" value={localValues.title ?? ''} placeholder="e.g., Spacious 3BHK near Metro Station"
                                        onChange={e => handleLocalChange('title', e.target.value)}
                                        onBlur={e => handleFieldUpdate('title', e.target.value)}
                                        className={inputCls} maxLength={200} />
                                    <p className="text-xs text-gray-400 mt-1">{(localValues.title || '').length}/200</p>
                                </FormField>

                                <FormField label="Description *" className="mt-5">
                                    <textarea
                                        value={localValues.description ?? ''}
                                        onChange={e => handleLocalChange('description', e.target.value)}
                                        onBlur={e => handleFieldUpdate('description', e.target.value)}
                                        placeholder="Describe key features, neighbourhood, nearby facilities, reasons to buy..."
                                        rows={7}
                                        maxLength={5000}
                                        className={`${inputCls} resize-none`}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">{(localValues.description || '').length}/5000</p>
                                </FormField>

                                <StepNav step={6} onPrev={() => setCurrentStep(5)} onNext={() => setCurrentStep(7)} />
                            </StepCard>
                        )}

                        {/* ─── STEP 7: Amenities ─── */}
                        {currentStep === 7 && (
                            <StepCard title="What amenities does your property have?" step={7}
                                subtitle="Select all that apply. This helps buyers filter and find your listing.">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {AMENITY_OPTIONS.map(({ key, label, icon }) => {
                                        const isActive = (localValues.amenities || []).includes(key);
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => handleAmenitiesToggle(key)}
                                                disabled={saving}
                                                className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left text-sm font-medium transition-all disabled:opacity-50 ${isActive
                                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                                    }`}
                                            >
                                                <span className="text-xl leading-none flex-shrink-0">{icon}</span>
                                                <span className="leading-tight">{label}</span>
                                                {isActive && <Check className="w-4 h-4 ml-auto text-emerald-600 flex-shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </div>
                                <StepNav step={7} onPrev={() => setCurrentStep(6)} onNext={() => setCurrentStep(8)} />
                            </StepCard>
                        )}

                        {/* ─── STEP 8: Ownership & Documents ─── */}
                        {currentStep === 8 && (
                            <StepCard title="Ownership & availability details" step={8}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <FormField label="Ownership Type">
                                        <select value={localValues.ownership_type ?? ''} onChange={e => { handleLocalChange('ownership_type', e.target.value); handleFieldUpdate('ownership_type', e.target.value as OwnershipType); }} className={inputCls}>
                                            <option value="">Select</option>
                                            <option value="SINGLE">Single Owner</option>
                                            <option value="JOINT">Joint Ownership</option>
                                            <option value="COMPANY">Company / Corporate</option>
                                        </select>
                                    </FormField>

                                    <FormField label="Property Age (years)">
                                        <input type="number" min="0" value={localValues.property_age_years ?? ''} placeholder="0 = New"
                                            onChange={e => handleLocalChange('property_age_years', e.target.value)}
                                            onBlur={e => handleFieldUpdate('property_age_years', parseInt(e.target.value) || 0)}
                                            className={inputCls} />
                                    </FormField>

                                    <FormField label="Availability Status">
                                        <div className="grid grid-cols-1 gap-2">
                                            {[
                                                { v: 'READY_TO_MOVE', l: '✅ Ready to Move', d: 'Property is ready for immediate possession' },
                                                { v: 'UNDER_CONSTRUCTION', l: '🏗️ Under Construction', d: 'Still being built / renovation in progress' },
                                                { v: 'IMMEDIATE', l: '⚡ Immediate Sale', d: 'Urgent / motivated to sell quickly' },
                                            ].map(({ v, l, d }) => (
                                                <button key={v}
                                                    onClick={() => { handleLocalChange('availability_status', v); handleFieldUpdate('availability_status', v as AvailabilityStatus); }}
                                                    className={`p-3 rounded-xl border-2 text-left transition-all ${localValues.availability_status === v
                                                            ? 'border-emerald-500 bg-emerald-50'
                                                            : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <div className="text-sm font-semibold text-gray-800">{l}</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">{d}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </FormField>
                                </div>

                                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                    <h4 className="font-semibold text-blue-900 text-sm mb-1">📄 Documents</h4>
                                    <p className="text-xs text-blue-700">
                                        Documents (sale deed, tax receipt, EC) are collected by your assigned agent during the verification visit.
                                        You don't need to upload them here.
                                    </p>
                                </div>

                                <StepNav step={8} onPrev={() => setCurrentStep(7)} onNext={() => setCurrentStep(9)} />
                            </StepCard>
                        )}

                        {/* ─── STEP 9: Review & Submit ─── */}
                        {currentStep === 9 && (
                            <StepCard title="Review & submit your listing" step={9}>
                                {/* Completeness summary */}
                                <div className={`p-4 rounded-xl border-2 mb-6 ${completeness.can_hire_agent
                                        ? 'border-emerald-400 bg-emerald-50'
                                        : 'border-amber-300 bg-amber-50'
                                    }`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${completeness.can_hire_agent ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'
                                            }`}>
                                            {completeness.percentage}%
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900">
                                                {completeness.can_hire_agent ? '✅ Listing Complete!' : '⚠️ Almost Ready'}
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                {completeness.can_hire_agent
                                                    ? 'Your listing is complete. Request an agent for verification.'
                                                    : `${completeness.missing_fields.length} field(s) still missing.`}
                                            </div>
                                        </div>
                                    </div>
                                    {completeness.missing_fields.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {completeness.missing_fields.map(f => (
                                                <span key={f} className="px-2.5 py-1 bg-amber-200 text-amber-900 rounded-full text-xs font-medium">
                                                    Missing: {f}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Quick summary */}
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <ReviewItem label="Type" value={`${localValues.type || '—'} ${localValues.property_sub_type ? `/ ${localValues.property_sub_type}` : ''}`} />
                                    <ReviewItem label="Listing" value={localValues.listing_type || '—'} />
                                    <ReviewItem label="City" value={localValues.city || '—'} />
                                    <ReviewItem label="Area" value={localValues.area_sqft ? `${localValues.area_sqft} sq ft` : '—'} />
                                    <ReviewItem label="Price" value={localValues.price ? `₹${formatIndianPrice(Number(localValues.price))}` : '—'} />
                                    <ReviewItem label="Negotiable" value={localValues.price_negotiable ? 'Yes' : 'No'} />
                                    <ReviewItem label="Availability" value={localValues.availability_status?.replace('_', ' ') || '—'} />
                                    <ReviewItem label="Photos" value={`${property.media?.length || 0} uploaded`} />
                                    <ReviewItem label="Amenities" value={`${(localValues.amenities || []).length} selected`} />
                                    <ReviewItem label="Furnishing" value={localValues.furnishing_status?.replace('_', ' ') || '—'} />
                                </div>

                                {/* Agent Verification explainer */}
                                <div className="bg-gray-900 text-white rounded-2xl p-5 mb-6">
                                    <h4 className="font-bold text-base mb-2">🔍 What happens next?</h4>
                                    <ol className="space-y-2 text-sm text-gray-300">
                                        <li className="flex gap-2"><span className="font-bold text-emerald-400 flex-shrink-0">1.</span>A local verified agent is assigned within 24 hours.</li>
                                        <li className="flex gap-2"><span className="font-bold text-emerald-400 flex-shrink-0">2.</span>Agent visits your property, verifies details and photos.</li>
                                        <li className="flex gap-2"><span className="font-bold text-emerald-400 flex-shrink-0">3.</span>Your listing goes live to qualified buyers.</li>
                                        <li className="flex gap-2"><span className="font-bold text-emerald-400 flex-shrink-0">4.</span>Track views, inquiries, and offers from your dashboard.</li>
                                    </ol>
                                </div>

                                {/* CTA */}
                                <button
                                    onClick={handleHireAgent}
                                    disabled={!completeness.can_hire_agent || saving}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-base hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    {completeness.can_hire_agent ? 'Submit for Verification' : 'Complete all fields first'}
                                </button>

                                <div className="flex gap-3 mt-3">
                                    <button onClick={() => setCurrentStep(8)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
                                        ← Back
                                    </button>
                                    <Link href="/sell/dashboard" className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors text-center flex items-center justify-center gap-2">
                                        <Save className="w-4 h-4" />
                                        Save & Exit
                                    </Link>
                                </div>
                            </StepCard>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// HELPER COMPONENTS
// ─────────────────────────────────────────────

const inputCls = "w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all text-sm";

function StepCard({ title, subtitle, step, children }: {
    title: string; subtitle?: string; step: number; children: React.ReactNode
}) {
    const s = STEPS.find(s => s.id === step);
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-gray-50">
                <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mb-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">{step}</span>
                    <span className="uppercase tracking-wider">{s?.label}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

function FormField({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
            {children}
        </div>
    );
}

function ToggleField({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 w-full text-left text-sm font-medium transition-all ${checked ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
        >
            <div className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            {label}
        </button>
    );
}

function StepNav({ step, onPrev, onNext }: { step: number; onPrev?: () => void; onNext?: () => void }) {
    return (
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
            {onPrev ? (
                <button onClick={onPrev} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
            ) : <div />}
            {onNext && (
                <button onClick={onNext} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm">
                    Next <ArrowRight className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-gray-50 rounded-xl px-4 py-3">
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</div>
            <div className="text-sm font-semibold text-gray-800 mt-0.5 capitalize">{value}</div>
        </div>
    );
}

function formatIndianPrice(n: number): string {
    if (n >= 10000000) return `${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `${(n / 100000).toFixed(2)} L`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
}






