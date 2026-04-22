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
            {/* Hero Header - Light & Vibrant */}
            <div className="relative pt-32 pb-16 lg:pt-40 lg:pb-24 overflow-hidden bg-gradient-to-br from-rose-50 via-white to-orange-50/50">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                    <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[50%] rounded-full bg-gradient-to-bl from-[#FF385C]/20 to-orange-300/20 blur-3xl opacity-60 animate-pulse" />
                    <div className="absolute top-[20%] -left-[10%] w-[30%] h-[40%] rounded-full bg-gradient-to-tr from-[#FF385C]/15 to-purple-300/15 blur-3xl opacity-60" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center mb-10">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-4 leading-tight">
                            Find <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF385C] to-[#E31C5F]">Verified Agents</span> Near You
                        </h1>
                        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto font-medium">
                            Connect with top-rated real estate professionals to buy, sell, or manage properties in your area.
                        </p>
                    </div>

                    {/* Search Bar with Autocomplete */}
                    <div className="max-w-3xl mx-auto relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#FF385C] to-orange-400 opacity-20 group-hover:opacity-30 blur-lg rounded-2xl transition duration-500"></div>
                        <form onSubmit={handleSearch} className="relative">
                            <div className="flex bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden border border-white/60 focus-within:ring-2 focus-within:ring-[#FF385C]/50 transition-all">
                                <div className="flex-1 relative flex items-center">
                                    <MapPin className="absolute left-5 text-[#FF385C] h-6 w-6" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        placeholder="Search by city, neighborhood, or landmark..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearchInputChange(e.target.value)}
                                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                        className="w-full pl-14 pr-12 py-5.5 md:py-4 text-lg bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none"
                                        autoComplete="off"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={handleClearSearch}
                                            className="absolute right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                    {isSearching && (
                                        <Loader2 className="absolute right-4 h-5 w-5 animate-spin text-[#FF385C]" />
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    className="px-8 py-5.5 md:py-4 bg-[#FF385C] text-white font-semibold text-lg hover:bg-[#E31C5F] active:scale-95 transition-all flex items-center gap-2 m-1.5 rounded-xl shadow-md"
                                >
                                    <Search className="h-5 w-5" />
                                    <span className="hidden sm:inline">Search</span>
                                </button>
                            </div>
                        </form>

                        {/* Autocomplete Suggestions */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div
                                ref={suggestionsRef}
                                className="absolute top-[calc(100%+0.5rem)] left-0 right-0 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden z-50 max-h-80 overflow-y-auto transform origin-top animate-in fade-in slide-in-from-top-2 duration-200"
                            >
                                {suggestions.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSelectSuggestion(suggestion)}
                                        className="w-full px-5 py-3.5 text-left hover:bg-[#FF385C]/5 flex items-start gap-4 border-b border-gray-50 last:border-0 transition-colors group"
                                    >
                                        <div className="bg-[#FF385C]/10 p-2 rounded-full group-hover:bg-[#FF385C]/20 transition-colors">
                                            <MapPin className="h-4 w-4 text-[#FF385C] flex-shrink-0" />
                                        </div>
                                        <div className="min-w-0 flex-1 pt-0.5">
                                            <div className="font-semibold text-gray-900 truncate">
                                                {suggestion.displayName.split(',')[0]}
                                            </div>
                                            <div className="text-sm text-gray-500 truncate mt-0.5">
                                                {suggestion.displayName.split(',').slice(1, 3).join(',')}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Quick actions */}
                        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                            <button
                                onClick={handleUseMyLocation}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 hover:bg-white backdrop-blur-sm border border-gray-200/60 shadow-sm text-gray-700 font-medium text-sm transition-all hover:shadow hover:-translate-y-0.5"
                            >
                                <Navigation className="w-4 h-4 text-blue-500" />
                                Use My Location
                            </button>
                            
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm border shadow-sm font-medium text-sm transition-all hover:shadow hover:-translate-y-0.5 ${showFilters ? 'bg-white border-[#FF385C]/30 text-[#FF385C] ring-1 ring-[#FF385C]/20' : 'bg-white/60 hover:bg-white border-gray-200/60 text-gray-700'}`}
                            >
                                <Filter className={`w-4 h-4 ${showFilters ? 'text-[#FF385C]' : 'text-gray-500'}`} />
                                Filter Results
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showFilters ? 'rotate-180 text-[#FF385C]' : 'text-gray-400'}`} />
                            </button>
                        </div>

                        {/* Filters Panel */}
                        {showFilters && (
                            <div className="absolute top-full left-0 right-0 mt-4 bg-white/95 backdrop-blur-xl rounded-2xl p-5 border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.08)] z-40 animate-in fade-in slide-in-from-top-4 duration-300">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-gray-700 text-sm font-semibold flex items-center gap-2">
                                            Search Radius
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={radius}
                                                onChange={(e) => setRadius(Number(e.target.value))}
                                                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]/30 focus:border-[#FF385C] appearance-none"
                                            >
                                                <option value={25}>Within 25 km</option>
                                                <option value={50}>Within 50 km</option>
                                                <option value={100}>Within 100 km</option>
                                                <option value={200}>Within 200 km</option>
                                                <option value={500}>Within 500 km</option>
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-gray-700 text-sm font-semibold flex items-center gap-2">
                                            Minimum Agent Rating
                                        </label>
                                        <div className="flex gap-2">
                                            {[
                                                { val: null, label: 'Any' }, 
                                                { val: 3, label: '3.0+' }, 
                                                { val: 4, label: '4.0+' }, 
                                                { val: 4.5, label: '4.5+' }
                                            ].map((r) => (
                                                <button
                                                    key={r.val ?? 'any'}
                                                    onClick={() => setMinRating(r.val)}
                                                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                                        minRating === r.val
                                                        ? 'bg-[#FF385C] text-white shadow-md shadow-[#FF385C]/20'
                                                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                                    }`}
                                                >
                                                    {r.label}
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
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 text-gray-700 text-sm font-medium bg-gray-50 px-4 py-2 rounded-full border border-gray-100 inline-flex w-fit">
                        {currentLocationName ? (
                            <>
                                <div className="p-1 bg-[#FF385C]/10 rounded-full">
                                    <MapPin className="w-4 h-4 text-[#FF385C]" />
                                </div>
                                <span className="truncate max-w-[200px] sm:max-w-xs">{currentLocationName}</span>
                                <span className="text-gray-300">•</span>
                                <span className="text-[#FF385C] font-semibold">{radius} km</span>
                            </>
                        ) : locationStatus === 'detecting' ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                <span>Detecting location...</span>
                            </>
                        ) : (
                            <>
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span>Location pending</span>
                            </>
                        )}
                    </div>

                    {/* View Toggle & Actions */}
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                        <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-3 py-1.5 rounded-full">
                            {agents.length} <span className="text-gray-500 font-normal">agent{agents.length !== 1 ? 's' : ''} found</span>
                        </span>
                        
                        <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner border border-gray-200/50">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${viewMode === 'list'
                                    ? 'bg-white text-gray-900 shadow-md transform scale-100'
                                    : 'text-gray-500 hover:text-gray-700 scale-95 hover:bg-gray-200/50'
                                    }`}
                            >
                                <List className={`h-4 w-4 mr-2 ${viewMode === 'list' ? 'text-[#FF385C]' : ''}`} />
                                List
                            </button>
                            <button
                                onClick={() => setViewMode('map')}
                                className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${viewMode === 'map'
                                    ? 'bg-white text-gray-900 shadow-md transform scale-100'
                                    : 'text-gray-500 hover:text-gray-700 scale-95 hover:bg-gray-200/50'
                                    }`}
                            >
                                <MapIcon className={`h-4 w-4 mr-2 ${viewMode === 'map' ? 'text-[#FF385C]' : ''}`} />
                                Map
                            </button>
                        </div>
                        
                        <button
                            onClick={fetchAgents}
                            disabled={isLoading}
                            className={`p-2.5 rounded-xl border transition-all ${isLoading ? 'bg-gray-100 text-gray-400 border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'}`}
                            title="Refresh agents"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content - Exclusive Views */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                {/* LIST VIEW - Full Width */}
                {viewMode === 'list' && (
                    <div className="w-full animate-in fade-in duration-500">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-[#FF385C]/20 rounded-full animate-pulse"></div>
                                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[#FF385C] rounded-full animate-spin border-t-transparent"></div>
                                </div>
                                <p className="text-gray-600 font-medium mt-6 text-lg">Locating top agents near you...</p>
                            </div>
                        ) : agents.length === 0 ? (
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center max-w-2xl mx-auto transform transition-all hover:shadow-md">
                                <div className="w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                    <Users className="w-10 h-10 text-gray-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-3">No agents found here</h3>
                                <p className="text-gray-500 mb-8 text-lg">
                                    We couldn't find any verified agents in this specific area. Try expanding your search radius to see more options.
                                </p>
                                <button
                                    onClick={() => setRadius(500)}
                                    className="px-8 py-3.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 mx-auto"
                                >
                                    <MapIcon className="w-5 h-5" />
                                    Search within 500 km
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
                                {agents.map((agent, i) => (
                                    <div
                                        key={agent.id}
                                        className="animate-in fade-in slide-in-from-bottom-8 fill-mode-both"
                                        style={{ animationDelay: `${i * 75}ms`, animationDuration: '600ms' }}
                                    >
                                        <AgentCard agent={agent} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* MAP VIEW - Full Width */}
                {viewMode === 'map' && (
                    <div className="w-full animate-in zoom-in-95 fade-in duration-500">
                        <div className="h-[calc(100vh-280px)] min-h-[600px] rounded-3xl overflow-hidden shadow-xl border border-gray-200/60 relative group">
                            <AgentSearchMap
                                agents={agents}
                                center={center}
                                radiusKm={radius}
                            />
                        </div>

                        {/* Agent count overlay */}
                        {agents.length > 0 && (
                            <div className="mt-6 text-center">
                                <p className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 font-medium rounded-full border border-gray-200">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    Showing <span className="font-bold text-gray-900">{agents.length}</span> verified agents on the map
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
