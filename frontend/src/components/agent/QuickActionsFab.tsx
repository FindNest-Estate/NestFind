'use client';

import React, { useState } from 'react';
import { Plus, Phone, Calendar, FileText, Pencil, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickAction {
    id: string;
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    onClick: () => void;
}

interface QuickActionsFabProps {
    onAddLead?: () => void;
    onScheduleVisit?: () => void;
    onLogCall?: () => void;
    onQuickNote?: () => void;
}

export default function QuickActionsFab({
    onAddLead,
    onScheduleVisit,
    onLogCall,
    onQuickNote
}: QuickActionsFabProps) {
    const [isOpen, setIsOpen] = useState(false);

    const actions: QuickAction[] = [
        {
            id: 'lead',
            label: 'Add Lead',
            icon: Plus,
            color: 'text-white',
            bgColor: 'bg-gradient-to-br from-blue-500 to-indigo-500',
            onClick: () => {
                onAddLead?.();
                setIsOpen(false);
            }
        },
        {
            id: 'call',
            label: 'Log Call',
            icon: Phone,
            color: 'text-white',
            bgColor: 'bg-gradient-to-br from-emerald-500 to-green-500',
            onClick: () => {
                onLogCall?.();
                setIsOpen(false);
            }
        },
        {
            id: 'visit',
            label: 'Schedule Visit',
            icon: Calendar,
            color: 'text-white',
            bgColor: 'bg-gradient-to-br from-purple-500 to-pink-500',
            onClick: () => {
                onScheduleVisit?.();
                setIsOpen(false);
            }
        },
        {
            id: 'note',
            label: 'Quick Note',
            icon: Pencil,
            color: 'text-white',
            bgColor: 'bg-gradient-to-br from-amber-500 to-orange-500',
            onClick: () => {
                onQuickNote?.();
                setIsOpen(false);
            }
        }
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Action Buttons */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="absolute bottom-16 right-0 flex flex-col-reverse gap-3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                    >
                        {actions.map((action, index) => {
                            const Icon = action.icon;
                            return (
                                <motion.button
                                    key={action.id}
                                    initial={{ opacity: 0, x: 20, scale: 0.8 }}
                                    animate={{
                                        opacity: 1,
                                        x: 0,
                                        scale: 1,
                                        transition: { delay: index * 0.05 }
                                    }}
                                    exit={{
                                        opacity: 0,
                                        x: 20,
                                        scale: 0.8,
                                        transition: { delay: (actions.length - index) * 0.03 }
                                    }}
                                    onClick={action.onClick}
                                    className={`flex items-center gap-3 pr-4 pl-3 py-2 rounded-full ${action.bgColor} shadow-lg hover:shadow-xl transition-shadow group`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                        <Icon className={`w-4 h-4 ${action.color}`} />
                                    </div>
                                    <span className="text-sm font-medium text-white whitespace-nowrap">
                                        {action.label}
                                    </span>
                                </motion.button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main FAB */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${isOpen
                        ? 'bg-gray-800 hover:bg-gray-900 rotate-45'
                        : 'bg-gradient-to-br from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600'
                    }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                {isOpen ? (
                    <X className="w-6 h-6 text-white" />
                ) : (
                    <Plus className="w-6 h-6 text-white" />
                )}
            </motion.button>

            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/20 -z-10"
                        onClick={() => setIsOpen(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
