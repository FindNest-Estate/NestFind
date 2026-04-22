import React, { useState, useEffect } from 'react';
import { X, Bed, Bath, Square, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { DevUnit } from '@/types/developer';
import { UNIT_STATUS_COLORS } from '@/types/developer';
import { exploreApi } from '@/lib/visualizationApi';

interface UnitDetailsPanelProps {
  projectId: string;
  unitId: string | null;
  onClose: () => void;
}

export default function UnitDetailsPanel({ projectId, unitId, onClose }: UnitDetailsPanelProps) {
  const [unit, setUnit] = useState<DevUnit | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!unitId) {
      setUnit(null);
      return;
    }

    async function loadUnit() {
      setLoading(true);
      try {
        const res = await exploreApi.getUnitDetail(projectId, unitId!);
        if (res.success) {
          setUnit(res.data);
        }
      } catch (err) {
        console.error("Failed to load unit details", err);
      } finally {
        setLoading(false);
      }
    }

    loadUnit();
  }, [projectId, unitId]);

  if (!unitId) return null;

  return (
    <div className={`fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl border-l border-gray-200 z-50 transform transition-transform duration-300 ease-in-out ${unitId ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Unit Details</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-48 bg-gray-200 rounded-xl w-full" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="space-y-2 mt-8">
                <div className="h-8 bg-gray-200 rounded w-full" />
                <div className="h-8 bg-gray-200 rounded w-full" />
                <div className="h-8 bg-gray-200 rounded w-full" />
              </div>
            </div>
          ) : unit ? (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-extrabold text-gray-900">{unit.unit_number || 'Unit'}</h3>
                  <p className="text-sm font-medium text-gray-500">{unit.unit_type}</p>
                </div>
                <div 
                  className="px-4 py-1.5 rounded-full text-sm font-bold text-white shadow-sm"
                  style={{ backgroundColor: UNIT_STATUS_COLORS[unit.status] }}
                >
                  {unit.status}
                </div>
              </div>

              <div className="h-px bg-gray-100 w-full my-4" />

              {/* Price */}
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Pricing</p>
                <div className="text-2xl font-bold text-[#FF385C]">
                  {unit.price ? `₹${unit.price.toLocaleString('en-IN')}` : 'Price on Request'}
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-4 py-4">
                {unit.area_sqft && (
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <Square className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Area</p>
                      <p className="text-sm font-bold text-gray-900">{unit.area_sqft} sqft</p>
                    </div>
                  </div>
                )}
                {unit.facing && (
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <CheckCircle2 className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Facing</p>
                      <p className="text-sm font-bold text-gray-900">{unit.facing}</p>
                    </div>
                  </div>
                )}
                {unit.bedrooms != null && unit.bedrooms > 0 && (
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <Bed className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Bedrooms</p>
                      <p className="text-sm font-bold text-gray-900">{unit.bedrooms}</p>
                    </div>
                  </div>
                )}
                {unit.bathrooms != null && unit.bathrooms > 0 && (
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <Bath className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Bathrooms</p>
                      <p className="text-sm font-bold text-gray-900">{unit.bathrooms}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-6 space-y-3">
                <button 
                  className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-md ${unit.status === 'AVAILABLE' ? 'bg-gray-900 hover:bg-black hover:shadow-lg' : 'bg-gray-300 cursor-not-allowed'}`}
                  disabled={unit.status !== 'AVAILABLE'}
                >
                  {unit.status === 'AVAILABLE' ? 'Start Deal Options' : 'Currently Unavailable'}
                </button>
                <button className="w-full py-4 rounded-xl font-bold text-gray-700 bg-white border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all">
                  Schedule Site Visit
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Unit details not found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
