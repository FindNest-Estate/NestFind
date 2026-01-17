"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow, isPast } from "date-fns";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
    targetDate: string; // ISO string
    onExpire?: () => void;
    label?: string;
}

export function CountdownTimer({ targetDate, onExpire, label = "Time Remaining" }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            const end = new Date(targetDate);
            if (isPast(end)) {
                setIsExpired(true);
                setTimeLeft("Expired");
                onExpire?.();
                return;
            }
            setTimeLeft(formatDistanceToNow(end));
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [targetDate, onExpire]);

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${isExpired ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-700'
            }`}>
            <Clock className="w-4 h-4" />
            <span>{label}: {timeLeft}</span>
        </div>
    );
}
