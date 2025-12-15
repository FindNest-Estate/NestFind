import { LucideIcon, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// --- Stat Card ---
interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    trendUp?: boolean;
    color?: 'blue' | 'green' | 'purple' | 'rose' | 'amber';
}

export const StatCard = ({ label, value, icon: Icon, trend, trendUp, color = 'blue' }: StatCardProps) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        purple: 'bg-violet-50 text-violet-600 border-violet-100',
        rose: 'bg-rose-50 text-rose-600 border-rose-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
    };

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all group">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-lg ${colors[color]} bg-opacity-50 group-hover:bg-opacity-100 transition-all`}>
                    <Icon size={20} className="opacity-90" />
                </div>
                {trend && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trendUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {trend}
                    </span>
                )}
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none mb-1">{value}</p>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
            </div>
        </div>
    );
};

// --- Section Header ---
interface SectionHeaderProps {
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export const SectionHeader = ({ title, description, action }: SectionHeaderProps) => (
    <div className="flex items-end justify-between mb-5">
        <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h2>
            {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
        </div>
        {action}
    </div>
);

// --- Action Card (Quick Links) ---
interface ActionCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    href: string;
    color?: string;
}

export const ActionCard = ({ title, description, icon: Icon, href }: ActionCardProps) => (
    <Link href={href} className="group flex flex-col items-center p-4 bg-white border border-gray-200 rounded-xl hover:border-rose-200 hover:shadow-md hover:shadow-rose-500/5 transition-all text-center h-full">
        <div className="h-10 w-10 rounded-full bg-gray-50 group-hover:bg-rose-50 flex items-center justify-center text-gray-500 group-hover:text-rose-500 transition-colors mb-3">
            <Icon size={20} />
        </div>
        <h3 className="font-bold text-gray-900 text-sm mb-1">{title}</h3>
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </Link>
);
