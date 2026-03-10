'use client';

import { useAuth } from '@/lib/auth';
import { UserRole } from '@/lib/auth/types';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Check } from 'lucide-react';

export default function ContextSwitcher() {
    const { user, activeContext, switchContext } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user || !user.roles || user.roles.length <= 1) {
        return null; // Don't show if user has only one role
    }

    const availableRoles = user.roles.filter(role => role !== UserRole.ADMIN); // Admin uses separate portal

    // Sort roles for display: Buyer -> Seller -> Agent
    const roleOrder = [UserRole.BUYER, UserRole.SELLER, UserRole.AGENT];
    availableRoles.sort((a, b) => roleOrder.indexOf(a) - roleOrder.indexOf(b));

    const handleSwitch = (role: UserRole) => {
        switchContext(role);
        setIsOpen(false);

        // Redirect logic based on context
        if (role === UserRole.AGENT) router.push('/agent/dashboard');
        else if (role === UserRole.SELLER) router.push('/sell/dashboard');
        else if (role === UserRole.BUYER) router.push('/home'); // or /buyer/dashboard
    };

    const getRoleLabel = (role: UserRole) => {
        switch (role) {
            case UserRole.BUYER: return 'Buyer';
            case UserRole.SELLER: return 'Seller';
            case UserRole.AGENT: return 'Agent';
            default: return role;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
            >
                <span className="text-gray-500">View as:</span>
                <span className="text-gray-900">{getRoleLabel(activeContext || UserRole.BUYER)}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Switch Context
                    </div>
                    {availableRoles.map((role) => (
                        <button
                            key={role}
                            onClick={() => handleSwitch(role)}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-gray-50 transition-colors ${activeContext === role ? 'text-[#FF385C] font-semibold bg-red-50/50' : 'text-gray-700'
                                }`}
                        >
                            <span>{getRoleLabel(role)}</span>
                            {activeContext === role && <Check size={16} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
