'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Search } from 'lucide-react';

export default function UserManagementPage() {
    // Placeholder - would fetch from API
    const [users] = useState([
        { id: '1', name: 'John Doe', email: 'john@example.com', role: 'USER', status: 'ACTIVE' },
        { id: '2', name: 'Jane Agent', email: 'jane@example.com', role: 'AGENT', status: 'ACTIVE' },
        { id: '3', name: 'Suspicious Sam', email: 'sam@example.com', role: 'USER', status: 'SUSPENDED' },
    ]);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 pt-24">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                        <p className="text-gray-600 mt-1">Manage platform users and access</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 flex gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search users by name or email..."
                                className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                    </div>

                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                            <tr>
                                <th className="p-4">Name</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="p-4">
                                        <div className="font-medium text-gray-900">{user.name}</div>
                                        <div className="text-sm text-gray-500">{user.email}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'AGENT' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button className="text-blue-600 hover:underline text-sm font-medium">Edit</button>
                                        <span className="mx-2 text-gray-300">|</span>
                                        <button className="text-red-600 hover:underline text-sm font-medium">Suspend</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
