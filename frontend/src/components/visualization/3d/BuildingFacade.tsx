import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { DevBuilding, DevUnit } from '@/types/developer';
import { UNIT_STATUS_COLORS } from '@/types/developer';

interface BuildingFacadeProps {
  building: DevBuilding;
  selectedFloor: number | null;
  onSelectFloor: (floor: number) => void;
  onSelectUnit: (unit: DevUnit) => void;
}

export default function BuildingFacade({
  building,
  selectedFloor,
  onSelectFloor,
  onSelectUnit
}: BuildingFacadeProps) {
  // Building architectural constants
  const FLOOR_HEIGHT = 3.2; // meters
  const UNIT_WIDTH = 5.0; // meters
  const BUILDING_DEPTH = 12.0; // meters

  // Generate the building structural meshes procedurally
  const { floors, totalWidth, totalHeight } = useMemo(() => {
    const numFloors = building.total_floors || 10;
    const unitsPerFloor = building.units_per_floor || 4;
    
    // Sort and map the database floors to actual geometric floors
    const dbFloors = [...(building.floors || [])].sort((a, b) => a.floor_number - b.floor_number);
    
    const calculatedWidth = unitsPerFloor * UNIT_WIDTH;
    const calculatedHeight = numFloors * FLOOR_HEIGHT;

    const generatedFloors = [];
    
    for (let i = 0; i < numFloors; i++) {
      const dbData = dbFloors.find(f => f.floor_number === i);
      const units = dbData?.units || [];
      
      // Ensure we have 'unitsPerFloor' unit mockups if DB doesn't have them
      const floorUnits = [];
      for (let j = 0; j < unitsPerFloor; j++) {
        floorUnits.push({
          mockIndex: j,
          dbUnit: units[j] || null,
          xOffset: -calculatedWidth / 2 + (j * UNIT_WIDTH) + (UNIT_WIDTH / 2),
        });
      }

      generatedFloors.push({
        floorIndex: i,
        yOffset: i * FLOOR_HEIGHT + (FLOOR_HEIGHT / 2),
        units: floorUnits,
        dbData
      });
    }

    return { floors: generatedFloors, totalWidth: calculatedWidth, totalHeight: calculatedHeight };
  }, [building]);

  // Materials
  const concreteMaterial = new THREE.MeshStandardMaterial({ color: '#f3f4f6', roughness: 0.8 });
  const glassMaterial = new THREE.MeshPhysicalMaterial({ 
    color: '#bae6fd', 
    metalness: 0.9, 
    roughness: 0.1, 
    transmission: 0.5, 
    transparent: true 
  });
  const slabMaterial = new THREE.MeshStandardMaterial({ color: '#d1d5db', roughness: 0.9 });

  return (
    <group position={[0, 0, 0]}>
      {/* Base / Foundation */}
      <mesh position={[0, -0.2, 0]} receiveShadow>
        <boxGeometry args={[totalWidth + 1, 0.4, BUILDING_DEPTH + 1]} />
        <meshStandardMaterial color="#374151" />
      </mesh>

      {/* Floors Generation */}
      {floors.map((floor) => {
        // Dim unselected floors
        const isDimmed = selectedFloor !== null && selectedFloor !== floor.floorIndex;
        const opacity = isDimmed ? 0.3 : 1.0;
        const pointerEvents = isDimmed ? 'none' : 'auto';

        const floorConcrete = concreteMaterial.clone();
        floorConcrete.transparent = true;
        floorConcrete.opacity = opacity;

        const floorGlass = glassMaterial.clone();
        floorGlass.transparent = true;
        floorGlass.opacity = isDimmed ? 0.2 : 0.8;

        const pbrSlab = slabMaterial.clone();
        pbrSlab.transparent = true;
        pbrSlab.opacity = opacity;

        return (
          <group 
            key={`floor-${floor.floorIndex}`} 
            position={[0, floor.yOffset, 0]}
            onClick={(e) => {
              if (selectedFloor === null) {
                e.stopPropagation();
                onSelectFloor(floor.floorIndex);
              }
            }}
          >
            {/* Floor Slab */}
            <mesh position={[0, -FLOOR_HEIGHT / 2 + 0.1, 0]} castShadow receiveShadow>
              <boxGeometry args={[totalWidth + 0.4, 0.2, BUILDING_DEPTH + 0.4]} />
              <primitive object={pbrSlab} attach="material" />
            </mesh>

            {/* Core Body Backdrop (Behind the facade) */}
            <mesh position={[0, 0, -1]} castShadow receiveShadow>
              <boxGeometry args={[totalWidth, FLOOR_HEIGHT - 0.2, BUILDING_DEPTH - 2]} />
              <primitive object={floorConcrete} attach="material" />
            </mesh>

            {/* Units Facade Generation */}
            {floor.units.map((unit) => {
              const statusColor = unit.dbUnit?.status 
                ? UNIT_STATUS_COLORS[unit.dbUnit.status as keyof typeof UNIT_STATUS_COLORS] 
                : '#e5e7eb';
                
              const unitColorMat = new THREE.MeshStandardMaterial({ 
                color: statusColor,
                transparent: true,
                opacity: isDimmed ? 0.1 : 0.8,
                emissive: statusColor,
                emissiveIntensity: 0.2
              });

              return (
                <group 
                  key={`u-${floor.floorIndex}-${unit.mockIndex}`} 
                  position={[unit.xOffset, 0, BUILDING_DEPTH / 2 - 1]}
                  onClick={(e) => {
                    if (selectedFloor === floor.floorIndex && unit.dbUnit) {
                      e.stopPropagation();
                      onSelectUnit(unit.dbUnit);
                    }
                  }}
                  onPointerOver={(e) => {
                    if (selectedFloor === floor.floorIndex || selectedFloor === null) {
                      e.stopPropagation();
                      document.body.style.cursor = 'pointer';
                    }
                  }}
                  onPointerOut={(e) => {
                    document.body.style.cursor = 'auto';
                  }}
                >
                  {/* Window/Glass */}
                  <mesh position={[0, 0.2, 0.1]} castShadow receiveShadow>
                    <boxGeometry args={[UNIT_WIDTH - 0.4, FLOOR_HEIGHT - 1.2, 0.2]} />
                    <primitive object={floorGlass} attach="material" />
                  </mesh>

                  {/* Status Overlay Band (Below Window) */}
                  <mesh position={[0, -FLOOR_HEIGHT / 2 + 0.5, 0.15]}>
                    <boxGeometry args={[UNIT_WIDTH - 0.6, 0.6, 0.1]} />
                    <primitive object={unitColorMat} attach="material" />
                  </mesh>
                  
                  {/* HTML Label overlay when zoomed in or selected floor */}
                  {selectedFloor === floor.floorIndex && unit.dbUnit && (
                    <Html position={[0, 0, 0.3]} center className="pointer-events-none">
                      <div className="bg-gray-900/80 backdrop-blur text-white px-2 py-1 rounded text-[10px] font-bold shadow-lg border border-gray-700">
                        {unit.dbUnit.unit_number || `U${unit.mockIndex}`}
                      </div>
                    </Html>
                  )}
                </group>
              );
            })}
            
            {/* Optional Floor Label on the side */}
            <group position={[-totalWidth / 2 - 0.5, 0, BUILDING_DEPTH / 2 - 1.5]}>
              <mesh>
                 <boxGeometry args={[0.1, 1, 1]} />
                 <meshStandardMaterial color="#1f2937" transparent={true} opacity={opacity} />
              </mesh>
              <Html position={[-0.2, 0, 0]} center sprite transform className={`transition-opacity ${isDimmed ? 'opacity-30' : 'opacity-100'}`}>
                <div className="text-white font-black text-xs -rotate-90">
                  {floor.floorIndex === 0 ? building.ground_floor_label || 'G' : `F${floor.floorIndex}`}
                </div>
              </Html>
            </group>

          </group>
        );
      })}
    </group>
  );
}
