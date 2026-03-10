"use client";

import { useState, useEffect } from "react";
import { getDeals } from "@/lib/api/deals";
import { Deal, DealStatus, DEAL_STATUS_LABELS, ACTIVE_DEAL_STATUSES } from "@/lib/types/deal";
import { DealCard } from "@/components/deals/DealCard";
import Navbar from "@/components/Navbar";
import { Loader2, FileStack, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
    { label: "All Deals", value: "" },
    { label: "Active Only", value: "__active__" },
    { label: "Deal Started", value: "INITIATED" },
    { label: "In Negotiation", value: "NEGOTIATION" },
    { label: "Price Agreed", value: "PRICE_AGREED" },
    { label: "Token Pending", value: "TOKEN_PENDING" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Cancelled", value: "CANCELLED" },
];

export default function DealsPage() {
    const [deals, setDeals] = useState<Deal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [total, setTotal] = useState(0);

    const fetchDeals = async () => {
        setIsLoading(true);
        try {
            const opts: { status?: string; active_only?: boolean; page: number; per_page: number } = {
                page, per_page: 20,
            };
            if (filter === "__active__") {
                opts.active_only = true;
            } else if (filter) {
                opts.status = filter;
            }
            const data = await getDeals(opts);
            setDeals(data.deals);
            setTotalPages(data.pagination.total_pages);
            setTotal(data.pagination.total);
        } catch (err) {
            console.error("Failed to fetch deals:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchDeals(); }, [filter, page]);

    const activeCount = deals.filter((d) => ACTIVE_DEAL_STATUSES.has(d.status as DealStatus)).length;

    return (
        <div className="min-h-screen bg-[var(--gray-50)] pb-20">
            <Navbar />
            <div className="max-w-5xl mx-auto px-4 pt-24">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h1 className="text-xl font-bold text-[var(--gray-900)]">My Deals</h1>
                        <p className="text-xs text-[var(--gray-500)] mt-0.5">
                            {total} total deal{total !== 1 ? "s" : ""}
                            {activeCount > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-blue-50 text-[var(--color-info)] rounded-full text-[11px] font-medium">
                                    {activeCount} active
                                </span>
                            )}
                        </p>
                    </div>
                    <FileStack className="w-6 h-6 text-[var(--gray-300)]" />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-2">
                    <Filter className="w-3.5 h-3.5 text-[var(--gray-400)] flex-shrink-0" />
                    {STATUS_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => { setFilter(f.value); setPage(1); }}
                            className={cn(
                                "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                                filter === f.value
                                    ? "bg-[var(--gray-900)] text-white"
                                    : "bg-white text-[var(--gray-600)] border border-[var(--gray-200)] hover:border-[var(--gray-300)]"
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--gray-400)]" />
                    </div>
                ) : deals.length === 0 ? (
                    <div className="text-center py-20">
                        <FileStack className="w-10 h-10 mx-auto mb-3 text-[var(--gray-300)]" />
                        <p className="text-[var(--gray-500)]">No deals found</p>
                        <p className="text-xs text-[var(--gray-400)] mt-1">
                            {filter ? "Try changing the filter" : "Deals will appear here when you initiate one on a property"}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {deals.map((deal) => (
                                <DealCard key={deal.id} deal={deal} />
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6">
                                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                                    className="px-3 py-1.5 text-xs border border-[var(--gray-200)] rounded-[var(--radius-sm)] disabled:opacity-50 hover:bg-[var(--gray-50)] transition">
                                    Previous
                                </button>
                                <span className="text-xs text-[var(--gray-500)]">Page {page} of {totalPages}</span>
                                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                                    className="px-3 py-1.5 text-xs border border-[var(--gray-200)] rounded-[var(--radius-sm)] disabled:opacity-50 hover:bg-[var(--gray-50)] transition">
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
