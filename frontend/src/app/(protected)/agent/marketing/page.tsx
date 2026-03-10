'use client';

import React, { useState, useEffect } from 'react';
import {
    LayoutTemplate,
    Share2,
    Download,
    Image as ImageIcon,
    FileText,
    Sparkles,
    Loader2,
    CheckCircle,
    History,
    Palette,
    Type,
    Layout,
    ArrowRight
} from 'lucide-react';
import {
    getAgentAssignments,
    getMarketingTemplates,
    generateMarketingAsset,
    getMarketingHistory,
    AssignmentListItem,
    MarketingTemplate,
    MarketingAssetResponse,
    MarketingHistoryItem,
    getAgentMarketingProfile,
    updateAgentMarketingProfile,
    MarketingProfile
} from '@/lib/api/agent';
import { getImageUrl } from '@/lib/api';

export default function MarketingPage() {
    // Data State
    const [properties, setProperties] = useState<AssignmentListItem[]>([]);
    const [templates, setTemplates] = useState<MarketingTemplate[]>([]);
    const [history, setHistory] = useState<MarketingHistoryItem[]>([]);

    // Selection State
    const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'create' | 'history' | 'profile'>('create');

    // Customization State
    const [accentColor, setAccentColor] = useState('#10B981'); // Default Emerald
    const [headline, setHeadline] = useState(''); // Optional override

    // UI State
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedAsset, setGeneratedAsset] = useState<MarketingAssetResponse | null>(null);

    // Profile State
    const [profile, setProfile] = useState<MarketingProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
    const [bio, setBio] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [serviceAreas, setServiceAreas] = useState<string>('');
    const [socialLinks, setSocialLinks] = useState({
        website: '', linkedin: '', twitter: '', instagram: '', facebook: ''
    });

    useEffect(() => {
        async function loadData() {
            try {
                const [propsRes, tempsRes, histRes, profileRes] = await Promise.all([
                    getAgentAssignments('active'),
                    getMarketingTemplates(),
                    getMarketingHistory(),
                    getAgentMarketingProfile().catch(e => {
                        // Ignore 404s for new profiles
                        if (e?.status !== 404) console.error("Profile fetch error", e);
                        return { success: false, profile: null };
                    })
                ]);

                setProperties(propsRes.assignments);
                setTemplates(tempsRes.templates);
                setHistory(histRes.history);

                if (profileRes.success && profileRes.profile) {
                    setProfile(profileRes.profile);
                    setBio(profileRes.profile.bio || '');
                    setPhotoUrl(profileRes.profile.photo_url || '');
                    setServiceAreas((profileRes.profile.service_areas || []).join(', '));
                    const links = profileRes.profile.social_links || {};
                    setSocialLinks({
                        website: links.website || '',
                        linkedin: links.linkedin || '',
                        twitter: links.twitter || '',
                        instagram: links.instagram || '',
                        facebook: links.facebook || ''
                    });
                }
                setProfileLoading(false);

                if (propsRes.assignments.length > 0) setSelectedProperty(propsRes.assignments[0].property.id);
                if (tempsRes.templates.length > 0) setSelectedTemplate(tempsRes.templates[0].id);
            } catch (error) {
                console.error("Failed to load marketing data", error);
            }
        }
        loadData();
    }, []);

    const handleGenerate = async () => {
        if (!selectedProperty || !selectedTemplate) return;

        setIsGenerating(true);
        setGeneratedAsset(null);

        try {
            const res = await generateMarketingAsset(selectedProperty, selectedTemplate, {
                accentColor,
                headline: headline || undefined
            });
            if (res.success) {
                setGeneratedAsset(res);
                // Refresh history quietly
                getMarketingHistory().then(h => setHistory(h.history));
            }
        } catch (error) {
            console.error("Failed to generate asset", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingProfile(true);
        setProfileError(null);
        setProfileSuccessMsg(null);

        try {
            const cleanedLinks = Object.fromEntries(
                Object.entries(socialLinks).filter(([_, v]) => v.trim() !== '')
            );
            const areasArray = serviceAreas.split(',').map(a => a.trim()).filter(a => a.length > 0);

            const updateData: Partial<MarketingProfile> = {
                bio: bio.trim(),
                photo_url: photoUrl.trim(),
                service_areas: areasArray,
                social_links: cleanedLinks
            };

            const res = await updateAgentMarketingProfile(updateData);
            if (res.success) {
                setProfileSuccessMsg("Profile updated successfully!");
                setTimeout(() => setProfileSuccessMsg(null), 3000);
            } else {
                throw new Error("Update failed");
            }
        } catch (err: any) {
            setProfileError(err.message || "Failed to save profile.");
        } finally {
            setSavingProfile(false);
        }
    };

    const currentProperty = properties.find(p => p.property.id === selectedProperty);
    const currentTemplate = templates.find(t => t.id === selectedTemplate);

    return (
        <div className="min-h-screen pb-20 space-y-6 animate-fade-in relative">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Marketing Studio</h1>
                    <p className="text-gray-500 mt-1">Design professional materials for your listings.</p>
                </div>

                <div className="bg-white p-1 rounded-lg border border-gray-200 flex shadow-sm">
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'create' ? 'bg-[var(--gray-900)] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Create Asset
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-[var(--gray-900)] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        History
                    </button>
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'profile' ? 'bg-[var(--gray-900)] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Public Profile
                    </button>
                </div>
            </div>

            {activeTab === 'create' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-180px)] min-h-[600px]">

                    {/* LEFT PANEL: Controls */}
                    <div className="lg:col-span-4 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Layout className="w-5 h-5 text-gray-400" /> 1. Select Listing
                            </h3>
                            <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                {properties.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedProperty(p.property.id)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedProperty === p.property.id ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <img src={getImageUrl(p.property.thumbnail_url) || '/placeholder-house.jpg'} className="w-10 h-10 rounded-lg object-cover bg-gray-200" />
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium truncate text-gray-900">{p.property.title}</div>
                                            <div className="text-xs text-gray-500">{p.property.city}</div>
                                        </div>
                                        {selectedProperty === p.property.id && <CheckCircle className="w-4 h-4 text-emerald-600 ml-auto" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 border-b border-gray-100 flex-1 overflow-y-auto">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                                <LayoutTemplate className="w-5 h-5 text-gray-400" /> 2. Choose Template
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {templates.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setSelectedTemplate(t.id)}
                                        className={`relative aspect-[3/4] rounded-xl border overflow-hidden transition-all ${selectedTemplate === t.id ? 'border-emerald-500 ring-2 ring-emerald-500 ring-offset-1' : 'border-gray-200 hover:shadow-md'}`}
                                    >
                                        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-xs text-gray-400">{t.name}</div>
                                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                                            <span className="text-white text-[10px] font-medium">{t.name}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                                <Palette className="w-4 h-4 text-gray-400" /> Customize
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Accent Color</label>
                                    <div className="flex gap-2">
                                        {['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#111827'].map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setAccentColor(c)}
                                                className={`w-6 h-6 rounded-full border-2 ${accentColor === c ? 'border-gray-400 scale-110' : 'border-transparent'}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: Preview */}
                    <div className="lg:col-span-8 bg-gray-100 rounded-2xl border border-gray-200 flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 left-0 p-4 z-10">
                            <span className="bg-white/90 backdrop-blur text-xs font-bold px-3 py-1 rounded-full shadow-sm text-gray-500">PREVIEW</span>
                        </div>

                        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden relative">
                            {/* Mock Preview using iframe/image based on state */}
                            <div className="relative shadow-2xl rounded-sm transition-all duration-500 ease-in-out transform" style={{ height: '500px', aspectRatio: '3/4', backgroundColor: 'white' }}>
                                {/* Simple Mock content that reacts to state */}
                                <div className="h-1/2 bg-gray-200 relative overflow-hidden">
                                    <img src={getImageUrl(currentProperty?.property.thumbnail_url) || '/placeholder-house.jpg'} className="w-full h-full object-cover" />
                                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
                                        <h2 className="text-white font-bold text-xl">{currentProperty?.property.title || 'Select Property'}</h2>
                                    </div>
                                </div>
                                <div className="h-1/2 p-6 flex flex-col">
                                    <div className="w-16 h-1 mb-4 rounded-full" style={{ backgroundColor: accentColor }}></div>
                                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-4">
                                        Beautiful property located in {currentProperty?.property.city || '...'}...
                                    </p>
                                    <div className="mt-auto flex items-center justify-between border-t pt-4">
                                        <span className="font-bold text-gray-900 text-lg">₹ {currentProperty?.property.price ? (currentProperty.property.price / 10000000).toFixed(2) + ' Cr' : '...'}</span>
                                        <span className="text-xs text-gray-400">NESTFIND</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-4 border-t border-gray-200 flex justify-end items-center gap-4">
                            <span className="text-sm text-gray-500">{currentTemplate?.name} template selected</span>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !selectedProperty}
                                className={`
                                    flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5
                                    ${isGenerating || !selectedProperty ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-900 hover:bg-black'}
                                `}
                            >
                                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                Generate Asset
                            </button>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'history' ? (
                /* HISTORY TAB */
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 animate-fade-in">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <History className="w-5 h-5 text-gray-400" /> Recent Assets
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {history.map(item => (
                            <div key={item.id} className="group relative border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                                <div className="aspect-[3/4] bg-gray-100 relative">
                                    <img src={item.url} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
                                        <button className="p-2 bg-white rounded-full text-gray-900 hover:text-emerald-600 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all">
                                            <Download className="w-5 h-5" />
                                        </button>
                                        <button className="p-2 bg-white rounded-full text-gray-900 hover:text-blue-600 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all delay-75">
                                            <Share2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-3 bg-white">
                                    <h4 className="font-semibold text-gray-900 text-sm truncate">{item.property_title}</h4>
                                    <p className="text-xs text-gray-500 mt-1 flex justify-between">
                                        <span>{item.template_name}</span>
                                        <span>{new Date(item.generated_at).toLocaleDateString()}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                        {history.length === 0 && (
                            <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                No assets generated yet.
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* PROFILE TAB */
                <div className="bg-white rounded-2xl border border-[var(--gray-200)] shadow-sm overflow-hidden animate-fade-in max-w-4xl mx-auto">
                    {profileLoading ? (
                        <div className="p-20 flex justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-[var(--gray-300)]" />
                        </div>
                    ) : (
                        <form onSubmit={handleSaveProfile} className="p-8 space-y-8">
                            {/* Status Messages */}
                            {profileError && (
                                <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-700">
                                    <p className="text-sm font-medium">{profileError}</p>
                                </div>
                            )}

                            {profileSuccessMsg && (
                                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-3 text-emerald-700">
                                    <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                                    <p className="text-sm font-medium">{profileSuccessMsg}</p>
                                </div>
                            )}

                            <div>
                                <h2 className="text-sm font-bold tracking-tight text-[var(--gray-900)] uppercase mb-4">
                                    Basic Information
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-3 bg-[var(--gray-50)] rounded-lg border border-[var(--gray-100)]">
                                        <span className="block text-[10px] uppercase font-bold text-[var(--gray-400)] tracking-wider">Full Name</span>
                                        <span className="block text-sm font-medium text-[var(--gray-700)] mt-0.5">{profile?.name || 'Your Name'}</span>
                                    </div>
                                    <div className="p-3 bg-[var(--gray-50)] rounded-lg border border-[var(--gray-100)]">
                                        <span className="block text-[10px] uppercase font-bold text-[var(--gray-400)] tracking-wider">Contact Email</span>
                                        <span className="block text-sm font-medium text-[var(--gray-700)] mt-0.5">{profile?.email || 'email@example.com'}</span>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-[var(--gray-100)]" />

                            <div className="space-y-4">
                                <h2 className="text-sm font-bold tracking-tight text-[var(--gray-900)] uppercase">
                                    Public Listing Details
                                </h2>
                                <div>
                                    <label className="text-[12px] font-bold text-[var(--gray-600)] mb-1.5 uppercase tracking-wider block">Profile Photo URL</label>
                                    <input
                                        type="url" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)}
                                        className="w-full px-3 py-2 text-[13px] border border-[var(--gray-200)] rounded-lg focus:ring-1 focus:ring-[var(--gray-900)] focus:border-[var(--gray-900)] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[12px] font-bold text-[var(--gray-600)] mb-1.5 uppercase tracking-wider block">Service Areas</label>
                                    <input
                                        type="text" value={serviceAreas} onChange={(e) => setServiceAreas(e.target.value)}
                                        placeholder="Comma separated"
                                        className="w-full px-3 py-2 text-[13px] border border-[var(--gray-200)] rounded-lg focus:ring-1 focus:ring-[var(--gray-900)] focus:border-[var(--gray-900)] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[12px] font-bold text-[var(--gray-600)] mb-1.5 uppercase tracking-wider block">Agent Biography</label>
                                    <textarea
                                        value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
                                        className="w-full px-3 py-2 text-[13px] border border-[var(--gray-200)] rounded-lg focus:ring-1 focus:ring-[var(--gray-900)] focus:border-[var(--gray-900)] outline-none resize-none"
                                    />
                                </div>
                            </div>

                            <hr className="border-[var(--gray-100)]" />

                            <div className="space-y-4">
                                <h2 className="text-sm font-bold tracking-tight text-[var(--gray-900)] uppercase">Social Links</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {['website', 'linkedin', 'twitter', 'instagram', 'facebook'].map(network => (
                                        <div key={network}>
                                            <label className="text-[12px] font-bold text-[var(--gray-600)] mb-1.5 uppercase tracking-wider block">{network}</label>
                                            <input
                                                type="url"
                                                value={(socialLinks as any)[network]}
                                                onChange={(e) => setSocialLinks({ ...socialLinks, [network]: e.target.value })}
                                                className="w-full px-3 py-2 text-[13px] border border-[var(--gray-200)] rounded-lg focus:ring-1 focus:ring-[var(--gray-900)] focus:border-[var(--gray-900)] outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={savingProfile}
                                    className="px-6 py-2.5 bg-[var(--gray-900)] text-white text-[13px] font-bold uppercase tracking-wider rounded-lg hover:bg-black transition-colors disabled:opacity-50"
                                >
                                    {savingProfile ? 'Saving...' : 'Save Profile'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {/* Success Modal */}
            {generatedAsset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-scale-in">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                                <CheckCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Asset Ready!</h3>
                            <p className="text-gray-500 mt-2 mb-6 text-sm">Your marketing material has been generated successfully.</p>

                            <img src={generatedAsset.asset_url} className="w-full rounded-lg border border-gray-200 mb-6 bg-gray-50" />

                            <div className="flex gap-3">
                                <button onClick={() => setGeneratedAsset(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors">Close</button>
                                <button className="flex-1 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200">Download</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
