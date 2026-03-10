"use client";

import { Deal, DealStatus, DEAL_STATUS_LABELS, ACTIVE_DEAL_STATUSES } from "@/lib/types/deal";
import Link from "next/link";
import {
    ArrowRight,
    Building2,
    Clock,
    CheckCircle2,
    XCircle,
    IndianRupee,
    Users,
} from "lucide-react";
import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/Badge";

interface DealCardProps {
    deal: Deal;
}

export function DealCard({ deal }: DealCardProps) {
    const isActive = ACTIVE_DEAL_STATUSES.has(deal.status as DealStatus);

    const ROLE_LABELS: Record<string, string> = {
        BUYER: "Buyer", SELLER: "Seller", AGENT: "Agent", ADMIN: "Admin",
    };

    return (
        <Link href={`/deals/${deal.id}`}>
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] hover:shadow-[var(--shadow-sm)] hover:border-[var(--gray-300)] transition-all p-4 cursor-pointer group">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <Building2 className="w-4 h-4 text-[var(--gray-400)] shrink-0" />
                            <h3 className="font-semibold text-sm text-[var(--gray-900)] truncate">
                                {deal.property_title}
                            </h3>
                        </div>
                        {deal.property_city && (
                            <p className="text-xs text-[var(--gray-500)] ml-6">{deal.property_city}</p>
                        )}
                    </div>
                    <StatusBadge status={deal.status} />
                </div>

                {/* Deal info */}
                <div className="flex items-center gap-4 text-xs text-[var(--gray-600)] mb-2 ml-6">
                    {deal.agreed_price && (
                        <span className="flex items-center gap-1 font-semibold text-[var(--gray-900)]">
                            <IndianRupee className="w-3 h-3" />
                            {deal.agreed_price.toLocaleString("en-IN")}
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        You: {ROLE_LABELS[deal.viewer_role || "BUYER"]}
                    </span>
                </div>

                {/* Participants */}
                <div className="flex items-center gap-2 text-[11px] text-[var(--gray-500)] ml-6 mb-2">
                    {deal.buyer_name && <span>Buyer: {deal.buyer_name}</span>}
                    {deal.seller_name && (
                        <><span className="text-[var(--gray-300)]">•</span><span>Seller: {deal.seller_name}</span></>
                    )}
                    {deal.agent_name && (
                        <><span className="text-[var(--gray-300)]">•</span><span>Agent: {deal.agent_name}</span></>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--gray-100)] ml-6">
                    <span className="text-[11px] text-[var(--gray-400)]">
                        {format(new Date(deal.created_at), "MMM d, yyyy")}
                    </span>
                    <span className="text-xs text-[var(--color-brand)] font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        View Deal <ArrowRight className="w-3 h-3" />
                    </span>
                </div>
            </div>
        </Link>
    );
}
