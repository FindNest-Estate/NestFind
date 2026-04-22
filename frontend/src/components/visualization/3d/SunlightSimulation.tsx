import React, { useMemo } from 'react';
import * as THREE from 'three';
import SunCalc from 'suncalc';

interface SunlightSimulationProps {
  timeOfDay: number; // 0 to 24 (hours)
  latitude?: number;
  longitude?: number;
}

export default function SunlightSimulation({ 
  timeOfDay, 
  latitude = 17.3850, // Default to Hyderabad, India for realism
  longitude = 78.4867 
}: SunlightSimulationProps) {
  
  // Calculate sun position vector based on SunCalc
  const sunPosition = useMemo(() => {
    const date = new Date();
    // Reset date to today at 00:00:00
    date.setHours(0, 0, 0, 0);
    // Add the timeOfDay in milliseconds
    date.setMilliseconds(timeOfDay * 60 * 60 * 1000);

    const sunPos = SunCalc.getPosition(date, latitude, longitude);
    
    // Altitude is the vertical angle, Azimuth is the horizontal angle
    // Convert to cartesian coordinates for THREE.js light vector (radius = 100)
    const radius = 100;
    
    // Map astronomical coordinates to WebGL coordinates
    // Three.js Y is up. SunCalc Altitude is angle above horizon.
    // 0 azimuth in SunCalc = South.
    const x = radius * Math.cos(sunPos.altitude) * Math.sin(sunPos.azimuth);
    const y = radius * Math.sin(sunPos.altitude);
    const z = -radius * Math.cos(sunPos.altitude) * Math.cos(sunPos.azimuth);

    return new THREE.Vector3(x, Math.max(y, -10), z); // Keep Y slightly bounded to avoid total darkness when sun sets
  }, [timeOfDay, latitude, longitude]);

  // If it's night time (sun below horizon), lower intensity drastically
  const hours = timeOfDay;
  const isNight = hours < 6 || hours > 18.5;
  const intensity = isNight ? 0.2 : 2.5;

  return (
    <>
      <ambientLight intensity={isNight ? 0.3 : 0.8} color={isNight ? "#4B61B6" : "#ffffff"} />
      
      {/* Main realistic sun light casting shadow */}
      <directionalLight
        position={sunPosition}
        intensity={intensity}
        castShadow
        color={isNight ? "#829fd9" : "#fffaed"}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.001}
      />
      
      {/* Fill lights to soften harsh shadows */}
      {!isNight && (
        <directionalLight 
          position={[-sunPosition.x * 0.5, sunPosition.y * 0.8, -sunPosition.z * 0.5]} 
          intensity={0.4} 
        />
      )}
    </>
  );
}
