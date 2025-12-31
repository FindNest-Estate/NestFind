/**
 * User Home Page
 * 
 * Landing page for authenticated USER role (buyers/sellers).
 * Users are redirected here after login via /dashboard router.
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface UserResponse {
    id: string;
    full_name: string;
    email: string;
    role: 'USER' | 'AGENT' | 'ADMIN';
    status: string;
}

async function getAuthUser(): Promise<UserResponse | null> {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
        return null;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/user/me`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch {
        return null;
    }
}

export default async function UserHomePage() {
    const user = await getAuthUser();

    // Safety check - redirect if not authenticated
    if (!user) {
        redirect('/login');
    }

    // Verify user has USER role (backend-authoritative check)
    if (user.role !== 'USER') {
        // Wrong role - redirect to dashboard router
        redirect('/dashboard');
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* User Home Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        Welcome back, {user.full_name}!
                    </h1>
                    <p className="text-gray-600 mb-6">
                        Find your dream home or list your property on NestFind.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Browse Properties */}
                        <a
                            href="/properties"
                            className="block p-6 bg-gradient-to-br from-[#FF385C] to-[#E61E4D] rounded-xl text-white hover:shadow-lg transition-shadow"
                        >
                            <h2 className="text-xl font-semibold mb-2">Browse Properties</h2>
                            <p className="text-white/90">
                                Explore thousands of verified listings near you
                            </p>
                        </a>

                        {/* Find an Agent */}
                        <a
                            href="/agents"
                            className="block p-6 bg-gray-900 rounded-xl text-white hover:shadow-lg transition-shadow"
                        >
                            <h2 className="text-xl font-semibold mb-2">Find an Agent</h2>
                            <p className="text-white/90">
                                Connect with trusted real estate professionals
                            </p>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
