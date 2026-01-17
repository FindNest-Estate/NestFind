'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Map as MapIcon, List, MapPin, Loader2, Navigation, Users, Filter, X, ChevronDown, RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { getNearbyAgents } from '@/lib/agentsApi';
import { geocodeAddress, searchLocations, reverseGeocode, GeocodingResult } from '@/lib/geocoding';
import AgentCard from '@/components/AgentCard';
import { Agent } from '@/types/agent';

// Dynamically import Map to avoid SSR issues
const AgentSearchMap = dynamic(() => import('@/components/AgentSearchMap'), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl">
            <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF385C] mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Loading map...</p>
            </div>
        </div>
    ),
});

// Default fallback coordinates (India center)
const DEFAULT_COORDS: [number, number] = [20.5937, 78.9629];

export default function AgentsPage() {
    const [center, setCenter] = useState<[number, number]>(DEFAULT_COORDS);
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [radius, setRadius] = useState(100);
    const [locationStatus, setLocationStatus] = useState<'detecting' | 'granted' | 'denied' | 'unavailable'>('detecting');
    const [showFilters, setShowFilters] = useState(false);
    const [minRating, setMinRating] = useState<number | null>(null);
    const [currentLocationName, setCurrentLocationName] = useState<string>('');
    const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

    // Autocomplete state
    const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Get user's location on mount
    useEffect(() => {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
            setLocationStatus('detecting');
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setCenter([latitude, longitude]);
                    setLocationStatus('granted');

                    const locationName = await reverseGeocode(latitude, longitude);
                    if (locationName) {
                        setCurrentLocationName(locationName);
                    }
                },
                (error) => {
                    console.log('Geolocation error:', error.message);
                    setLocationStatus(error.code === 1 ? 'denied' : 'unavailable');
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
            );
        } else {
            setLocationStatus('unavailable');
        }
    }, []);

    // Fetch agents when center or radius changes
    const fetchAgents = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getNearbyAgents({
                latitude: center[0],
                longitude: center[1],
                radius_km: radius,
                per_page: 50
            });

            let filteredAgents = data.agents;

            if (minRating !== null) {
                filteredAgents = filteredAgents.filter(a => a.rating >= minRating);
            }

            setAgents(filteredAgents);
            setLastFetchTime(new Date());
        } catch (error) {
            console.error('Error fetching agents:', error);
            setAgents([]);
        } finally {
            setIsLoading(false);
        }
    }, [center, radius, minRating]);

    useEffect(() => {
        if (locationStatus !== 'detecting') {
            fetchAgents();
        }
    }, [locationStatus, fetchAgents]);

    // Handle search input change with debounced autocomplete
    const handleSearchInputChange = (value: string) => {
        setSearchQuery(value);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (value.length >= 3) {
            debounceRef.current = setTimeout(async () => {
                setIsSearching(true);
                const results = await searchLocations(value);
                setSuggestions(results);
                setShowSuggestions(results.length > 0);
                setIsSearching(false);
            }, 300);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    // Handle selecting a suggestion
    const handleSelectSuggestion = async (suggestion: GeocodingResult) => {
        setCenter([suggestion.lat, suggestion.lng]);
        setSearchQuery(suggestion.displayName.split(',')[0]);
        setCurrentLocationName(suggestion.displayName.split(',').slice(0, 3).join(', '));
        setShowSuggestions(false);
        setSuggestions([]);
    };

    // Handle search form submit
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowSuggestions(false);

        if (!searchQuery.trim()) {
            fetchAgents();
            return;
        }

        setIsLoading(true);
        try {
            const result = await geocodeAddress(searchQuery);

            if (result) {
                setCenter([result.lat, result.lng]);
                setCurrentLocationName(result.displayName.split(',').slice(0, 3).join(', '));
            } else {
                console.log('No location found for:', searchQuery);
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(event.target as Node) &&
                searchInputRef.current &&
                !searchInputRef.current.contains(event.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset to user location
    const handleUseMyLocation = () => {
        if (navigator.geolocation) {
            setLocationStatus('detecting');
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    setCenter([position.coords.latitude, position.coords.longitude]);
                    setLocationStatus('granted');
                    setSearchQuery('');

                    const locationName = await reverseGeocode(position.coords.latitude, position.coords.longitude);
                    if (locationName) {
                        setCurrentLocationName(locationName);
                    }
                },
                () => setLocationStatus('denied')
            );
        }
    };

    // Clear search
    const handleClearSearch = () => {
        setSearchQuery('');
        setSuggestions([]);
        setShowSuggestions(false);
        handleUseMyLocation();
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            {/* Hero Header */}
            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 pt-28 pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-6">
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                            Find Verified Agents Near You
                        </h1>
                        <p className="text-gray-300 max-w-xl mx-auto">
                            Connect with top-rated real estate professionals in your area
                        </p>
                    </div>

                    {/* Search Bar with Autocomplete */}
                    <div className="max-w-2xl mx-auto relative">
                        <form onSubmit={handleSearch} className="relative">
                            <div className="flex bg-white rounded-xl shadow-xl overflow-hidden">
                                <div className="flex-1 relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FF385C] h-5 w-5" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        placeholder="Search city, area, or landmark..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearchInputChange(e.target.value)}
                                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                        className="w-full pl-12 pr-10 py-4 text-base focus:outline-none"
                                        autoComplete="off"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={handleClearSearch}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                    {isSearching && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    className="px-6 bg-[#FF385C] text-white font-medium hover:bg-[#E31C5F] transition-colors flex items-center gap-2"
                                >
                                    <Search className="h-4 w-4" />
                                    Search
                                </button>
                            </div>
                        </form>

                        {/* Autocomplete Suggestions */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div
                                ref={suggestionsRef}
                                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-80 overflow-y-auto"
                            >
                                {suggestions.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSelectSuggestion(suggestion)}
                                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-50 last:border-0"
                                    >
                                        <MapPin className="h-4 w-4 text-[#FF385C] mt-0.5 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <div className="font-medium text-gray-900 truncate">
                                                {suggestion.displayName.split(',')[0]}
                                            </div>
                                            <div className="text-sm text-gray-500 truncate">
                                                {suggestion.displayName.split(',').slice(1, 3).join(',')}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Quick actions */}
                        <div className="flex items-center justify-center gap-4 mt-3">
                            <button
                                onClick={handleUseMyLocation}
                                className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors"
                            >
                                <Navigation className="w-3.5 h-3.5" />
                                My location
                            </button>
                            <span className="text-gray-600">•</span>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors"
                            >
                                <Filter className="w-3.5 h-3.5" />
                                Filters
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        {/* Filters Panel */}
                        {showFilters && (
                            <div className="mt-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                <div className="flex flex-wrap items-center justify-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <label className="text-white/80 text-sm">Radius:</label>
                                        <select
                                            value={radius}
                                            onChange={(e) => setRadius(Number(e.target.value))}
                                            className="bg-white/20 text-white border border-white/30 rounded-lg px-2 py-1 text-sm focus:outline-none"
                                        >
                                            <option value={25} className="text-gray-900">25 km</option>
                                            <option value={50} className="text-gray-900">50 km</option>
                                            <option value={100} className="text-gray-900">100 km</option>
                                            <option value={200} className="text-gray-900">200 km</option>
                                            <option value={500} className="text-gray-900">500 km</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-white/80 text-sm">Rating:</label>
                                        <div className="flex gap-1">
                                            {[null, 3, 4, 4.5].map((r) => (
                                                <button
                                                    key={r ?? 'all'}
                                                    onClick={() => setMinRating(r)}
                                                    className={`px-2 py-1 rounded text-sm transition-colors ${minRating === r
                                                        ? 'bg-[#FF385C] text-white'
                                                        : 'bg-white/20 text-white hover:bg-white/30'
                                                        }`}
                                                >
                                                    {r === null ? 'All' : `${r}+`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Info Bar */}
            <div className="bg-white border-b border-gray-100 py-3">
                <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                        {currentLocationName ? (
                            <>
                                <MapPin className="w-4 h-4 text-[#FF385C]" />
                                <span>Near <strong>{currentLocationName}</strong></span>
                                <span className="text-gray-300 mx-1">•</span>
                                <span className="text-gray-500">{radius} km radius</span>
                            </>
                        ) : locationStatus === 'detecting' ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                <span>Detecting location...</span>
                            </>
                        ) : (
                            <>
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span>Search for a location above</span>
                            </>
                        )}
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 mr-2">
                            {agents.length} agent{agents.length !== 1 ? 's' : ''}
                        </span>
                        <div className="flex bg-gray-100 p-0.5 rounded-lg">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <List className="h-4 w-4 mr-1.5" />
                                List
                            </button>
                            <button
                                onClick={() => setViewMode('map')}
                                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'map'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <MapIcon className="h-4 w-4 mr-1.5" />
                                Map
                            </button>
                        </div>
                        <button
                            onClick={fetchAgents}
                            disabled={isLoading}
                            className="ml-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Refresh agents"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content - Exclusive Views */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* LIST VIEW - Full Width */}
                {viewMode === 'list' && (
                    <div className="w-full">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <Loader2 className="w-10 h-10 animate-spin text-[#FF385C] mb-4" />
                                <p className="text-gray-500">Finding agents...</p>
                            </div>
                        ) : agents.length === 0 ? (
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center max-w-lg mx-auto">
                                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Users className="w-7 h-7 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No agents found</h3>
                                <p className="text-gray-500 mb-5 text-sm">
                                    No agents found in this area. Try expanding your search radius.
                                </p>
                                <button
                                    onClick={() => setRadius(500)}
                                    className="px-5 py-2.5 bg-[#FF385C] text-white font-medium rounded-lg hover:bg-[#E31C5F] transition-colors text-sm"
                                >
                                    Expand to 500 km
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {agents.map((agent) => (
                                    <AgentCard key={agent.id} agent={agent} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* MAP VIEW - Full Width */}
                {viewMode === 'map' && (
                    <div className="w-full">
                        <div className="h-[calc(100vh-280px)] min-h-[500px] rounded-xl overflow-hidden shadow-lg border border-gray-100">
                            <AgentSearchMap
                                agents={agents}
                                center={center}
                                radiusKm={radius}
                            />
                        </div>

                        {/* Agent count overlay */}
                        {agents.length > 0 && (
                            <div className="mt-4 text-center">
                                <p className="text-gray-600">
                                    <strong>{agents.length}</strong> verified agents shown on the map
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
