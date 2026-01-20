'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';

interface Visit {
    id: string;
    propertyTitle: string;
    propertyAddress: string;
    scheduledDate: string;
    status: 'REQUESTED' | 'APPROVED' | 'COMPLETED' | 'CANCELLED';
}

interface VisitsCalendarProps {
    visits: Visit[];
    onDateSelect: (date: Date) => void;
}

export default function VisitsCalendar({ visits, onDateSelect }: VisitsCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        return { daysInMonth, startingDayOfWeek, year, month };
    };

    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const previousMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const getVisitsForDate = (day: number) => {
        const dateStr = new Date(year, month, day).toISOString().split('T')[0];
        return visits.filter(visit => {
            const visitDate = new Date(visit.scheduledDate).toISOString().split('T')[0];
            return visitDate === dateStr;
        });
    };

    const isToday = (day: number) => {
        const today = new Date();
        return today.getDate() === day &&
            today.getMonth() === month &&
            today.getFullYear() === year;
    };

    const isFutureDate = (day: number) => {
        const date = new Date(year, month, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
    };

    return (
        <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <CalendarIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">Visit Calendar</h3>
                        <p className="text-sm text-gray-500">Schedule and manage your property visits</p>
                    </div>
                </div>
            </div>

            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
                <h4 className="text-xl font-bold text-gray-900">
                    {monthNames[month]} {year}
                </h4>
                <div className="flex gap-2">
                    <button
                        onClick={previousMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {dayNames.map(day => (
                    <div key={day} className="text-center py-2 text-sm font-semibold text-gray-600">
                        {day}
                    </div>
                ))}

                {/* Empty cells for days before month starts */}
                {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                    <div key={`empty-${index}`} className="aspect-square" />
                ))}

                {/* Calendar days */}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                    const day = index + 1;
                    const dayVisits = getVisitsForDate(day);
                    const hasVisits = dayVisits.length > 0;
                    const today = isToday(day);
                    const future = isFutureDate(day);

                    return (
                        <motion.button
                            key={day}
                            whileHover={{ scale: future ? 1.05 : 1 }}
                            onClick={() => future && onDateSelect(new Date(year, month, day))}
                            disabled={!future}
                            className={`aspect-square p-2 rounded-xl transition-all relative ${today
                                    ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white ring-2 ring-rose-200'
                                    : hasVisits
                                        ? 'bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300'
                                        : future
                                            ? 'hover:bg-gray-100 border border-gray-200'
                                            : 'text-gray-300 cursor-not-allowed'
                                }`}
                        >
                            <div className="flex flex-col items-center justify-center h-full">
                                <span className={`text-sm font-semibold ${today ? 'text-white' : hasVisits ? 'text-purple-700' : 'text-gray-700'}`}>
                                    {day}
                                </span>
                                {hasVisits && (
                                    <div className="flex gap-0.5 mt-1">
                                        {dayVisits.slice(0, 3).map((visit, i) => (
                                            <div
                                                key={i}
                                                className={`w-1.5 h-1.5 rounded-full ${visit.status === 'APPROVED' ? 'bg-emerald-500' :
                                                        visit.status === 'COMPLETED' ? 'bg-blue-500' :
                                                            visit.status === 'CANCELLED' ? 'bg-red-500' :
                                                                'bg-amber-500'
                                                    }`}
                                            />
                                        ))}
                                        {dayVisits.length > 3 && (
                                            <span className="text-[10px] text-purple-600 font-bold">+</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">Status Legend</p>
                <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span className="text-gray-600">Requested</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="text-gray-600">Approved</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-gray-600">Completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-gray-600">Cancelled</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
