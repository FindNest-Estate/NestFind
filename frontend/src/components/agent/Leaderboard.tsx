'use client';

import React from 'react';
import { Trophy, Crown, Medal, TrendingUp, ChevronUp, ChevronDown, Minus } from 'lucide-react';

interface LeaderboardEntry {
    rank: number;
    previousRank: number;
    agentName: string;
    avatar?: string;
    score: number;
    metric: string;
    isCurrentUser: boolean;
}

interface LeaderboardProps {
    title?: string;
    entries?: LeaderboardEntry[];
    metricLabel?: string;
}

// Mock data
export const mockLeaderboard: LeaderboardEntry[] = [
    { rank: 1, previousRank: 1, agentName: 'Priya Singh', score: 12, metric: 'Deals', isCurrentUser: false },
    { rank: 2, previousRank: 4, agentName: 'Rahul Verma', score: 10, metric: 'Deals', isCurrentUser: false },
    { rank: 3, previousRank: 2, agentName: 'You', score: 8, metric: 'Deals', isCurrentUser: true },
    { rank: 4, previousRank: 3, agentName: 'Aisha Khan', score: 7, metric: 'Deals', isCurrentUser: false },
    { rank: 5, previousRank: 6, agentName: 'Vikram Patel', score: 6, metric: 'Deals', isCurrentUser: false },
];

const getRankBadge = (rank: number) => {
    switch (rank) {
        case 1:
            return (
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <Crown className="w-4 h-4 text-white" />
                </div>
            );
        case 2:
            return (
                <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center shadow">
                    <Medal className="w-4 h-4 text-white" />
                </div>
            );
        case 3:
            return (
                <div className="w-8 h-8 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center shadow">
                    <Medal className="w-4 h-4 text-white" />
                </div>
            );
        default:
            return (
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-600">{rank}</span>
                </div>
            );
    }
};

const getRankChange = (current: number, previous: number) => {
    const diff = previous - current;
    if (diff > 0) {
        return (
            <span className="flex items-center text-emerald-500 text-xs font-medium">
                <ChevronUp className="w-3 h-3" />
                {diff}
            </span>
        );
    } else if (diff < 0) {
        return (
            <span className="flex items-center text-red-500 text-xs font-medium">
                <ChevronDown className="w-3 h-3" />
                {Math.abs(diff)}
            </span>
        );
    } else {
        return <Minus className="w-3 h-3 text-gray-400" />;
    }
};

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
    return (
        <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${entry.isCurrentUser
            ? 'bg-rose-50 border border-rose-200'
            : 'hover:bg-gray-50'
            }`}>
            {/* Rank Badge */}
            {getRankBadge(entry.rank)}

            {/* Agent Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h4 className={`font-semibold text-sm ${entry.isCurrentUser ? 'text-rose-600' : 'text-gray-900'}`}>
                        {entry.agentName}
                    </h4>
                    {entry.isCurrentUser && (
                        <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-bold rounded">
                            YOU
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    {getRankChange(entry.rank, entry.previousRank)}
                    <span className="text-xs text-gray-400">vs last week</span>
                </div>
            </div>

            {/* Score */}
            <div className="text-right">
                <span className={`text-lg font-bold ${entry.isCurrentUser ? 'text-rose-600' : 'text-gray-900'}`}>
                    {entry.score}
                </span>
                <p className="text-[10px] text-gray-400 uppercase">{entry.metric}</p>
            </div>
        </div>
    );
}

export default function Leaderboard({
    title = 'This Month',
    entries = mockLeaderboard,
    metricLabel = 'Deals Closed'
}: LeaderboardProps) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-100 rounded-lg">
                        <Trophy className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Leaderboard</h3>
                        <p className="text-xs text-gray-500">{title} • {metricLabel}</p>
                    </div>
                </div>
                <select className="text-xs text-gray-500 bg-gray-50 rounded-lg px-2 py-1 border-none">
                    <option>This Month</option>
                    <option>This Quarter</option>
                    <option>All Time</option>
                </select>
            </div>

            {/* Entries */}
            <div className="p-2 space-y-1">
                {entries.map(entry => (
                    <LeaderboardRow key={entry.rank} entry={entry} />
                ))}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-100 bg-gray-50">
                <p className="text-center text-xs text-gray-500">
                    Rankings update weekly • <span className="text-rose-600 font-medium">Keep closing deals!</span>
                </p>
            </div>
        </div>
    );
}
