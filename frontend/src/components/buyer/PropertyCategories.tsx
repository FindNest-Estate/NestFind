'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Waves,
    Mountain,
    Home,
    Sparkles,
    Trees,
    Building2,
    MapPin,
    TrendingUp,
    Landmark,
    Heart,
    Sun,
    Palmtree
} from 'lucide-react';

interface Category {
    id: string;
    name: string;
    icon: any;
    gradient: string;
}

const categories: Category[] = [
    { id: 'all', name: 'All Properties', icon: Home, gradient: 'from-gray-500 to-gray-600' },
    { id: 'waterfront', name: 'Waterfront', icon: Waves, gradient: 'from-blue-500 to-cyan-500' },
    { id: 'mountain', name: 'Mountain Views', icon: Mountain, gradient: 'from-purple-500 to-indigo-600' },
    { id: 'luxury', name: 'Luxury', icon: Sparkles, gradient: 'from-amber-500 to-yellow-600' },
    { id: 'countryside', name: 'Countryside', icon: Trees, gradient: 'from-emerald-500 to-green-600' },
    { id: 'urban', name: 'Urban Living', icon: Building2, gradient: 'from-rose-500 to-pink-600' },
    { id: 'beachfront', name: 'Beachfront', icon: Palmtree, gradient: 'from-orange-500 to-red-500' },
    { id: 'historic', name: 'Historic', icon: Landmark, gradient: 'from-stone-500 to-slate-600' },
    { id: 'new', name: 'New Construction', icon: TrendingUp, gradient: 'from-teal-500 to-cyan-600' },
    { id: 'family', name: 'Family Homes', icon: Heart, gradient: 'from-pink-500 to-rose-600' },
    { id: 'sunny', name: 'Sunny', icon: Sun, gradient: 'from-yellow-400 to-orange-500' },
    { id: 'downtown', name: 'Downtown', icon: MapPin, gradient: 'from-indigo-500 to-purple-600' }
];

interface PropertyCategoriesProps {
    onCategoryChange?: (categoryId: string) => void;
    selectedCategory?: string;
}

export default function PropertyCategories({ onCategoryChange, selectedCategory = 'all' }: PropertyCategoriesProps) {
    const [activeCategory, setActiveCategory] = useState(selectedCategory);

    const handleCategoryClick = (categoryId: string) => {
        setActiveCategory(categoryId);
        onCategoryChange?.(categoryId);
    };

    return (
        <div className="relative mb-8">
            {/* Gradient fade on edges */}
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

            {/* Scrollable container */}
            <div className="overflow-x-auto custom-scrollbar pb-3 -mx-4 px-4">
                <div className="flex gap-3 min-w-max">
                    {categories.map((category, index) => {
                        const Icon = category.icon;
                        const isActive = activeCategory === category.id;

                        return (
                            <motion.button
                                key={category.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => handleCategoryClick(category.id)}
                                className={`group relative flex flex-col items-center gap-2 px-5 py-3 rounded-xl transition-all duration-300 ${isActive
                                        ? 'bg-white shadow-lg scale-105'
                                        : 'hover:bg-white/50 hover:shadow-md'
                                    }`}
                            >
                                {/* Active indicator */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeCategory"
                                        className="absolute inset-0 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border-2 border-rose-500"
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                    />
                                )}

                                <div className="relative z-10 flex flex-col items-center gap-2">
                                    {/* Icon with gradient background */}
                                    <div
                                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.gradient} flex items-center justify-center transition-transform ${isActive ? 'scale-110 shadow-lg' : 'group-hover:scale-105'
                                            }`}
                                    >
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>

                                    {/* Label */}
                                    <span
                                        className={`text-sm font-semibold whitespace-nowrap transition-colors ${isActive ? 'text-rose-600' : 'text-gray-700 group-hover:text-gray-900'
                                            }`}
                                    >
                                        {category.name}
                                    </span>
                                </div>

                                {/* Subtle glow effect on hover */}
                                <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${category.gradient} blur-xl -z-10`} style={{ filter: 'blur(20px)' }} />
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Active category info */}
            {activeCategory !== 'all' && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 px-4 py-3 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-100"
                >
                    <p className="text-sm text-gray-700">
                        <span className="font-semibold text-rose-600">
                            {categories.find(c => c.id === activeCategory)?.name}
                        </span>
                        {' '}- Showing properties matching this category
                        <button
                            onClick={() => handleCategoryClick('all')}
                            className="ml-3 text-rose-600 hover:text-rose-700 underline font-medium"
                        >
                            Clear filter
                        </button>
                    </p>
                </motion.div>
            )}
        </div>
    );
}
