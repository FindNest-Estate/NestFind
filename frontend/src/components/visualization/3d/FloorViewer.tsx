import React, { useMemo } from 'react';
import type { DevBuilding, DevUnit } from '@/types/developer';
import { UNIT_STATUS_COLORS } from '@/types/developer';
import { X, BedDouble, ArrowUp, ArrowDown } from 'lucide-react';

interface FloorViewerProps {
  building: DevBuilding;
  floorNumber: number;
  onClose: () => void;
  onSelectUnit: (unit: DevUnit) => void;
}

export default function FloorViewer({
  building,
  floorNumber,
  onClose,
  onSelectUnit
}: FloorViewerProps) {
  
  // Find the exact floor data
  const floorData = useMemo(() => {
    return building.floors?.find(f => f.floor_number === floorNumber);
  }, [building, floorNumber]);

  const units = floorData?.units || [];
  
  // Fake lift/core layout separator logic for BookMyShow style UI
  const leftUnits = units.slice(0, Math.ceil(units.length / 2));
  const rightUnits = units.slice(Math.ceil(units.length / 2));

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{building.building_name}</p>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Floor {floorNumber}</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-2 bg-white rounded-full shadow-sm border border-gray-200 text-gray-400 hover:text-gray-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
        <div className="mb-8 flex justify-center gap-6 text-sm font-bold text-gray-600 border-b border-gray-200 pb-4">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div> Available</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> Sold</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> Reserved</div>
        </div>

        <div className="max-w-sm mx-auto relative">
          
          {/* Main Grid structure matching BookMyShow seats */}
          <div className="flex justify-between items-stretch gap-6">
            
            {/* Left Wing Flats */}
            <div className="flex flex-col gap-4 flex-1">
              <span className="text-xs font-bold text-gray-400 uppercase text-center mb-2 tracking-widest">Left Wing</span>
              {leftUnits.map((u, i) => (
                <UnitCard key={u.id || `l-${i}`} unit={u} onSelect={() => onSelectUnit(u)} />
              ))}
            </div>

            {/* Core / Lift lobby */}
            <div className="w-16 flex flex-col items-center justify-center gap-8 bg-gray-200/50 rounded-full border border-gray-200 py-8">
               <div className="text-gray-400 flex flex-col items-center gap-1">
                 <ArrowUp className="w-5 h-5" />
                 <span className="text-[10px] uppercase font-bold transform -rotate-90 my-6 tracking-widest">Lifts</span>
                 <ArrowDown className="w-5 h-5" />
               </div>
            </div>

            {/* Right Wing Flats */}
            <div className="flex flex-col gap-4 flex-1">
               <span className="text-xs font-bold text-gray-400 uppercase text-center mb-2 tracking-widest">Right Wing</span>
               {rightUnits.map((u, i) => (
                <UnitCard key={u.id || `r-${i}`} unit={u} onSelect={() => onSelectUnit(u)} />
              ))}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

function UnitCard({ unit, onSelect }: { unit: DevUnit, onSelect: () => void }) {
  const isAvailable = unit.status === 'AVAILABLE';
  const statusColor = UNIT_STATUS_COLORS[unit.status as keyof typeof UNIT_STATUS_COLORS] || '#e5e7eb';
  
  return (
    <button
      onClick={onSelect}
      className={`relative w-full aspect-square rounded-2xl flex flex-col items-center justify-center p-4 transition-all overflow-hidden border-2
      ${isAvailable 
        ? 'hover:scale-105 hover:shadow-lg cursor-pointer bg-white' 
        : 'opacity-70 cursor-not-allowed bg-gray-50'}`}
      style={{ borderColor: isAvailable ? statusColor : '#e5e7eb' }}
    >
      {/* Top Color Band */}
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: statusColor }} />
      
      <span className="text-lg font-black text-gray-900 tracking-tighter mb-1 mt-2">
        {unit.unit_number || 'U'}
      </span>
      
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">
        {unit.facing || 'N/A'}<br/>{unit.area_sqft ? `${Math.round(unit.area_sqft)} SQFT` : ''}
      </span>
      
      {unit.bedrooms && (
        <div className="absolute bottom-2 right-2 flex items-center text-gray-400 text-xs font-bold gap-0.5">
          {unit.bedrooms}<BedDouble className="w-3 h-3" />
        </div>
      )}
    </button>
  );
}
