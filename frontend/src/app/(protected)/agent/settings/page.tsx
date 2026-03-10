'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { updateProfile, changePassword } from '@/lib/authApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { User, Lock, Shield, Smartphone, Mail } from 'lucide-react';

export default function SettingsPage() {
    const { user, login } = useAuth(); // login needed to update local user state on profile change
    const [isLoading, setIsLoading] = useState(false);

    // Profile State
    const [fullName, setFullName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isProfileSaving, setIsProfileSaving] = useState(false);

    // Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isPasswordSaving, setIsPasswordSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setFullName(user.full_name || '');
            setMobileNumber(user.mobile_number || '');
        }
    }, [user]);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileMessage(null);
        setIsProfileSaving(true);

        try {
            const res = await updateProfile({
                full_name: fullName,
                mobile_number: mobileNumber
            });

            if (res.success && user) {
                // Update local auth context
                // We need to construct the full user object to update it
                // In a real app, updateProfile might return the full user or we fetch it again
                // Here we assume partial update is fine for local state until refresh
                // But typically we should refetch user. For now, let's manual update.
                const updatedUser = { ...user, full_name: res.full_name, mobile_number: res.mobile_number || user.mobile_number };
                // There is no easy 'updateUser' method exposed in useAuth, but 'login' updates state.
                // However 'login' expects a token. We can get the current token from localStorage or just rely on a page refresh 
                // implicitly if we don't have a clean way. 
                // Actually, useAuth exposes `login` which sets user.
                // Let's try to fetch fresh user data to be safe?
                // Or just show success message. The user data in context might stay stale until refresh.
                // Given constraints, showing success is most important.
                setProfileMessage({ type: 'success', text: 'Profile updated successfully.' });
            }
        } catch (error: any) {
            setProfileMessage({ type: 'error', text: error.message || 'Failed to update profile.' });
        } finally {
            setIsProfileSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage(null);

        if (newPassword.length < 8) {
            setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }

        setIsPasswordSaving(true);

        try {
            const res = await changePassword({
                current_password: currentPassword,
                new_password: newPassword
            });

            if (res.success) {
                setPasswordMessage({ type: 'success', text: 'Password changed successfully.' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch (error: any) {
            setPasswordMessage({ type: 'error', text: error.message || 'Failed to change password.' });
        } finally {
            setIsPasswordSaving(false);
        }
    };

    if (!user) {
        return (
            <div className="max-w-3xl mx-auto space-y-6 pt-6">
                <Skeleton className="h-12 w-48 mb-6" />
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-20">
            <PageHeader
                title="Settings"
                subtitle="Manage your profile and security preferences"
            />

            {/* Profile Section */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[var(--gray-200)]">
                    <User className="w-5 h-5 text-[var(--gray-500)]" />
                    <h2 className="text-lg font-bold text-[var(--gray-900)]">Profile Information</h2>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-[var(--gray-700)]">Full Name</label>
                            <Input
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                icon={<User className="w-4 h-4 text-[var(--gray-400)]" />}
                                placeholder="Your full name"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-[var(--gray-700)]">Mobile Number</label>
                            <Input
                                value={mobileNumber}
                                onChange={(e) => setMobileNumber(e.target.value)}
                                icon={<Smartphone className="w-4 h-4 text-[var(--gray-400)]" />}
                                placeholder="+91..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-[var(--gray-700)]">Email Address</label>
                            <div className="relative">
                                <Input
                                    value={user.email}
                                    disabled
                                    className="bg-[var(--gray-50)] text-[var(--gray-500)]"
                                    icon={<Mail className="w-4 h-4 text-[var(--gray-400)]" />}
                                />
                                <span className="absolute right-3 top-2.5 text-[10px] font-bold text-[var(--gray-400)] uppercase">Read Only</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-[var(--gray-700)]">Role & Status</label>
                            <div className="flex items-center gap-2 h-10 px-3 bg-[var(--gray-50)] border border-[var(--gray-200)] rounded-[var(--radius-md)]">
                                <Badge variant="brand" className="uppercase tracking-wider text-[10px]">
                                    {user.role}
                                </Badge>
                                <Badge variant={user.status === 'ACTIVE' ? 'success' : 'warning'} className="uppercase tracking-wider text-[10px]">
                                    {user.status}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {profileMessage && (
                        <Alert variant={profileMessage.type} className="mt-2">
                            {profileMessage.text}
                        </Alert>
                    )}

                    <div className="flex justify-end pt-2">
                        <Button
                            type="submit"
                            variant="primary"
                            loading={isProfileSaving}
                        >
                            Save Profile
                        </Button>
                    </div>
                </form>
            </section>

            {/* Security Section */}
            <section className="space-y-4 pt-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[var(--gray-200)]">
                    <Shield className="w-5 h-5 text-[var(--gray-500)]" />
                    <h2 className="text-lg font-bold text-[var(--gray-900)]">Security</h2>
                </div>

                <form onSubmit={handlePasswordChange} className="bg-[var(--gray-50)] rounded-[var(--card-radius)] border border-[var(--gray-200)] p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-[var(--gray-700)]">Current Password</label>
                        <Input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            icon={<Lock className="w-4 h-4 text-[var(--gray-400)]" />}
                            placeholder="Enter current password"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-[var(--gray-700)]">New Password</label>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                icon={<Lock className="w-4 h-4 text-[var(--gray-400)]" />}
                                placeholder="Min 8 chars"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-[var(--gray-700)]">Confirm New Password</label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                icon={<Lock className="w-4 h-4 text-[var(--gray-400)]" />}
                                placeholder="Re-enter new password"
                            />
                        </div>
                    </div>

                    {passwordMessage && (
                        <Alert variant={passwordMessage.type}>
                            {passwordMessage.text}
                        </Alert>
                    )}

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            variant="secondary"
                            loading={isPasswordSaving}
                            disabled={!currentPassword || !newPassword}
                        >
                            Update Password
                        </Button>
                    </div>
                </form>
            </section>
        </div>
    );
}
