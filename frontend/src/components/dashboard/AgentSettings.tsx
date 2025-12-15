"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { User, Phone, Building, Award, Linkedin, Twitter, Instagram, Save, Loader2, Shield, Bell, Camera, Lock, Mail, MessageSquare } from "lucide-react";

export default function AgentSettings() {
    const { user, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState("profile");
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Profile Form State
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        phone: "",
        bio: "",
        agency_name: "",
        license_number: "",
        experience_years: 0,
        social_links: {
            linkedin: "",
            twitter: "",
            instagram: ""
        }
    });

    // Security Form State
    const [securityData, setSecurityData] = useState({
        current_password: "",
        new_password: "",
        confirm_password: ""
    });

    // Notification State
    const [notificationPrefs, setNotificationPrefs] = useState({
        email_marketing: true,
        email_security: true,
        push_new_leads: true,
        push_messages: true
    });

    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name || "",
                last_name: user.last_name || "",
                phone: user.phone || "",
                bio: user.bio || "",
                agency_name: user.agency_name || "",
                license_number: user.license_number || "",
                experience_years: user.experience_years || 0,
                social_links: {
                    linkedin: user.social_links?.linkedin || "",
                    twitter: user.social_links?.twitter || "",
                    instagram: user.social_links?.instagram || ""
                }
            });
            if (user.notification_preferences) {
                setNotificationPrefs(prev => ({ ...prev, ...user.notification_preferences }));
            }
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name.startsWith("social_")) {
            const socialKey = name.replace("social_", "");
            setFormData(prev => ({
                ...prev,
                social_links: {
                    ...prev.social_links,
                    [socialKey]: value
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.users.updateProfile(formData);
            await refreshUser();
            toast.success("Profile updated successfully");
        } catch (error) {
            console.error("Failed to update profile", error);
            toast.error("Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (e.g., 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size should be less than 5MB");
            return;
        }

        try {
            const loadingToast = toast.loading("Uploading avatar...");
            await api.users.uploadAvatar(file);
            await refreshUser();
            toast.dismiss(loadingToast);
            toast.success("Avatar updated successfully");
        } catch (error) {
            console.error("Failed to upload avatar", error);
            toast.error("Failed to upload avatar");
        }
    };

    const handleSecuritySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (securityData.new_password !== securityData.confirm_password) {
            toast.error("New passwords do not match");
            return;
        }
        if (securityData.new_password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            await api.auth.changePassword({
                current_password: securityData.current_password,
                new_password: securityData.new_password
            });
            setSecurityData({ current_password: "", new_password: "", confirm_password: "" });
            toast.success("Password changed successfully");
        } catch (error: any) {
            console.error("Failed to change password", error);
            toast.error(error.message || "Failed to change password");
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationToggle = async (key: string) => {
        const newPrefs = { ...notificationPrefs, [key]: !notificationPrefs[key as keyof typeof notificationPrefs] };
        setNotificationPrefs(newPrefs);

        // Auto-save preferences
        try {
            await api.users.updateProfile({ notification_preferences: newPrefs });
            // Don't need full refresh for this, just optimistic update is fine usually, but for consistency:
            // await refreshUser(); 
            toast.success("Preferences saved");
        } catch (error) {
            console.error("Failed to update preferences", error);
            toast.error("Failed to save preference");
            // Revert on error
            setNotificationPrefs(notificationPrefs);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Account Settings</h1>
                    <p className="text-gray-500 mt-1">Manage your personal information and preferences</p>
                </div>
            </div>

            {/* Modern Tabs */}
            <div className="flex p-1 bg-gray-100/80 backdrop-blur-sm rounded-xl w-fit">
                {[
                    { id: "profile", label: "Profile", icon: User },
                    { id: "security", label: "Security", icon: Shield },
                    { id: "notifications", label: "Notifications", icon: Bell }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                                ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                            }`}
                    >
                        <tab.icon size={16} className={activeTab === tab.id ? "text-rose-500" : ""} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
                {activeTab === "profile" && (
                    <form onSubmit={handleProfileSubmit}>
                        {/* Header Banner / Avatar Section */}
                        <div className="relative h-32 bg-gradient-to-r from-rose-50 to-orange-50 border-b border-gray-100">
                            <div className="absolute -bottom-12 left-8 flex items-end">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg ring-1 ring-black/5">
                                        <div className="w-full h-full rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 overflow-hidden relative">
                                            {user?.avatar_url ? (
                                                <img src={`${api.API_URL}${user.avatar_url}`} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={32} />
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAvatarClick}
                                        className="absolute -bottom-2 -right-2 p-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors shadow-lg cursor-pointer z-10"
                                    >
                                        <Camera size={14} />
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </div>
                                <div className="ml-4 mb-2">
                                    <h2 className="text-xl font-bold text-gray-900">{user?.first_name} {user?.last_name}</h2>
                                    <p className="text-sm text-gray-500">{user?.email}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 pt-16 space-y-10">
                            {/* Personal Information */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                                    <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                                        <User size={20} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">First Name</label>
                                        <input
                                            type="text"
                                            name="first_name"
                                            value={formData.first_name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all duration-200 outline-none font-medium text-gray-900 placeholder:text-gray-400"
                                            placeholder="Enter your first name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Last Name</label>
                                        <input
                                            type="text"
                                            name="last_name"
                                            value={formData.last_name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all duration-200 outline-none font-medium text-gray-900 placeholder:text-gray-400"
                                            placeholder="Enter your last name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Phone Number</label>
                                        <div className="relative group">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-rose-500 transition-colors" size={18} />
                                            <input
                                                type="text"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all duration-200 outline-none font-medium text-gray-900 placeholder:text-gray-400"
                                                placeholder="+91 98765 43210"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-medium text-gray-700">Bio</label>
                                        <textarea
                                            name="bio"
                                            value={formData.bio}
                                            onChange={handleChange}
                                            rows={4}
                                            className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all duration-200 outline-none font-medium text-gray-900 placeholder:text-gray-400 resize-none"
                                            placeholder="Tell buyers about your experience and expertise..."
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Professional Details */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <Building size={20} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">Professional Details</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Agency Name</label>
                                        <div className="relative group">
                                            <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                            <input
                                                type="text"
                                                name="agency_name"
                                                value={formData.agency_name}
                                                onChange={handleChange}
                                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 outline-none font-medium text-gray-900 placeholder:text-gray-400"
                                                placeholder="e.g. Dream Homes Realty"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">License Number</label>
                                        <div className="relative group">
                                            <Award className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                            <input
                                                type="text"
                                                name="license_number"
                                                value={formData.license_number}
                                                onChange={handleChange}
                                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 outline-none font-medium text-gray-900 placeholder:text-gray-400"
                                                placeholder="e.g. RERA-12345"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Experience (Years)</label>
                                        <input
                                            type="number"
                                            name="experience_years"
                                            value={formData.experience_years}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 outline-none font-medium text-gray-900 placeholder:text-gray-400"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Social Links */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                        <Linkedin size={20} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">Social Presence</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">LinkedIn</label>
                                        <div className="relative group">
                                            <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0077b5] transition-colors" size={18} />
                                            <input
                                                type="text"
                                                name="social_linkedin"
                                                value={formData.social_links.linkedin}
                                                onChange={handleChange}
                                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-[#0077b5] focus:ring-4 focus:ring-[#0077b5]/10 transition-all duration-200 outline-none font-medium text-gray-900 placeholder:text-gray-400"
                                                placeholder="Profile URL"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Twitter / X</label>
                                        <div className="relative group">
                                            <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={18} />
                                            <input
                                                type="text"
                                                name="social_twitter"
                                                value={formData.social_links.twitter}
                                                onChange={handleChange}
                                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-black focus:ring-4 focus:ring-black/5 transition-all duration-200 outline-none font-medium text-gray-900 placeholder:text-gray-400"
                                                placeholder="Profile URL"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Instagram</label>
                                        <div className="relative group">
                                            <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#E4405F] transition-colors" size={18} />
                                            <input
                                                type="text"
                                                name="social_instagram"
                                                value={formData.social_links.instagram}
                                                onChange={handleChange}
                                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-[#E4405F] focus:ring-4 focus:ring-[#E4405F]/10 transition-all duration-200 outline-none font-medium text-gray-900 placeholder:text-gray-400"
                                                placeholder="Profile URL"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Footer Action */}
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                            <p className="text-sm text-gray-500">Last saved: Just now</p>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/20 disabled:opacity-50 disabled:shadow-none font-medium"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                )}

                {activeTab === "security" && (
                    <div className="p-8 pt-12 space-y-10">
                        <section className="space-y-6 max-w-2xl mx-auto">
                            <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                                    <Lock size={20} />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
                            </div>

                            <form onSubmit={handleSecuritySubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Current Password</label>
                                    <input
                                        type="password"
                                        value={securityData.current_password}
                                        onChange={(e) => setSecurityData({ ...securityData, current_password: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all duration-200 outline-none font-medium text-gray-900 placeholder:text-gray-400"
                                        placeholder="Enter current password"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">New Password</label>
                                    <input
                                        type="password"
                                        value={securityData.new_password}
                                        onChange={(e) => setSecurityData({ ...securityData, new_password: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all duration-200 outline-none font-medium text-gray-900 placeholder:text-gray-400"
                                        placeholder="Enter new password"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={securityData.confirm_password}
                                        onChange={(e) => setSecurityData({ ...securityData, confirm_password: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all duration-200 outline-none font-medium text-gray-900 placeholder:text-gray-400"
                                        placeholder="Confirm new password"
                                        required
                                    />
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full flex items-center justify-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/20 disabled:opacity-50 disabled:shadow-none font-medium"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                        Update Password
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>
                )}

                {activeTab === "notifications" && (
                    <div className="p-8 pt-12 space-y-10">
                        <section className="space-y-6 max-w-2xl mx-auto">
                            <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                                    <Bell size={20} />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-white rounded-lg shadow-sm text-gray-600">
                                            <Mail size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900">Marketing Emails</h4>
                                            <p className="text-sm text-gray-500">Receive updates about new features and promotions</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificationPrefs.email_marketing}
                                            onChange={() => handleNotificationToggle('email_marketing')}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-white rounded-lg shadow-sm text-gray-600">
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900">Security Alerts</h4>
                                            <p className="text-sm text-gray-500">Get notified about login attempts and password changes</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificationPrefs.email_security}
                                            onChange={() => handleNotificationToggle('email_security')}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-white rounded-lg shadow-sm text-gray-600">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900">New Leads</h4>
                                            <p className="text-sm text-gray-500">Push notifications for new buyer inquiries</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificationPrefs.push_new_leads}
                                            onChange={() => handleNotificationToggle('push_new_leads')}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-white rounded-lg shadow-sm text-gray-600">
                                            <MessageSquare size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900">Messages</h4>
                                            <p className="text-sm text-gray-500">Push notifications for new messages</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificationPrefs.push_messages}
                                            onChange={() => handleNotificationToggle('push_messages')}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                                    </label>
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
