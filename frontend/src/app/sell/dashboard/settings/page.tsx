'use client';

import React, { useEffect, useState } from 'react';
import { get, put } from '@/lib/api';
import {
    Settings,
    Loader2,
    Bell,
    Mail,
    Smartphone,
    Globe,
    Save,
    CheckCircle,
    Eye,
    EyeOff,
    Moon,
    Sun,
    User
} from 'lucide-react';

interface NotificationPreferences {
    email_offers: boolean;
    email_visits: boolean;
    email_messages: boolean;
    email_marketing: boolean;
    push_offers: boolean;
    push_visits: boolean;
    push_messages: boolean;
}

interface DisplayPreferences {
    default_currency: string;
    default_view: string;
    timezone: string;
}

interface SellerSettings {
    notifications: NotificationPreferences;
    display: DisplayPreferences;
    contact_phone_visible: boolean;
    auto_respond_inquiries: boolean;
}

export default function SellerSettingsPage() {
    const [settings, setSettings] = useState<SellerSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        try {
            setIsLoading(true);
            const data = await get<{ success: boolean; settings: SellerSettings }>('/seller/settings');
            setSettings(data.settings);
        } catch (err) {
            console.error("Failed to load settings", err);
            // Use defaults if settings don't exist
            setSettings({
                notifications: {
                    email_offers: true,
                    email_visits: true,
                    email_messages: true,
                    email_marketing: false,
                    push_offers: true,
                    push_visits: true,
                    push_messages: true
                },
                display: {
                    default_currency: 'INR',
                    default_view: 'grid',
                    timezone: 'Asia/Kolkata'
                },
                contact_phone_visible: false,
                auto_respond_inquiries: false
            });
        } finally {
            setIsLoading(false);
        }
    }

    async function saveSettings() {
        if (!settings) return;

        try {
            setIsSaving(true);
            await put('/seller/settings', settings);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error("Failed to save settings", err);
            setError("Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    }

    function updateNotification(key: keyof NotificationPreferences, value: boolean) {
        if (!settings) return;
        setSettings({
            ...settings,
            notifications: { ...settings.notifications, [key]: value }
        });
    }

    function updateSetting(key: 'contact_phone_visible' | 'auto_respond_inquiries', value: boolean) {
        if (!settings) return;
        setSettings({ ...settings, [key]: value });
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-[#ff385c] animate-spin" />
            </div>
        );
    }

    if (!settings) return null;

    const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: (val: boolean) => void }) => (
        <button
            onClick={() => onChange(!enabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-[#ff385c]' : 'bg-slate-200'}`}
        >
            <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${enabled ? 'translate-x-6' : ''}`}
            />
        </button>
    );

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-gray-100/60 pb-6 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3 tracking-tight">
                        <div className="p-2.5 bg-gradient-to-br from-[#FF385C] to-rose-500 rounded-2xl shadow-sm">
                            <Settings className="w-6 h-6 text-white" />
                        </div>
                        Settings
                    </h1>
                    <p className="text-sm font-medium text-gray-500 mt-2">Manage your notification and display preferences</p>
                </div>
                <button
                    onClick={saveSettings}
                    disabled={isSaving}
                    className="flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#ff385c] to-rose-600 text-white rounded-xl font-bold hover:shadow-lg shadow-rose-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 w-full sm:w-auto"
                >
                    {isSaving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : saveSuccess ? (
                        <CheckCircle className="w-5 h-5" />
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                    {saveSuccess ? 'Saved Successfully!' : 'Save Changes'}
                </button>
            </div>

            {/* Notification Preferences */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100/60 shadow-sm overflow-hidden mb-8">
                <div className="px-8 py-6 bg-amber-50/50 border-b border-gray-100/60 flex items-center gap-4">
                    <div className="p-3 bg-amber-100 rounded-xl">
                        <Bell className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 tracking-tight">Notification Preferences</h2>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Control how we alert you</p>
                    </div>
                </div>
                <div className="divide-y divide-gray-100/60">
                    {/* Email Notifications */}
                    <div className="p-8">
                        <h3 className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Email Notifications
                        </h3>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">New Offers</p>
                                    <p className="text-[11px] font-medium text-gray-500 mt-1">Get notified when buyers make offers</p>
                                </div>
                                <ToggleSwitch
                                    enabled={settings.notifications.email_offers}
                                    onChange={(val) => updateNotification('email_offers', val)}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Visit Requests</p>
                                    <p className="text-[11px] font-medium text-gray-500 mt-1">Notifications for property tour requests</p>
                                </div>
                                <ToggleSwitch
                                    enabled={settings.notifications.email_visits}
                                    onChange={(val) => updateNotification('email_visits', val)}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Messages</p>
                                    <p className="text-[11px] font-medium text-gray-500 mt-1">Buyer and agent messages</p>
                                </div>
                                <ToggleSwitch
                                    enabled={settings.notifications.email_messages}
                                    onChange={(val) => updateNotification('email_messages', val)}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Marketing</p>
                                    <p className="text-[11px] font-medium text-gray-500 mt-1">Tips, updates, and promotional emails</p>
                                </div>
                                <ToggleSwitch
                                    enabled={settings.notifications.email_marketing}
                                    onChange={(val) => updateNotification('email_marketing', val)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Push Notifications */}
                    <div className="p-8">
                        <h3 className="text-[11px] font-bold text-rose-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Smartphone className="w-4 h-4" />
                            Push Notifications
                        </h3>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">New Offers</p>
                                    <p className="text-[11px] font-medium text-gray-500 mt-1">Instant notifications for offers</p>
                                </div>
                                <ToggleSwitch
                                    enabled={settings.notifications.push_offers}
                                    onChange={(val) => updateNotification('push_offers', val)}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Visit Reminders</p>
                                    <p className="text-[11px] font-medium text-gray-500 mt-1">Reminders before scheduled visits</p>
                                </div>
                                <ToggleSwitch
                                    enabled={settings.notifications.push_visits}
                                    onChange={(val) => updateNotification('push_visits', val)}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Messages</p>
                                    <p className="text-[11px] font-medium text-gray-500 mt-1">Real-time message alerts</p>
                                </div>
                                <ToggleSwitch
                                    enabled={settings.notifications.push_messages}
                                    onChange={(val) => updateNotification('push_messages', val)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Privacy Settings */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100/60 shadow-sm overflow-hidden mb-8">
                <div className="px-8 py-6 bg-purple-50/50 border-b border-gray-100/60 flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-xl">
                        <User className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 tracking-tight">Privacy & Profile</h2>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Manage your public information</p>
                    </div>
                </div>
                <div className="p-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-gray-900">Show Phone Number</p>
                            <p className="text-[11px] font-medium text-gray-500 mt-1">Allow verified buyers to see your contact number</p>
                        </div>
                        <ToggleSwitch
                            enabled={settings.contact_phone_visible}
                            onChange={(val) => updateSetting('contact_phone_visible', val)}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-gray-900">Auto-respond to Inquiries</p>
                            <p className="text-[11px] font-medium text-gray-500 mt-1">Send automatic acknowledgment to buyer inquiries</p>
                        </div>
                        <ToggleSwitch
                            enabled={settings.auto_respond_inquiries}
                            onChange={(val) => updateSetting('auto_respond_inquiries', val)}
                        />
                    </div>
                </div>
            </div>

            {/* Display Preferences */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100/60 shadow-sm overflow-hidden mb-8">
                <div className="px-8 py-6 bg-blue-50/50 border-b border-gray-100/60 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                        <Globe className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 tracking-tight">Display Preferences</h2>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Customize your viewing experience</p>
                    </div>
                </div>
                <div className="p-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-gray-900">Currency</p>
                            <p className="text-[11px] font-medium text-gray-500 mt-1">Default currency for prices</p>
                        </div>
                        <span className="px-5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold tracking-tight shadow-inner">
                            {settings.display.default_currency}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-gray-900">Timezone</p>
                            <p className="text-[11px] font-medium text-gray-500 mt-1">For scheduling and notifications</p>
                        </div>
                        <span className="px-5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold tracking-tight shadow-inner text-sm">
                            {settings.display.timezone}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
