'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    Upload,
    FileText,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ArrowLeft,
    Image,
    File,
    X
} from 'lucide-react';
import { get, post } from '@/lib/api';

interface PageParams {
    id: string;
}

interface Document {
    id: string;
    uploader_name: string;
    uploader_role: string;
    document_type: string;
    file_url: string;
    file_name: string;
    admin_verified: boolean;
    uploaded_at: string;
}

interface UserInfo {
    id: string;
    role: string;
}

const DOCUMENT_TYPES = {
    BUYER: [
        { type: 'NESTFIND_AGREEMENT', label: 'Signed NestFind Agreement', required: true },
        { type: 'REGISTRATION_CERTIFICATE', label: 'Registration Certificate', required: true }
    ],
    SELLER: [
        { type: 'NESTFIND_AGREEMENT', label: 'Signed NestFind Agreement', required: true },
        { type: 'SALE_DEED', label: 'Sale Deed Copy', required: true }
    ],
    AGENT: [
        { type: 'VERIFICATION_PHOTO', label: 'Verification Photo at Office', required: true }
    ]
};

export default function TransactionDocumentsPage({ params }: { params: Promise<PageParams> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string>('BUYER');

    useEffect(() => {
        loadDocuments();
        detectUserRole();
    }, [resolvedParams.id]);

    const detectUserRole = async () => {
        // In a real app, determine from auth context
        // For now, detect from URL path
        if (window.location.pathname.includes('/sell/')) {
            setUserRole('SELLER');
        } else if (window.location.pathname.includes('/agent/')) {
            setUserRole('AGENT');
        } else {
            setUserRole('BUYER');
        }
    };

    const loadDocuments = async () => {
        try {
            const response = await get<{ success: boolean; documents: Document[] }>(`/transactions/${resolvedParams.id}/documents`);
            if (response.success) {
                setDocuments(response.documents || []);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (docType: string, file: File) => {
        setUploading(docType);
        try {
            // In a real app, upload to storage first
            // For now, create a mock URL
            const mockUrl = `/uploads/${Date.now()}_${file.name}`;

            const response = await post(`/transactions/${resolvedParams.id}/documents`, {
                document_type: docType,
                file_url: mockUrl,
                file_name: file.name,
                uploader_role: userRole
            });

            if (response.success) {
                loadDocuments();
            } else {
                throw new Error(response.error || 'Upload failed');
            }
        } catch (err: any) {
            alert(err.message || 'Upload failed');
        } finally {
            setUploading(null);
        }
    };

    const getUploadedDoc = (docType: string) => {
        return documents.find(d => d.document_type === docType && d.uploader_role === userRole);
    };

    const requiredDocs = DOCUMENT_TYPES[userRole as keyof typeof DOCUMENT_TYPES] || [];
    const allUploaded = requiredDocs.every(d => getUploadedDoc(d.type));

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
                <ArrowLeft className="w-4 h-4" />
                Back
            </button>

            {/* Header */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Upload Documents</h1>
                        <p className="text-slate-500">Upload required documents for verification</p>
                    </div>
                </div>
            </div>

            {/* Role Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm font-medium text-slate-700">
                Uploading as: <span className="text-emerald-600">{userRole}</span>
            </div>

            {/* Progress */}
            <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Upload Progress</span>
                    <span className="text-sm font-medium text-slate-900">
                        {documents.filter(d => d.uploader_role === userRole).length} / {requiredDocs.length}
                    </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                        className="bg-emerald-500 h-2 rounded-full transition-all"
                        style={{
                            width: `${(documents.filter(d => d.uploader_role === userRole).length / requiredDocs.length) * 100}%`
                        }}
                    />
                </div>
            </div>

            {/* Document Upload Cards */}
            <div className="space-y-4">
                {requiredDocs.map((doc) => {
                    const uploaded = getUploadedDoc(doc.type);
                    const isUploading = uploading === doc.type;

                    return (
                        <div
                            key={doc.type}
                            className={`bg-white rounded-xl p-5 border ${uploaded ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'
                                }`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    {uploaded ? (
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                                    ) : (
                                        <File className="w-6 h-6 text-slate-400 flex-shrink-0" />
                                    )}
                                    <div>
                                        <h3 className="font-medium text-slate-900">{doc.label}</h3>
                                        {uploaded && (
                                            <p className="text-sm text-slate-500 mt-1">
                                                {uploaded.file_name}
                                            </p>
                                        )}
                                        {doc.required && !uploaded && (
                                            <span className="text-xs text-amber-600">Required</span>
                                        )}
                                    </div>
                                </div>

                                {uploaded ? (
                                    <div className="flex items-center gap-2">
                                        {uploaded.admin_verified ? (
                                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                                                Verified
                                            </span>
                                        ) : (
                                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                                                Pending Review
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <label className="cursor-pointer">
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleUpload(doc.type, file);
                                            }}
                                            disabled={isUploading}
                                        />
                                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${isUploading
                                                ? 'bg-slate-100 text-slate-400'
                                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                            }`}>
                                            {isUploading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Uploading...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-4 h-4" />
                                                    Upload
                                                </>
                                            )}
                                        </span>
                                    </label>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* All Documents Section */}
            {documents.length > 0 && (
                <div className="bg-white rounded-xl p-5 border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-4">All Uploaded Documents</h3>
                    <div className="space-y-3">
                        {documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-slate-400" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{doc.file_name || doc.document_type}</p>
                                        <p className="text-xs text-slate-500">
                                            {doc.uploader_name} ({doc.uploader_role})
                                        </p>
                                    </div>
                                </div>
                                {doc.admin_verified ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : (
                                    <span className="text-xs text-amber-600">Pending</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Status Message */}
            {allUploaded && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-medium text-emerald-800">All documents uploaded!</p>
                    <p className="text-sm text-emerald-600 mt-1">
                        Waiting for all parties to upload and admin review.
                    </p>
                </div>
            )}
        </div>
    );
}
