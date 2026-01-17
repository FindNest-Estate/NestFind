"use client";

import { Visit, VisitStatus } from "@/lib/types/visit";
import Link from "next/link";
import { format } from "date-fns";

interface VisitCardProps {
    visit: Visit;
    role?: 'buyer' | 'agent';
}

export function VisitCard({ visit, role = 'buyer' }: VisitCardProps) {
    const statusColor = {
        [VisitStatus.REQUESTED]: "bg-gray-100 text-gray-800",
        [VisitStatus.APPROVED]: "bg-blue-100 text-blue-800",
        [VisitStatus.REJECTED]: "bg-red-100 text-red-800",
        [VisitStatus.CHECKED_IN]: "bg-purple-100 text-purple-800",
        [VisitStatus.COMPLETED]: "bg-green-100 text-green-800",
        [VisitStatus.CANCELLED]: "bg-gray-100 text-gray-500",
        [VisitStatus.NO_SHOW]: "bg-red-100 text-red-800",
        [VisitStatus.COUNTERED]: "bg-amber-100 text-amber-800",
    }[visit.status];

    const linkHref = role === 'agent'
        ? `/agent/visits/${visit.id}`
        : `/visits/${visit.id}`;

    return (
        <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition bg-white">
            <div className="flex justify-between items-start mb-3">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColor}`}>
                    {visit.status.replace('_', ' ')}
                </span>
                <span className="text-sm text-gray-500">
                    {format(new Date(visit.created_at), "MMM d, yyyy")}
                </span>
            </div>

            <div className="flex gap-4">
                {visit.property?.thumbnail_url && (
                    <img
                        src={visit.property.thumbnail_url}
                        alt={visit.property.title}
                        className="w-20 h-20 object-cover rounded bg-gray-200"
                    />
                )}

                <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                        {visit.property?.title}
                    </h3>
                    <p className="text-sm text-gray-600 truncate">
                        {visit.property?.address}
                    </p>

                    <div className="mt-2 text-sm">
                        <span className="font-medium text-gray-700">Scheduled: </span>
                        {visit.confirmed_date ? (
                            <span className="text-green-600">
                                {format(new Date(visit.confirmed_date), "PPp")}
                            </span>
                        ) : visit.status === VisitStatus.COUNTERED && visit.counter_date ? (
                            <span className="text-amber-600 font-bold">
                                Proposed: {format(new Date(visit.counter_date), "PPp")}
                            </span>
                        ) : (
                            <span className="text-gray-500">
                                Preferred: {format(new Date(visit.preferred_date), "PPp")}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-4 flex justify-end">
                <Link
                    href={linkHref}
                    className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                >
                    View Details →
                </Link>
            </div>
        </div>
    );
}
