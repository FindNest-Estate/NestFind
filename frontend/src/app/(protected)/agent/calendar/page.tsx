'use client';

import React, { useState, useEffect } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    CheckCircle,
    Plus,
    Trash2,
    X,
    User,
    Phone,
    Mail,
    Loader2
} from 'lucide-react';
import {
    getAgentSchedule,
    createScheduleEvent,
    deleteScheduleEvent,
    manageVisitAction,
    ScheduleEvent
} from '@/lib/api/agent';
import { toast } from 'sonner';

/* ──────────────────────────────────────────────────────── */
/*  SLIDEOVER PANEL COMPONENT                               */
/* ──────────────────────────────────────────────────────── */

function SlideOver({
    open,
    onClose,
    title,
    children,
    actions
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
}) {
    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col animate-slide-in-right">
                <div className="flex items-center justify-between p-5 border-b border-[var(--gray-200)]">
                    <h3 className="text-lg font-bold text-[var(--gray-900)]">{title}</h3>
                    <button onClick={onClose} className="p-1.5 text-[var(--gray-400)] hover:text-[var(--gray-900)] hover:bg-[var(--gray-100)] rounded-md transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5">{children}</div>
                {actions && <div className="p-5 border-t border-[var(--gray-200)] bg-[var(--gray-50)]">{actions}</div>}
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────── */
/*  MODAL COMPONENT                                         */
/* ──────────────────────────────────────────────────────── */

function CustomModal({ open, onClose, title, children }: { open: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl border border-[var(--gray-200)] flex flex-col overflow-hidden animate-fade-in">
                <div className="px-5 py-4 border-b border-[var(--gray-100)] flex items-center justify-between">
                    <h3 className="text-base font-bold text-[var(--gray-900)]">{title}</h3>
                    <button onClick={onClose} className="text-[var(--gray-400)] hover:text-[var(--gray-900)] hover:bg-[var(--gray-100)] p-1 rounded-md transition-colors"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────── */
/*  HELPERS                                                 */
/* ──────────────────────────────────────────────────────── */

function getWeekDays(startDate: Date) {
    const days = [];
    const current = new Date(startDate);
    current.setDate(current.getDate() - current.getDay()); // Sunday
    for (let i = 0; i < 7; i++) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return days;
}

function getEventColor(type: string, isPast: boolean = false) {
    if (isPast) return 'var(--gray-300)';
    switch (type) {
        case 'visit': return 'var(--color-brand)';
        case 'verification': return '#10b981'; // emerald
        case 'call': return '#f59e0b'; // amber
        default: return 'var(--gray-500)';
    }
}

/* ──────────────────────────────────────────────────────── */
/*  MAIN COMPONENT                                          */
/* ──────────────────────────────────────────────────────── */

export default function CalendarPage() {
    const [view, setView] = useState<'month' | 'week'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<ScheduleEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
    const [newEventTime, setNewEventTime] = useState('09:00');
    const [newEventType, setNewEventType] = useState('task');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isActionProcessing, setIsActionProcessing] = useState(false);

    useEffect(() => { fetchSchedule(); }, [currentDate]);

    const fetchSchedule = async () => {
        setLoading(true);
        try {
            const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString();
            const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0).toISOString();
            const res = await getAgentSchedule(start, end);
            if (res.success) setEvents(res.events);
        } catch (err) {
            toast.error("Failed to load schedule");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEvent = async () => {
        if (!newEventTitle || !newEventDate || !newEventTime) {
            toast.error("Please fill in all fields"); return;
        }
        setIsSubmitting(true);
        try {
            const start = `${newEventDate}T${newEventTime}:00`;
            const res = await createScheduleEvent(newEventTitle, start, newEventType);
            if (res.success && res.event) {
                setEvents([...events, res.event]);
                setIsAddModalOpen(false);
                setNewEventTitle('');
                toast.success("Event created successfully");
            }
        } catch (err) {
            toast.error("Failed to create event");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (!confirm("Are you sure you want to delete this event?")) return;
        try {
            await deleteScheduleEvent(id);
            setEvents(events.filter(e => e.id !== id));
            setSelectedEvent(null);
            toast.success("Event deleted");
        } catch (err) {
            toast.error("Failed to delete event");
        }
    };

    const handleVisitAction = async (action: string) => {
        if (!selectedEvent) return;
        setIsActionProcessing(true);
        try {
            const res = await manageVisitAction(selectedEvent.id, action);
            if (res.success) {
                setEvents(events.map(e => e.id === selectedEvent.id ? { ...e, status: res.new_status } : e));
                setSelectedEvent(prev => prev ? { ...prev, status: res.new_status } : null);
                // Important to use standard toast, not alert
                toast.success("Visit status updated");
            }
        } catch (err) {
            toast.error("Action failed");
        } finally {
            setIsActionProcessing(false);
        }
    };

    const nextPeriod = () => {
        const d = new Date(currentDate);
        if (view === 'month') d.setMonth(d.getMonth() + 1); else d.setDate(d.getDate() + 7);
        setCurrentDate(d);
    };

    const prevPeriod = () => {
        const d = new Date(currentDate);
        if (view === 'month') d.setMonth(d.getMonth() - 1); else d.setDate(d.getDate() - 7);
        setCurrentDate(d);
    };

    const jumpToToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
    };

    const getEventsForDay = (d: Date) => events.filter(e => {
        const ed = new Date(e.start);
        return ed.getDate() === d.getDate() && ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
    }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    // Month grid logic
    const monthDays = [];
    if (view === 'month') {
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        for (let i = 0; i < firstDay; i++) monthDays.push(null);
        for (let i = 1; i <= daysInMonth; i++) monthDays.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }
    const weekDays = view === 'week' ? getWeekDays(currentDate) : [];

    return (
        <div className="max-w-[1400px] mx-auto space-y-5 h-[calc(100vh-6rem)] flex flex-col pb-20">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-[var(--gray-900)] flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-[var(--gray-400)]" />
                        Calendar
                    </h1>
                    <p className="text-[13px] text-[var(--gray-500)] mt-0.5">Manage your visits, tasks, and follow-ups</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-[var(--gray-100)] p-1 rounded-lg">
                        <button onClick={() => setView('month')} className={`px-4 py-1.5 rounded-md text-[11px] font-semibold transition-all ${view === 'month' ? 'bg-white text-[var(--gray-900)] shadow-sm' : 'text-[var(--gray-500)] hover:text-[var(--gray-700)]'}`}>Month</button>
                        <button onClick={() => setView('week')} className={`px-4 py-1.5 rounded-md text-[11px] font-semibold transition-all ${view === 'week' ? 'bg-white text-[var(--gray-900)] shadow-sm' : 'text-[var(--gray-500)] hover:text-[var(--gray-700)]'}`}>Week</button>
                    </div>
                    <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--gray-900)] text-white text-xs font-medium border border-[var(--gray-900)] hover:bg-[var(--gray-800)] hover:border-[var(--gray-800)] transition-all rounded-lg shadow-sm">
                        <Plus className="w-3.5 h-3.5" /> Add Event
                    </button>
                </div>
            </div>

            {/* ── Navigation Bar ── */}
            <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-[var(--gray-200)] shadow-sm shrink-0">
                <div className="flex items-center gap-1.5">
                    <button onClick={prevPeriod} className="p-1.5 text-[var(--gray-500)] hover:text-[var(--gray-900)] hover:bg-[var(--gray-100)] rounded-md transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={nextPeriod} className="p-1.5 text-[var(--gray-500)] hover:text-[var(--gray-900)] hover:bg-[var(--gray-100)] rounded-md transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    <h2 className="text-sm font-bold text-[var(--gray-900)] ml-3 min-w-[160px]">
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h2>
                </div>
                {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--gray-300)]" />}
                <button onClick={jumpToToday} className="px-3 py-1.5 text-[11px] font-semibold text-[var(--gray-600)] border border-[var(--gray-200)] rounded-md hover:bg-[var(--gray-50)] transition-colors">Today</button>
            </div>

            {/* ── Grid Container ── */}
            <div className="flex-1 bg-white rounded-xl border border-[var(--gray-200)] shadow-sm flex flex-col min-h-0 overflow-hidden">
                {/* Month View */}
                {view === 'month' && (
                    <div className="flex-1 flex flex-col h-full">
                        <div className="grid grid-cols-7 border-b border-[var(--gray-200)] bg-[var(--gray-50)] shrink-0">
                            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                                <div key={d} className="py-2.5 text-center text-[10px] font-bold text-[var(--gray-500)] tracking-widest">{d}</div>
                            ))}
                        </div>
                        <div className="flex-1 grid grid-cols-7 grid-rows-5 divide-x divide-y divide-[var(--gray-100)] overflow-y-auto">
                            {monthDays.map((d, idx) => {
                                if (!d) return <div key={idx} className="bg-[var(--gray-50)]/50" />;
                                const dayEvents = getEventsForDay(d);
                                const isToday = d.toDateString() === new Date().toDateString();
                                const isSelected = d.toDateString() === selectedDate.toDateString();
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => setSelectedDate(d)}
                                        className={`group flex flex-col p-2 min-h-[90px] cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/40' : 'hover:bg-[var(--gray-50)]'}`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className={`w-6 h-6 flex items-center justify-center rounded-md text-[11px] font-bold ${isToday ? 'bg-[var(--color-brand)] text-white' : 'text-[var(--gray-600)] group-hover:text-[var(--gray-900)] group-hover:bg-[var(--gray-200)]'}`}>
                                                {d.getDate()}
                                            </span>
                                            {dayEvents.length > 0 && <span className="text-[9px] font-semibold text-[var(--gray-400)]">{dayEvents.length} events</span>}
                                        </div>
                                        <div className="flex-1 space-y-1 overflow-hidden">
                                            {dayEvents.slice(0, 3).map((e, i) => {
                                                const isPast = new Date(e.start).getTime() < new Date().getTime() - 86400000;
                                                return (
                                                    <div
                                                        key={i}
                                                        onClick={(ev) => { ev.stopPropagation(); setSelectedEvent(e); }}
                                                        className="px-2 py-1 rounded-[4px] text-[10px] font-medium truncate border-l-2 bg-[var(--gray-50)] hover:bg-[var(--gray-100)] transition-colors"
                                                        style={{ borderLeftColor: getEventColor(e.type, isPast) }}
                                                    >
                                                        {new Date(e.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} {e.title}
                                                    </div>
                                                )
                                            })}
                                            {dayEvents.length > 3 && <div className="text-[9px] font-medium text-[var(--gray-400)] pl-1.5">+{dayEvents.length - 3} more</div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Week View */}
                {view === 'week' && (
                    <div className="flex h-full overflow-hidden">
                        <div className="w-16 shrink-0 border-r border-[var(--gray-200)] bg-[var(--gray-50)] overflow-y-auto hide-scrollbar z-20 shadow-[1px_0_4px_rgba(0,0,0,0.05)]">
                            <div className="h-14 border-b border-[var(--gray-200)]" />
                            {Array.from({ length: 13 }, (_, i) => i + 8).map(h => (
                                <div key={h} className="h-[80px] text-[10px] font-semibold text-[var(--gray-400)] text-center pt-2 relative">
                                    <span className="-top-2.5 relative">{h}:00</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex-1 flex flex-col overflow-hidden min-w-[700px]">
                            <div className="grid grid-cols-7 border-b border-[var(--gray-200)] shrink-0 bg-white">
                                {weekDays.map((d, i) => {
                                    const isToday = d.toDateString() === new Date().toDateString();
                                    return (
                                        <div key={i} className={`h-14 py-2 border-r border-[var(--gray-100)] flex flex-col items-center justify-center ${isToday ? 'bg-blue-50/40' : ''}`}>
                                            <div className="text-[10px] font-semibold text-[var(--gray-500)] tracking-widest uppercase mb-0.5">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                            <div className={`text-sm font-bold ${isToday ? 'text-[var(--color-brand)]' : 'text-[var(--gray-800)]'}`}>{d.getDate()}</div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex-1 overflow-y-auto overflow-x-hidden relative bg-[var(--gray-50)]/30">
                                <div className="absolute inset-x-0 top-0 bottom-0 grid grid-cols-7 divide-x divide-[var(--gray-100)] pointer-events-none">
                                    {[...Array(7)].map((_, i) => <div key={i} className="h-full border-b border-[var(--gray-100)]" />)}
                                </div>
                                <div className="absolute inset-0 flex flex-col pointer-events-none">
                                    {[...Array(13)].map((_, i) => <div key={i} className="h-[80px] border-b border-[var(--gray-100)] w-full" />)}
                                </div>
                                <div className="absolute inset-0 grid grid-cols-7 divide-x divide-transparent">
                                    {weekDays.map((d, i) => (
                                        <div key={i} className="relative h-[1040px]">
                                            {getEventsForDay(d).map((e, idx) => {
                                                const dObj = new Date(e.start);
                                                const top = (dObj.getHours() + dObj.getMinutes() / 60 - 8) * 80;
                                                const isPast = dObj.getTime() < Date.now();
                                                if (top < 0 || top > 1040) return null;
                                                return (
                                                    <div
                                                        key={idx}
                                                        onClick={() => setSelectedEvent(e)}
                                                        className="absolute inset-x-[3px] rounded-md p-2 shadow-sm border-l-[3px] cursor-pointer hover:shadow-md transition-shadow bg-white overflow-hidden text-left"
                                                        style={{ top: `${top}px`, height: '74px', borderLeftColor: getEventColor(e.type, isPast), zIndex: 10 + idx }}
                                                    >
                                                        <div className={`text-[11px] font-bold leading-tight ${isPast ? 'text-[var(--gray-500)] text-strike' : 'text-[var(--gray-900)]'}`}>{e.title}</div>
                                                        <div className="text-[10px] font-medium text-[var(--gray-500)] flex items-center gap-1 mt-1">
                                                            <Clock className="w-2.5 h-2.5" />
                                                            {dObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── SlideOver Details ── */}
            <SlideOver
                open={!!selectedEvent}
                onClose={() => setSelectedEvent(null)}
                title={selectedEvent?.title || 'Event Details'}
                actions={
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => selectedEvent && handleDeleteEvent(selectedEvent.id)} className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-colors">
                            <span className="flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Delete</span>
                        </button>
                    </div>
                }
            >
                {selectedEvent && (
                    <div className="space-y-6">
                        {/* Status */}
                        <div className={`p-4 rounded-lg flex items-center gap-3 border ${selectedEvent.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                selectedEvent.status === 'IN_PROGRESS' || selectedEvent.status === 'CHECKED_IN' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    'bg-[var(--gray-50)] text-[var(--gray-700)] border-[var(--gray-200)]'
                            }`}>
                            {selectedEvent.status === 'COMPLETED' ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">Status</div>
                                <div className="text-sm font-semibold">{selectedEvent.status || 'SCHEDULED'}</div>
                            </div>
                        </div>

                        {/* Date/Time */}
                        <div className="flex gap-4 items-start">
                            <div className="p-2.5 bg-[var(--gray-100)] text-[var(--gray-500)] rounded-lg shrink-0"><CalendarIcon className="w-5 h-5" /></div>
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--gray-500)] mb-1">Date & Time</h4>
                                <div className="text-sm font-semibold text-[var(--gray-900)]">{new Date(selectedEvent.start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                                <div className="text-[13px] text-[var(--gray-600)] mt-0.5">{new Date(selectedEvent.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="flex gap-4 items-start">
                            <div className="p-2.5 bg-[var(--gray-100)] text-[var(--gray-500)] rounded-lg shrink-0"><MapPin className="w-5 h-5" /></div>
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--gray-500)] mb-1">Location</h4>
                                <div className="text-sm font-medium text-[var(--gray-900)]">Linked Property Address</div>
                                <button className="text-[11px] font-semibold text-[var(--color-brand)] hover:underline mt-0.5">View on Map</button>
                            </div>
                        </div>

                        {/* Client Info Mock */}
                        <div className="flex gap-4 items-start border-t border-[var(--gray-100)] pt-5 mt-5">
                            <div className="p-2.5 bg-[var(--gray-100)] text-[var(--gray-500)] rounded-lg shrink-0"><User className="w-5 h-5" /></div>
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--gray-500)] mb-1">Assignee / Client</h4>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <div className="w-6 h-6 rounded-full bg-[var(--color-brand)] text-white flex items-center justify-center text-[10px] font-bold">JD</div>
                                    <span className="text-sm font-semibold text-[var(--gray-900)]">John Doe</span>
                                </div>
                                <div className="flex gap-2 mt-3">
                                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[var(--gray-200)] text-[var(--gray-600)] hover:bg-[var(--gray-50)] hover:text-[var(--gray-900)] rounded-md text-[11px] font-semibold transition-colors">
                                        <Phone className="w-3 h-3" /> Call
                                    </button>
                                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[var(--gray-200)] text-[var(--gray-600)] hover:bg-[var(--gray-50)] hover:text-[var(--gray-900)] rounded-md text-[11px] font-semibold transition-colors">
                                        <Mail className="w-3 h-3" /> Email
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        {selectedEvent.type === 'visit' && (
                            <div className="border-t border-[var(--gray-200)] pt-6 mt-6">
                                <h4 className="text-[11px] font-bold uppercase tracking-wide text-[var(--gray-900)] mb-3">Visit Actions</h4>
                                {(!selectedEvent.status || selectedEvent.status === 'SCHEDULED' || selectedEvent.status === 'APPROVED') && (
                                    <button
                                        onClick={() => handleVisitAction('check_in')}
                                        disabled={isActionProcessing}
                                        className="w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-semibold text-[13px] rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        <MapPin className="w-4 h-4" /> GPS Check-In
                                    </button>
                                )}
                                {(selectedEvent.status === 'IN_PROGRESS' || selectedEvent.status === 'CHECKED_IN') && (
                                    <button
                                        onClick={() => handleVisitAction('complete')}
                                        disabled={isActionProcessing}
                                        className="w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-semibold text-[13px] rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                    >
                                        <CheckCircle className="w-4 h-4" /> Complete Visit
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </SlideOver>

            {/* ── Add Event Modal ── */}
            <CustomModal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Event">
                <div className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-semibold text-[var(--gray-700)] uppercase tracking-wide mb-1.5">Event Title</label>
                        <input
                            type="text"
                            value={newEventTitle}
                            onChange={e => setNewEventTitle(e.target.value)}
                            placeholder="e.g. Property Viewing"
                            className="w-full px-3 py-2 text-[13px] border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] focus:border-[var(--color-brand)]"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-semibold text-[var(--gray-700)] uppercase tracking-wide mb-1.5">Date</label>
                            <input
                                type="date"
                                value={newEventDate}
                                onChange={e => setNewEventDate(e.target.value)}
                                className="w-full px-3 py-2 text-[13px] border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] focus:border-[var(--color-brand)] text-[var(--gray-700)]"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-[var(--gray-700)] uppercase tracking-wide mb-1.5">Time</label>
                            <input
                                type="time"
                                value={newEventTime}
                                onChange={e => setNewEventTime(e.target.value)}
                                className="w-full px-3 py-2 text-[13px] border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] focus:border-[var(--color-brand)] text-[var(--gray-700)]"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] font-semibold text-[var(--gray-700)] uppercase tracking-wide mb-1.5">Event Type</label>
                        <div className="flex flex-wrap gap-2">
                            {['task', 'visit', 'verification', 'call'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setNewEventType(t)}
                                    className={`px-3 py-1.5 rounded-md text-[11px] font-semibold capitalize border transition-colors ${newEventType === t ? 'bg-[var(--gray-900)] text-white border-[var(--gray-900)]' : 'bg-white text-[var(--gray-600)] border-[var(--gray-200)] hover:bg-[var(--gray-50)]'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="pt-4 border-t border-[var(--gray-100)] flex justify-end gap-2 mt-2">
                        <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-[12px] font-semibold text-[var(--gray-600)] hover:bg-[var(--gray-50)] rounded-lg transition-colors">Cancel</button>
                        <button disabled={isSubmitting} onClick={handleCreateEvent} className="px-4 py-2 text-[12px] font-bold text-white bg-[var(--color-brand)] hover:opacity-90 rounded-lg transition-opacity disabled:opacity-50 min-w-[100px] flex justify-center">
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                        </button>
                    </div>
                </div>
            </CustomModal>
        </div>
    );
}
