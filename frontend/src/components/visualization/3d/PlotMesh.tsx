import React, { useMemo } from 'react';
import * as THREE from 'three';
import { LayoutPolygon } from '@/types/developer';
import { UNIT_STATUS_COLORS } from '@/types/developer';
import { Html } from '@react-three/drei';

interface PlotMeshProps {
  polygon: LayoutPolygon;
  mapWidth: number;
  mapDepth: number;
  onClick: (polygon: LayoutPolygon) => void;
  isDimmed: boolean;
}

export default function PlotMesh({ polygon, mapWidth, mapDepth, onClick, isDimmed }: PlotMeshProps) {
  
  // Calculate the 3D geometry from 2D relative polygon coordinates
  const geometry = useMemo(() => {
    if (!polygon.coordinates || polygon.coordinates.length < 3) return null;
    
    // Create a generic 2D shape in Three.JS
    const shape = new THREE.Shape();
    polygon.coordinates.forEach((point, index) => {
      // Convert normalized 0.0-1.0 coordinate to scaled 3D coordinate
      // Coordinate System: Center of map is (0,0)
      const x = (point[0] - 0.5) * mapWidth;
      const z = (point[1] - 0.5) * mapDepth; // Z acts as 2D Y because Three.js Y is "Up"
      
      if (index === 0) {
        shape.moveTo(x, z);
      } else {
        shape.lineTo(x, z);
      }
    });

    // Extrude the 2D shape into a 3D plot
    // Z in extrusion becomes Y in space, so we flip it in the mesh rotation
    const extrudeSettings = {
      depth: 0.2, // Very thin height for the land plot
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.1,
      bevelThickness: 0.1
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [polygon, mapWidth, mapDepth]);

  if (!geometry) return null;

  const statusColor = polygon.status 
    ? UNIT_STATUS_COLORS[polygon.status as keyof typeof UNIT_STATUS_COLORS] 
    : '#e5e7eb';

  // Calculate approximate center for placing a label
  const centerPos = useMemo(() => {
    if (!polygon.coordinates || polygon.coordinates.length < 3) return [0, 0, 0] as const;
    const xSum = polygon.coordinates.reduce((sum, p) => sum + p[0], 0);
    const ySum = polygon.coordinates.reduce((sum, p) => sum + p[1], 0);
    return [
      (xSum / polygon.coordinates.length - 0.5) * mapWidth,
      0.3, // Float slightly above the plot
      (ySum / polygon.coordinates.length - 0.5) * mapDepth
    ] as const;
  }, [polygon, mapWidth, mapDepth]);

  return (
    <group>
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} // Rotate to lay flat on the X/Z terrain bounds
        receiveShadow
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          onClick(polygon);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial 
          color={statusColor} 
          transparent={true}
          opacity={isDimmed ? 0.3 : 0.8}
          roughness={0.9} 
          metalness={0.1} 
        />
      </mesh>
      
      {/* HTML Label Floating Above The Plot */}
      {!isDimmed && polygon.label && (
        <Html position={centerPos as any} center className="pointer-events-none z-0 hover:z-50">
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm rounded px-1.5 py-0.5 text-[8px] font-bold text-gray-800 whitespace-nowrap">
            {polygon.label}
          </div>
        </Html>
      )}
    </group>
  );
}
