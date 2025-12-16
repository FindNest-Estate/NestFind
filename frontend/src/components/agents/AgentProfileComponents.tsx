import React from "react";
import { LucideIcon, ArrowUpRight } from "lucide-react";

// --- Stat Card Component (Ultra Premium) ---
interface StatCardProps {
    label: string;
    value: string | number;
    subtext?: string;
    isLast?: boolean;
}

export const StatCard = ({ label, value, subtext }: StatCardProps) => (
    <div className="flex flex-col pt-6 pb-5 px-5 rounded-2xl bg-white border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-300 group">
        <span className="text-3xl font-extrabold text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors mb-1">{value}</span>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</span>
        {subtext && <span className="text-[11px] font-medium text-gray-400 mt-1.5">{subtext}</span>}
    </div>
);

// --- Action Button Component (Polished) ---
interface ActionBtnProps {
    icon: LucideIcon;
    label: string;
    onClick?: () => void;
    href?: string;
    primary?: boolean;
    fullWidth?: boolean;
}

export const ActionBtn = ({ icon: Icon, label, onClick, href, primary = false, fullWidth = false }: ActionBtnProps) => {
    const Component = href ? 'a' : 'button';
    const baseClass = `flex items-center justify-center gap-2.5 h-12 px-6 rounded-xl font-bold text-sm transition-all duration-300 active:scale-[0.98] ${fullWidth ? 'w-full' : ''}`;

    // Primary: Dark subtle gradient, glow effect
    const primaryClass = "bg-gray-900 text-white hover:bg-black shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.25)] ring-1 ring-gray-900";
    // Secondary: White, clean border, subtle gray hover
    const secondaryClass = "bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50/50 hover:text-gray-900 shadow-sm";

    return (
        <Component href={href} onClick={onClick} className={`${baseClass} ${primary ? primaryClass : secondaryClass}`}>
            <Icon size={18} className={primary ? "text-white" : "text-gray-500"} />
            {label}
        </Component>
    );
};

// --- Social / Icon Button (Refined) ---
export const SocialBtn = ({ icon: Icon, href, onClick }: { icon: LucideIcon, href?: string, onClick?: () => void }) => {
    const Component = href ? 'a' : 'button';
    return (
        <Component
            href={href}
            onClick={onClick}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-100 text-gray-400 hover:text-gray-900 hover:border-gray-300 hover:shadow-md transition-all duration-300"
        >
            <Icon size={16} />
        </Component>
    );
};

// --- Contact Row Item (Clean) ---
export const ContactRow = ({ icon: Icon, label, value, href }: { icon: LucideIcon, label: string, value: string, href?: string }) => (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0 group">
        <div className="flex items-center gap-3 text-gray-500 group-hover:text-gray-700 transition-colors">
            <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors">
                <Icon size={16} />
            </div>
            <span className="text-sm font-medium">{label}</span>
        </div>
        {href ? (
            <a href={href} className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-1.5">
                {value} <ArrowUpRight size={12} className="text-gray-300 group-hover:text-blue-400" />
            </a>
        ) : (
            <span className="text-sm font-bold text-gray-900">{value}</span>
        )}
    </div>
);

// --- Info Chip (Refined) ---
export const InfoChip = ({ text }: { text: string }) => (
    <span className="px-3.5 py-1.5 bg-white border border-gray-200 text-gray-600 text-[13px] font-medium rounded-full shadow-sm hover:border-gray-300 transition-colors">
        {text}
    </span>
);

// --- Section Title (Premium Typography) ---
export const SectionTitle = ({ title, action }: { title: string, action?: React.ReactNode }) => (
    <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 tracking-tight leading-none">{title}</h3>
        {action}
    </div>
);

// --- Area Chip ---
import { MapPin } from "lucide-react";
export const AreaChip = ({ text }: { text: string }) => (
    <div className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-600 transition-all hover:shadow-sm cursor-default">
        <MapPin size={12} className="text-blue-500" />
        {text}
    </div>
);
