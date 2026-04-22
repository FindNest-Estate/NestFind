import React, { useState, useRef, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { MasterPlanData, LayoutPolygon } from '@/types/developer';
import PolygonRenderer from './PolygonRenderer';
import ViewControls from './ViewControls';
import StatusLegend from './StatusLegend';
import UnitDetailsPanel from './UnitDetailsPanel';

interface MasterPlanViewerProps {
  data: MasterPlanData;
  onBuildingSelect?: (buildingId: string) => void;
}

export default function MasterPlanViewer({ data, onBuildingSelect }: MasterPlanViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 1000, height: 700 });
  const [selectedPolygon, setSelectedPolygon] = useState<LayoutPolygon | null>(null);
  const [hoveredPolygon, setHoveredPolygon] = useState<LayoutPolygon | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Update viewport size based on container to maintain aspect ratio
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        // Maintain a rough 16:9 or custom ratio if available
        const ratio = (data.viewport?.height || 700) / (data.viewport?.width || 1000);
        setViewportSize({ width, height: width * ratio });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [data.viewport]);

  const handlePolygonClick = (polygon: LayoutPolygon) => {
    setSelectedPolygon(polygon);
    if (polygon.polygon_type === 'BUILDING_FOOTPRINT' && polygon.linked_building_id && onBuildingSelect) {
      onBuildingSelect(polygon.linked_building_id);
    }
  };

  const handlePolygonMouseEnter = (polygon: LayoutPolygon, e: React.MouseEvent) => {
    setHoveredPolygon(polygon);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handlePolygonMouseLeave = () => {
    setHoveredPolygon(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (hoveredPolygon) {
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-[#eef2f6]" ref={containerRef} onMouseMove={handleMouseMove}>
      
      {/* Zoom and Pan Controls */}
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={4}
        centerOnInit
        wheel={{ step: 0.1 }}
      >
        <div className="relative w-full h-full">
          <ViewControls />
          <StatusLegend />

          <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
            <div 
              className="relative shadow-2xl bg-white"
              style={{
                width: viewportSize.width,
                height: viewportSize.height,
                backgroundColor: data.viewport?.background_color || '#ffffff'
              }}
            >
              {/* Background Map Image */}
              {data.master_plan_image && (
                <img 
                  src={data.master_plan_image} 
                  alt={data.project.name} 
                  className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                />
              )}

              {/* Polygons SVG Overlay */}
              <svg 
                width="100%" 
                height="100%" 
                className="absolute inset-0 z-10"
                style={{ pointerEvents: 'auto' }}
              >
                {data.polygons.map((polygon) => (
                  <PolygonRenderer
                    key={polygon.id}
                    polygon={polygon}
                    viewportWidth={viewportSize.width}
                    viewportHeight={viewportSize.height}
                    isSelected={selectedPolygon?.id === polygon.id}
                    isHovered={hoveredPolygon?.id === polygon.id}
                    onClick={handlePolygonClick}
                    onMouseEnter={handlePolygonMouseEnter}
                    onMouseLeave={handlePolygonMouseLeave}
                  />
                ))}
              </svg>
            </div>
          </TransformComponent>
        </div>
      </TransformWrapper>

      {/* Hover Tooltip */}
      {hoveredPolygon && hoveredPolygon.label && !selectedPolygon && (
        <div 
          className="fixed z-50 pointer-events-none bg-gray-900 text-white text-sm font-semibold py-1.5 px-3 rounded-lg shadow-xl"
          style={{ 
            left: tooltipPos.x + 15, 
            top: tooltipPos.y + 15,
            transform: 'translate(0, 0)'
          }}
        >
          {hoveredPolygon.label}
          {hoveredPolygon.unit_status && (
            <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs uppercase">
              {hoveredPolygon.unit_status}
            </span>
          )}
        </div>
      )}

      {/* Unit Details Sidebar */}
      <UnitDetailsPanel 
        projectId={data.project.id}
        unitId={selectedPolygon?.linked_unit_id || null}
        onClose={() => setSelectedPolygon(null)}
      />

    </div>
  );
}
