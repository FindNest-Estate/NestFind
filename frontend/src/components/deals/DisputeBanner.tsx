import { AlertTriangle, Lock } from "lucide-react";

interface DisputeBannerProps {
    isFrozen: boolean;
    freezeReason?: string;
    onViewDisputes?: () => void;
}

export function DisputeBanner({ isFrozen, freezeReason, onViewDisputes }: DisputeBannerProps) {
    if (!isFrozen) return null;

    return (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-md shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <Lock className="h-5 w-5 text-red-500" />
                </div>
                <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-red-800">
                        Deal is Currently Frozen
                    </h3>
                    <div className="mt-1 text-sm text-red-700">
                        <p>{freezeReason || "Administrative hold applied."}</p>
                    </div>
                    {onViewDisputes && (
                        <div className="mt-2">
                            <button
                                onClick={onViewDisputes}
                                className="text-sm font-medium text-red-800 hover:text-red-900 underline"
                            >
                                View Disputes & Status
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
