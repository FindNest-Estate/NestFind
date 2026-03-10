'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    User, Lock, Bell, Shield, Save, Loader2,
    Smartphone, Mail, MapPin, Eye, EyeOff
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const profileSchema = z.object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Invalid phone number'),
    location: z.string().optional(),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function AdminSettingsPage() {
    const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications'>('profile');
    const [isLoading, setIsLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const { showToast } = useToast();

    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            fullName: 'Admin User',
            email: 'admin@nestfind.com',
            phone: '+91 98765 43210',
            location: 'Mumbai, India',
        },
    });

    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
    });

    const onProfileSubmit = async (data: ProfileFormValues) => {
        setIsLoading(true);
        // Mock API call
        await new Promise(r => setTimeout(r, 1000));
        setIsLoading(false);
        showToast('Profile updated successfully', 'success');
    };

    const onPasswordSubmit = async (data: PasswordFormValues) => {
        setIsLoading(true);
        // Mock API call
        await new Promise(r => setTimeout(r, 1000));
        setIsLoading(false);
        showToast('Password changed successfully', 'success');
        passwordForm.reset();
    };

    const tabs = [
        { id: 'profile', label: 'Profile Information', icon: User },
        { id: 'password', label: 'Password & Security', icon: Lock },
        { id: 'notifications', label: 'Notification Settings', icon: Bell },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-[var(--gray-900)]">Settings</h1>
                <p className="text-sm text-[var(--gray-500)] mt-0.5">Manage your account preferences and security settings</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Navigation */}
                <div className="w-full lg:w-64 space-y-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-[var(--radius-sm)] transition-colors ${activeTab === tab.id
                                    ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)]'
                                    : 'text-[var(--gray-600)] hover:bg-[var(--gray-50)]'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] shadow-[var(--shadow-sm)]">
                    {activeTab === 'profile' && (
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-[var(--gray-900)] mb-6">Profile Settings</h3>
                            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4 max-w-xl">
                                <div>
                                    <label className="block text-[11px] font-bold text-[var(--gray-500)] uppercase tracking-wider mb-1.5">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-2.5 w-4 h-4 text-[var(--gray-400)]" />
                                        <input {...profileForm.register('fullName')}
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-sm focus:border-[var(--color-brand)] outline-none" />
                                    </div>
                                    {profileForm.formState.errors.fullName && <p className="text-xs text-red-500 mt-1">{profileForm.formState.errors.fullName.message}</p>}
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-[var(--gray-500)] uppercase tracking-wider mb-1.5">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-2.5 w-4 h-4 text-[var(--gray-400)]" />
                                            <input {...profileForm.register('email')}
                                                className="w-full pl-10 pr-4 py-2 bg-white border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-sm focus:border-[var(--color-brand)] outline-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-[var(--gray-500)] uppercase tracking-wider mb-1.5">Phone Number</label>
                                        <div className="relative">
                                            <Smartphone className="absolute left-3 top-2.5 w-4 h-4 text-[var(--gray-400)]" />
                                            <input {...profileForm.register('phone')}
                                                className="w-full pl-10 pr-4 py-2 bg-white border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-sm focus:border-[var(--color-brand)] outline-none" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-[var(--gray-500)] uppercase tracking-wider mb-1.5">Location</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-[var(--gray-400)]" />
                                        <input {...profileForm.register('location')}
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-sm focus:border-[var(--color-brand)] outline-none" />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button type="submit" disabled={isLoading}
                                        className="inline-flex items-center gap-2 px-6 py-2 bg-[var(--color-brand)] text-white rounded-[var(--radius-sm)] text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save Profile
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'password' && (
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-[var(--gray-900)] mb-6">Security Settings</h3>
                            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-xl">
                                <div>
                                    <label className="block text-[11px] font-bold text-[var(--gray-500)] uppercase tracking-wider mb-1.5">Current Password</label>
                                    <input type="password" {...passwordForm.register('currentPassword')}
                                        className="w-full px-4 py-2 bg-white border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-sm focus:border-[var(--color-brand)] outline-none" />
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-[var(--gray-500)] uppercase tracking-wider mb-1.5">New Password</label>
                                        <div className="relative">
                                            <input type={showPass ? 'text' : 'password'} {...passwordForm.register('newPassword')}
                                                className="w-full px-4 py-2 bg-white border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-sm focus:border-[var(--color-brand)] outline-none" />
                                            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-2.5 text-[var(--gray-400)] hover:text-[var(--gray-600)]">
                                                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-[var(--gray-500)] uppercase tracking-wider mb-1.5">Confirm Password</label>
                                        <input type="password" {...passwordForm.register('confirmPassword')}
                                            className="w-full px-4 py-2 bg-white border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-sm focus:border-[var(--color-brand)] outline-none" />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button type="submit" disabled={isLoading}
                                        className="inline-flex items-center gap-2 px-6 py-2 bg-[var(--color-brand)] text-white rounded-[var(--radius-sm)] text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                                        Update Password
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-[var(--gray-900)] mb-6">Notification Preferences</h3>
                            <div className="space-y-6">
                                {[
                                    { title: 'Email Notifications', desc: 'Receive updates about deals and system alerts via email.' },
                                    { title: 'Push Notifications', desc: 'Real-time alerts in your browser/mobile about urgent actions.' },
                                    { title: 'Financial Alerts', desc: 'Get notified when commissions are released or tokens frozen.' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start justify-between">
                                        <div className="flex-1 pr-6">
                                            <p className="text-sm font-bold text-[var(--gray-900)]">{item.title}</p>
                                            <p className="text-[13px] text-[var(--gray-500)] mt-0.5">{item.desc}</p>
                                        </div>
                                        <div className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" defaultChecked={i < 2} />
                                            <div className="w-10 h-5 bg-[var(--gray-200)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-brand)]"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
