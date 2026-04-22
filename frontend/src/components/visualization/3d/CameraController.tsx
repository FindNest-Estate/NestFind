import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';

interface CameraControllerProps {
  selectedFloor: number | null;
  buildingHeight: number;
}

export default function CameraController({ selectedFloor, buildingHeight }: CameraControllerProps) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  // Target coordinates for smooth animation
  const targetLookAt = useRef(new THREE.Vector3(0, buildingHeight / 2, 0));
  const targetPosition = useRef(new THREE.Vector3(0, buildingHeight / 2, 35));

  useEffect(() => {
    if (selectedFloor !== null) {
      // Zoom into specific floor
      const yPos = selectedFloor * 3.2 + 1.6; // assuming FLOOR_HEIGHT = 3.2
      targetLookAt.current.set(0, yPos, 0);
      targetPosition.current.set(0, yPos + 2, 15); // Zoomed in closer
    } else {
      // Full building view
      targetLookAt.current.set(0, buildingHeight / 2, 0);
      targetPosition.current.set(0, buildingHeight / 2, Math.max(30, buildingHeight * 1.5));
    }
  }, [selectedFloor, buildingHeight]);

  useFrame((state, delta) => {
    if (!controlsRef.current) return;
    
    // Smoothly interpolate camera position and lookAt target
    camera.position.lerp(targetPosition.current, 0.05);
    controlsRef.current.target.lerp(targetLookAt.current, 0.05);
    controlsRef.current.update();
  });

  return (
    <OrbitControls 
      ref={controlsRef} 
      enablePan={true}
      enableZoom={true}
      maxPolarAngle={Math.PI / 2 + 0.1} // Prevent going too far below ground
      minDistance={5}
      maxDistance={100}
      makeDefault
    />
  );
}
