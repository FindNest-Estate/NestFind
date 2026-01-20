'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Save,
    Trash2,
    Send,
    Home,
    FileText,
    MapPin,
    DollarSign,
    Loader2
} from 'lucide-react';
import PropertyProgress from '@/components/PropertyProgress';
import LocationPicker from '@/components/LocationPicker';
import MediaUpload from '@/components/MediaUpload';
import { Camera } from 'lucide-react';
import {
    getProperty,
    updateProperty,
    deleteProperty,
    hireAgent
} from '@/lib/api/seller';
import { PropertyDetail, PropertyType, UpdatePropertyRequest } from '@/lib/types/property';

interface PropertyEditorProps {
    propertyId: string;
}

export default function PropertyEditor({ propertyId }: PropertyEditorProps) {
    const router = useRouter();
    const [property, setProperty] = useState<PropertyDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Completeness from backend (NEVER compute on frontend)
    const completeness = property?.completeness || {
        level: 'BASIC' as const,
        percentage: 0,
        can_hire_agent: false,
        missing_fields: []
    };

    // Load property data
    useEffect(() => {
        loadProperty();
    }, [propertyId]);

    const loadProperty = async () => {
        try {
            setLoading(true);
            const data = await getProperty(propertyId);
            setProperty(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load property');
            console.error('Load property error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Auto-save helper
    const handleFieldUpdate = async (field: keyof UpdatePropertyRequest, value: any) => {
        if (!property) return;

        try {
            setSaving(true);
            const updates = { [field]: value };
            await updateProperty(propertyId, updates);

            // Refetch property to get updated completeness from backend
            const updatedProperty = await getProperty(propertyId);
            setProperty(updatedProperty);
            setError(null);
        } catch (err: any) {
            setError(err.message || `Failed to update ${field}`);
            console.error('Update error:', err);
        } finally {
            setSaving(false);
        }
    };

    // Delete draft
    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
            return;
        }

        try {
            setSaving(true);
            await deleteProperty(propertyId);
            router.push('/sell/dashboard');
        } catch (err: any) {
            setError(err.message || 'Failed to delete property');
            setSaving(false);
        }
    };

    // Hire agent
    const handleHireAgent = async () => {
        if (!completeness.can_hire_agent) {
            alert('Please complete all required fields before hiring an agent.');
            return;
        }

        try {
            setSaving(true);
            await hireAgent(propertyId);
            router.push(`/sell/dashboard?success=agent_requested`);
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
                    <p className="text-gray-600">Loading property...</p>
                </div>
            </div>
        );
    }

    if (!property) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error || 'Property not found'}</p>
                    <Link href="/sell/dashboard" className="text-[#ff385c] hover:underline">
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link
                        href="/sell/dashboard"
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back to Dashboard</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        {saving && (
                            <span className="text-sm text-gray-500 flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </span>
                        )}
                        <span className="text-sm font-medium text-gray-900">{property.display_status}</span>
                    </div>
                </div>
            </header>

            {/* Error Banner */}
            {error && (
                <div className="max-w-5xl mx-auto px-6 py-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-800 text-sm">{error}</p>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="max-w-5xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Form Sections */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Details Section */}
                        <section className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-rose-50 rounded-lg">
                                    <FileText className="w-5 h-5 text-[#ff385c]" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Basic Details</h2>
                            </div>

                            <div className="space-y-4">
                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Property Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={property.title || ''}
                                        onChange={(e) => handleFieldUpdate('title', e.target.value)}
                                        onBlur={(e) => handleFieldUpdate('title', e.target.value)}
                                        placeholder="e.g., Spacious 3BHK Apartment in Koramangala"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff385c] focus:border-transparent"
                                    />
                                </div>

                                {/* Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Property Type *
                                    </label>
                                    <select
                                        value={property.type || ''}
                                        onChange={(e) => handleFieldUpdate('type', e.target.value as PropertyType)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff385c] focus:border-transparent"
                                    >
                                        <option value="">Select type</option>
                                        <option value={PropertyType.LAND}>Land</option>
                                        <option value={PropertyType.HOUSE}>House</option>
                                        <option value={PropertyType.APARTMENT}>Apartment</option>
                                        <option value={PropertyType.COMMERCIAL}>Commercial</option>
                                    </select>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Description *
                                    </label>
                                    <textarea
                                        value={property.description || ''}
                                        onChange={(e) => handleFieldUpdate('description', e.target.value)}
                                        onBlur={(e) => handleFieldUpdate('description', e.target.value)}
                                        placeholder="Describe your property, key features, amenities..."
                                        rows={5}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff385c] focus:border-transparent resize-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Be detailed - buyers want to know what makes your property special.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Location Section */}
                        <section className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-rose-50 rounded-lg">
                                    <MapPin className="w-5 h-5 text-[#ff385c]" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Location</h2>
                            </div>

                            <LocationPicker
                                initialLat={property.latitude || undefined}
                                initialLng={property.longitude || undefined}
                                showCurrentLocationButton={true}
                                onLocationSelect={async (lat, lng, locationData) => {
                                    // Batch all location updates into a single API call
                                    // to avoid race conditions from multiple simultaneous updates
                                    try {
                                        setSaving(true);
                                        const updates: any = {
                                            latitude: lat,
                                            longitude: lng,
                                        };

                                        if (locationData?.address) {
                                            updates.address = locationData.address;
                                        }
                                        if (locationData?.city) {
                                            updates.city = locationData.city;
                                        }
                                        if (locationData?.state) {
                                            updates.state = locationData.state;
                                        }
                                        if (locationData?.pincode) {
                                            updates.pincode = locationData.pincode;
                                        }

                                        console.log('[PropertyEditor] Batched location updates:', updates);
                                        await updateProperty(propertyId, updates);

                                        // Refetch to get updated completeness
                                        const updatedProperty = await getProperty(propertyId);
                                        console.log('[PropertyEditor] Refetched property state/pincode:', {
                                            state: updatedProperty.state,
                                            pincode: updatedProperty.pincode,
                                            city: updatedProperty.city
                                        });
                                        setProperty(updatedProperty);
                                        setError(null);
                                    } catch (err: any) {
                                        setError(err.message || 'Failed to update location');
                                        console.error('Location update error:', err);
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                            />

                            {/* City */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    City *
                                </label>
                                <input
                                    type="text"
                                    value={property.city || ''}
                                    onChange={(e) => handleFieldUpdate('city', e.target.value)}
                                    onBlur={(e) => handleFieldUpdate('city', e.target.value)}
                                    placeholder="e.g., Bangalore"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff385c] focus:border-transparent"
                                />
                            </div>

                            {/* State */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    State
                                </label>
                                <input
                                    type="text"
                                    value={property.state || ''}
                                    onChange={(e) => handleFieldUpdate('state', e.target.value)}
                                    onBlur={(e) => handleFieldUpdate('state', e.target.value)}
                                    placeholder="e.g., Karnataka"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff385c] focus:border-transparent"
                                />
                            </div>

                            {/* Pincode */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Pincode
                                </label>
                                <input
                                    type="text"
                                    value={property.pincode || ''}
                                    onChange={(e) => handleFieldUpdate('pincode', e.target.value)}
                                    onBlur={(e) => handleFieldUpdate('pincode', e.target.value)}
                                    placeholder="e.g., 560001"
                                    maxLength={10}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff385c] focus:border-transparent"
                                />
                            </div>
                        </section>

                        {/* Property Details Section */}
                        <section className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-rose-50 rounded-lg">
                                    <Home className="w-5 h-5 text-[#ff385c]" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Property Details</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Bedrooms - Only for HOUSE and APARTMENT */}
                                {(property.type === PropertyType.HOUSE || property.type === PropertyType.APARTMENT) && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Bedrooms *
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={property.bedrooms || ''}
                                            onChange={(e) => handleFieldUpdate('bedrooms', parseInt(e.target.value) || null)}
                                            onBlur={(e) => handleFieldUpdate('bedrooms', parseInt(e.target.value) || null)}
                                            placeholder="0"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff385c] focus:border-transparent"
                                        />
                                    </div>
                                )}

                                {/* Bathrooms - Only for HOUSE and APARTMENT */}
                                {(property.type === PropertyType.HOUSE || property.type === PropertyType.APARTMENT) && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Bathrooms *
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={property.bathrooms || ''}
                                            onChange={(e) => handleFieldUpdate('bathrooms', parseInt(e.target.value) || null)}
                                            onBlur={(e) => handleFieldUpdate('bathrooms', parseInt(e.target.value) || null)}
                                            placeholder="0"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff385c] focus:border-transparent"
                                        />
                                    </div>
                                )}

                                {/* Area - Label changes by property type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {property.type === PropertyType.LAND ? 'Land Area (sq ft) *' : 'Built-up Area (sq ft) *'}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={property.area_sqft || ''}
                                        onChange={(e) => handleFieldUpdate('area_sqft', parseFloat(e.target.value) || null)}
                                        onBlur={(e) => handleFieldUpdate('area_sqft', parseFloat(e.target.value) || null)}
                                        placeholder="1500"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff385c] focus:border-transparent"
                                    />
                                </div>

                                {/* Price */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Price (₹) *
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={property.price || ''}
                                        onChange={(e) => handleFieldUpdate('price', parseFloat(e.target.value) || null)}
                                        onBlur={(e) => handleFieldUpdate('price', parseFloat(e.target.value) || null)}
                                        placeholder="5000000"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff385c] focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Helper text for property type */}
                            {!property.type && (
                                <p className="mt-4 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                                    Select a property type above to see all required fields.
                                </p>
                            )}
                        </section>

                        {/* Photos Section */}
                        <section className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-rose-50 rounded-lg">
                                    <Camera className="w-5 h-5 text-[#ff385c]" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Property Photos</h2>
                                    <p className="text-sm text-gray-500">Add photos to attract more buyers</p>
                                </div>
                            </div>

                            <MediaUpload
                                propertyId={propertyId}
                                media={property.media || []}
                                onMediaChange={loadProperty}
                                disabled={saving}
                            />
                        </section>
                    </div>

                    {/* Right Column - Progress & Actions */}
                    <div className="lg:col-span-1 space-y-6">
                        <PropertyProgress
                            percentage={completeness.percentage}
                            canHireAgent={completeness.can_hire_agent}
                            level={completeness.level}
                            missingFields={completeness.missing_fields}
                        />

                        {/* Actions */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
                            <button
                                onClick={handleHireAgent}
                                disabled={!completeness.can_hire_agent || saving}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#ff385c] text-white font-semibold rounded-lg hover:bg-[#d9324e] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send className="w-5 h-5" />
                                Hire Agent
                            </button>

                            <Link
                                href="/sell/dashboard"
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <Save className="w-5 h-5" />
                                Save & Exit
                            </Link>

                            <button
                                onClick={handleDelete}
                                disabled={saving}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-red-300 text-red-600 font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Trash2 className="w-5 h-5" />
                                Delete Draft
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

