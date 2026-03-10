'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import NotificationBell from './NotificationBell';
import ContextSwitcher from './ContextSwitcher';
import BecomeSellerButton from './BecomeSellerButton';
import { UserRole } from '@/lib/auth/types';
import {
    Menu,
    User,
    Settings,
    LogOut,
    LayoutDashboard,
    Search,
    Home as HomeIcon,
    Handshake,
    Building2,
    Users,
    ClipboardList,
    Shield,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
    const { user, isLoading, logout, activeContext, switchContext } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        setIsLoggingOut(true);
        setIsDropdownOpen(false);
        logout();
    };

    const getInitials = (name: string) =>
        name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const renderNavLinks = () => {
        if (!activeContext) return null;
        switch (activeContext) {
            case UserRole.BUYER:
                return (
                    <>
                        <li><Link href="/buyer/dashboard" className="nav-link"><LayoutDashboard className="w-4 h-4" />Dashboard</Link></li>
                        <li><Link href="/properties" className="nav-link"><Search className="w-4 h-4" />Buy / Rent</Link></li>
                        <li><Link href="/agents" className="nav-link"><Users className="w-4 h-4" />Find Agent</Link></li>
                    </>
                );
            case UserRole.SELLER:
                return (
                    <>
                        <li><Link href="/sell/dashboard" className="nav-link"><LayoutDashboard className="w-4 h-4" />Dashboard</Link></li>
                        <li><Link href="/sell/properties" className="nav-link"><Building2 className="w-4 h-4" />My Properties</Link></li>
                        <li><Link href="/sell/deals" className="nav-link"><Handshake className="w-4 h-4" />Deals</Link></li>
                    </>
                );
            case UserRole.AGENT:
                return (
                    <>
                        <li><Link href="/agent/dashboard" className="nav-link"><LayoutDashboard className="w-4 h-4" />Dashboard</Link></li>
                        <li><Link href="/agent/crm" className="nav-link"><Users className="w-4 h-4" />CRM</Link></li>
                        <li><Link href="/agent/listings" className="nav-link"><ClipboardList className="w-4 h-4" />Listings</Link></li>
                    </>
                );
            default:
                return <li><Link href="/properties" className="nav-link">Buy</Link></li>;
        }
    };

    /* Menu items for dropdown */
    const menuItems = [
        ...(user?.roles?.includes(UserRole.BUYER) ? [
            { label: 'Buyer Dashboard', icon: LayoutDashboard, action: 'BUYER', href: '/buyer/dashboard' },
        ] : []),
        ...(user?.roles?.includes(UserRole.SELLER) ? [
            { label: 'Seller Dashboard', icon: HomeIcon, action: 'SELLER', href: '/sell/dashboard' },
        ] : []),
        ...(user?.roles?.includes(UserRole.ADMIN) ? [
            { href: '/admin/agents', label: 'Admin Panel', icon: Shield },
        ] : []),
        { href: '/profile', label: 'My Profile', icon: User },
        { href: '/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <nav className="navbar">
            <div className="navbar-container">
                {/* Logo */}
                <Link
                    href={
                        activeContext === UserRole.AGENT ? '/agent/dashboard' :
                            activeContext === UserRole.SELLER ? '/sell/dashboard' : '/'
                    }
                    className="flex items-center gap-2 font-bold text-xl tracking-tight transition-transform hover:scale-[1.02]"
                >
                    <span style={{ background: 'linear-gradient(to right, var(--color-brand), #ff6b81)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                        NestFind
                    </span>
                </Link>

                {/* Nav links */}
                <ul className="nav-links">{renderNavLinks()}</ul>

                {/* Right side */}
                <div className="auth-buttons">
                    {isLoading ? (
                        <div className="w-9 h-9 rounded-full bg-[var(--gray-200)] animate-pulse" />
                    ) : user ? (
                        <div className="flex items-center gap-3">
                            <BecomeSellerButton />
                            <ContextSwitcher />
                            <NotificationBell />

                            {/* Profile trigger */}
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="flex items-center gap-2 rounded-full border border-[var(--gray-200)] hover:shadow-md transition-all hover:-translate-y-0.5 bg-white pl-3 pr-1.5 py-1.5"
                                >
                                    <Menu className="w-4 h-4 text-[var(--gray-600)]" />
                                    <div
                                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                        style={{ background: 'var(--color-brand)' }}
                                    >
                                        {getInitials(user.full_name)}
                                    </div>
                                </button>

                                {/* Dropdown */}
                                {isDropdownOpen && (
                                    <div
                                        className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl overflow-hidden z-[var(--z-dropdown)] shadow-xl border border-[var(--gray-200)] origin-top-right transition-all duration-200"
                                    >
                                        {/* User header */}
                                        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--gray-200)] bg-[var(--gray-50)]">
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                                                style={{ background: 'var(--color-brand)' }}
                                            >
                                                {getInitials(user.full_name)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-[var(--gray-900)] text-sm truncate">{user.full_name}</p>
                                                <p className="text-xs text-[var(--gray-500)] truncate">{user.email}</p>
                                            </div>
                                        </div>

                                        {/* Links */}
                                        <div className="py-1">
                                            {menuItems.map(item => {
                                                if (item.action) {
                                                    return (
                                                        <button
                                                            key={item.label}
                                                            onClick={async () => {
                                                                if (activeContext !== item.action) {
                                                                    switchContext(item.action as UserRole);
                                                                }
                                                                setIsDropdownOpen(false);
                                                                router.push(item.href as string);
                                                            }}
                                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--gray-700)] hover:bg-[var(--gray-50)] transition-colors"
                                                        >
                                                            <item.icon className="w-4 h-4 text-[var(--gray-400)]" />
                                                            {item.label}
                                                        </button>
                                                    );
                                                }
                                                return (
                                                    <Link
                                                        key={item.label}
                                                        href={item.href as string}
                                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--gray-700)] hover:bg-[var(--gray-50)] transition-colors"
                                                        onClick={() => setIsDropdownOpen(false)}
                                                    >
                                                        <item.icon className="w-4 h-4 text-[var(--gray-400)]" />
                                                        {item.label}
                                                    </Link>
                                                );
                                            })}
                                        </div>

                                        {/* Logout */}
                                        <div className="border-t border-[var(--gray-200)] py-1">
                                            <button
                                                onClick={handleLogout}
                                                disabled={isLoggingOut}
                                                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[var(--gray-700)] hover:bg-[var(--color-error-bg)] hover:text-[var(--color-error)] transition-colors disabled:opacity-50"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                {isLoggingOut ? 'Logging out…' : 'Sign Out'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <Link href="/login" className="login-btn">Login</Link>
                            <Link href="/register" className="signup-btn">Sign up</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
