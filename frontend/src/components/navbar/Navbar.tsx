"use client";
import Link from 'next/link';
import { Search, Globe, Menu, User } from 'lucide-react';
import Container from '../Container';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { user, logout } = useAuth();
    const pathname = usePathname();

    const isHome = pathname === '/';

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navbarClasses = `fixed w-full z-50 transition-all duration-300 ${isHome && !scrolled ? 'bg-transparent py-6' : 'bg-white shadow-sm py-4'
        }`;

    const textClasses = isHome && !scrolled ? 'text-white' : 'text-gray-800';
    const logoClasses = isHome && !scrolled ? 'text-white' : 'text-rose-500';

    return (
        <div className={navbarClasses}>
            <Container>
                <div className="flex flex-row items-center justify-between gap-3 md:gap-0">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-1 group">
                        <span className={`${logoClasses} font-extrabold text-2xl tracking-tighter transition-colors`}>NestFind</span>
                    </Link>

                    {/* Middle Links */}
                    <div className={`hidden md:flex items-center gap-8 font-semibold ${textClasses}`}>
                        <Link href="/properties?listing_type=sale" className="hover:opacity-80 transition">Buy</Link>
                        <Link href="/properties?listing_type=rent" className="hover:opacity-80 transition">Rent</Link>
                        <Link href="/sell" className="hover:opacity-80 transition">Sell</Link>
                        <Link href="/loans" className="hover:opacity-80 transition">Loans</Link>
                        <Link href="/find-agent" className="hover:opacity-80 transition">Find Agent</Link>
                    </div>

                    {/* User Menu */}
                    <div className="relative">
                        <div className="flex flex-row items-center gap-3">
                            <div className={`hidden md:block text-sm font-semibold py-3 px-4 rounded-full hover:bg-neutral-100/20 transition cursor-pointer ${textClasses}`}>
                                <Globe size={18} />
                            </div>
                            <div
                                onClick={() => setIsOpen(!isOpen)}
                                className="p-4 md:py-1 md:px-2 flex flex-row items-center gap-3 rounded-full cursor-pointer hover:shadow-md transition shadow-sm bg-white border border-neutral-200"
                            >
                                <Menu className="text-gray-600" />
                                <div className="hidden md:block">
                                    <div className="bg-gray-500 rounded-full p-1">
                                        {user ? (
                                            <div className="w-[30px] h-[30px] rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
                                                {user.first_name[0]}
                                            </div>
                                        ) : (
                                            <User className="text-white" size={18} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dropdown Menu */}
                        {isOpen && (
                            <div className="absolute rounded-xl shadow-md w-[40vw] md:w-3/4 bg-white overflow-hidden right-0 top-12 text-sm text-gray-800">
                                <div className="flex flex-col cursor-pointer">
                                    {user ? (
                                        <>
                                            <Link href="/messages" className="px-4 py-3 hover:bg-neutral-100 transition font-semibold">
                                                Messages
                                            </Link>
                                            <Link href="/dashboard" className="px-4 py-3 hover:bg-neutral-100 transition font-semibold">
                                                Dashboard
                                            </Link>
                                            <div onClick={logout} className="px-4 py-3 hover:bg-neutral-100 transition">
                                                Logout
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Link href="/login" className="px-4 py-3 hover:bg-neutral-100 transition font-semibold">
                                                Login
                                            </Link>
                                            <Link href="/signup" className="px-4 py-3 hover:bg-neutral-100 transition">
                                                Sign up
                                            </Link>
                                        </>
                                    )}
                                    <hr />
                                    <Link href="/find-agent" className="px-4 py-3 hover:bg-neutral-100 transition md:hidden">
                                        Find Agent
                                    </Link>
                                    <div className="px-4 py-3 hover:bg-neutral-100 transition">
                                        Help Center
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Container>
        </div>
    );
}

