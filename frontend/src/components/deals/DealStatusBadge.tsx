import { OfferStatus } from "@/lib/types/offer";
import { Lock, CheckCircle2, XCircle, Clock, ArrowLeftRight } from "lucide-react";

interface DealStatusBadgeProps {
    status: OfferStatus;
    className?: string;
}

export default function DealStatusBadge({ status, className = "" }: DealStatusBadgeProps) {
    const config = {
        [OfferStatus.ACCEPTED]: {
            label: "DEAL LOCKED",
            icon: Lock,
            color: "bg-emerald-100 text-emerald-800 border-emerald-200",
            description: "Modifications disabled"
        },
        [OfferStatus.REJECTED]: {
            label: "OFFER REJECTED",
            icon: XCircle,
            color: "bg-red-100 text-red-800 border-red-200",
            description: "Negotiation ended"
        },
        [OfferStatus.COUNTERED]: {
            label: "NEGOTIATION ACTIVE",
            icon: ArrowLeftRight,
            color: "bg-purple-100 text-purple-800 border-purple-200",
            description: "Counter-offer in progress"
        },
        [OfferStatus.PENDING]: {
            label: "OFFER PENDING",
            icon: Clock,
            color: "bg-blue-100 text-blue-800 border-blue-200",
            description: "Awaiting response"
        },
        [OfferStatus.WITHDRAWN]: {
            label: "OFFER WITHDRAWN",
            icon: XCircle,
            color: "bg-gray-100 text-gray-800 border-gray-200",
            description: "No longer active"
        },
        [OfferStatus.EXPIRED]: {
            label: "OFFER EXPIRED",
            icon: Clock,
            color: "bg-gray-100 text-gray-600 border-gray-200",
            description: "Time limit reached"
        }
    }[status] || {
        label: "UNKNOWN STATUS",
        icon: Clock,
        color: "bg-gray-100 text-gray-800",
        description: ""
    };

    const Icon = config.icon;

    return (
        <div className={`flex flex-col items-start ${className}`}>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wide ${config.color}`}>
                <Icon className="w-3.5 h-3.5" />
                {config.label}
            </div>
            {/* <span className="text-[10px] text-gray-500 font-medium ml-1 mt-1">
                {config.description}
            </span> */}
        </div>
    );
}
