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
        <div className="relative mb-8 bg-white border-b border-gray-100 pb-2">
            {/* Scrollable container */}
            <div className="overflow-x-auto custom-scrollbar pb-2 -mx-4 px-4">
                <div className="flex gap-6 min-w-max items-center">
                    {categories.map((category, index) => {
                        const Icon = category.icon;
                        const isActive = activeCategory === category.id;

                        return (
                            <motion.button
                                key={category.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                onClick={() => handleCategoryClick(category.id)}
                                className="group relative flex flex-col items-center gap-2 py-2 transition-all duration-200"
                            >
                                <div className="relative flex flex-col items-center gap-2">
                                    {/* Icon - Minimalist style */}
                                    <div
                                        className={`transition-colors duration-200 ${isActive ? 'text-[#FF385C]' : 'text-gray-500 group-hover:text-gray-900'
                                            }`}
                                    >
                                        <Icon className="w-6 h-6 stroke-[1.5]" />
                                    </div>

                                    {/* Label */}
                                    <span
                                        className={`text-xs font-medium whitespace-nowrap transition-colors duration-200 ${isActive ? 'text-gray-900 font-semibold' : 'text-gray-500 group-hover:text-gray-900'
                                            }`}
                                    >
                                        {category.name}
                                    </span>
                                </div>

                                {/* Minimal Active Underline */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeCategoryIndicator"
                                        className="absolute -bottom-2.5 left-0 right-0 h-[2px] bg-gray-900 rounded-full"
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                                    />
                                )}
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
                    className="mt-4 flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg border border-gray-100"
                >
                    <p className="text-sm text-gray-700">
                        <span className="font-semibold text-gray-900">
                            {categories.find(c => c.id === activeCategory)?.name}
                        </span>
                        {' '}— Selected Category
                    </p>
                    <button
                        onClick={() => handleCategoryClick('all')}
                        className="text-sm text-[#FF385C] hover:text-[#E31C5F] font-medium transition-colors"
                    >
                        Clear Filter
                    </button>
                </motion.div>
            )}
        </div>
    );
}
