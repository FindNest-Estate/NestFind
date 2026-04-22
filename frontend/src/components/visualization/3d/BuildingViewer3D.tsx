import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows, Loader } from '@react-three/drei';
import type { DevBuilding, DevUnit } from '@/types/developer';
import BuildingFacade from './BuildingFacade';
import CameraController from './CameraController';
import SunlightSimulation from './SunlightSimulation';
import FloorViewer from './FloorViewer';
import { ArrowLeft, Clock, Info } from 'lucide-react';

interface BuildingViewer3DProps {
  building: DevBuilding;
  onBackToMasterPlan: () => void;
  latitude?: number;
  longitude?: number;
}

export default function BuildingViewer3D({ 
  building: initialBuilding, 
  onBackToMasterPlan,
  latitude,
  longitude
}: BuildingViewer3DProps) {
  const [building, setBuilding] = useState<DevBuilding>(initialBuilding);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<number>(14); // Default to 2:00 PM
  const [activeUnit, setActiveUnit] = useState<DevUnit | null>(null);

  // Fetch the detailed building with internal floors and units arrays!
  React.useEffect(() => {
    async function loadDetails() {
      try {
        const { exploreApi } = await import('@/lib/visualizationApi');
        const res = await exploreApi.getBuildingDetail(initialBuilding.project_id, initialBuilding.id);
        if (res.success) {
          setBuilding(res.data);
        }
      } catch (e) {
        console.error("Failed to load building detail", e);
      }
    }
    loadDetails();
  }, [initialBuilding.id, initialBuilding.project_id]);

  const calculatedHeight = (building.total_floors || 10) * 3.2;

  // Render the FloorView if a floor is deeply focused
  if (activeUnit) {
    // Let FloorView handle the BookMyShow grid layout logic (simulated by just showing unit detail here for rapid flow)
    // You could return `<FloorViewer unit={activeUnit} />` here instead.
  }

  return (
    <div className="absolute inset-0 z-50 bg-sky-50 flex">
      {/* 3D Scene */}
      <div className="relative flex-1 h-full">
        <Canvas shadows gl={{ antialias: true, alpha: false }} camera={{ position: [0, 20, 40], fov: 45 }}>
          <color attach="background" args={['#e0f2fe']} />
          
          <Suspense fallback={null}>
            <SunlightSimulation timeOfDay={timeOfDay} latitude={latitude} longitude={longitude} />
            
            <Environment preset="city" />

            <BuildingFacade 
              building={building} 
              selectedFloor={selectedFloor}
              onSelectFloor={setSelectedFloor}
              onSelectUnit={setActiveUnit}
            />

            {/* Base shadow on ground */}
            <ContactShadows resolution={1024} scale={50} blur={2} opacity={0.6} far={20} position={[0, -0.19, 0]} />

            <CameraController 
              selectedFloor={selectedFloor} 
              buildingHeight={calculatedHeight} 
            />
          </Suspense>
        </Canvas>

        <Loader /> {/* Three.js suspended loader */}
      </div>

      {/* Floating UI Overlay */}
      <div className="absolute top-6 left-6 flex items-center gap-4 z-10 pointer-events-auto">
        <button 
          onClick={() => selectedFloor !== null ? setSelectedFloor(null) : onBackToMasterPlan()}
          className="flex items-center gap-2 bg-white/90 backdrop-blur-md text-gray-800 px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          {selectedFloor !== null ? 'Back to Building View' : 'Back to Master Plan'}
        </button>

        <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-gray-200">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">{building.building_name}</h2>
        </div>
      </div>

      {/* Sun Simulation Controls */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-96 max-w-full px-4 z-10 pointer-events-auto">
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#FF385C]" /> Sunlight Simulator
            </h3>
            <span className="text-sm font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">
              {timeOfDay < 12 ? Math.floor(timeOfDay) : Math.floor(timeOfDay) === 12 ? 12 : Math.floor(timeOfDay) - 12}:
              {((timeOfDay % 1) * 60).toString().padStart(2, '0')} {timeOfDay < 12 ? 'AM' : 'PM'}
            </span>
          </div>
          <input 
            type="range" 
            min="6" 
            max="18" 
            step="0.5" 
            value={timeOfDay} 
            onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF385C]"
          />
          <div className="flex justify-between text-xs font-bold text-gray-400 mt-2 uppercase tracking-wide">
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
          </div>
        </div>
      </div>

      {/* Side Panel (BookMyShow style grid placeholder for Floor selection) */}
      <div className={`w-96 bg-white shadow-2xl relative z-10 flex flex-col transform transition-transform duration-300 ${selectedFloor !== null ? 'translate-x-0' : 'translate-x-full absolute right-0 top-0 h-full'}`}>
        {selectedFloor !== null && (
          <FloorViewer 
            building={building} 
            floorNumber={selectedFloor} 
            onClose={() => setSelectedFloor(null)}
            onSelectUnit={setActiveUnit}
          />
        )}
      </div>

      {/* Unit Detail Modal overlay when deeply selecting a unit */}
      {activeUnit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black text-gray-900 mb-1">{activeUnit.unit_number || 'Unit Details'}</h2>
            <p className="text-gray-500 font-medium mb-6">Floor {activeUnit.floor} • {activeUnit.facing} • {activeUnit.area_sqft} sqft</p>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6 flex justify-between items-center text-xl font-bold">
              <span className="text-gray-500 text-sm">Price Details</span>
              <span className="text-[#FF385C]">₹{(parseFloat(activeUnit.price as any) || 0).toLocaleString('en-IN')}</span>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setActiveUnit(null)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
               >
                Close
              </button>
              <button 
                disabled={activeUnit.status !== 'AVAILABLE'}
                className="flex-[2] px-4 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {activeUnit.status === 'AVAILABLE' ? 'Express Interest' : 'Unavailable'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
