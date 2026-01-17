'use client';

import React, { useState, useEffect } from 'react';
import {
    User,
    Mail,
    Phone,
    Shield,
    Edit2,
    Save,
    X,
    Loader2,
    CheckCircle,
    AlertCircle,
    Eye,
    EyeOff,
    Lock
} from 'lucide-react';
import { put, get } from '@/lib/api';

/**
 * Profile Page - /profile
 * 
 * User profile management: view info, edit profile, change password.
 */

interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    mobile_number: string | null;
    status: string;
    role: string;
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Password change
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [isChangingPw, setIsChangingPw] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setIsLoading(true);
        try {
            const data = await get<UserProfile>('/user/me');
            setProfile(data);
            setEditName(data.full_name);
            setEditPhone(data.mobile_number || '');
        } catch (err: any) {
            setError(err?.message || 'Failed to load profile');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        setError(null);
        try {
            await put('/user/profile', {
                full_name: editName,
                mobile_number: editPhone || null
            });
            await fetchProfile();
            setIsEditing(false);
            setSuccessMessage('Profile updated successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err?.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsChangingPw(true);
        setError(null);
        try {
            await put('/user/password', {
                current_password: currentPassword,
                new_password: newPassword
            });
            setShowPasswordForm(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setSuccessMessage('Password changed successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err?.message || 'Failed to change password');
        } finally {
            setIsChangingPw(false);
        }
    };

    const statusColors: Record<string, string> = {
        ACTIVE: 'bg-emerald-100 text-emerald-800',
        PENDING_VERIFICATION: 'bg-amber-100 text-amber-800',
        IN_REVIEW: 'bg-blue-100 text-blue-800',
        SUSPENDED: 'bg-red-100 text-red-800',
        DECLINED: 'bg-gray-100 text-gray-800'
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="text-center py-16">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600">{error || 'Failed to load profile'}</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            </div>

            {/* Messages */}
            {successMessage && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
                    <CheckCircle className="w-5 h-5" />
                    <span>{successMessage}</span>
                </div>
            )}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Profile Card */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Avatar Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                            <User className="w-10 h-10 text-white" />
                        </div>
                        <div className="text-white">
                            <h2 className="text-xl font-bold">{profile.full_name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[profile.status] || 'bg-gray-100 text-gray-800'}`}>
                                    {profile.status.replace('_', ' ')}
                                </span>
                                <span className="text-emerald-100 text-sm">• {profile.role}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profile Fields */}
                <div className="p-6 space-y-6">
                    {/* Email (read-only) */}
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Mail className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs text-gray-500 uppercase tracking-wide">Email</div>
                            <div className="font-medium text-gray-900">{profile.email}</div>
                        </div>
                    </div>

                    {/* Name */}
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs text-gray-500 uppercase tracking-wide">Full Name</div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-emerald-500"
                                />
                            ) : (
                                <div className="font-medium text-gray-900">{profile.full_name}</div>
                            )}
                        </div>
                    </div>

                    {/* Phone */}
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Phone className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs text-gray-500 uppercase tracking-wide">Phone</div>
                            {isEditing ? (
                                <input
                                    type="tel"
                                    value={editPhone}
                                    onChange={(e) => setEditPhone(e.target.value)}
                                    placeholder="Enter phone number"
                                    className="w-full p-2 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-emerald-500"
                                />
                            ) : (
                                <div className="font-medium text-gray-900">
                                    {profile.mobile_number || <span className="text-gray-400">Not set</span>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Edit Actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditName(profile.full_name);
                                        setEditPhone(profile.mobile_number || '');
                                    }}
                                    className="flex-1 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={isSaving}
                                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <Edit2 className="w-4 h-4" />
                                Edit Profile
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Security Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Security</h3>
                        <p className="text-sm text-gray-500">Manage your password</p>
                    </div>
                </div>

                {showPasswordForm ? (
                    <div className="space-y-4">
                        {/* Current Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                            <div className="relative">
                                <input
                                    type={showCurrentPw ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                >
                                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* New Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <div className="relative">
                                <input
                                    type={showNewPw ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPw(!showNewPw)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                >
                                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => {
                                    setShowPasswordForm(false);
                                    setCurrentPassword('');
                                    setNewPassword('');
                                    setConfirmPassword('');
                                }}
                                className="flex-1 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleChangePassword}
                                disabled={isChangingPw || !currentPassword || !newPassword || !confirmPassword}
                                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isChangingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                Update Password
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowPasswordForm(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <Lock className="w-4 h-4" />
                        Change Password
                    </button>
                )}
            </div>
        </div>
    );
}
