"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Edit, Trash2, Plus, LayoutGrid, List, Home, MapPin, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import AgentLayout from "@/components/dashboard/AgentLayout";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";

export default function AgentPropertiesPage() {
    const { user } = useAuth();
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [deleteModal, setDeleteModal] = useState<{ show: boolean, propertyId: number | null }>({ show: false, propertyId: null });

    useEffect(() => {
        if (!user) return;
        fetchListings();
    }, [user]);

    const fetchListings = async () => {
        if (!user) return;
        try {
            const data = await api.properties.list({ user_id: user.id });
            setListings(data);
        } catch (error) {
            console.error("Failed to fetch listings", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.propertyId) return;
        try {
            await api.properties.delete(deleteModal.propertyId);
            toast.success("Property deleted successfully");
            fetchListings();
            setDeleteModal({ show: false, propertyId: null });
        } catch (error) {
            console.error("Failed to delete property", error);
            toast.error("Failed to delete property");
        }
    };

    if (loading) {
        return (
            <AgentLayout title="My Properties">
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin text-rose-500" size={32} />
                </div>
            </AgentLayout>
        );
    }

    return (
        <AgentLayout title="My Properties">
            <div className="max-w-7xl mx-auto">
                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Your Listings</h1>
                        <p className="text-gray-500">{listings.length} properties currently listed</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                title="Grid View"
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                title="List View"
                            >
                                <List size={18} />
                            </button>
                        </div>

                        <Link
                            href="/dashboard/add-property"
                            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-all shadow-sm font-medium"
                        >
                            <Plus size={18} />
                            Add Property
                        </Link>
                    </div>
                </div>

                {listings.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Home size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No properties listed</h3>
                        <p className="text-gray-500 mb-6">Create your first listing to start receiving leads.</p>
                        <Link
                            href="/dashboard/add-property"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition font-medium"
                        >
                            <Plus size={20} /> List a Property
                        </Link>
                    </div>
                ) : (
                    <>
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {listings.map((property) => (
                                    <div key={property.id} className="group bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-300 flex flex-col">
                                        {/* Image Area */}
                                        <div className="relative h-56 bg-gray-100 overflow-hidden">
                                            <Link href={`/properties/${property.id}`}>
                                                {property.images && property.images.length > 0 ? (
                                                    <img
                                                        src={`${api.API_URL}/${property.images[0].image_path}`}
                                                        alt={property.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <Home size={32} />
                                                    </div>
                                                )}
                                            </Link>

                                            <div className="absolute top-3 right-3 flex gap-2">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-md uppercase tracking-wider bg-white/90 shadow-sm ${property.is_verified ? 'text-green-700' : 'text-gray-500'
                                                    }`}>
                                                    {property.listing_type}
                                                </span>
                                            </div>
                                            <div className="absolute bottom-3 left-3">
                                                <span className="bg-black/70 text-white text-xs px-2 py-1 rounded font-medium backdrop-blur-sm">
                                                    ₹{property.price.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Content Area */}
                                        <div className="p-5 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-lg text-gray-900 line-clamp-1 group-hover:text-rose-600 transition-colors">
                                                    {property.title}
                                                </h3>
                                            </div>
                                            <p className="text-sm text-gray-500 mb-4 line-clamp-1 flex items-center gap-1">
                                                <MapPin size={14} /> {property.address}, {property.city}
                                            </p>

                                            {/* Metrics */}
                                            <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-gray-100 mb-4">
                                                <div className="text-center">
                                                    <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-0.5">Views</div>
                                                    <div className="font-mono font-bold text-gray-900">241</div>
                                                </div>
                                                <div className="text-center border-l border-r border-gray-100">
                                                    <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-0.5">Saves</div>
                                                    <div className="font-mono font-bold text-rose-600">18</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-0.5">Leads</div>
                                                    <div className="font-mono font-bold text-green-600">4</div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 mt-auto">
                                                <Link href={`/dashboard/agent/properties/${property.id}/edit`} className="flex-1">
                                                    <button className="w-full flex items-center justify-center gap-2 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-200">
                                                        <Edit size={16} /> Edit
                                                    </button>
                                                </Link>
                                                <button
                                                    onClick={() => setDeleteModal({ show: true, propertyId: property.id })}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Property</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Performance</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {listings.map((property) => (
                                            <tr key={property.id} className="hover:bg-gray-50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-16 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                                            {property.images && property.images.length > 0 ? (
                                                                <img src={`${api.API_URL}/${property.images[0].image_path}`} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-400"><Home size={16} /></div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900 group-hover:text-rose-600 transition-colors line-clamp-1">{property.title}</div>
                                                            <div className="text-xs text-gray-500 line-clamp-1">{property.address}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Active
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-sm text-gray-700">₹{property.price.toLocaleString()}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-4 text-sm">
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-bold text-gray-900">241</span>
                                                            <span className="text-[10px] text-gray-400 uppercase">Views</span>
                                                        </div>
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-bold text-gray-900">4</span>
                                                            <span className="text-[10px] text-gray-400 uppercase">Leads</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Link href={`/dashboard/agent/properties/${property.id}/edit`}>
                                                            <button className="text-gray-400 hover:text-blue-600 p-1 transition-colors"><Edit size={18} /></button>
                                                        </Link>
                                                        <button
                                                            onClick={() => setDeleteModal({ show: true, propertyId: property.id })}
                                                            className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                <ConfirmationDialog
                    isOpen={deleteModal.show}
                    onClose={() => setDeleteModal({ show: false, propertyId: null })}
                    onConfirm={handleDelete}
                    title="Delete Property"
                    message="Are you sure you want to delete this property? This action cannot be undone."
                    variant="danger"
                />
            </div>
        </AgentLayout>
    );
}
