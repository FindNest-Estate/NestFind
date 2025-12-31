'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logout } from '@/lib/authApi';

interface User {
    id: string;
    full_name: string;
    email: string;
    role: string;
    status: string;
}

export default function Navbar() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Check if user is logged in
        const checkAuth = async () => {
            try {
                const userData = await getCurrentUser();
                setUser(userData);
            } catch {
                // Not logged in
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
        } catch {
            // Ignore errors
        }
        setUser(null);
        setIsDropdownOpen(false);
        router.push('/');
        router.refresh();
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link href="/" className="logo" style={{ color: '#FF385C', fontWeight: 700, fontSize: '1.5rem' }}>
                    NestFind
                </Link>
                <ul className="nav-links">
                    <li><Link href="/sell">Sell</Link></li>
                    <li><a href="#buy">Buy</a></li>
                    <li><a href="#rent">Rent</a></li>
                    <li><a href="#loans">Loans</a></li>
                    <li><Link href="/find-agent">Find Agent</Link></li>
                </ul>
                <div className="auth-buttons">
                    {isLoading ? (
                        <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
                    ) : user ? (
                        // Logged in - show profile dropdown
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center gap-3 rounded-full border border-gray-300 hover:shadow-lg transition-all duration-200 bg-white"
                                style={{
                                    padding: '8px 8px 8px 14px',
                                    borderWidth: '1.5px'
                                }}
                            >
                                {/* Hamburger menu icon */}
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-gray-700">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                </svg>
                                {/* Profile avatar with initials */}
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                    style={{
                                        background: 'linear-gradient(135deg, #FF385C 0%, #BD1E59 100%)',
                                        boxShadow: '0 2px 8px rgba(255, 56, 92, 0.3)'
                                    }}
                                >
                                    {getInitials(user.full_name)}
                                </div>
                            </button>

                            {/* Dropdown menu */}
                            {isDropdownOpen && (
                                <div
                                    className="absolute right-0 top-full mt-3 w-80 bg-white rounded-2xl overflow-hidden z-50"
                                    style={{
                                        boxShadow: '0 4px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)',
                                        animation: 'fadeIn 0.15s ease-out'
                                    }}
                                >
                                    {/* User info header */}
                                    <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)' }}>
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                                                style={{
                                                    background: 'linear-gradient(135deg, #FF385C 0%, #BD1E59 100%)',
                                                    boxShadow: '0 2px 8px rgba(255, 56, 92, 0.25)'
                                                }}
                                            >
                                                {getInitials(user.full_name)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-gray-900 text-lg truncate">{user.full_name}</p>
                                                <p className="text-sm text-gray-500 truncate">{user.email}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Menu items */}
                                    <div style={{ padding: '12px 16px' }}>
                                        <Link
                                            href="/profile"
                                            className="flex items-center gap-4 rounded-xl text-gray-800 hover:bg-gray-50 transition-colors"
                                            style={{ padding: '14px 12px' }}
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                                </svg>
                                            </div>
                                            <span className="font-medium text-base">My Profile</span>
                                        </Link>
                                        <Link
                                            href="/settings"
                                            className="flex items-center gap-4 rounded-xl text-gray-800 hover:bg-gray-50 transition-colors"
                                            style={{ padding: '14px 12px' }}
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            </div>
                                            <span className="font-medium text-base">Settings</span>
                                        </Link>
                                    </div>

                                    {/* Logout */}
                                    <div style={{ borderTop: '1px solid #E5E7EB', padding: '12px 16px' }}>
                                        <button
                                            onClick={handleLogout}
                                            disabled={isLoggingOut}
                                            className="flex items-center gap-4 w-full rounded-xl text-gray-800 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                                            style={{ padding: '14px 12px' }}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-500">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                                                </svg>
                                            </div>
                                            <span className="font-medium text-base">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Not logged in - show auth buttons
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
