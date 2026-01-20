'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Command, X, ArrowRight, User, Building2, FileText, Loader2, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { globalSearch, SearchResult } from '@/lib/api/admin';

export default function AdminSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // Toggle with Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
                inputRef.current?.blur();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Construct debounced search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setLoading(true);
                const data = await globalSearch(query);
                setResults(data);
                setLoading(false);
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const quickLinks = [
        { label: 'User Management', href: '/admin/users', icon: User },
        { label: 'Agent Approvals', href: '/admin/agents', icon: User },
        { label: 'Properties', href: '/admin/properties', icon: Building2 },
        { label: 'Transactions', href: '/admin/transactions', icon: FileText },
    ];

    const handleSelect = (href: string) => {
        router.push(href);
        setIsOpen(false);
        setQuery('');
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'user': return <User className="w-4 h-4" />;
            case 'agent': return <User className="w-4 h-4 text-purple-500" />;
            case 'property': return <Home className="w-4 h-4 text-emerald-500" />;
            case 'transaction': return <FileText className="w-4 h-4 text-amber-500" />;
            default: return <Search className="w-4 h-4" />;
        }
    };

    // Group results by type
    const groupedResults = results.reduce((acc, result) => {
        const type = result.type === 'agent' ? 'user' : result.type;
        const key = type === 'user' || type === 'agent' ? 'Users & Agents' :
            type === 'property' ? 'Properties' :
                type === 'transaction' ? 'Transactions' : 'Other';
        if (!acc[key]) acc[key] = [];
        acc[key].push(result);
        return acc;
    }, {} as Record<string, SearchResult[]>);

    return (
        <div ref={containerRef} className="relative z-50">
            {/* Navbar Input Bar */}
            <div className={`relative flex items-center transition-all duration-200 ${isOpen ? 'w-[500px]' : 'w-96'}`}>
                <Search className={`absolute left-4 w-4 h-4 transition-colors ${isOpen ? 'text-emerald-500' : 'text-slate-400'}`} />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search users, properties, transactions..."
                    className={`w-full pl-10 pr-12 py-2.5 bg-slate-50 border rounded-xl text-sm transition-all outline-none 
                        ${isOpen
                            ? 'bg-white border-emerald-500 ring-4 ring-emerald-500/10 shadow-lg text-slate-900 placeholder:text-slate-400'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600 placeholder:text-slate-500'
                        }`}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                />

                {/* Right Actions */}
                <div className="absolute right-3 flex items-center gap-2">
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    ) : (
                        <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded bg-white border border-slate-200 px-1.5 font-mono text-[10px] font-medium text-slate-400">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    )}
                </div>
            </div>

            {/* Dropdown Results */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden max-h-[70vh] flex flex-col antialiased"
                    >
                        <div className="overflow-y-auto p-2 scrollbar-hide">
                            {query === '' ? (
                                <div className="p-1">
                                    <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                        Quick Navigation
                                    </p>
                                    <div className="grid grid-cols-1 gap-1">
                                        {quickLinks.map((link) => (
                                            <button
                                                key={link.href}
                                                onClick={() => handleSelect(link.href)}
                                                className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 rounded-lg hover:bg-slate-50 group transition-all"
                                            >
                                                <div className="p-1.5 bg-slate-100 rounded-md text-slate-500 group-hover:bg-white group-hover:text-emerald-600 group-hover:shadow-sm transition-all">
                                                    <link.icon className="w-4 h-4" />
                                                </div>
                                                <span className="font-medium">{link.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : results.length > 0 ? (
                                <div className="space-y-4 p-1">
                                    {Object.entries(groupedResults).map(([category, items]) => (
                                        <div key={category}>
                                            <p className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-white/95 sticky top-0 z-10 backdrop-blur-sm">
                                                {category}
                                            </p>
                                            <div className="space-y-1">
                                                {items.map((result) => (
                                                    <button
                                                        key={result.id}
                                                        onClick={() => handleSelect(result.url)}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-emerald-50/50 group transition-colors border border-transparent hover:border-emerald-100"
                                                    >
                                                        <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-white group-hover:text-emerald-600 group-hover:shadow-sm transition-all">
                                                            {getIcon(result.type)}
                                                        </div>
                                                        <div className="flex-1 text-left">
                                                            <p className="font-medium text-slate-900 group-hover:text-emerald-700">
                                                                {result.title}
                                                            </p>
                                                            <p className="text-xs text-slate-500 truncate max-w-[280px]">
                                                                {result.subtitle}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center text-slate-500">
                                    {loading ? (
                                        <div className="space-y-2">
                                            <p className="text-sm">Searching ecosystem...</p>
                                        </div>
                                    ) : (
                                        <div className="opacity-60">
                                            <Search className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                                            <p className="text-sm font-medium">No matches found</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Hint */}
                        <div className="px-3 py-2 bg-slate-50 border-t border-slate-100/50 text-[10px] text-slate-400 flex justify-between">
                            <span>Press <kbd className="font-sans">↵</kbd> to select</span>
                            <span><kbd className="font-sans">ESC</kbd> to close</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

