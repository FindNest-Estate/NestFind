"use client";
import { Building2, Home, Trees, Factory, Warehouse, Building, LandPlot, ChevronLeft, ChevronRight } from 'lucide-react';
import Container from '../Container';
import { useRouter, useSearchParams } from 'next/navigation';
import qs from 'query-string';
import { useRef } from 'react';

const categories = [
    { label: 'Apartment', icon: Building2, description: 'Modern living spaces' },
    { label: 'Villa', icon: Home, description: 'Luxury homes' },
    { label: 'Plot', icon: LandPlot, description: 'Build your dream' },
    { label: 'Farmhouse', icon: Trees, description: 'Peaceful retreats' },
    { label: 'Commercial', icon: Building, description: 'Business spaces' },
    { label: 'Industrial', icon: Factory, description: 'Industrial zones' },
    { label: 'Warehouse', icon: Warehouse, description: 'Storage solutions' },
];

export default function CategoryBar() {
    const router = useRouter();
    const params = useSearchParams();
    const category = params?.get('category');
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleClick = (label: string) => {
        let currentQuery = {};

        if (params) {
            currentQuery = qs.parse(params.toString());
        }

        const updatedQuery: any = {
            ...currentQuery,
            category: label
        };

        if (params?.get('category') === label) {
            delete updatedQuery.category;
        }

        const url = qs.stringifyUrl({
            url: '/',
            query: updatedQuery
        }, { skipNull: true });

        router.push(url);
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = direction === 'left' ? -200 : 200;
            scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    return (
        <div className="bg-white border-b border-gray-100 sticky top-[72px] z-40">
            <Container>
                <div className="py-4 relative">
                    {/* Left Arrow */}
                    <button
                        onClick={() => scroll('left')}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-sm flex items-center justify-center hover:shadow-md transition-shadow hidden md:flex"
                    >
                        <ChevronLeft size={16} className="text-gray-600" />
                    </button>

                    {/* Categories */}
                    <div
                        ref={scrollRef}
                        className="flex gap-4 overflow-x-auto scrollbar-hide px-8 md:px-10"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {categories.map((item) => {
                            const Icon = item.icon;
                            const isSelected = category === item.label;
                            return (
                                <div
                                    key={item.label}
                                    onClick={() => handleClick(item.label)}
                                    className={`
                                        flex-shrink-0 flex flex-col items-center justify-center py-3 px-4 rounded-xl cursor-pointer transition-all duration-200
                                        ${isSelected
                                            ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
                                            : 'hover:bg-gray-50 text-gray-500 hover:text-gray-800'
                                        }
                                    `}
                                >
                                    <div className={`
                                        w-10 h-10 rounded-lg flex items-center justify-center mb-1.5 transition-colors
                                        ${isSelected ? 'bg-rose-100' : 'bg-gray-100'}
                                    `}>
                                        <Icon size={20} />
                                    </div>
                                    <div className="font-semibold text-xs">{item.label}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right Arrow */}
                    <button
                        onClick={() => scroll('right')}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-sm flex items-center justify-center hover:shadow-md transition-shadow hidden md:flex"
                    >
                        <ChevronRight size={16} className="text-gray-600" />
                    </button>
                </div>
            </Container>
        </div>
    );
}
