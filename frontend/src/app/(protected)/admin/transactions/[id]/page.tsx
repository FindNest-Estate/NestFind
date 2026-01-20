'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileText,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    Loader2,
    ArrowLeft,
    User,
    Building2,
    DollarSign,
    Download,
    Eye,
    Printer
} from 'lucide-react';
import { get, post } from '@/lib/api';
import { format } from 'date-fns';

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
    admin_notes: string | null;
    uploaded_at: string;
}

interface Transaction {
    id: string;
    property: {
        id: string;
        title: string;
        city: string;
        address: string;
    };
    buyer: { id: string; name: string };
    seller: { id: string; name: string };
    agent: { id: string; name: string };
    total_price: number;
    commission: {
        total: number;
        agent_share: number;
        platform_share: number;
    };
    status: string;
    display_status: string;
    created_at?: string;
}

export default function AdminTransactionDetailPage({ params }: { params: Promise<PageParams> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState(false);
    const [verifyingDoc, setVerifyingDoc] = useState<string | null>(null);
    const [approvalNotes, setApprovalNotes] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [resolvedParams.id]);

    const loadData = async () => {
        try {
            const [txnRes, docRes] = await Promise.all([
                get<{ success: boolean; transaction: Transaction }>(`/transactions/${resolvedParams.id}`),
                get<{ success: boolean; documents: Document[] }>(`/transactions/${resolvedParams.id}/documents`)
            ]);

            if (txnRes.success) setTransaction(txnRes.transaction);
            if (docRes.success) setDocuments(docRes.documents || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyDocument = async (docId: string, approved: boolean) => {
        setVerifyingDoc(docId);
        try {
            await post(`/admin/documents/${docId}/verify`, { approved });
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to verify document');
        } finally {
            setVerifyingDoc(null);
        }
    };

    const handleApproveTransaction = async () => {
        if (!transaction) return;

        const unverifiedDocs = documents.filter(d => !d.admin_verified);
        if (unverifiedDocs.length > 0) {
            alert('Please verify all documents before approving the transaction');
            return;
        }

        setApproving(true);
        try {
            const response = await post(`/admin/transactions/${transaction.id}/approve`, {
                notes: approvalNotes
            });

            if (response.success) {
                alert('Transaction approved! Property marked as SOLD.');
                router.push('/admin/transactions');
            } else {
                throw new Error(response.error);
            }
        } catch (err: any) {
            alert(err.message || 'Failed to approve transaction');
        } finally {
            setApproving(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value);
    };

    const handleDownloadInvoice = () => {
        if (!transaction) return;

        const invoiceWindow = window.open('', '_blank');
        if (!invoiceWindow) return;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice #${transaction.id.slice(0, 8)}</title>
                <style>
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; max-width: 800px; mx-auto; color: #333; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #eee; }
                    .logo { font-size: 24px; font-weight: bold; color: #10B981; }
                    .invoice-details { text-align: right; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
                    .section-title { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
                    .value { font-size: 16px; font-weight: 500; }
                    .table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                    .table th { text-align: left; padding: 12px; background: #f9fafb; font-size: 12px; text-transform: uppercase; color: #666; }
                    .table td { padding: 12px; border-bottom: 1px solid #eee; }
                    .total-section { display: flex; justify-content: flex-end; }
                    .total-row { display: flex; justify-content: space-between; width: 300px; padding: 10px 0; }
                    .total-row.final { font-size: 20px; font-weight: bold; border-top: 2px solid #eee; margin-top: 10px; padding-top: 20px; }
                    .footer { margin-top: 80px; text-align: center; color: #999; font-size: 12px; }
                    .status-stamp { display: inline-block; padding: 5px 10px; border: 2px solid #10B981; color: #10B981; font-weight: bold; text-transform: uppercase; border-radius: 4px; transform: rotate(-10deg); position: absolute; top: 150px; right: 40px; opacity: 0.5; font-size: 24px; }
                </style>
            </head>
            <body>
                ${transaction.status === 'COMPLETED' ? '<div class="status-stamp">PAID / COMPLETED</div>' : ''}
                
                <div class="header">
                    <div class="logo">NestFind.</div>
                    <div class="invoice-details">
                        <h1>INVOICE</h1>
                        <p>#INV-${transaction.id.slice(0, 8).toUpperCase()}</p>
                        <p>Date: ${new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <div class="grid">
                    <div>
                        <div class="section-title">Bill To</div>
                        <div class="value">${transaction.buyer.name}</div>
                        <div style="margin-top: 5px; color: #666;">Buyer ID: ${transaction.buyer.id.slice(0, 8)}</div>
                    </div>
                    <div>
                        <div class="section-title">Property Details</div>
                        <div class="value">${transaction.property.title}</div>
                        <div style="margin-top: 5px; color: #666;">${transaction.property.address}<br>${transaction.property.city}</div>
                    </div>
                </div>

                <table class="table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Reference</th>
                            <th style="text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Property Sale Value</td>
                            <td>${transaction.property.id.slice(0, 8)}</td>
                            <td style="text-align: right;">${formatCurrency(transaction.total_price)}</td>
                        </tr>
                        <tr>
                            <td style="padding-left: 20px; font-size: 12px; color: #666;">Handling Fees (included)</td>
                            <td>-</td>
                            <td style="text-align: right;">-</td>
                        </tr>
                    </tbody>
                </table>

                <div class="total-section">
                    <div>
                        <div class="total-row">
                            <span>Subtotal</span>
                            <span>${formatCurrency(transaction.total_price)}</span>
                        </div>
                        <div class="total-row">
                            <span>Tax (0%)</span>
                            <span>₹0.00</span>
                        </div>
                        <div class="total-row final">
                            <span>Total</span>
                            <span>${formatCurrency(transaction.total_price)}</span>
                        </div>
                    </div>
                </div>

                <div class="footer">
                    <p>Thank you for choosing NestFind.</p>
                    <p>This is a computer generated invoice and does not require physical signature.</p>
                </div>

                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        invoiceWindow.document.write(html);
        invoiceWindow.document.close();
    };

    const getDocTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'NESTFIND_AGREEMENT': 'NestFind Agreement',
            'REGISTRATION_CERTIFICATE': 'Registration Certificate',
            'SALE_DEED': 'Sale Deed',
            'VERIFICATION_PHOTO': 'Verification Photo',
            'ID_PROOF': 'ID Proof',
            'OTHER': 'Other Document'
        };
        return labels[type] || type;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            </div>
        );
    }

    if (error || !transaction) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <p className="text-red-600">{error || 'Transaction not found'}</p>
            </div>
        );
    }

    const allDocsVerified = documents.length > 0 && documents.every(d => d.admin_verified);
    const canApprove = transaction.status === 'ADMIN_REVIEW' && allDocsVerified;

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Transactions
                </button>
                <button
                    onClick={handleDownloadInvoice}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                >
                    <Printer className="w-4 h-4" />
                    Print Invoice
                </button>
            </div>

            {/* Header */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">

                <div className="flex items-center justify-between">
                    <div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${transaction.status === 'ADMIN_REVIEW'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                            }`}>
                            <Clock className="w-3.5 h-3.5" />
                            {transaction.display_status}
                        </span>
                        <h1 className="text-xl font-bold text-slate-900 mt-2">{transaction.property.title}</h1>
                        <p className="text-slate-500">{transaction.property.address}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-500">Deal Value</p>
                        <p className="text-2xl font-bold text-emerald-600">{formatCurrency(transaction.total_price)}</p>
                    </div>
                </div>
            </div>

            {/* Parties */}
            <div className="grid md:grid-cols-3 gap-4">
                {[
                    { role: 'Buyer', name: transaction.buyer.name },
                    { role: 'Seller', name: transaction.seller.name },
                    { role: 'Agent', name: transaction.agent.name }
                ].map((party) => (
                    <div key={party.role} className="bg-white rounded-xl p-4 border border-slate-200">
                        <p className="text-sm text-slate-500">{party.role}</p>
                        <p className="font-semibold text-slate-900">{party.name}</p>
                    </div>
                ))}
            </div>

            {/* Documents Section */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-900">Uploaded Documents</h2>
                    <p className="text-sm text-slate-500">Review and verify all documents</p>
                </div>

                {documents.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        No documents uploaded yet
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {documents.map((doc) => (
                            <div key={doc.id} className="p-4 hover:bg-slate-50">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${doc.admin_verified ? 'bg-emerald-100' : 'bg-slate-100'
                                            }`}>
                                            <FileText className={`w-5 h-5 ${doc.admin_verified ? 'text-emerald-600' : 'text-slate-400'
                                                }`} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">
                                                {getDocTypeLabel(doc.document_type)}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                {doc.uploader_name} ({doc.uploader_role}) • {doc.file_name}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {format(new Date(doc.uploaded_at), 'MMM d, yyyy h:mm a')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <a
                                            href={doc.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </a>

                                        {doc.admin_verified ? (
                                            <span className="flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Verified
                                            </span>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleVerifyDocument(doc.id, true)}
                                                    disabled={verifyingDoc === doc.id}
                                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-50"
                                                    title="Approve"
                                                >
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleVerifyDocument(doc.id, false)}
                                                    disabled={verifyingDoc === doc.id}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                                                    title="Reject"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Commission Info */}
            <div className="bg-white rounded-xl p-5 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-3">Commission Distribution</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-sm text-slate-500">Total Commission</p>
                        <p className="text-lg font-bold text-slate-900">{formatCurrency(transaction.commission.total)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Agent (0.7%)</p>
                        <p className="text-lg font-bold text-emerald-600">{formatCurrency(transaction.commission.agent_share)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">NestFind (0.2%)</p>
                        <p className="text-lg font-bold text-amber-600">{formatCurrency(transaction.commission.platform_share)}</p>
                    </div>
                </div>
            </div>

            {/* Approval Section */}
            {transaction.status === 'ADMIN_REVIEW' && (
                <div className="bg-white rounded-xl p-5 border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-3">Final Approval</h3>

                    {!allDocsVerified && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                            ⚠️ Please verify all documents before approving
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Admin Notes (optional)
                        </label>
                        <textarea
                            value={approvalNotes}
                            onChange={(e) => setApprovalNotes(e.target.value)}
                            placeholder="Add any notes about this transaction..."
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg resize-none"
                            rows={3}
                        />
                    </div>

                    <button
                        onClick={handleApproveTransaction}
                        disabled={!canApprove || approving}
                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {approving ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Approving...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-5 h-5" />
                                Approve & Complete Transaction
                            </>
                        )}
                    </button>
                    <p className="text-xs text-slate-500 text-center mt-2">
                        This will mark the property as SOLD and disburse agent commission
                    </p>
                </div>
            )}

            {transaction.status === 'COMPLETED' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-emerald-800">Transaction Completed</h3>
                    <p className="text-emerald-600 mt-1">Property has been marked as SOLD</p>
                </div>
            )}
        </div>
    );
}
