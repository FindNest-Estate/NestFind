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
    Lock,
    Calendar,
    Clock,
    LogOut,
    Settings,
    Bell,
    Moon,
    Sun,
    Globe
} from 'lucide-react';
import { put, get } from '@/lib/api';
import { logout } from '@/lib/authApi';
import { useRouter } from 'next/navigation';

/**
 * Enhanced Profile Page - /profile
 * 
 * Fully functional with backend integration:
 * - GET /user/me - Fetches all user data from database
 * - PUT /user/profile - Updates name and phone
 * - PUT /user/password - Changes password
 */

interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    mobile_number: string | null;
    status: string;
    role: string;
    created_at: string | null;
    avatar_url: string | null;
}

export default function ProfilePage() {
    const router = useRouter();
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

    // Preferences
    const [darkMode, setDarkMode] = useState(false);
    const [notifications, setNotifications] = useState(true);

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

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/');
        } catch (err) {
            console.error('Logout failed', err);
            router.push('/');
        }
    };

    const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
        ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
        PENDING_VERIFICATION: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
        IN_REVIEW: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
        SUSPENDED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
        DECLINED: { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500' }
    };

    const roleColors: Record<string, string> = {
        BUYER: 'bg-blue-100 text-blue-700',
        SELLER: 'bg-purple-100 text-purple-700',
        AGENT: 'bg-rose-100 text-rose-700',
        ADMIN: 'bg-gray-800 text-white'
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Unknown';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-rose-500 animate-spin mx-auto" />
                    <p className="text-gray-500 mt-4">Loading your profile...</p>
                </div>
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

    const status = statusColors[profile.status] || statusColors.ACTIVE;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
                <p className="text-gray-500 mt-1">Manage your account settings and preferences</p>
            </div>

            {/* Messages */}
            {successMessage && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 animate-fade-in">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{successMessage}</span>
                </div>
            )}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 animate-fade-in">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto hover:bg-red-100 p-1 rounded">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Profile Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Avatar Header */}
                <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-8">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-full flex items-center justify-center ring-4 ring-white/30">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <span className="text-4xl font-bold text-white">
                                        {profile.full_name.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
                                <Edit2 className="w-4 h-4 text-gray-600" />
                            </button>
                        </div>

                        {/* Name & Status */}
                        <div className="text-white flex-1">
                            <h2 className="text-2xl font-bold">{profile.full_name}</h2>
                            <p className="text-white/80 text-sm mt-1">{profile.email}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                    {profile.status.replace(/_/g, ' ')}
                                </span>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[profile.role] || 'bg-gray-100 text-gray-700'}`}>
                                    {profile.role}
                                </span>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex gap-4">
                            <div className="bg-white/10 backdrop-blur px-4 py-3 rounded-xl text-center">
                                <Calendar className="w-5 h-5 text-white/80 mx-auto" />
                                <p className="text-white/60 text-[10px] uppercase mt-1">Joined</p>
                                <p className="text-white text-xs font-medium">{formatDate(profile.created_at)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profile Fields */}
                <div className="p-6 space-y-6">
                    {/* Email (read-only) */}
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <Mail className="w-6 h-6 text-gray-500" />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Email Address</div>
                            <div className="font-semibold text-gray-900 mt-0.5">{profile.email}</div>
                        </div>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Verified</span>
                    </div>

                    {/* Name */}
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <User className="w-6 h-6 text-gray-500" />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Full Name</div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                                />
                            ) : (
                                <div className="font-semibold text-gray-900 mt-0.5">{profile.full_name}</div>
                            )}
                        </div>
                    </div>

                    {/* Phone */}
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <Phone className="w-6 h-6 text-gray-500" />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Phone Number</div>
                            {isEditing ? (
                                <input
                                    type="tel"
                                    value={editPhone}
                                    onChange={(e) => setEditPhone(e.target.value)}
                                    placeholder="Enter phone number"
                                    className="w-full p-2 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                                />
                            ) : (
                                <div className="font-semibold text-gray-900 mt-0.5">
                                    {profile.mobile_number || <span className="text-gray-400 font-normal">Not set</span>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Edit Actions */}
                    <div className="flex gap-3 pt-2">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditName(profile.full_name);
                                        setEditPhone(profile.mobile_number || '');
                                    }}
                                    className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={isSaving}
                                    className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-rose-200 transition-all"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700 transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                                Edit Profile
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Security Section */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                            <Shield className="w-5 h-5 text-rose-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Security</h3>
                            <p className="text-sm text-gray-500">Manage your password and account security</p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {showPasswordForm ? (
                        <div className="space-y-4">
                            {/* Current Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPw ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full p-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showCurrentPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showNewPw ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full p-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPw(!showNewPw)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showNewPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Must be at least 8 characters</p>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
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
                                    className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleChangePassword}
                                    disabled={isChangingPw || !currentPassword || !newPassword || !confirmPassword}
                                    className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-rose-200"
                                >
                                    {isChangingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                    Update Password
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Lock className="w-5 h-5 text-gray-400" />
                                <div>
                                    <p className="font-medium text-gray-900">Password</p>
                                    <p className="text-sm text-gray-500">Last changed: Never</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPasswordForm(true)}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
                            >
                                Change
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Preferences Section */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                            <Settings className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Preferences</h3>
                            <p className="text-sm text-gray-500">Customize your experience</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    {/* Notifications Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Bell className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="font-medium text-gray-900">Email Notifications</p>
                                <p className="text-sm text-gray-500">Receive updates about your activity</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setNotifications(!notifications)}
                            className={`w-12 h-7 rounded-full transition-colors ${notifications ? 'bg-rose-500' : 'bg-gray-300'}`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${notifications ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Language */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Globe className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="font-medium text-gray-900">Language</p>
                                <p className="text-sm text-gray-500">Select your preferred language</p>
                            </div>
                        </div>
                        <select className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700">
                            <option>English</option>
                            <option>हिंदी</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
                <div className="p-6">
                    <h3 className="font-bold text-gray-900 mb-4">Account Actions</h3>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2.5 border border-red-200 rounded-xl font-medium text-red-600 hover:bg-red-50">
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
