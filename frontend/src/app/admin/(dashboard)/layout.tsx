'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    LayoutDashboard,
    Users,
    Home,
    CreditCard,
    Settings,
    Bell,
    Search,
    Menu,
    X,
    LogOut,
    Shield,
    Loader2
} from 'lucide-react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const pathname = usePathname();
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                router.push('/admin/login');
            } else if (user.role !== 'admin' && user.role !== 'super_admin') {
                router.push('/login'); // Redirect unauthorized users
            }
        }
    }, [user, isLoading, router]);

    if (isLoading || !user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    <p className="text-gray-500 font-medium">Verifying access...</p>
                </div>
            </div>
        );
    }

    const navItems = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'User Management', href: '/admin/users', icon: Users },
        { name: 'Properties', href: '/admin/properties', icon: Home },
        { name: 'Financials', href: '/admin/finance', icon: CreditCard },
        { name: 'Settings', href: '/admin/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:relative lg:translate-x-0`}
            >
                <div className="h-16 flex items-center justify-between px-6 bg-slate-950">
                    <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                        <Shield className="text-indigo-500" />
                        <span>NestFind<span className="text-indigo-500">Admin</span></span>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <nav className="p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                                    : 'text-gray-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <item.icon size={18} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="absolute bottom-0 w-full p-4 border-t border-slate-800">
                    <button className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium">
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 lg:px-8">
                    <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
                        <Menu size={20} />
                    </button>

                    <div className="flex-1 max-w-lg mx-auto lg:mx-0 lg:mr-auto px-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search users, properties, deals..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm border border-indigo-200">
                            AD
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
