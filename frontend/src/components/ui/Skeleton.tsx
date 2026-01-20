export default function Skeleton({ className = "" }: { className?: string }) {
    return (
        <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
    );
}

export function CardSkeleton() {
    return (
        <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm h-full">
            <Skeleton className="h-48 w-full" />
            <div className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2 pt-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                </div>
            </div>
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-8 animate-pulse">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-5 w-48" />
                </div>
                <Skeleton className="h-12 w-32 rounded-xl" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-64 rounded-2xl" />
                    <Skeleton className="h-64 rounded-2xl" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-96 rounded-2xl" />
                </div>
            </div>
        </div>
    );
}
