'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, FileText, Camera, Clipboard, MessageSquare, DollarSign, AlertCircle } from 'lucide-react';

interface ChecklistItem {
    id: string;
    label: string;
    completed: boolean;
    icon: any;
    category: 'before' | 'during' | 'after';
}

interface VisitPreparationChecklistProps {
    visitId: string;
    propertyTitle: string;
    scheduledDate: string;
    onUpdate?: (completedItems: string[]) => void;
}

export default function VisitPreparationChecklist({
    visitId,
    propertyTitle,
    scheduledDate,
    onUpdate
}: VisitPreparationChecklistProps) {
    const [items, setItems] = useState<ChecklistItem[]>([
        // Before Visit
        { id: '1', label: 'Review property details and listing', completed: false, icon: FileText, category: 'before' },
        { id: '2', label: 'Research the neighborhood and nearby amenities', completed: false, icon: Clipboard, category: 'before' },
        { id: '3', label: 'Prepare list of questions for agent/seller', completed: false, icon: MessageSquare, category: 'before' },
        { id: '4', label: 'Check financing pre-approval status', completed: false, icon: DollarSign, category: 'before' },
        { id: '5', label: 'Plan route and confirm visit time', completed: false, icon: AlertCircle, category: 'before' },

        // During Visit
        { id: '6', label: 'Take photos and videos of property', completed: false, icon: Camera, category: 'during' },
        { id: '7', label: 'Inspect key areas (kitchen, bathrooms, etc.)', completed: false, icon: CheckCircle2, category: 'during' },
        { id: '8', label: 'Test appliances and fixtures', completed: false, icon: CheckCircle2, category: 'during' },
        { id: '9', label: 'Check for signs of damage or repairs needed', completed: false, icon: AlertCircle, category: 'during' },
        { id: '10', label: 'Ask about HOA fees, utilities, and taxes', completed: false, icon: DollarSign, category: 'during' },

        // After Visit
        { id: '11', label: 'Write down first impressions and notes', completed: false, icon: FileText, category: 'after' },
        { id: '12', label: 'Compare with other properties visited', completed: false, icon: Clipboard, category: 'after' },
        { id: '13', label: 'Discuss pros and cons with family/advisor', completed: false, icon: MessageSquare, category: 'after' },
        { id: '14', label: 'Decide on next steps (offer, revisit, pass)', completed: false, icon: CheckCircle2, category: 'after' }
    ]);

    const toggleItem = (id: string) => {
        const updatedItems = items.map(item =>
            item.id === id ? { ...item, completed: !item.completed } : item
        );
        setItems(updatedItems);

        if (onUpdate) {
            const completedIds = updatedItems.filter(i => i.completed).map(i => i.id);
            onUpdate(completedIds);
        }
    };

    const categoryTitles = {
        before: '📋 Before the Visit',
        during: '🏠 During the Visit',
        after: '✍️ After the Visit'
    };

    const categoryColors = {
        before: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-600' },
        during: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-600' },
        after: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-600' }
    };

    const getProgress = (category: 'before' | 'during' | 'after') => {
        const categoryItems = items.filter(i => i.category === category);
        const completed = categoryItems.filter(i => i.completed).length;
        return { completed, total: categoryItems.length, percentage: (completed / categoryItems.length) * 100 };
    };

    const totalProgress = () => {
        const completed = items.filter(i => i.completed).length;
        return { completed, total: items.length, percentage: (completed / items.length) * 100 };
    };

    const progress = totalProgress();

    return (
        <div className="glass-card p-6">
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">Visit Preparation</h3>
                        <p className="text-sm text-gray-600 mt-1">{propertyTitle}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-gray-900">{progress.completed}/{progress.total}</div>
                        <p className="text-xs text-gray-500">Tasks Complete</p>
                    </div>
                </div>

                {/* Overall Progress Bar */}
                <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress.percentage}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"
                    />
                </div>
            </div>

            {/* Checklist by Category */}
            <div className="space-y-6">
                {(['before', 'during', 'after'] as const).map((category) => {
                    const categoryItems = items.filter(i => i.category === category);
                    const colors = categoryColors[category];
                    const catProgress = getProgress(category);

                    return (
                        <div key={category} className={`p-4 rounded-xl border-2 ${colors.border} ${colors.bg}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h4 className={`font-bold ${colors.text} text-lg`}>
                                    {categoryTitles[category]}
                                </h4>
                                <span className={`text-sm font-semibold ${colors.text}`}>
                                    {catProgress.completed}/{catProgress.total}
                                </span>
                            </div>

                            <div className="space-y-2">
                                <AnimatePresence>
                                    {categoryItems.map((item, index) => {
                                        const Icon = item.icon;

                                        return (
                                            <motion.button
                                                key={item.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                onClick={() => toggleItem(item.id)}
                                                className={`w-full flex items-start gap-3 p-3 rounded-lg bg-white border transition-all ${item.completed
                                                        ? 'border-emerald-300 bg-emerald-50'
                                                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                                    }`}
                                            >
                                                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${item.completed
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-gray-200 text-gray-400'
                                                    }`}>
                                                    {item.completed ? (
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    ) : (
                                                        <Circle className="w-4 h-4" />
                                                    )}
                                                </div>

                                                <div className="flex-1 text-left">
                                                    <div className="flex items-center gap-2">
                                                        <Icon className={`w-4 h-4 ${item.completed ? 'text-emerald-600' : colors.icon}`} />
                                                        <span className={`text-sm font-medium ${item.completed ? 'text-emerald-700 line-through' : 'text-gray-700'
                                                            }`}>
                                                            {item.label}
                                                        </span>
                                                    </div>
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Completion Message */}
            {progress.percentage === 100 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-emerald-900">All Set! 🎉</p>
                            <p className="text-sm text-emerald-700">You're fully prepared for your visit!</p>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
