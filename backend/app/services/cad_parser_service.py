"""
CAD Parser Service — Extracts polygons from DXF files.
Uses the ezdxf library to parse LWPOLYLINE, POLYLINE, CIRCLE,
TEXT and MTEXT entities from AutoCAD DXF exports.
"""
import io
from typing import List, Optional, Tuple


class CADParserService:
    """Parse DXF files and extract geometry as normalized polygon data."""

    # Layer name to polygon type mapping
    TYPE_MAPPING = {
        "plot": "PLOT", "plots": "PLOT", "lot": "PLOT", "lots": "PLOT",
        "road": "ROAD", "roads": "ROAD", "street": "ROAD", "path": "ROAD",
        "park": "PARK", "parks": "PARK", "garden": "PARK", "green": "PARK",
        "amenity": "AMENITY", "amen": "AMENITY",
        "boundary": "BOUNDARY", "border": "BOUNDARY", "site": "BOUNDARY",
        "building": "BUILDING_FOOTPRINT", "tower": "BUILDING_FOOTPRINT", "block": "BUILDING_FOOTPRINT",
        "club": "CLUBHOUSE", "clubhouse": "CLUBHOUSE",
        "parking": "PARKING", "water": "WATER_BODY", "lake": "WATER_BODY",
    }

    def parse_dxf(self, content: bytes) -> List[dict]:
        """
        Parse DXF content and return normalized polygon data.
        Returns: List of {polygon_type, label, coordinates, layer_name, ...}
        """
        try:
            import ezdxf
        except ImportError:
            raise ImportError("ezdxf not installed. Run: pip install ezdxf")

        # Read DXF from bytes
        doc = ezdxf.read(io.BytesIO(content))
        msp = doc.modelspace()

        # Collect all entities and determine bounding box
        raw_entities = []
        all_points = []

        for entity in msp:
            dxf_type = entity.dxftype()
            layer = entity.dxf.layer if hasattr(entity.dxf, "layer") else ""

            if dxf_type in ("LWPOLYLINE",):
                points = list(entity.get_points(format="xy"))
                if len(points) >= 3:
                    raw_entities.append({
                        "type": "polygon",
                        "layer": layer,
                        "points": points,
                        "closed": entity.closed,
                    })
                    all_points.extend(points)

            elif dxf_type == "POLYLINE":
                points = [(v.dxf.location.x, v.dxf.location.y) for v in entity.vertices]
                if len(points) >= 3:
                    raw_entities.append({
                        "type": "polygon",
                        "layer": layer,
                        "points": points,
                        "closed": entity.is_closed,
                    })
                    all_points.extend(points)

            elif dxf_type == "LINE":
                start = (entity.dxf.start.x, entity.dxf.start.y)
                end = (entity.dxf.end.x, entity.dxf.end.y)
                raw_entities.append({
                    "type": "line",
                    "layer": layer,
                    "points": [start, end],
                })
                all_points.extend([start, end])

            elif dxf_type == "CIRCLE":
                cx, cy = entity.dxf.center.x, entity.dxf.center.y
                r = entity.dxf.radius
                import math
                pts = [(cx + r * math.cos(2 * math.pi * i / 16),
                        cy + r * math.sin(2 * math.pi * i / 16))
                       for i in range(16)]
                raw_entities.append({
                    "type": "polygon",
                    "layer": layer,
                    "points": pts,
                    "closed": True,
                })
                all_points.extend(pts)

            elif dxf_type in ("TEXT", "MTEXT"):
                text = entity.dxf.text if dxf_type == "TEXT" else entity.text
                insert = entity.dxf.insert if hasattr(entity.dxf, "insert") else None
                if insert and text:
                    raw_entities.append({
                        "type": "text",
                        "layer": layer,
                        "text": text.strip(),
                        "position": (insert.x, insert.y),
                    })
                    all_points.append((insert.x, insert.y))

        if not all_points:
            return []

        # Calculate bounding box for normalization
        min_x = min(p[0] for p in all_points)
        max_x = max(p[0] for p in all_points)
        min_y = min(p[1] for p in all_points)
        max_y = max(p[1] for p in all_points)
        range_x = max_x - min_x if max_x != min_x else 1
        range_y = max_y - min_y if max_y != min_y else 1

        # Separate polygons and text labels
        polygons_raw = [e for e in raw_entities if e["type"] == "polygon"]
        texts = [e for e in raw_entities if e["type"] == "text"]

        # Try to associate text labels with nearest polygon
        label_map = {}
        for text_entity in texts:
            tx, ty = text_entity["position"]
            best_poly_idx = None
            best_dist = float("inf")
            for i, poly in enumerate(polygons_raw):
                # Centroid of polygon
                cx = sum(p[0] for p in poly["points"]) / len(poly["points"])
                cy = sum(p[1] for p in poly["points"]) / len(poly["points"])
                dist = (tx - cx) ** 2 + (ty - cy) ** 2
                if dist < best_dist:
                    best_dist = dist
                    best_poly_idx = i
            if best_poly_idx is not None:
                label_map[best_poly_idx] = text_entity["text"]

        # Build normalized polygons
        result = []
        for i, poly in enumerate(polygons_raw):
            coords = [
                [
                    round((p[0] - min_x) / range_x, 6),
                    round(1.0 - (p[1] - min_y) / range_y, 6)  # Flip Y (CAD has Y-up, screen has Y-down)
                ]
                for p in poly["points"]
            ]

            label = label_map.get(i)
            polygon_type = self._infer_type(poly["layer"], label)

            # Calculate area in normalized units
            area = self._shoelace_area(coords)

            result.append({
                "polygon_type": polygon_type,
                "label": label,
                "layer_name": poly["layer"],
                "coordinates": coords,
                "style": {},
                "area_sqft": area,
                "metadata": {"source": "dxf_import", "layer": poly["layer"], "closed": poly.get("closed", True)},
            })

        return result

    def _infer_type(self, layer_name: str, label: Optional[str]) -> str:
        """Infer polygon type from CAD layer name."""
        if layer_name:
            ln = layer_name.lower()
            for key, ptype in self.TYPE_MAPPING.items():
                if key in ln:
                    return ptype

        if label:
            ll = label.lower()
            if ll.startswith("p") and any(c.isdigit() for c in ll):
                return "PLOT"
            for key, ptype in self.TYPE_MAPPING.items():
                if key in ll:
                    return ptype

        return "OTHER"

    def _shoelace_area(self, coords: List[List[float]]) -> Optional[float]:
        """Calculate polygon area using shoelace formula."""
        n = len(coords)
        if n < 3:
            return None
        area = 0.0
        for i in range(n):
            j = (i + 1) % n
            area += coords[i][0] * coords[j][1]
            area -= coords[j][0] * coords[i][1]
        return abs(area) / 2.0
