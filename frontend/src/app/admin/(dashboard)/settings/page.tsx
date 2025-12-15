'use client';
import { Save, Lock, Bell, Globe } from 'lucide-react';

export default function AdminSettings() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-500">Manage platform configurations and admin preferences.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Navigation */}
                <div className="lg:col-span-1 space-y-1">
                    <button className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-indigo-600 shadow-sm">
                        <Globe size={18} />
                        General
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-white hover:shadow-sm rounded-lg text-sm font-medium transition-all">
                        <Lock size={18} />
                        Security
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-white hover:shadow-sm rounded-lg text-sm font-medium transition-all">
                        <Bell size={18} />
                        Notifications
                    </button>
                </div>

                {/* Right Column: Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Platform Fees */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Platform Configuration</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Booking Token (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            defaultValue={0.1}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Paid by buyer to reserve property.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Success Fee (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            defaultValue={0.9}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Paid by seller/agent upon completion.</p>
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end">
                                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors shadow-sm">
                                    <Save size={16} />
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Admin Profile */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Admin Profile</h2>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl">
                                N
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">NestFind Admin</h3>
                                <p className="text-sm text-gray-500">nestfind@gmail.com</p>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                                    Super Admin
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
