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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="w-7 h-7 text-[#ff385c]" />
                        Settings
                    </h1>
                    <p className="text-slate-500 mt-1">Manage your notification and display preferences</p>
                </div>
                <button
                    onClick={saveSettings}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#ff385c] text-white rounded-xl font-medium hover:bg-[#d9324e] transition-colors shadow-lg disabled:opacity-50"
                >
                    {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : saveSuccess ? (
                        <CheckCircle className="w-4 h-4" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {saveSuccess ? 'Saved!' : 'Save Changes'}
                </button>
            </div>

            {/* Notification Preferences */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-amber-500" />
                        Notification Preferences
                    </h2>
                </div>
                <div className="divide-y divide-slate-100">
                    {/* Email Notifications */}
                    <div className="p-6">
                        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Email Notifications
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-slate-800">New Offers</p>
                                    <p className="text-sm text-slate-500">Get notified when buyers make offers</p>
                                </div>
                                <ToggleSwitch
                                    enabled={settings.notifications.email_offers}
                                    onChange={(val) => updateNotification('email_offers', val)}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-slate-800">Visit Requests</p>
                                    <p className="text-sm text-slate-500">Notifications for property tour requests</p>
                                </div>
                                <ToggleSwitch
                                    enabled={settings.notifications.email_visits}
                                    onChange={(val) => updateNotification('email_visits', val)}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-slate-800">Messages</p>
                                    <p className="text-sm text-slate-500">Buyer and agent messages</p>
                                </div>
                                <ToggleSwitch
                                    enabled={settings.notifications.email_messages}
                                    onChange={(val) => updateNotification('email_messages', val)}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-slate-800">Marketing</p>
                                    <p className="text-sm text-slate-500">Tips, updates, and promotional emails</p>
                                </div>
                                <ToggleSwitch
                                    enabled={settings.notifications.email_marketing}
                                    onChange={(val) => updateNotification('email_marketing', val)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Push Notifications */}
                    <div className="p-6">
                        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4 flex items-center gap-2">
                            <Smartphone className="w-4 h-4" />
                            Push Notifications
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-slate-800">New Offers</p>
                                    <p className="text-sm text-slate-500">Instant notifications for offers</p>
                                </div>
                                <ToggleSwitch
                                    enabled={settings.notifications.push_offers}
                                    onChange={(val) => updateNotification('push_offers', val)}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-slate-800">Visit Reminders</p>
                                    <p className="text-sm text-slate-500">Reminders before scheduled visits</p>
                                </div>
                                <ToggleSwitch
                                    enabled={settings.notifications.push_visits}
                                    onChange={(val) => updateNotification('push_visits', val)}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-slate-800">Messages</p>
                                    <p className="text-sm text-slate-500">Real-time message alerts</p>
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
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <User className="w-5 h-5 text-purple-500" />
                        Privacy & Profile
                    </h2>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-800">Show Phone Number</p>
                            <p className="text-sm text-slate-500">Allow verified buyers to see your contact number</p>
                        </div>
                        <ToggleSwitch
                            enabled={settings.contact_phone_visible}
                            onChange={(val) => updateSetting('contact_phone_visible', val)}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-800">Auto-respond to Inquiries</p>
                            <p className="text-sm text-slate-500">Send automatic acknowledgment to buyer inquiries</p>
                        </div>
                        <ToggleSwitch
                            enabled={settings.auto_respond_inquiries}
                            onChange={(val) => updateSetting('auto_respond_inquiries', val)}
                        />
                    </div>
                </div>
            </div>

            {/* Display Preferences */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-500" />
                        Display Preferences
                    </h2>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-800">Currency</p>
                            <p className="text-sm text-slate-500">Default currency for prices</p>
                        </div>
                        <span className="px-4 py-2 bg-slate-100 rounded-lg text-slate-600 font-medium">
                            {settings.display.default_currency}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-800">Timezone</p>
                            <p className="text-sm text-slate-500">For scheduling and notifications</p>
                        </div>
                        <span className="px-4 py-2 bg-slate-100 rounded-lg text-slate-600 font-medium">
                            {settings.display.timezone}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
