'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { User, Lock, Bell, Palette, Loader2, Save, Settings } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import { useAuth } from '@/lib/auth';
import { updateProfile, changePassword } from '@/lib/authApi';

// ============================================================================
// Schemas
// ============================================================================

const profileSchema = z.object({
    full_name: z.string().min(2, 'Name must be at least 2 characters'),
    mobile_number: z.string().optional(),
    email: z.string().email(), // Read only
});

const passwordSchema = z.object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(8, 'New password must be at least 8 characters'),
    confirm_password: z.string()
}).refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

// ============================================================================
// Component
// ============================================================================

export default function AdminSettingsPage() {
    const { user, login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    // Profile Form
    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            full_name: user?.full_name || '',
            mobile_number: user?.mobile_number || '',
            email: user?.email || '',
        },
    });

    // Password Form
    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
    });

    // Handlers
    const onProfileSubmit = async (data: ProfileFormValues) => {
        setIsLoading(true);
        try {
            const res = await updateProfile({
                full_name: data.full_name,
                mobile_number: data.mobile_number
            });

            if (res.success && user) {
                // Update local session
                login('dummy_token_refresh_handled_internally', {
                    ...user,
                    full_name: res.full_name,
                    mobile_number: res.mobile_number || undefined
                });
                toast.success('Profile updated successfully');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setIsLoading(false);
        }
    };

    const onPasswordSubmit = async (data: PasswordFormValues) => {
        setIsLoading(true);
        try {
            await changePassword({
                current_password: data.current_password,
                new_password: data.new_password
            });
            toast.success('Password changed successfully');
            passwordForm.reset();
        } catch (error: any) {
            toast.error(error.message || 'Failed to change password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-500">Manage your account preferences and system settings</p>
            </div>

            <Tabs.Root defaultValue="general" className="w-full">
                <Tabs.List className="flex border-b border-gray-200 mb-8 bg-white rounded-t-lg px-2 pt-2">
                    <Tabs.Trigger
                        value="general"
                        className="group flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300 data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-600 transition-all outline-none"
                    >
                        <User className="w-4 h-4" />
                        General
                    </Tabs.Trigger>
                    <Tabs.Trigger
                        value="security"
                        className="group flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300 data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-600 transition-all outline-none"
                    >
                        <Lock className="w-4 h-4" />
                        Security
                    </Tabs.Trigger>
                    <Tabs.Trigger
                        value="platform"
                        className="group flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300 data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-600 transition-all outline-none"
                    >
                        <Settings className="w-4 h-4" />
                        Platform
                    </Tabs.Trigger>
                </Tabs.List>

                {/* ================= General Tab ================= */}
                <Tabs.Content value="general" className="outline-none">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:max-w-2xl">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
                            <p className="text-sm text-gray-500">Update your account details and public profile.</p>
                        </div>

                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                {/* Email (Read-only) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input
                                        {...profileForm.register('email')}
                                        disabled
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                                    />
                                </div>

                                {/* Full Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        {...profileForm.register('full_name')}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                    />
                                    {profileForm.formState.errors.full_name && (
                                        <p className="mt-1 text-sm text-red-500">{profileForm.formState.errors.full_name.message}</p>
                                    )}
                                </div>

                                {/* Mobile Number */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                    <input
                                        {...profileForm.register('mobile_number')}
                                        placeholder="+1 (555) 000-0000"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-100">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </Tabs.Content>

                {/* ================= Security Tab ================= */}
                <Tabs.Content value="security" className="outline-none">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:max-w-2xl">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">Security</h2>
                            <p className="text-sm text-gray-500">Manage your password and security preferences.</p>
                        </div>

                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                            {/* Current Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                                <input
                                    type="password"
                                    {...passwordForm.register('current_password')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                />
                                {passwordForm.formState.errors.current_password && (
                                    <p className="mt-1 text-sm text-red-500">{passwordForm.formState.errors.current_password.message}</p>
                                )}
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                <input
                                    type="password"
                                    {...passwordForm.register('new_password')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                />
                                {passwordForm.formState.errors.new_password && (
                                    <p className="mt-1 text-sm text-red-500">{passwordForm.formState.errors.new_password.message}</p>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    {...passwordForm.register('confirm_password')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                />
                                {passwordForm.formState.errors.confirm_password && (
                                    <p className="mt-1 text-sm text-red-500">{passwordForm.formState.errors.confirm_password.message}</p>
                                )}
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-100">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Update Password
                                </button>
                            </div>
                        </form>
                    </div>
                </Tabs.Content>

                {/* ================= Platform Tab ================= */}
                <Tabs.Content value="platform" className="outline-none">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:max-w-2xl">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">Platform Configuration</h2>
                            <p className="text-sm text-gray-500">Global settings for the NestFind application.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between py-4 border-b border-gray-50">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900">Maintenance Mode</h3>
                                    <p className="text-xs text-gray-500">Disables user access to the platform</p>
                                </div>
                                <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                    <input type="checkbox" className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300 right-0" />
                                    <label className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-4 border-b border-gray-50">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900">New User Registration</h3>
                                    <p className="text-xs text-gray-500">Allow new users to sign up</p>
                                </div>
                                <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                    <input type="checkbox" defaultChecked className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-emerald-500 right-0" />
                                    <label className="toggle-label block overflow-hidden h-6 rounded-full bg-emerald-500 cursor-pointer"></label>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-4 border-b border-gray-50">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900">Debug Mode</h3>
                                    <p className="text-xs text-gray-500">Show advanced error logs in UI</p>
                                </div>
                                <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                    <input type="checkbox" className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300 right-0" />
                                    <label className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                                </div>
                            </div>
                        </div>
                    </div>
                </Tabs.Content>
            </Tabs.Root>
        </div>
    );
}
