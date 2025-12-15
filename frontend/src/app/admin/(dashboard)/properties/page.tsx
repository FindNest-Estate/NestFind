'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
    Search,
    Filter,
    MoreVertical,
    Home,
    MapPin,
    CheckCircle,
    XCircle,
    Clock,
    ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function PropertyManagement() {
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchProperties = async () => {
        setLoading(true);
        try {
            const data = await api.admin.getProperties(statusFilter || undefined);
            setProperties(data);
        } catch (error) {
            console.error("Failed to fetch properties", error);
            toast.error("Failed to load properties");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProperties();
    }, [statusFilter]);

    const handleStatusChange = async (propertyId: number, newStatus: string) => {
        try {
            await api.admin.updatePropertyStatus(propertyId, newStatus);
            toast.success(`Property ${newStatus === 'verified' ? 'verified' : 'rejected'} successfully`);
            // Optimistic update
            setProperties(properties.map(p => p.id === propertyId ? { ...p, status: newStatus, is_verified: newStatus === 'verified' } : p));
        } catch (error) {
            toast.error("Failed to update property status");
        }
    };

    const filteredProperties = properties.filter(property =>
        property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'verified': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle size={12} /> Verified</span>;
            case 'rejected': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle size={12} /> Rejected</span>;
            case 'pending': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock size={12} /> Pending</span>;
            default: return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Property Management</h1>
                    <p className="text-gray-500">Review and manage property listings.</p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by title or location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter size={18} className="text-gray-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending Review</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Properties Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Property</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4">Price</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Listed Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading properties...</td>
                                </tr>
                            ) : filteredProperties.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No properties found matching your criteria.</td>
                                </tr>
                            ) : (
                                filteredProperties.map((property) => (
                                    <tr key={property.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 overflow-hidden">
                                                    {property.images && property.images.length > 0 ? (
                                                        <img src={`${api.API_URL}/${property.images[0].url}`} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Home size={18} />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 line-clamp-1 max-w-[200px]">{property.title}</div>
                                                    <div className="text-xs text-gray-500">{property.property_type}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <MapPin size={14} className="text-gray-400" />
                                                <span className="line-clamp-1 max-w-[150px]">{property.location}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            ₹{property.price.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(property.status)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(property.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/properties/${property.id}`} target="_blank" className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="View Property">
                                                    <ExternalLink size={18} />
                                                </Link>
                                                {property.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleStatusChange(property.id, 'verified')}
                                                            className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                                                            title="Verify Property"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange(property.id, 'rejected')}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Reject Property"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    </>
                                                )}
                                                {property.status === 'verified' && (
                                                    <button
                                                        onClick={() => handleStatusChange(property.id, 'rejected')}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Reject Property"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                )}
                                                {property.status === 'rejected' && (
                                                    <button
                                                        onClick={() => handleStatusChange(property.id, 'verified')}
                                                        className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Re-verify Property"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                )}
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
                    <span className="text-xs text-gray-500">Showing {filteredProperties.length} properties</span>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 border border-gray-300 rounded bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50" disabled>Previous</button>
                        <button className="px-3 py-1 border border-gray-300 rounded bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50" disabled>Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
