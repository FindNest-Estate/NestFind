"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

export default function HeroSearch() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"buy" | "rent">("buy");
    const [location, setLocation] = useState("");
    const [propertyType, setPropertyType] = useState("");
    const [priceRange, setPriceRange] = useState("");

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (activeTab === "rent") params.append("listing_type", "rent");
        else params.append("listing_type", "sale");

        if (location) params.append("location", location);
        if (propertyType) params.append("property_type", propertyType);

        router.push(`/properties?${params.toString()}`);
    };

    return (
        <div className="w-full max-w-3xl mx-auto px-4">
            {/* Tabs */}
            <div className="flex justify-center mb-4">
                <div className="bg-black/30 backdrop-blur-md p-1 rounded-full inline-flex">
                    <button
                        onClick={() => setActiveTab("buy")}
                        className={`px-5 py-2 rounded-full font-medium text-sm transition-all duration-300 ${activeTab === "buy"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-white hover:bg-white/10"
                            }`}
                    >
                        Buy
                    </button>
                    <button
                        onClick={() => setActiveTab("rent")}
                        className={`px-5 py-2 rounded-full font-medium text-sm transition-all duration-300 ${activeTab === "rent"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-white hover:bg-white/10"
                            }`}
                    >
                        Rent
                    </button>
                </div>
            </div>

            {/* Search Bar Container - Pill Style */}
            <div className="bg-white rounded-full p-2 shadow-xl">
                <div className="flex flex-col md:flex-row items-center">

                    {/* Location */}
                    <div className="w-full md:flex-1 px-4 py-2 md:border-r border-gray-200">
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Location</label>
                        <input
                            type="text"
                            placeholder="City, Neighborhood..."
                            className="w-full bg-transparent outline-none text-gray-900 text-sm font-medium placeholder:text-gray-400"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                        />
                    </div>

                    {/* Type */}
                    <div className="w-full md:flex-1 px-4 py-2 md:border-r border-gray-200">
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Type</label>
                        <select
                            className="w-full bg-transparent outline-none text-gray-900 text-sm font-medium appearance-none cursor-pointer"
                            value={propertyType}
                            onChange={(e) => setPropertyType(e.target.value)}
                        >
                            <option value="">Any Type</option>
                            <option value="apartment">Apartment</option>
                            <option value="house">House</option>
                            <option value="villa">Villa</option>
                            <option value="commercial">Commercial</option>
                        </select>
                    </div>

                    {/* Price */}
                    <div className="w-full md:flex-1 px-4 py-2">
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Price</label>
                        <select
                            className="w-full bg-transparent outline-none text-gray-900 text-sm font-medium appearance-none cursor-pointer"
                            value={priceRange}
                            onChange={(e) => setPriceRange(e.target.value)}
                        >
                            <option value="">Any Price</option>
                            <option value="0-500000">Under ₹50L</option>
                            <option value="500000-1000000">₹50L - ₹1Cr</option>
                            <option value="1000000-2000000">₹1Cr - ₹2Cr</option>
                            <option value="2000000+">₹2Cr+</option>
                        </select>
                    </div>

                    {/* Search Button */}
                    <div className="p-1.5">
                        <button
                            onClick={handleSearch}
                            className="w-10 h-10 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center active:scale-95"
                        >
                            <Search size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
