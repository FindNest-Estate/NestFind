'use client';

import React, { useState, useEffect } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    CheckCircle,
    User,
    Video,
    Plus,
    Trash2,
    X,
    Filter
} from 'lucide-react';
import {
    getAgentSchedule,
    createScheduleEvent,
    deleteScheduleEvent,
    ScheduleEvent
} from '@/lib/api/agent';

// Helper: Get week days starting from a specific date
function getWeekDays(startDate: Date) {
    const days = [];
    const current = new Date(startDate);
    current.setDate(current.getDate() - current.getDay()); // Start on Sunday
    for (let i = 0; i < 7; i++) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return days;
}

// Modal Component
function AddEventModal({ isOpen, onClose, onSave }: any) {
    if (!isOpen) return null;

    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('09:00');
    const [type, setType] = useState('task');

    const handleSave = () => {
        const start = `${date}T${time}:00`;
        onSave({ title, start, type });
        onClose();
        setTitle('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Add New Event</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-500 hover:text-gray-700" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            placeholder="e.g. Meet with Client"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                            <input
                                type="time"
                                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <div className="flex gap-2">
                            {['task', 'visit', 'verification'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setType(t)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize border transition-colors ${type === t ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg">Save Event</button>
                </div>
            </div>
        </div>
    );
}

// Visit Action Modal Component
function VisitActionModal({ isOpen, onClose, event, onAction }: any) {
    if (!isOpen || !event) return null;

    // Mocking status state locally for the modal flow
    const [status, setStatus] = useState(event.status || 'SCHEDULED');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleAction = async (action: string) => {
        setIsProcessing(true);
        await onAction(event.id, action);
        setIsProcessing(false);
        if (action === 'check_in') setStatus('IN_PROGRESS');
        else onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-scale-in">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MapPin className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{event.title}</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        {new Date(event.start).toLocaleString()}
                    </p>

                    <div className="space-y-3">
                        {status === 'SCHEDULED' && (
                            <button
                                onClick={() => handleAction('check_in')}
                                disabled={isProcessing}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                            >
                                {isProcessing ? <Clock className="animate-spin" /> : <MapPin className="w-5 h-5" />}
                                GPS Check-In
                            </button>
                        )}

                        {status === 'IN_PROGRESS' && (
                            <div className="space-y-3 animate-fade-in">
                                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                                    <CheckCircle className="w-4 h-4" /> GPS Verified
                                </div>
                                <button
                                    onClick={() => handleAction('complete')}
                                    disabled={isProcessing}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-200"
                                >
                                    Complete Visit
                                </button>
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className="w-full py-2 text-gray-400 hover:text-gray-600 font-medium text-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CalendarPage() {
    const [view, setView] = useState<'month' | 'week'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<ScheduleEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [visitModalEvent, setVisitModalEvent] = useState<ScheduleEvent | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    async function fetchEvents() {
        setIsLoading(true);
        try {
            // Fetch generous range
            const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString();
            const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0).toISOString();

            const response = await getAgentSchedule(start, end);
            if (response.success) {
                setEvents(response.events);
            }
        } catch (error) {
            console.error("Failed to fetch schedule", error);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchEvents();
    }, [currentDate]);

    const handleCreateEvent = async (data: { title: string, start: string, type: string }) => {
        try {
            const res = await createScheduleEvent(data.title, data.start, data.type);
            if (res.success && res.event) {
                setEvents([...events, res.event]);
            }
        } catch (error) {
            console.error("Failed create", error);
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (!confirm("Delete this event?")) return;
        try {
            await deleteScheduleEvent(id);
            setEvents(events.filter(e => e.id !== id));
        } catch (error) {
            console.error("Failed delete", error);
        }
    };

    const handleVisitAction = async (id: string, action: string) => {
        // Import dynamically or pass as prop if strictly following file structure, 
        // but for this file edit we assume manageVisitAction is imported.
        // Adding import to top of file in next step if needed, but 'agent.ts' has it.
        const { manageVisitAction } = await import('@/lib/api/agent');
        try {
            const res = await manageVisitAction(id, action);
            if (res.success) {
                // Update local event status
                setEvents(events.map(e => e.id === id ? { ...e, status: res.new_status } : e));
            }
        } catch (error) {
            console.error("Visit action failed", error);
        }
    };

    const nextPeriod = () => {
        const d = new Date(currentDate);
        if (view === 'month') d.setMonth(d.getMonth() + 1);
        else d.setDate(d.getDate() + 7);
        setCurrentDate(d);
    };

    const prevPeriod = () => {
        const d = new Date(currentDate);
        if (view === 'month') d.setMonth(d.getMonth() - 1);
        else d.setDate(d.getDate() - 7);
        setCurrentDate(d);
    };

    const getEventsForDay = (d: Date) => {
        return events.filter(e => {
            const ed = new Date(e.start);
            return ed.getDate() === d.getDate() && ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
        });
    };

    // Render Logic
    const monthDays = [];
    if (view === 'month') {
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        for (let i = 0; i < firstDay; i++) monthDays.push(null);
        for (let i = 1; i <= daysInMonth; i++) monthDays.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }

    const weekDays = view === 'week' ? getWeekDays(currentDate) : [];

    return (
        <div className="min-h-screen pb-20 space-y-6 animate-fade-in">
            <AddEventModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSave={handleCreateEvent} />
            <VisitActionModal
                isOpen={!!visitModalEvent}
                onClose={() => setVisitModalEvent(null)}
                event={visitModalEvent}
                onAction={handleVisitAction}
            />

            {/* Header Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={prevPeriod} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><ChevronLeft className="w-5 h-5" /></button>
                    <h2 className="text-xl font-bold text-gray-900 min-w-[200px] text-center">
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        {view === 'week' && <span className="text-sm font-normal text-gray-500 ml-2">(Week {Math.ceil(currentDate.getDate() / 7)})</span>}
                    </h2>
                    <button onClick={nextPeriod} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><ChevronRight className="w-5 h-5" /></button>
                </div>

                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setView('month')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Month
                    </button>
                    <button
                        onClick={() => setView('week')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Week
                    </button>
                </div>

                <div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Add Event
                    </button>
                </div>
            </div>

            {/* Calendar Views */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Main Calendar Area */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[600px]">
                    {/* Month View */}
                    {view === 'month' && (
                        <div className="p-6 h-full flex flex-col">
                            <div className="grid grid-cols-7 mb-4 text-center text-sm font-semibold text-gray-400">
                                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => <div key={d}>{d}</div>)}
                            </div>
                            <div className="grid grid-cols-7 gap-px bg-gray-100 flex-1 border border-gray-200 rounded-lg overflow-hidden">
                                {monthDays.map((d, index) => {
                                    if (!d) return <div key={`empty-${index}`} className="bg-gray-50" />;
                                    const dayEvents = getEventsForDay(d);
                                    const isToday = d.toDateString() === new Date().toDateString();
                                    const isSelected = d.toDateString() === selectedDate.toDateString();

                                    return (
                                        <div
                                            key={index}
                                            onClick={() => setSelectedDate(d)}
                                            className={`
                                                bg-white min-h-[100px] p-2 relative transition-colors hover:bg-gray-50 cursor-pointer
                                                ${isSelected ? 'bg-blue-50/50' : ''}
                                            `}
                                        >
                                            <span className={`
                                                text-sm font-semibold block mb-1
                                                ${isToday ? 'text-emerald-600' : 'text-gray-700'}
                                            `}>
                                                {d.getDate()}
                                            </span>
                                            <div className="space-y-1">
                                                {dayEvents.slice(0, 3).map((e, i) => (
                                                    <div
                                                        key={i}
                                                        onClick={(ev) => {
                                                            ev.stopPropagation();
                                                            if (e.type === 'visit') setVisitModalEvent(e);
                                                        }}
                                                        className={`text-[10px] truncate px-1.5 py-0.5 rounded font-medium ${e.type === 'visit' ? 'cursor-pointer hover:ring-1 hover:ring-blue-300' : ''}`}
                                                        style={{ backgroundColor: e.color + '20', color: e.color }}
                                                    >
                                                        {e.title}
                                                    </div>
                                                ))}
                                                {dayEvents.length > 3 && (
                                                    <div className="text-[10px] text-gray-400 pl-1">+{dayEvents.length - 3} more</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Week View */}
                    {view === 'week' && (
                        <div className="flex h-full">
                            {/* Times Column */}
                            <div className="w-16 border-r border-gray-200 flex flex-col pt-12">
                                {Array.from({ length: 12 }, (_, i) => i + 8).map(h => (
                                    <div key={h} className="h-20 text-xs text-gray-400 text-center -mt-2">{h}:00</div>
                                ))}
                            </div>
                            {/* Days Columns */}
                            <div className="flex-1 grid grid-cols-7 divide-x divide-gray-200">
                                {weekDays.map((d, i) => (
                                    <div key={i} className="flex flex-col">
                                        <div className={`h-12 border-b border-gray-200 flex flex-col items-center justify-center ${d.toDateString() === new Date().toDateString() ? 'bg-emerald-50' : ''}`}>
                                            <span className="text-xs font-semibold text-gray-500">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                            <span className={`text-sm font-bold ${d.toDateString() === new Date().toDateString() ? 'text-emerald-600' : 'text-gray-900'}`}>{d.getDate()}</span>
                                        </div>
                                        <div className="flex-1 relative bg-white">
                                            {/* Grid Lines */}
                                            {Array.from({ length: 12 }).map((_, idx) => (
                                                <div key={idx} className="h-20 border-b border-gray-100" />
                                            ))}
                                            {/* Events */}
                                            {getEventsForDay(d).map((e, idx) => {
                                                const eventDate = new Date(e.start);
                                                const hours = eventDate.getHours();
                                                const startHour = 8;
                                                const top = (hours - startHour) * 80; // 80px per hour
                                                if (top < 0) return null; // Before 8am hidden for simple view
                                                return (
                                                    <div
                                                        key={`wk-evt-${idx}`}
                                                        onClick={(ev) => {
                                                            ev.stopPropagation();
                                                            if (e.type === 'visit') setVisitModalEvent(e);
                                                        }}
                                                        className={`absolute left-1 right-1 rounded p-2 text-xs shadow-sm border-l-2 ${e.type === 'visit' ? 'cursor-pointer hover:shadow-md' : ''}`}
                                                        style={{ top: `${top}px`, height: '70px', backgroundColor: 'white', borderColor: e.color, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                                                    >
                                                        <div className="font-semibold truncate text-gray-900">{e.title}</div>
                                                        <div className="text-gray-500">{eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Agenda */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 h-fit sticky top-6">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-gray-400" />
                        Agenda
                    </h3>
                    <p className="text-sm text-gray-500 mb-6 font-medium">
                        {selectedDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>

                    <div className="space-y-4">
                        {getEventsForDay(selectedDate).length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                <p className="text-gray-400 text-sm">No events</p>
                            </div>
                        ) : (
                            getEventsForDay(selectedDate).map((e, i) => (
                                <div key={i} className="group relative bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-lg" style={{ backgroundColor: e.color }} />
                                    <div className="pl-3">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-semibold text-gray-900 text-sm">{e.title}</h4>
                                            {e.type === 'visit' && (
                                                <button
                                                    onClick={() => setVisitModalEvent(e)}
                                                    className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold hover:bg-blue-100"
                                                >
                                                    Action
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(e.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                        </div>
                                        <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleDeleteEvent(e.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg ml-auto">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
