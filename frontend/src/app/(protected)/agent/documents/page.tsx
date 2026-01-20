'use client';

import React, { useState } from 'react';
import {
    FileText,
    Upload,
    FolderOpen,
    Search,
    Filter,
    Download,
    Trash2,
    Eye,
    Share2,
    MoreVertical,
    File,
    Image,
    FileSpreadsheet,
    CheckCircle,
    AlertCircle,
    Clock,
    Plus,
    X,
    Home
} from 'lucide-react';

// Types
interface Document {
    id: string;
    name: string;
    type: 'pdf' | 'image' | 'doc' | 'spreadsheet';
    category: 'agreement' | 'verification' | 'legal' | 'marketing';
    size: string;
    uploadedAt: string;
    status: 'verified' | 'pending' | 'rejected';
    propertyId?: string;
    propertyTitle?: string;
}

// Mock data
const mockDocuments: Document[] = [
    { id: '1', name: 'Sale Agreement - Villa HSR.pdf', type: 'pdf', category: 'agreement', size: '2.4 MB', uploadedAt: '2026-01-15', status: 'verified', propertyTitle: 'Modern Villa in HSR' },
    { id: '2', name: 'Property Title Deed.pdf', type: 'pdf', category: 'legal', size: '1.8 MB', uploadedAt: '2026-01-14', status: 'verified', propertyTitle: 'Modern Villa in HSR' },
    { id: '3', name: 'NOC Certificate.pdf', type: 'pdf', category: 'legal', size: '540 KB', uploadedAt: '2026-01-13', status: 'pending', propertyTitle: '3BHK in Koramangala' },
    { id: '4', name: 'Property Photos.zip', type: 'image', category: 'marketing', size: '15.2 MB', uploadedAt: '2026-01-12', status: 'verified', propertyTitle: 'Modern Villa in HSR' },
    { id: '5', name: 'Verification Report.docx', type: 'doc', category: 'verification', size: '780 KB', uploadedAt: '2026-01-10', status: 'verified', propertyTitle: '3BHK in Koramangala' },
    { id: '6', name: 'Commission Invoice.xlsx', type: 'spreadsheet', category: 'agreement', size: '125 KB', uploadedAt: '2026-01-08', status: 'pending' },
];

const categories = [
    { id: 'all', label: 'All Documents', icon: FolderOpen, count: 6 },
    { id: 'agreement', label: 'Agreements', icon: FileText, count: 2 },
    { id: 'verification', label: 'Verification', icon: CheckCircle, count: 1 },
    { id: 'legal', label: 'Legal', icon: FileSpreadsheet, count: 2 },
    { id: 'marketing', label: 'Marketing', icon: Image, count: 1 },
];

// Document type icons
const getDocIcon = (type: Document['type']) => {
    switch (type) {
        case 'pdf': return <FileText className="w-6 h-6 text-red-500" />;
        case 'image': return <Image className="w-6 h-6 text-blue-500" />;
        case 'doc': return <File className="w-6 h-6 text-indigo-500" />;
        case 'spreadsheet': return <FileSpreadsheet className="w-6 h-6 text-emerald-500" />;
    }
};

const getStatusBadge = (status: Document['status']) => {
    switch (status) {
        case 'verified':
            return <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" />Verified</span>;
        case 'pending':
            return <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" />Pending</span>;
        case 'rejected':
            return <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><AlertCircle className="w-3 h-3" />Rejected</span>;
    }
};

