import React from 'react';
import type { LayoutPolygon } from '@/types/developer';
import { POLYGON_TYPE_COLORS, UNIT_STATUS_COLORS } from '@/types/developer';

interface PolygonRendererProps {
  polygon: LayoutPolygon;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: (polygon: LayoutPolygon) => void;
  onMouseEnter?: (polygon: LayoutPolygon, e: React.MouseEvent) => void;
  onMouseLeave?: (polygon: LayoutPolygon, e: React.MouseEvent) => void;
  viewportWidth: number;
  viewportHeight: number;
}

export default function PolygonRenderer({
  polygon,
  isSelected = false,
  isHovered = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  viewportWidth,
  viewportHeight,
}: PolygonRendererProps) {
  // Convert normalized [0,1] coordinates to absolute viewport pixels
  const points = polygon.coordinates
    .map(([x, y]) => `${x * viewportWidth},${y * viewportHeight}`)
    .join(' ');

  // Determine fill color
  let fill = polygon.style?.fill || POLYGON_TYPE_COLORS[polygon.polygon_type] || POLYGON_TYPE_COLORS.OTHER;
  
  if (polygon.polygon_type === 'PLOT' || polygon.polygon_type === 'BUILDING_FOOTPRINT') {
    if (polygon.unit_status) {
      fill = UNIT_STATUS_COLORS[polygon.unit_status] || fill;
    }
  }

  // Determine stroke color
  let stroke = polygon.style?.stroke || 'rgba(0,0,0,0.1)';
  let strokeWidth = polygon.style?.strokeWidth || 1;
  let opacity = polygon.style?.opacity || 0.8;

  if (isSelected) {
    stroke = '#000000';
    strokeWidth = 3;
    opacity = 1;
  } else if (isHovered) {
    stroke = '#333333';
    strokeWidth = 2;
    opacity = 0.9;
  }

  const isInteractive = !!polygon.linked_unit_id || !!polygon.linked_building_id || polygon.polygon_type === 'PLOT';

  return (
    <polygon
      points={points}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fillOpacity={opacity}
      className={`transition-all duration-200 ${isInteractive ? 'cursor-pointer hover:brightness-110' : ''}`}
      onClick={() => isInteractive && onClick && onClick(polygon)}
      onMouseEnter={(e) => onMouseEnter && onMouseEnter(polygon, e)}
      onMouseLeave={(e) => onMouseLeave && onMouseLeave(polygon, e)}
      data-id={polygon.id}
      data-type={polygon.polygon_type}
    />
  );
}
