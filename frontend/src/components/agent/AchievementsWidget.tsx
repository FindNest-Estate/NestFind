'use client';

import React from 'react';
import { Trophy, Award, Flame, Zap, Target, Star, TrendingUp, CheckCircle } from 'lucide-react';

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: 'trophy' | 'award' | 'flame' | 'zap' | 'target' | 'star';
    category: 'performance' | 'engagement' | 'milestone';
    progress: number;
    target: number;
    unlocked: boolean;
    unlockedAt?: string;
    xp: number;
}

const ICON_MAP = {
    trophy: Trophy,
    award: Award,
    flame: Flame,
    zap: Zap,
    target: Target,
    star: Star
};

const CATEGORY_COLORS = {
    performance: 'from-amber-500 to-orange-500',
    engagement: 'from-blue-500 to-indigo-500',
    milestone: 'from-emerald-500 to-green-500'
};

// Mock achievements data
export const mockAchievements: Achievement[] = [
    { id: '1', title: 'First Deal', description: 'Close your first property deal', icon: 'trophy', category: 'milestone', progress: 1, target: 1, unlocked: true, unlockedAt: '2026-01-10', xp: 100 },
    { id: '2', title: 'Fast Responder', description: 'Respond to 10 leads within 1 hour', icon: 'zap', category: 'engagement', progress: 7, target: 10, unlocked: false, xp: 50 },
    { id: '3', title: 'Verification Pro', description: 'Complete 5 property verifications', icon: 'target', category: 'performance', progress: 5, target: 5, unlocked: true, unlockedAt: '2026-01-15', xp: 75 },
    { id: '4', title: 'Hot Streak', description: 'Close deals 3 weeks in a row', icon: 'flame', category: 'performance', progress: 2, target: 3, unlocked: false, xp: 150 },
    { id: '5', title: 'Rising Star', description: 'Reach 500 XP', icon: 'star', category: 'milestone', progress: 325, target: 500, unlocked: false, xp: 100 },
    { id: '6', title: 'Client Champion', description: 'Get 5 positive reviews', icon: 'award', category: 'engagement', progress: 3, target: 5, unlocked: false, xp: 80 },
];

function AchievementCard({ achievement }: { achievement: Achievement }) {
    const Icon = ICON_MAP[achievement.icon];
    const progress = Math.min((achievement.progress / achievement.target) * 100, 100);

    return (
        <div className={`relative p-4 rounded-xl border transition-all ${achievement.unlocked
                ? 'bg-gradient-to-br from-white to-gray-50 border-gray-200 shadow-sm'
                : 'bg-gray-50 border-gray-100'
            }`}>
            <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl ${achievement.unlocked
                        ? `bg-gradient-to-br ${CATEGORY_COLORS[achievement.category]} shadow-lg`
                        : 'bg-gray-200'
                    }`}>
                    <Icon className={`w-5 h-5 ${achievement.unlocked ? 'text-white' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className={`font-semibold text-sm ${achievement.unlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                            {achievement.title}
                        </h4>
                        {achievement.unlocked && (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{achievement.description}</p>

                    {!achievement.unlocked && (
                        <div className="mt-2">
                            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                                <span>{achievement.progress} / {achievement.target}</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full bg-gradient-to-r ${CATEGORY_COLORS[achievement.category]}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <span className={`text-xs font-bold ${achievement.unlocked ? 'text-amber-500' : 'text-gray-400'}`}>
                        +{achievement.xp} XP
                    </span>
                </div>
            </div>

            {achievement.unlocked && (
                <div className="absolute top-2 right-2">
                    <span className="text-xs text-gray-400">{achievement.unlockedAt}</span>
                </div>
            )}
        </div>
    );
}

interface AchievementsWidgetProps {
    achievements?: Achievement[];
    totalXP?: number;
    level?: number;
}

export default function AchievementsWidget({
    achievements = mockAchievements,
    totalXP = 325,
    level = 3
}: AchievementsWidgetProps) {
    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const nextLevelXP = (level + 1) * 200;
    const levelProgress = (totalXP % 200) / 200 * 100;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header with XP */}
            <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5" />
                        <h3 className="font-bold">Achievements</h3>
                    </div>
                    <span className="text-sm font-medium bg-white/20 px-2 py-0.5 rounded-full">
                        {unlockedCount}/{achievements.length}
                    </span>
                </div>

                {/* Level Progress */}
                <div className="bg-white/20 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                                <span className="text-purple-600 font-bold">{level}</span>
                            </div>
                            <div>
                                <p className="text-xs text-white/80">Current Level</p>
                                <p className="font-bold text-sm">{totalXP} XP</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-white/80">Next Level</p>
                            <p className="font-bold text-sm">{nextLevelXP} XP</p>
                        </div>
                    </div>
                    <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white rounded-full transition-all"
                            style={{ width: `${levelProgress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Achievements List */}
            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                {achievements.map(achievement => (
                    <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
            </div>
        </div>
    );
}
