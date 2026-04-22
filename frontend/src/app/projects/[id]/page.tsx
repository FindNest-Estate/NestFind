'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { exploreApi } from '@/lib/visualizationApi';
import type { MasterPlanData } from '@/types/developer';
import MasterPlanViewer from '@/components/visualization/MasterPlanViewer';
import { Loader2, AlertCircle, Map, Box } from 'lucide-react';
import dynamic from 'next/dynamic';

const DynamicBuildingViewer3D = dynamic(
  () => import('@/components/visualization/3d/BuildingViewer3D'),
  { ssr: false, loading: () => <div className="absolute inset-0 flex items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 animate-spin text-[#FF385C]" /></div> }
);

const DynamicTownshipViewer3D = dynamic(
  () => import('@/components/visualization/3d/TownshipViewer3D'),
  { ssr: false, loading: () => <div className="absolute inset-0 flex items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 animate-spin text-[#FF385C]" /></div> }
);

export default function ProjectExplorerPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [data, setData] = useState<MasterPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const is3DDefault = searchParams?.get('view') === '3d';

  const [activeBuildingId, setActiveBuildingId] = useState<string | null>(null);
  const [is3DTownship, setIs3DTownship] = useState<boolean>(is3DDefault);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await exploreApi.getMasterPlan(projectId);
        if (res.success) {
          setData(res.data);
        }
      } catch (err: any) {
        console.error("Failed to load master plan:", err);
        setError(err.message || 'Failed to load project data. It may not exist or visualization is disabled.');
      } finally {
        setLoading(false);
      }
    }

    if (projectId) {
      loadData();
    }
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#f8f9fa]">
        <Loader2 className="w-12 h-12 animate-spin text-[#FF385C] mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Loading Interactive Map...</h2>
        <p className="text-gray-500 mt-2">Preparing layouts and available units</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#f8f9fa]">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Unavailable</h2>
        <p className="text-gray-500 max-w-md text-center">{error || 'Data could not be loaded'}</p>
      </div>
    );
  }

  const activeBuilding = activeBuildingId 
    ? data.buildings.find(b => b.id === activeBuildingId) 
    : null;

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#e0f2fe]">
      {/* 2D Master Plan Component vs 3D Township View */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${activeBuildingId ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
        
        {is3DTownship ? (
          <DynamicTownshipViewer3D 
             data={data}
             onExit3D={() => setIs3DTownship(false)}
             onSelectBuilding={setActiveBuildingId}
             onSelectPlot={(plot) => {
               setIs3DTownship(false);
             }}
          />
        ) : (
          <MasterPlanViewer 
            data={data} 
            onBuildingSelect={setActiveBuildingId} 
          />
        )}
        
        {/* Project Info Overlay Badge (Only in 2D mode, 3D has its own header) */}
        {(!activeBuildingId && !is3DTownship) && (
          <div className="absolute top-6 left-6 z-10 pointer-events-none">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 p-4 pointer-events-auto">
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">{data.project.name}</h1>
              <p className="text-sm font-medium text-gray-500">{data.project.location}</p>
              <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Total Units</p>
                  <p className="text-sm font-bold text-gray-800">{data.units_summary.total}</p>
                </div>
                <div>
                  <p className="text-xs text-green-500 uppercase tracking-wider font-bold">Available</p>
                  <p className="text-sm font-bold text-gray-800">{data.units_summary.available}</p>
                </div>
              </div>
            </div>
            
            {/* 2D/3D Mode Toggle Switch */}
            <div className="mt-4 bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl p-1 inline-flex pointer-events-auto shadow-sm">
              <button 
                onClick={() => setIs3DTownship(false)}
                className={`flex gap-2 items-center px-4 py-2 rounded-lg text-sm font-bold transition-colors ${!is3DTownship ? 'bg-[#FF385C] text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <Map className="w-4 h-4" /> 2D Map
              </button>
              <button 
                 onClick={() => setIs3DTownship(true)}
                 className={`flex gap-2 items-center px-4 py-2 rounded-lg text-sm font-bold transition-colors ${is3DTownship ? 'bg-sky-500 text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <Box className="w-4 h-4" /> 3D Township
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3D Core Building Viewer Component (Highest Z-index) */}
      {activeBuilding && (
        <div className="absolute inset-0 z-40 animate-in fade-in duration-500">
           <DynamicBuildingViewer3D 
              building={activeBuilding} 
              onBackToMasterPlan={() => setActiveBuildingId(null)}
              latitude={data.project.latitude || 17.3850}
              longitude={data.project.longitude || 78.4867}
           />
        </div>
      )}
    </div>
  );
}
