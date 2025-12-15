"use client";

import { useState } from 'react';
import { toast } from 'sonner';

interface TimeSlotPickerProps {
    value: string[];
    onChange: (slots: string[]) => void;
    maxSlots?: number;
}

export function TimeSlotPicker({ value = [], onChange, maxSlots = 5 }: TimeSlotPickerProps) {
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');

    const handleAddSlot = () => {
        if (!selectedDate || !selectedTime) {
            toast.error('Please select both date and time');
            return;
        }

        const dateTime = new Date(`${selectedDate}T${selectedTime}`);
        if (isNaN(dateTime.getTime())) {
            toast.error('Invalid date or time');
            return;
        }

        const slotString = dateTime.toISOString();

        // Check for duplicates
        if (value.includes(slotString)) {
            toast.error('This slot is already selected');
            return;
        }

        // Check for max slots
        if (value.length >= maxSlots) {
            toast.error(`Maximum ${maxSlots} time slots allowed`);
            return;
        }

        onChange([...value, slotString]);

        // Reset inputs
        setSelectedDate('');
        setSelectedTime('');

        toast.success('Slot added successfully!');
    };

    const removeSlot = (index: number) => {
        const newSlots = value.filter((_, i) => i !== index);
        onChange(newSlots);
        toast.success('Slot removed');
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-start gap-3">
                    <div className="text-3xl">📅</div>
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">
                            Schedule Your Visit
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Select your preferred date and time. You can add multiple time slots for flexibility.
                        </p>
                    </div>
                </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* Date Input */}
                <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Select Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full pl-4 pr-10 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all bg-white hover:border-gray-300 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                            placeholder="MM / DD / YYYY"
                            min={new Date().toISOString().split('T')[0]}
                        />
                        <div className="absolute right-3 top-3.5 pointer-events-none bg-white pl-2">
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Time Input */}
                <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Select Time <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                        <input
                            type="time"
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="w-full pl-4 pr-10 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all bg-white hover:border-gray-300 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                        />
                        <div className="absolute right-3 top-3.5 pointer-events-none bg-white pl-2">
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 2m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Button */}
            <div className="mb-8">
                <button
                    disabled={!selectedDate || !selectedTime}
                    onClick={handleAddSlot}
                    className={`
                        w-full py-3.5 px-4 rounded-xl font-bold text-base transition-all duration-200
                        flex items-center justify-center gap-2 border-2 transform active:scale-[0.98]
                        ${selectedDate && selectedTime
                            ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700 shadow-lg shadow-blue-200'
                            : 'bg-gray-100 border-gray-100 text-gray-400 cursor-not-allowed'
                        }
                    `}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add Time Slot</span>
                </button>
            </div>

            {/* Selected Slots */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Selected Slots ({value.length})
                    </h4>
                    {value.length > 0 && (
                        <button
                            onClick={() => onChange([])}
                            className="text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-full transition-colors"
                        >
                            Clear All
                        </button>
                    )}
                </div>

                {value.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-100">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 2m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">No time slots added yet</p>
                        <p className="text-xs text-gray-400 mt-1">Select a date and time above to add one</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {value.map((slot, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-xs border border-blue-100">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">
                                            {new Date(slot).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {new Date(slot).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => removeSlot(idx)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Remove slot"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
