import React, { useState, useMemo, Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls, Loader } from '@react-three/drei';
import * as THREE from 'three';
import { MasterPlanData, LayoutPolygon, DevBuilding } from '@/types/developer';
import SunlightSimulation from './SunlightSimulation';
import PlotMesh from './PlotMesh';
import BuildingFacade from './BuildingFacade';
import { ArrowLeft, Clock } from 'lucide-react';

interface TownshipViewerProps {
  data: MasterPlanData;
  onExit3D: () => void;
  onSelectBuilding: (buildingId: string) => void;
  onSelectPlot: (plot: LayoutPolygon) => void;
}

// Sub-component to manage full map view camera physics
function DroneCameraController() {
  const controlsRef = useRef<any>(null);
  
  return (
    <OrbitControls 
      ref={controlsRef} 
      enablePan={true}
      enableZoom={true}
      maxPolarAngle={Math.PI / 2.2} // Prevent zooming below terrain
      minDistance={20}
      maxDistance={400} // High satellite view possible
      target={[0, 0, 0]}
      makeDefault
    />
  );
}

export default function TownshipViewer3D({ 
  data, 
  onExit3D, 
  onSelectBuilding, 
  onSelectPlot 
}: TownshipViewerProps) {
  const [timeOfDay, setTimeOfDay] = useState<number>(14);
  const [hoveredPoly, setHoveredPoly] = useState<string | null>(null);

  // Core Map Metrics (Scales the 0-1 coordinates into a massive 3D plane)
  const MAP_WIDTH = 250; 
  const MAP_DEPTH = 250; 

  const renderPolygons = useMemo(() => {
    return data.polygons.map(poly => {
      // Color logic overriding default plot colors
      if (poly.polygon_type === 'ROAD') {
        const fakeRoadCol = '#475569'; // slate-600
        return <PlotMesh key={poly.id} polygon={{...poly, status: ''}} mapWidth={MAP_WIDTH} mapDepth={MAP_DEPTH} onClick={() => {}} isDimmed={false} />;
      }
      if (poly.polygon_type === 'PARK' || poly.polygon_type === 'AMENITY') {
        const fakeGrass = '#4ade80'; // green-400
        return <PlotMesh key={poly.id} polygon={{...poly, status: ''}} mapWidth={MAP_WIDTH} mapDepth={MAP_DEPTH} onClick={() => {}} isDimmed={false} />;
      }
      
      // Standalone unit plots vs building footprints
      if (poly.polygon_type === 'BUILDING_FOOTPRINT') {
        return (
          <PlotMesh 
            key={poly.id} 
            polygon={{...poly, status: ''}} 
            mapWidth={MAP_WIDTH} 
            mapDepth={MAP_DEPTH} 
            onClick={() => poly.linked_building_id && onSelectBuilding(poly.linked_building_id)} 
            isDimmed={false} 
          />
        );
      }

      return (
        <PlotMesh 
          key={poly.id} 
          polygon={poly} 
          mapWidth={MAP_WIDTH} 
          mapDepth={MAP_DEPTH} 
          onClick={onSelectPlot} 
          isDimmed={false} 
        />
      );
    });
  }, [data.polygons, onSelectBuilding, onSelectPlot]);

  // Translate buildings procedural facades to absolute layout placement
  const renderBuildings = useMemo(() => {
    return data.buildings.map((b, i) => {
      // Find its footprint polygon to position it accurately
      const footprint = data.polygons.find(p => p.linked_building_id === b.id);
      
      let bx = 0;
      let bz = 0;
      
      if (footprint && footprint.coordinates && footprint.coordinates.length > 0) {
        // Find center of footprint
        const xSum = footprint.coordinates.reduce((sum, p) => sum + p[0], 0);
        const ySum = footprint.coordinates.reduce((sum, p) => sum + p[1], 0);
        bx = (xSum / footprint.coordinates.length - 0.5) * MAP_WIDTH;
        bz = (ySum / footprint.coordinates.length - 0.5) * MAP_DEPTH;
      } else {
        // Fallback grid placement if no polygon mapped
        bx = (i - data.buildings.length / 2) * 50;
        bz = -50;
      }

      return (
        <group key={b.id} position={[bx, 0, bz]}>
          <BuildingFacade 
            building={b} 
            selectedFloor={null} 
            onSelectFloor={() => onSelectBuilding(b.id)} 
            onSelectUnit={() => {}} 
          />
        </group>
      );
    });
  }, [data.buildings, data.polygons, onSelectBuilding]);

  return (
    <div className="absolute inset-0 z-50 bg-sky-50 flex">
      {/* 3D Scene */}
      <div className="relative flex-1 h-full">
        <Canvas shadows gl={{ antialias: true }} camera={{ position: [0, 100, 150], fov: 45 }}>
          <color attach="background" args={['#e0f2fe']} />
          
          <Suspense fallback={null}>
            <SunlightSimulation 
              timeOfDay={timeOfDay} 
              latitude={data.project.latitude || 17.38} 
              longitude={data.project.longitude || 78.48} 
            />
            
            <Environment preset="city" />

            {/* Core Gameplay Grid / Terrain */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.05, 0]}>
              <planeGeometry args={[MAP_WIDTH + 100, MAP_DEPTH + 100]} />
              <meshStandardMaterial color="#86efac" roughness={0.9} /> {/* Light grassy underlying plain */}
            </mesh>

            {/* Placed Elements */}
            <group position={[0, 0, 0]}>
              {renderPolygons}
              {renderBuildings}
            </group>

            <DroneCameraController />
          </Suspense>
        </Canvas>
        <Loader />
      </div>

      {/* Floating Header UI */}
      <div className="absolute top-6 left-6 flex items-center gap-4 z-10 pointer-events-auto">
        <button 
          onClick={onExit3D}
          className="flex items-center gap-2 bg-white/90 backdrop-blur-md text-gray-800 px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Map
        </button>
        <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-gray-200">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">{data.project.name}</h2>
          <p className="text-xs font-bold text-gray-500 uppercase">3D Township Flyover</p>
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
        </div>
      </div>
    </div>
  );
}
