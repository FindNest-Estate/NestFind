'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
    Search,
    Filter,
    MoreVertical,
    Shield,
    User,
    Briefcase,
    CheckCircle,
    XCircle,
    AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

export default function UserManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [roleFilter, setRoleFilter] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await api.admin.getUsers(roleFilter || undefined);
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users", error);
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [roleFilter]);

    const handleStatusChange = async (userId: number, currentStatus: boolean) => {
        try {
            await api.admin.updateUserStatus(userId, !currentStatus);
            toast.success(`User ${!currentStatus ? 'activated' : 'suspended'} successfully`);
            // Optimistic update
            setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
        } catch (error) {
            toast.error("Failed to update user status");
        }
    };

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"><Shield size={12} /> Admin</span>;
            case 'agent': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Briefcase size={12} /> Agent</span>;
            case 'seller': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"><Briefcase size={12} /> Seller</span>;
            default: return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><User size={12} /> Buyer</span>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500">Manage user accounts, roles, and access permissions.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors shadow-sm">
                        <User size={16} />
                        Add User
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search users by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter size={18} className="text-gray-400" />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2"
                    >
                        <option value="">All Roles</option>
                        <option value="buyer">Buyers</option>
                        <option value="seller">Sellers</option>
                        <option value="agent">Agents</option>
                        <option value="admin">Admins</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Joined</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading users...</td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No users found matching your criteria.</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                                                    {user.first_name[0]}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getRoleBadge(user.role)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <CheckCircle size={12} /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    <XCircle size={12} /> Suspended
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleStatusChange(user.id, user.is_active)}
                                                    className={`p-2 rounded-lg transition-colors ${user.is_active
                                                            ? 'text-red-500 hover:bg-red-50'
                                                            : 'text-green-500 hover:bg-green-50'
                                                        }`}
                                                    title={user.is_active ? "Suspend User" : "Activate User"}
                                                >
                                                    {user.is_active ? <XCircle size={18} /> : <CheckCircle size={18} />}
                                                </button>
                                                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                                    <MoreVertical size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
                    <span className="text-xs text-gray-500">Showing {filteredUsers.length} users</span>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 border border-gray-300 rounded bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50" disabled>Previous</button>
                        <button className="px-3 py-1 border border-gray-300 rounded bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50" disabled>Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
