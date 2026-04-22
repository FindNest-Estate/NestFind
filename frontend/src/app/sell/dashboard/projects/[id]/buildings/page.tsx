'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { developerApi } from '@/lib/developerApi';
import type { DevBuilding } from '@/types/developer';
import { Plus, Building2, Layers, MapPin, Loader2, Save } from 'lucide-react';

export default function BuildingManagementPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [buildings, setBuildings] = useState<DevBuilding[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [newBuilding, setNewBuilding] = useState({
    building_name: '',
    building_code: '',
    total_floors: 10,
    units_per_floor: 4,
    facing: 'NORTH',
  });

  const loadBuildings = async () => {
    try {
      const res = await developerApi.get(`/developer/buildings?project_id=${projectId}`);
      if (res.success) setBuildings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBuildings();
  }, [projectId]);

  const handleCreate = async () => {
    if (!newBuilding.building_name) return;
    setSaving(true);
    try {
      await developerApi.post('/developer/buildings', {
        project_id: projectId,
        ...newBuilding
      });
      setIsCreating(false);
      loadBuildings();
    } catch (err) {
      console.error(err);
      alert("Failed to create building");
    } finally {
      setSaving(false);
    }
  };

  const handleAutoGenerateFloors = async (buildingId: string) => {
    try {
      await developerApi.post(`/developer/buildings/${buildingId}/auto-generate-floors`, {});
      alert("Floors generated successfully!");
      loadBuildings();
    } catch (err) {
      console.error(err);
      alert("Failed to generate floors");
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Building & Towers</h1>
          <p className="text-gray-500 mt-2">Manage the 3D buildings and floors for your project.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 bg-[#FF385C] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#E31C5F] transition-all"
        >
          <Plus className="w-5 h-5" /> Add Building
        </button>
      </div>

      {isCreating && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">New Building / Tower</h3>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Building Name</label>
              <input 
                type="text" value={newBuilding.building_name} onChange={e => setNewBuilding({...newBuilding, building_name: e.target.value})}
                placeholder="e.g. Tower A" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 ring-[#FF385C]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Code</label>
              <input 
                type="text" value={newBuilding.building_code} onChange={e => setNewBuilding({...newBuilding, building_code: e.target.value})}
                placeholder="e.g. TA" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 ring-[#FF385C]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Floors</label>
              <input 
                type="number" value={newBuilding.total_floors} onChange={e => setNewBuilding({...newBuilding, total_floors: parseInt(e.target.value) || 0})}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 ring-[#FF385C]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Units/Flr</label>
              <input 
                type="number" value={newBuilding.units_per_floor} onChange={e => setNewBuilding({...newBuilding, units_per_floor: parseInt(e.target.value) || 0})}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 ring-[#FF385C]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsCreating(false)} className="px-5 py-2 font-bold text-gray-500 hover:bg-gray-50 rounded-xl">Cancel</button>
            <button onClick={handleCreate} disabled={saving} className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-black">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Building
            </button>
          </div>
        </div>
      )}

      {buildings.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-24 bg-white border border-gray-200 rounded-2xl">
          <Building2 className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900">No Buildings Found</h3>
          <p className="text-gray-500 text-center max-w-sm mt-2">Add towers or blocks to your project to enable the 3D building visualization.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buildings.map(building => (
            <div key={building.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm group">
              <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 truncate">{building.building_name}</h3>
                  <div className="flex items-center text-sm font-medium text-gray-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 mr-1" />
                    Facing: {building.facing || 'N/A'}
                  </div>
                </div>
                {building.building_code && (
                  <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-bold">{building.building_code}</span>
                )}
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Structure</p>
                      <p className="text-sm font-bold text-gray-900">{building.total_floors} Floors, {building.units_per_floor} Units/Flr</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-500 block mb-1">Total Mapped</span>
                    <span className="font-bold text-gray-900">{building.total_units} Units</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-500 block mb-1">Available</span>
                    <span className="font-bold text-green-600">{building.available_units} Units</span>
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button 
                  onClick={() => handleAutoGenerateFloors(building.id)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
                >
                  Generate Floors
                </button>
                <button className="px-4 py-2 bg-[#FF385C] text-white rounded-lg text-sm font-bold hover:bg-[#E31C5F] transition-colors shadow-sm">
                  View 3D Model
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
