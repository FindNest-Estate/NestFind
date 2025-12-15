import { FileText, Download, Lock, FileCheck, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface DocumentVaultProps {
    deal: any;
    isBuyer: boolean;
    isAgent: boolean;
    onUpdate: () => void;
}

export function DocumentVault({ deal, isBuyer, isAgent, onUpdate }: DocumentVaultProps) {
    const docs = [
        {
            title: "Acceptance Letter",
            url: deal.acceptance_letter_url,
            isReady: !!deal.acceptance_letter_url,
            statusLabel: "Issued",
            statusColor: "bg-emerald-50 text-emerald-600 border-emerald-100"
        },
        {
            title: "Token Receipt",
            url: deal.reservation_pdf_url,
            isReady: !!deal.reservation_pdf_url,
            statusLabel: "Receipt Generated",
            statusColor: "bg-emerald-50 text-emerald-600 border-emerald-100"
        },
        {
            title: "Sale Deed Draft",
            url: deal.sale_deed_url,
            isReady: !!deal.sale_deed_url,
            statusLabel: "Draft Ready",
            statusColor: "bg-blue-50 text-blue-600 border-blue-100"
        },
        {
            title: "Final Registered Deed",
            url: deal.final_registration_doc_url,
            isReady: !!deal.final_registration_doc_url,
            statusLabel: deal.admin_doc_verified ? "Verified" : "Under Review",
            statusColor: deal.admin_doc_verified ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
        }
    ];

    const readyCount = docs.filter(d => d.isReady).length;

    return (
        <div className="space-y-4">
            {/* Header / Progress */}
            <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Files ({readyCount}/{docs.length})</h4>
                <div className="flex gap-1">
                    {docs.map((doc, idx) => (
                        <div key={idx} className={`w-6 h-1 rounded-full text-[10px] ${doc.isReady ? 'bg-emerald-500' : 'bg-gray-100'}`} />
                    ))}
                </div>
            </div>

            {/* Document List */}
            <div className="space-y-3">
                {docs.map((doc, idx) => (
                    <div
                        key={idx}
                        className={`group flex items-center justify-between p-4 rounded-xl border transition-all ${doc.isReady
                            ? 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                            : 'bg-gray-50 border-transparent opacity-70'
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${doc.isReady
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-gray-200 text-gray-400'
                                }`}>
                                {doc.isReady ? <FileCheck size={18} strokeWidth={2} /> : <Lock size={18} strokeWidth={2} />}
                            </div>
                            <div>
                                <p className={`text-sm font-bold ${doc.isReady ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {doc.title}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5 font-medium">PDF Document</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {doc.isReady ? (
                                <span className={`hidden sm:inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${doc.statusColor}`}>
                                    {doc.statusLabel}
                                </span>
                            ) : (
                                <span className="hidden sm:inline-block px-2.5 py-1 bg-gray-100 text-gray-400 text-[10px] font-bold uppercase tracking-wider rounded-md">
                                    Pending
                                </span>
                            )}

                            {doc.isReady ? (
                                <a
                                    href={`${api.API_URL}${doc.url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    title="View Document"
                                >
                                    <ExternalLink size={16} strokeWidth={2} />
                                </a>
                            ) : (doc.title === "Sale Deed Draft" && (deal.status === 'token_paid' || deal.status === 'completed')) ? (
                                <button
                                    onClick={async () => {
                                        try {
                                            toast.info("Generating Draft...");
                                            await api.offers.generateSaleDeed(deal.id);
                                            toast.success("Draft Generated!");
                                            onUpdate();
                                        } catch (e) {
                                            toast.error("Generation failed");
                                        }
                                    }}
                                    className="text-xs bg-gray-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800 transition shadow-sm"
                                >
                                    Generate
                                </button>
                            ) : null}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
