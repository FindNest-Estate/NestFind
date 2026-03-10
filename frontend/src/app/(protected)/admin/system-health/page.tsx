'use client';

import { useState, useEffect } from 'react';
import {
    Server, Database, Globe, Shield, Cpu, HardDrive,
    Activity, CheckCircle, AlertTriangle, RefreshCw
} from 'lucide-react';

interface ServiceStatus {
    name: string;
    status: 'healthy' | 'warning' | 'error';
    latency: string;
    uptime: string;
    lastChecked: string;
}

export default function AdminSystemHealthPage() {
    const [loading, setLoading] = useState(false);

    // Mock data as backend endpoint doesn't exist yet
    const services: ServiceStatus[] = [
        { name: 'API Gateway', status: 'healthy', latency: '45ms', uptime: '99.98%', lastChecked: 'Just now' },
        { name: 'Database Cluster', status: 'healthy', latency: '12ms', uptime: '100%', lastChecked: 'Just now' },
        { name: 'Authentication Service', status: 'healthy', latency: '28ms', uptime: '99.99%', lastChecked: '1 min ago' },
        { name: 'Storage Service (S3)', status: 'healthy', latency: '110ms', uptime: '100%', lastChecked: 'Just now' },
        { name: 'Email Provider (SendGrid)', status: 'healthy', latency: '320ms', uptime: '99.95%', lastChecked: '5 min ago' },
        { name: 'Payment Network (Stripe)', status: 'warning', latency: '450ms', uptime: '99.90%', lastChecked: 'Just now' },
    ];

    const refresh = () => {
        setLoading(true);
        setTimeout(() => setLoading(false), 800);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-[var(--gray-900)]">System Health</h1>
                    <p className="text-sm text-[var(--gray-500)] mt-0.5">Real-time infrastructure and service connectivity status</p>
                </div>
                <button
                    onClick={refresh}
                    disabled={loading}
                    className="p-2 text-[var(--gray-500)] hover:text-[var(--color-brand)] hover:bg-[var(--color-brand-subtle)] rounded-[var(--radius-sm)] transition-colors border border-[var(--gray-200)] bg-white"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Overall Status */}
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                        <Activity className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-[var(--gray-900)]">All Systems Operational</h2>
                        <p className="text-sm text-[var(--gray-500)]">Platform is performing within normal parameters. No major incidents reported in last 24h.</p>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'CPU Usage', value: '14%', icon: Cpu, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Memory Usage', value: '42%', icon: HardDrive, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Network In/Out', value: '1.2 GB/s', icon: Globe, color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map((metric) => (
                    <div key={metric.label} className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-[var(--gray-500)]">{metric.label}</span>
                            <metric.icon className={`w-4 h-4 ${metric.color}`} />
                        </div>
                        <p className="text-xl font-bold text-[var(--gray-900)]">{metric.value}</p>
                    </div>
                ))}
            </div>

            {/* Services Table */}
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)]">
                <div className="px-5 py-4 border-b border-[var(--gray-100)]">
                    <h3 className="text-sm font-bold text-[var(--gray-900)]">Service Connectivity</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                            <tr>
                                <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Service</th>
                                <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Status</th>
                                <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider text-right">Latency</th>
                                <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider text-right">Uptime</th>
                                <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider text-right">Last Checked</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--gray-100)]">
                            {services.map((service) => (
                                <tr key={service.name} className="hover:bg-[var(--gray-50)] transition-colors">
                                    <td className="px-5 py-3 text-sm font-medium text-[var(--gray-900)]">{service.name}</td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${service.status === 'healthy' ? 'bg-emerald-500' :
                                                    service.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                                                }`} />
                                            <span className="text-xs font-medium capitalize text-[var(--gray-700)]">{service.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-right text-xs text-[var(--gray-600)] font-mono">{service.latency}</td>
                                    <td className="px-5 py-3 text-right text-xs text-[var(--gray-600)]">{service.uptime}</td>
                                    <td className="px-5 py-3 text-right text-[11px] text-[var(--gray-400)]">{service.lastChecked}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
