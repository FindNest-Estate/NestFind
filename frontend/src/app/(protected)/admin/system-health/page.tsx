'use client';

import React from 'react';
import { Activity, Database, Server, Cpu, CheckCircle, AlertTriangle, XCircle, HardDrive } from 'lucide-react';
import { motion } from 'framer-motion';

// Mock Data for System Status
const services = [
    { id: 1, name: 'Primary Database', status: 'operational', uptime: '99.99%', message: 'Operating normally', icon: Database },
    { id: 2, name: 'API Gateway', status: 'operational', uptime: '99.95%', message: 'Operating normally', icon: Server },
    { id: 3, name: 'Redis Cache', status: 'degraded', uptime: '98.50%', message: 'Higher latency detected', icon: Cpu },
    { id: 4, name: 'Object Storage (S3)', status: 'operational', uptime: '99.99%', message: 'Operating normally', icon: HardDrive },
];

const metrics = [
    { label: 'API Latency', value: '45ms', trend: 'stable', color: 'text-emerald-600' },
    { label: 'Error Rate', value: '0.02%', trend: 'down', color: 'text-emerald-600' },
    { label: 'Active Sessions', value: '1,240', trend: 'up', color: 'text-blue-600' },
    { label: 'CPU Usage', value: '34%', trend: 'stable', color: 'text-emerald-600' },
];

export default function SystemHealthPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
                <p className="text-gray-500">Real-time monitoring of platform services and infrastructure.</p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((metric, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
                    >
                        <p className="text-sm font-medium text-gray-500 mb-1">{metric.label}</p>
                        <div className="flex items-end justify-between">
                            <h3 className="text-2xl font-bold text-gray-900">{metric.value}</h3>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full bg-slate-50 ${metric.color}`}>
                                {metric.trend === 'up' && '↗'}
                                {metric.trend === 'down' && '↘'}
                                {metric.trend === 'stable' && '—'}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Services Status */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Component Status</h2>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        All Systems Operational
                    </span>
                </div>
                <div className="divide-y divide-gray-50">
                    {services.map((service) => (
                        <div key={service.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-lg ${service.status === 'operational' ? 'bg-emerald-100 text-emerald-600' :
                                        service.status === 'degraded' ? 'bg-amber-100 text-amber-600' :
                                            'bg-red-100 text-red-600'
                                    }`}>
                                    <service.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{service.name}</h3>
                                    <p className="text-sm text-gray-500">{service.message}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-1 ${service.status === 'operational' ? 'bg-emerald-50 text-emerald-700' :
                                        service.status === 'degraded' ? 'bg-amber-50 text-amber-700' :
                                            'bg-red-50 text-red-700'
                                    }`}>
                                    {service.status === 'operational' && <CheckCircle className="w-3.5 h-3.5" />}
                                    {service.status === 'degraded' && <AlertTriangle className="w-3.5 h-3.5" />}
                                    {service.status === 'outage' && <XCircle className="w-3.5 h-3.5" />}
                                    {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                                </div>
                                <p className="text-xs text-gray-400 font-mono">Uptime: {service.uptime}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