// Upload Modal
function UploadModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('agreement');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Upload Document</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Drop Zone */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${isDragging ? 'border-rose-500 bg-rose-50' : 'border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-rose-500' : 'text-gray-400'}`} />
                        <p className="text-gray-600 font-medium">Drop files here or click to upload</p>
                        <p className="text-gray-400 text-sm mt-1">PDF, DOC, XLSX, Images up to 25MB</p>
                        <input type="file" className="hidden" multiple />
                    </div>

                    {/* Category Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <div className="grid grid-cols-2 gap-2">
                            {categories.filter(c => c.id !== 'all').map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`p-3 rounded-xl border text-left transition-all ${selectedCategory === cat.id
                                            ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-500'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <cat.icon className={`w-5 h-5 mb-1 ${selectedCategory === cat.id ? 'text-rose-500' : 'text-gray-400'}`} />
                                    <span className="text-sm font-medium text-gray-900">{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Property Link */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Link to Property (Optional)</label>
                        <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none text-sm">
                            <option value="">Select a property...</option>
                            <option value="1">Modern Villa in HSR</option>
                            <option value="2">3BHK in Koramangala</option>
                        </select>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                        Cancel
                    </button>
                    <button className="px-6 py-2 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 shadow-lg shadow-rose-200">
                        Upload
                    </button>
                </div>
            </div>
        </div>
    );
}

// Document Card
function DocumentCard({ doc, onView, onShare, onDelete }: {
    doc: Document;
    onView: () => void;
    onShare: () => void;
    onDelete: () => void;
}) {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all group">
            <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                    {getDocIcon(doc.type)}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">{doc.name}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">{doc.size} • {doc.uploadedAt}</p>
                    {doc.propertyTitle && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Home className="w-3 h-3" />
                            {doc.propertyTitle}
                        </p>
                    )}
                </div>
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>
                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                            <div className="absolute right-0 top-8 w-36 bg-white rounded-lg shadow-xl border border-gray-100 z-20 py-1 animate-scale-in">
                                <button onClick={onView} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                    <Eye className="w-4 h-4" /> View
                                </button>
                                <button className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                    <Download className="w-4 h-4" /> Download
                                </button>
                                <button onClick={onShare} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                    <Share2 className="w-4 h-4" /> Share
                                </button>
                                <button onClick={onDelete} className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                    <Trash2 className="w-4 h-4" /> Delete
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
                {getStatusBadge(doc.status)}
                <span className="text-[10px] text-gray-400 uppercase tracking-wide">{doc.category}</span>
            </div>
        </div>
    );
}

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>(mockDocuments);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    const filteredDocs = documents.filter(doc => {
        const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
        const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.propertyTitle?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleDelete = (id: string) => {
        if (confirm('Delete this document?')) {
            setDocuments(documents.filter(d => d.id !== id));
        }
    };

    return (
        <div className="min-h-screen pb-20 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Document Center</h1>
                    <p className="text-gray-500 mt-1">Manage and organize your property documents.</p>
                </div>
                <button
                    onClick={() => setIsUploadOpen(true)}
                    className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-rose-200 transition-all"
                >
                    <Upload className="w-5 h-5" />
                    Upload Document
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <p className="text-sm text-gray-500">Total Documents</p>
                    <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <p className="text-sm text-gray-500">Verified</p>
                    <p className="text-2xl font-bold text-emerald-500">{documents.filter(d => d.status === 'verified').length}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <p className="text-sm text-gray-500">Pending Review</p>
                    <p className="text-2xl font-bold text-amber-500">{documents.filter(d => d.status === 'pending').length}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <p className="text-sm text-gray-500">Storage Used</p>
                    <p className="text-2xl font-bold text-gray-900">21.8 MB</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Categories Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
                        <div className="space-y-1">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${selectedCategory === cat.id
                                            ? 'bg-rose-50 text-rose-600'
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <cat.icon className="w-4 h-4" />
                                        <span className="text-sm font-medium">{cat.label}</span>
                                    </div>
                                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{cat.count}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Documents Grid */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search documents..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        />
                    </div>

                    {/* Documents */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredDocs.map(doc => (
                            <DocumentCard
                                key={doc.id}
                                doc={doc}
                                onView={() => console.log('View', doc.id)}
                                onShare={() => console.log('Share', doc.id)}
                                onDelete={() => handleDelete(doc.id)}
                            />
                        ))}
                        {filteredDocs.length === 0 && (
                            <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">No documents found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Upload Modal */}
            <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
        </div>
    );
}
