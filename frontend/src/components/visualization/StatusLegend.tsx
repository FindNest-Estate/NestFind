import React from 'react';
import { UNIT_STATUS_COLORS } from '@/types/developer';

export default function StatusLegend() {
  const legendItems = [
    { label: 'Available', status: 'AVAILABLE' as const },
    { label: 'Negotiation', status: 'NEGOTIATION' as const },
    { label: 'Reserved', status: 'RESERVED' as const },
    { label: 'Sold', status: 'SOLD' as const },
  ];

  return (
    <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 p-4 z-10 w-48">
      <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Availability Legend</h3>
      <div className="flex flex-col gap-2">
        {legendItems.map((item) => (
          <div key={item.status} className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full shadow-sm"
              style={{ backgroundColor: UNIT_STATUS_COLORS[item.status] }}
            />
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
