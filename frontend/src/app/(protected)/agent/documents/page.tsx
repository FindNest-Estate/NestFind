'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    FileText,
    Upload,
    FolderOpen,
    Search,
    Download,
    Trash2,
    File,
    Image,
    FileSpreadsheet,
    CheckCircle,
    AlertCircle,
    Clock,
    X,
    Home,
    Loader2,
    LayoutGrid,
    List as ListIcon,
    Filter,
    RefreshCw,
    AlertTriangle,
    MapPin,
    Plus,
    ExternalLink,
    FilePlus2,
    Files,
    ShieldCheck,
    Scale,
    Megaphone,
} from 'lucide-react';
import {
    getAgentDocuments,
    uploadAgentDocument,
    deleteAgentDocument,
    getAgentAssignments,
    AgentDocument,
} from '@/lib/api/agent';
import { toast } from 'sonner';
import { format } from 'date-fns';

/* ──────────────────────────────────────────────────────── *
 *  CATEGORY CONFIG                                         *
 * ──────────────────────────────────────────────────────── */

const CATEGORY_CONFIG: Record<string, {
    label: string;
    icon: typeof FileText;
    color: string;
    bg: string;
    border: string;
}> = {
    agreement: { label: 'Agreement', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
    verification: { label: 'Verification', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    legal: { label: 'Legal', icon: Scale, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    marketing: { label: 'Marketing', icon: Megaphone, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
};

const CATEGORY_FILTERS = [
    { id: 'all', label: 'All Documents' },
    { id: 'agreement', label: 'Agreements' },
    { id: 'verification', label: 'Verification' },
    { id: 'legal', label: 'Legal' },
    { id: 'marketing', label: 'Marketing' },
];

/* ──────────────────────────────────────────────────────── *
 *  HELPERS                                                 *
 * ──────────────────────────────────────────────────────── */

const getDocIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t === 'pdf') return <FileText className="w-5 h-5 text-red-500" />;
    if (['image', 'jpg', 'jpeg', 'png'].includes(t)) return <Image className="w-5 h-5 text-blue-500" />;
    if (['doc', 'docx'].includes(t)) return <File className="w-5 h-5 text-indigo-500" />;
    if (['xls', 'xlsx', 'spreadsheet'].includes(t)) return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    return <File className="w-5 h-5 text-[var(--gray-400)]" />;
};

const formatBytes = (bytes: number, decimals = 1) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try { return format(new Date(dateStr), 'MMM d, yyyy'); }
    catch { return '—'; }
};

/* ──────────────────────────────────────────────────────── *
 *  STAT CARD                                               *
 * ──────────────────────────────────────────────────────── */

function StatCard({ label, value, icon: Icon, color }: {
    label: string;
    value: string | number;
    icon: typeof FileText;
    color: string;
}) {
    return (
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
            <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-[var(--gray-500)] truncate">{label}</p>
                <p className="text-lg font-bold text-[var(--gray-900)] leading-tight">{value}</p>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────── *
 *  DOCUMENT ROW (LIST VIEW)                                *
 * ──────────────────────────────────────────────────────── */

function DocumentRow({ doc, onDelete }: { doc: AgentDocument; onDelete: (id: string) => void }) {
    const catConfig = CATEGORY_CONFIG[doc.category] || CATEGORY_CONFIG.agreement;

    return (
        <div className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--gray-50)] group transition-colors border-b border-[var(--gray-100)] last:border-0">
            {/* Icon */}
            <div className="w-9 h-9 rounded-lg bg-[var(--gray-50)] border border-[var(--gray-200)] flex items-center justify-center flex-shrink-0">
                {getDocIcon(doc.type || 'file')}
            </div>

            {/* Name & meta */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--gray-900)] truncate">{doc.name}</p>
                <div className="flex items-center gap-3 text-[11px] text-[var(--gray-500)] mt-0.5">
                    {doc.property_title && (
                        <span className="flex items-center gap-1 truncate max-w-[180px]">
                            <Home className="w-3 h-3 text-[var(--gray-400)]" />
                            {doc.property_title}
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(doc.created_at)}
                    </span>
                </div>
            </div>

            {/* Category badge */}
            <div className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide border ${catConfig.bg} ${catConfig.color} ${catConfig.border}`}>
                <catConfig.icon className="w-3 h-3" />
                {catConfig.label}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-[var(--gray-400)] hover:text-[var(--color-brand)] hover:bg-blue-50 rounded-md transition-colors"
                    title="Open"
                >
                    <ExternalLink className="w-4 h-4" />
                </a>
                <a
                    href={doc.file_url}
                    download
                    className="p-1.5 text-[var(--gray-400)] hover:text-[var(--color-brand)] hover:bg-blue-50 rounded-md transition-colors"
                    title="Download"
                >
                    <Download className="w-4 h-4" />
                </a>
                <button
                    onClick={() => onDelete(doc.id)}
                    className="p-1.5 text-[var(--gray-400)] hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────── *
 *  DOCUMENT CARD (GRID VIEW)                               *
 * ──────────────────────────────────────────────────────── */

function DocumentCard({ doc, onDelete }: { doc: AgentDocument; onDelete: (id: string) => void }) {
    const catConfig = CATEGORY_CONFIG[doc.category] || CATEGORY_CONFIG.agreement;

    return (
        <div className="bg-white rounded-xl border border-[var(--gray-200)] hover:border-[var(--gray-300)] hover:shadow-md transition-all group overflow-hidden">
            {/* Color accent */}
            <div className={`h-1 ${catConfig.bg.replace('bg-', 'bg-')}`} style={{ background: `var(--tw-${catConfig.color.replace('text-', '')}, currentColor)` }} />

            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--gray-50)] border border-[var(--gray-200)] flex items-center justify-center">
                        {getDocIcon(doc.type || 'file')}
                    </div>
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide border ${catConfig.bg} ${catConfig.color} ${catConfig.border}`}>
                        {catConfig.label}
                    </div>
                </div>

                {/* Name */}
                <h4 className="font-semibold text-sm text-[var(--gray-900)] truncate mb-1" title={doc.name}>
                    {doc.name}
                </h4>

                {/* Meta */}
                <div className="text-[11px] text-[var(--gray-500)] space-y-1 mb-4">
                    {doc.property_title && (
                        <div className="flex items-center gap-1 truncate">
                            <Home className="w-3 h-3 text-[var(--gray-400)]" />
                            {doc.property_title}
                        </div>
                    )}
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[var(--gray-400)]" />
                        {formatDate(doc.created_at)}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex border-t border-[var(--gray-100)] pt-3 gap-1">
                    <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-[var(--gray-600)] hover:text-[var(--color-brand)] hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <ExternalLink className="w-3.5 h-3.5" /> Open
                    </a>
                    <a
                        href={doc.file_url}
                        download
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-[var(--gray-600)] hover:text-[var(--color-brand)] hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <Download className="w-3.5 h-3.5" /> Download
                    </a>
                    <button
                        onClick={() => onDelete(doc.id)}
                        className="flex items-center justify-center px-2 py-1.5 text-xs font-medium text-[var(--gray-400)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────── *
 *  UPLOAD MODAL                                            *
 * ──────────────────────────────────────────────────────── */

function UploadModal({
    isOpen,
    onClose,
    onSuccess,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('agreement');
    const [selectedProperty, setSelectedProperty] = useState('');
    const [properties, setProperties] = useState<{ id: string; title: string }[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadProperties();
            setFile(null);
            setError('');
            setSelectedProperty('');
        }
    }, [isOpen]);

    async function loadProperties() {
        try {
            const res = await getAgentAssignments('active');
            if (res.assignments) {
                setProperties(
                    res.assignments.map((a) => ({
                        id: a.property.id,
                        title: a.property.title || 'Untitled Property',
                    }))
                );
            }
        } catch {
            // silent
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        setError('');
        try {
            const mockUrl = `https://storage.nestfind.com/docs/${Date.now()}_${file.name}`;
            const res = await uploadAgentDocument(
                file.name,
                selectedCategory,
                mockUrl,
                selectedProperty || undefined
            );
            if (res.success) {
                toast.success('Document uploaded successfully');
                onSuccess();
                onClose();
            } else {
                setError('Failed to upload document');
            }
        } catch {
            setError('An error occurred during upload');
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
                className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--gray-100)]">
                    <div className="flex items-center gap-2">
                        <FilePlus2 className="w-4 h-4 text-[var(--gray-400)]" />
                        <h3 className="text-sm font-bold text-[var(--gray-900)]">Upload Document</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--gray-400)] hover:bg-[var(--gray-100)] hover:text-[var(--gray-600)] transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {error}
                        </div>
                    )}

                    {/* Drop zone */}
                    {!file ? (
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('file-upload')?.click()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging
                                    ? 'border-[var(--color-brand)] bg-blue-50/50'
                                    : 'border-[var(--gray-200)] hover:border-[var(--gray-300)] hover:bg-[var(--gray-50)]'
                                }`}
                        >
                            <Upload className={`w-7 h-7 mx-auto mb-2 ${isDragging ? 'text-[var(--color-brand)]' : 'text-[var(--gray-400)]'}`} />
                            <p className="text-xs font-medium text-[var(--gray-700)]">
                                Click to upload or drag and drop
                            </p>
                            <p className="text-[11px] text-[var(--gray-400)] mt-1">PDF, DOC, Images up to 10MB</p>
                            <input
                                id="file-upload"
                                type="file"
                                className="hidden"
                                onChange={(e) => e.target.files && setFile(e.target.files[0])}
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-between p-3 bg-[var(--gray-50)] border border-[var(--gray-200)] rounded-xl">
                            <div className="flex items-center gap-3 min-w-0">
                                {getDocIcon(file.name.split('.').pop() || 'file')}
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-[var(--gray-900)] truncate">{file.name}</p>
                                    <p className="text-[11px] text-[var(--gray-500)]">{formatBytes(file.size)}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setFile(null)}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--gray-400)] hover:bg-[var(--gray-200)] hover:text-[var(--gray-600)] transition flex-shrink-0"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Category */}
                    <div>
                        <label className="block text-xs font-medium text-[var(--gray-700)] mb-1.5">Category</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] text-[var(--gray-900)] transition"
                        >
                            <option value="agreement">Agreement</option>
                            <option value="verification">Verification</option>
                            <option value="legal">Legal</option>
                            <option value="marketing">Marketing</option>
                        </select>
                    </div>

                    {/* Property */}
                    <div>
                        <label className="block text-xs font-medium text-[var(--gray-700)] mb-1.5">
                            Property <span className="text-[var(--gray-400)]">(optional)</span>
                        </label>
                        <select
                            value={selectedProperty}
                            onChange={(e) => setSelectedProperty(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] text-[var(--gray-900)] transition"
                        >
                            <option value="">No property linked</option>
                            {properties.map((p) => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-[var(--gray-100)] bg-[var(--gray-50)]">
                    <button
                        onClick={onClose}
                        disabled={isUploading}
                        className="flex-1 py-2.5 text-xs font-medium text-[var(--gray-600)] bg-white border border-[var(--gray-200)] rounded-lg hover:bg-[var(--gray-50)] transition disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className="flex-1 py-2.5 text-xs font-medium text-white bg-[var(--gray-900)] rounded-lg hover:bg-[var(--gray-800)] disabled:opacity-50 disabled:pointer-events-none transition flex items-center justify-center gap-1.5"
                    >
                        {isUploading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Upload className="w-3.5 h-3.5" />
                        )}
                        {isUploading ? 'Uploading...' : 'Upload'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────── *
 *  MAIN PAGE                                               *
 * ──────────────────────────────────────────────────────── */

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<AgentDocument[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    const loadDocuments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getAgentDocuments();
            if (res.success) {
                setDocuments(res.documents);
                setStats(res.stats);
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to load documents');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDocuments();
    }, [loadDocuments]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;
        try {
            await deleteAgentDocument(id);
            setDocuments((docs) => docs.filter((d) => d.id !== id));
            toast.success('Document deleted');
            loadDocuments();
        } catch {
            toast.error('Failed to delete document');
        }
    };

    const filteredDocs = documents.filter((doc) => {
        const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
        const matchesSearch =
            doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (doc.property_title || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Stats derived
    const totalCount = stats?.total || documents.length;
    const agreementCount = stats?.by_category?.agreement || documents.filter(d => d.category === 'agreement').length;
    const verificationCount = stats?.by_category?.verification || documents.filter(d => d.category === 'verification').length;
    const legalCount = stats?.by_category?.legal || documents.filter(d => d.category === 'legal').length;

    return (
        <div className="space-y-5">
            {/* Upload Modal */}
            <UploadModal
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                onSuccess={loadDocuments}
            />

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-[var(--gray-900)] flex items-center gap-2">
                        <Files className="w-5 h-5 text-[var(--gray-400)]" />
                        Documents
                    </h1>
                    <p className="text-xs text-[var(--gray-500)] mt-0.5">
                        Manage agreements, verification proofs, and marketing assets
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadDocuments}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--gray-600)] bg-white border border-[var(--gray-200)] rounded-lg hover:bg-[var(--gray-50)] hover:border-[var(--gray-300)] transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setIsUploadOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[var(--gray-900)] rounded-lg hover:bg-[var(--gray-800)] transition-all"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Upload
                    </button>
                </div>
            </div>

            {/* ── Stats Row ── */}
            {!loading && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Total Documents" value={totalCount} icon={Files} color="bg-blue-500" />
                    <StatCard label="Agreements" value={agreementCount} icon={FileText} color="bg-indigo-500" />
                    <StatCard label="Verification" value={verificationCount} icon={ShieldCheck} color="bg-emerald-500" />
                    <StatCard label="Legal" value={legalCount} icon={Scale} color="bg-amber-500" />
                </div>
            )}

            {/* ── Filters & Controls ── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--gray-400)]" />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] placeholder:text-[var(--gray-400)] transition-all"
                    />
                </div>

                {/* Category pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-1">
                    <Filter className="w-3.5 h-3.5 text-[var(--gray-400)] flex-shrink-0" />
                    {CATEGORY_FILTERS.map((f) => {
                        const count =
                            f.id === 'all'
                                ? totalCount
                                : stats?.by_category?.[f.id] || documents.filter(d => d.category === f.id).length;
                        return (
                            <button
                                key={f.id}
                                onClick={() => setSelectedCategory(f.id)}
                                className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${selectedCategory === f.id
                                        ? 'bg-[var(--gray-900)] text-white'
                                        : 'bg-white text-[var(--gray-600)] border border-[var(--gray-200)] hover:border-[var(--gray-300)]'
                                    }`}
                            >
                                {f.label}
                                {count > 0 && (
                                    <span className={`ml-1 text-[10px] ${selectedCategory === f.id ? 'text-white/70' : 'text-[var(--gray-400)]'
                                        }`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* View mode toggle */}
                <div className="flex items-center gap-0.5 bg-[var(--gray-100)] rounded-lg p-0.5">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list'
                                ? 'bg-white text-[var(--gray-900)] shadow-sm'
                                : 'text-[var(--gray-400)] hover:text-[var(--gray-600)]'
                            }`}
                        title="List view"
                    >
                        <ListIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grid'
                                ? 'bg-white text-[var(--gray-900)] shadow-sm'
                                : 'text-[var(--gray-400)] hover:text-[var(--gray-600)]'
                            }`}
                        title="Grid view"
                    >
                        <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* ── Content ── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--gray-400)]" />
                    <p className="text-xs text-[var(--gray-400)]">Loading documents...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                    <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-sm text-red-600 font-medium">{error}</p>
                    <button onClick={loadDocuments} className="mt-3 text-xs text-red-500 hover:underline">
                        Try again
                    </button>
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="bg-white rounded-xl border border-[var(--gray-200)] p-12 text-center">
                    <FolderOpen className="w-10 h-10 text-[var(--gray-300)] mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-[var(--gray-700)]">No documents found</h3>
                    <p className="text-xs text-[var(--gray-500)] mt-1">
                        {searchQuery || selectedCategory !== 'all'
                            ? 'Try adjusting search or filter'
                            : 'Upload your first document to get started'}
                    </p>
                    {!searchQuery && selectedCategory === 'all' && (
                        <button
                            onClick={() => setIsUploadOpen(true)}
                            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[var(--gray-900)] rounded-lg hover:bg-[var(--gray-800)] transition"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            Upload Document
                        </button>
                    )}
                </div>
            ) : viewMode === 'list' ? (
                /* List view */
                <div className="bg-white rounded-xl border border-[var(--gray-200)] overflow-hidden">
                    {/* Column headers */}
                    <div className="flex items-center gap-4 px-4 py-2.5 bg-[var(--gray-50)] border-b border-[var(--gray-200)] text-[10px] uppercase tracking-wider font-semibold text-[var(--gray-500)]">
                        <div className="w-9" />
                        <div className="flex-1">Name</div>
                        <div className="hidden sm:block w-28">Category</div>
                        <div className="w-24 text-right">Actions</div>
                    </div>
                    {filteredDocs.map((doc) => (
                        <DocumentRow key={doc.id} doc={doc} onDelete={handleDelete} />
                    ))}
                    {/* Footer count */}
                    <div className="px-4 py-2.5 bg-[var(--gray-50)] border-t border-[var(--gray-200)] text-[11px] text-[var(--gray-500)]">
                        {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
                        {selectedCategory !== 'all' && ` in ${CATEGORY_CONFIG[selectedCategory]?.label || selectedCategory}`}
                    </div>
                </div>
            ) : (
                /* Grid view */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredDocs.map((doc) => (
                        <DocumentCard key={doc.id} doc={doc} onDelete={handleDelete} />
                    ))}
                </div>
            )}
        </div>
    );
}
