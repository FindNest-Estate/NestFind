'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSavedProperties, SavedProperty, getCollections, createCollection, updateCollection, deleteCollection, Collection } from '@/lib/propertiesApi';
import Link from 'next/link';
import { Heart, ChevronRight, Loader2, ArrowLeftRight, StickyNote, Bell, Share2, Check, TrendingDown } from 'lucide-react';
import PropertyCard from '@/components/PropertyCard';
import { PropertyCard as IPropertyCard } from '@/lib/api/public';
import CollectionsManager from '@/components/buyer/CollectionsManager'; // Types imported from api now
import PropertyComparison from '@/components/buyer/PropertyComparison';
import { useToast } from '@/components/ui/Toast';

// Adapter to convert SavedProperty to IPropertyCard for component compatibility
function toPropertyCard(saved: SavedProperty): IPropertyCard {
    return {
        id: saved.id,
        title: saved.title,
        type: saved.type,
        price: saved.price,
        city: saved.city,
        state: saved.state,
        bedrooms: saved.bedrooms,
        bathrooms: saved.bathrooms,
        area_sqft: saved.area_sqft,
        thumbnail_url: saved.thumbnail_url,
        latitude: null,
        longitude: null,
        agent_name: null,
        created_at: saved.saved_at
    };
}

export default function SavedPropertiesPage() {
    const [properties, setProperties] = useState<SavedProperty[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Collections state
    const [collections, setCollections] = useState<Collection[]>([]);
    const [activeCollection, setActiveCollection] = useState<string | null>(null);

    // Comparison state
    const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
    const [showComparison, setShowComparison] = useState(false);

    const { showToast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            await Promise.all([loadProperties(), loadCollections()]);
            setError(null);
        } catch (err) {
            console.error(err);
            setError('Failed to load data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const loadProperties = async () => {
        const data = await getSavedProperties();
        setProperties(data.properties);
    };

    const loadCollections = async () => {
        const data = await getCollections();
        setCollections(data);
    };

    const handleToggleSave = (id: string, newState: boolean) => {
        if (!newState) {
            setProperties(prev => prev.filter(p => p.id !== id));
            setSelectedForComparison(prev => prev.filter(pid => pid !== id));
        }
    };

    const toggleComparisonSelect = (id: string) => {
        setSelectedForComparison(prev => {
            if (prev.includes(id)) {
                return prev.filter(pid => pid !== id);
            } else if (prev.length < 4) { // Max 4 properties
                return [...prev, id];
            }
            return prev;
        });
    };

    const handleCreateCollection = async (name: string, color: string) => {
        try {
            const newCollection = await createCollection({ name, color });
            setCollections(prev => [...prev, newCollection]);
            showToast(`"${name}" has been created.`, 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to create collection.', 'error');
        }
    };

    const handleUpdateCollection = async (id: string, name: string, color: string) => {
        try {
            const updated = await updateCollection(id, { name, color });
            setCollections(prev => prev.map(c => c.id === id ? updated : c));
            showToast('Changes saved successfully.', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to update collection.', 'error');
        }
    };

    const handleDeleteCollection = async (id: string) => {
        try {
            await deleteCollection(id);
            setCollections(prev => prev.filter(c => c.id !== id));
            if (activeCollection === id) {
                setActiveCollection(null);
            }
            showToast('Collection removed.', 'info');
        } catch (error) {
            console.error(error);
            showToast('Failed to delete collection.', 'error');
        }
    };

    const handleShare = async (propertyId: string, title: string) => {
        // Construct the full URL to the public property page
        const url = `${window.location.origin}/properties/${propertyId}`; // Assumes standard route

        // Try Native Share API (Mobile)
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Check out this property on NestFind: ${title}`,
                    text: `I found this property on NestFind and thought you might like it: ${title}`,
                    url: url
                });
                return;
            } catch (err) {
                // Ignore abort errors (user cancelled share)
                if ((err as Error).name !== 'AbortError') {
                    console.error('Error sharing:', err);
                }
            }
        }

        // Fallback: Copy to Clipboard
        try {
            await navigator.clipboard.writeText(url);
            showToast('Link copied to clipboard!', 'success');
        } catch (err) {
            console.error('Failed to copy:', err);
            showToast('Failed to copy link.', 'error');
        }
    };

    const filteredProperties = activeCollection
        ? properties.filter(p => {
            // TODO: Add collection_id to SavedProperty when backend is ready
            return true; // For now, show all
        })
        : properties;

    const comparisonProperties = properties
        .filter(p => selectedForComparison.includes(p.id))
        .map(toPropertyCard);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/20 pt-24 pb-12 flex justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/20 pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">Saved Properties</h1>
                            <p className="text-gray-600">Organize, compare, and track your favorite listings</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {selectedForComparison.length >= 2 && (
                                <button
                                    onClick={() => setShowComparison(true)}
                                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all"
                                >
                                    <ArrowLeftRight className="w-5 h-5" />
                                    Compare ({selectedForComparison.length})
                                </button>
                            )}
                            <Link
                                href="/properties"
                                className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-rose-500 hover:text-rose-500 hover:bg-rose-50 transition-all"
                            >
                                Browse More <ChevronRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>

                    {/* Selection Info */}
                    {selectedForComparison.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between"
                        >
                            <p className="text-blue-700 font-medium">
                                {selectedForComparison.length} {selectedForComparison.length === 1 ? 'property' : 'properties'} selected for comparison
                                {selectedForComparison.length < 2 && ' (select at least 2 to compare)'}
                            </p>
                            <button
                                onClick={() => setSelectedForComparison([])}
                                className="text-blue-600 hover:text-blue-700 font-medium underline"
                            >
                                Clear Selection
                            </button>
                        </motion.div>
                    )}
                </div>

                {/* Collections Manager */}
                <CollectionsManager
                    collections={collections}
                    activeCollection={activeCollection}
                    onSelectCollection={setActiveCollection}
                    onCreateCollection={handleCreateCollection}
                    onUpdateCollection={handleUpdateCollection}
                    onDeleteCollection={handleDeleteCollection}
                />

                {/* Error State */}
                {error ? (
                    <div className="text-center py-12 glass-card">
                        <p className="text-red-500 mb-4">{error}</p>
                        <button onClick={() => window.location.reload()} className="text-gray-900 underline font-medium">
                            Retry
                        </button>
                    </div>
                ) : filteredProperties.length === 0 ? (
                    /* Empty State */
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20 glass-card"
                    >
                        <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Heart className="w-10 h-10 text-rose-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">No saved properties yet</h2>
                        <p className="text-gray-600 mb-8 max-w-md mx-auto">
                            Start exploring and save your favorite listings to track them here. Create collections to organize properties by type, budget, or location!
                        </p>
                        <Link
                            href="/properties"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all"
                        >
                            Browse Properties <ChevronRight className="w-5 h-5" />
                        </Link>
                    </motion.div>
                ) : (
                    /* Properties Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence mode="popLayout">
                            {filteredProperties.map((property, index) => {
                                const isSelected = selectedForComparison.includes(property.id);

                                // Calculate Price Drop
                                const priceDrop = property.saved_price && property.price < property.saved_price
                                    ? property.saved_price - property.price
                                    : 0;
                                const priceDropPercent = property.saved_price && priceDrop > 0
                                    ? Math.round((priceDrop / property.saved_price) * 100)
                                    : 0;

                                return (
                                    <motion.div
                                        key={property.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="relative group"
                                    >
                                        {/* Price Drop Badge */}
                                        {priceDrop > 0 && (
                                            <div className="absolute top-3 right-3 z-30 px-3 py-1.5 bg-emerald-500 text-white rounded-lg shadow-lg flex items-center gap-1.5 animate-pulse">
                                                <TrendingDown className="w-4 h-4" />
                                                <div className="flex flex-col leading-none">
                                                    <span className="text-[10px] font-bold uppercase opacity-90">Price Drop</span>
                                                    <span className="text-sm font-bold">-${(priceDrop / 1000).toFixed(0)}k ({priceDropPercent}%)</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Selection Checkbox */}
                                        <button
                                            onClick={() => toggleComparisonSelect(property.id)}
                                            className={`absolute top-3 left-3 z-30 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isSelected
                                                ? 'bg-blue-500 text-white shadow-lg scale-110'
                                                : 'bg-white/90 backdrop-blur-sm text-gray-400 hover:bg-blue-50 hover:text-blue-600'
                                                }`}
                                        >
                                            {isSelected ? (
                                                <Check className="w-5 h-5" />
                                            ) : (
                                                <div className="w-5 h-5 border-2 border-current rounded" />
                                            )}
                                        </button>

                                        <PropertyCard
                                            property={toPropertyCard(property)}
                                            initialIsSaved={true}
                                            onToggleSave={(state) => handleToggleSave(property.id, state)}
                                        />

                                        {/* Quick Actions */}
                                        <div className="absolute bottom-3 right-3 left-3 flex gap-2 z-20 opacity-0 hover:opacity-100 transition-opacity">
                                            <button
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-sm text-gray-700 rounded-lg text-sm font-medium hover:bg-white hover:shadow-md transition-all"
                                                title="Add note"
                                            >
                                                <StickyNote className="w-4 h-4" />
                                                Note
                                            </button>
                                            <button
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-sm text-gray-700 rounded-lg text-sm font-medium hover:bg-white hover:shadow-md transition-all"
                                                title="Price alert"
                                            >
                                                <Bell className="w-4 h-4" />
                                                Alert
                                            </button>
                                            <button
                                                onClick={() => handleShare(property.id, property.title)}
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-sm text-gray-700 rounded-lg text-sm font-medium hover:bg-white hover:shadow-md transition-all"
                                                title="Share"
                                            >
                                                <Share2 className="w-4 h-4" />
                                                Share
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Comparison Modal */}
            <AnimatePresence>
                {showComparison && comparisonProperties.length >= 2 && (
                    <PropertyComparison
                        properties={comparisonProperties}
                        onClose={() => setShowComparison(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
