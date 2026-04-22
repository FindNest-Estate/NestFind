"""
SVG Parser Service — Extracts polygons from SVG files.
Parses <rect>, <polygon>, <polyline>, <circle>, <path> elements
and converts them to normalized coordinate arrays for storage.
"""
import re
import xml.etree.ElementTree as ET
from typing import List, Optional, Tuple


class SVGParserService:
    """Parse SVG files and extract geometry as normalized polygon data."""

    # Layer name to polygon type mapping
    TYPE_MAPPING = {
        "plot": "PLOT", "plots": "PLOT", "unit": "PLOT", "units": "PLOT",
        "road": "ROAD", "roads": "ROAD", "street": "ROAD",
        "park": "PARK", "parks": "PARK", "garden": "PARK", "green": "PARK",
        "amenity": "AMENITY", "amenities": "AMENITY",
        "boundary": "BOUNDARY", "border": "BOUNDARY",
        "building": "BUILDING_FOOTPRINT", "tower": "BUILDING_FOOTPRINT",
        "club": "CLUBHOUSE", "clubhouse": "CLUBHOUSE",
        "parking": "PARKING", "water": "WATER_BODY",
    }

    def parse(self, svg_content: str) -> List[dict]:
        """
        Parse SVG content and return a list of polygon dicts.
        Each polygon has: polygon_type, label, coordinates, style, layer_name
        """
        # Remove namespace for easier parsing
        svg_content = re.sub(r'\sxmlns="[^"]+"', '', svg_content)
        root = ET.fromstring(svg_content)

        # Determine SVG viewBox for normalization
        viewbox = root.get("viewBox")
        if viewbox:
            parts = viewbox.split()
            vb_x, vb_y, vb_w, vb_h = float(parts[0]), float(parts[1]), float(parts[2]), float(parts[3])
        else:
            vb_w = float(root.get("width", "1000").replace("px", "").replace("pt", ""))
            vb_h = float(root.get("height", "1000").replace("px", "").replace("pt", ""))
            vb_x, vb_y = 0, 0

        polygons = []
        self._extract_elements(root, polygons, vb_x, vb_y, vb_w, vb_h, layer_name=None)
        return polygons

    def _extract_elements(self, element, polygons: List[dict], vb_x, vb_y, vb_w, vb_h, layer_name: Optional[str]):
        """Recursively extract elements from SVG."""
        tag = element.tag.split("}")[-1] if "}" in element.tag else element.tag

        # Groups can be layers
        if tag == "g":
            group_id = element.get("id", "")
            group_label = element.get("inkscape:label", group_id)
            current_layer = group_label or layer_name

        else:
            current_layer = layer_name

        # Process shape elements
        coords = None
        label = element.get("id") or element.get("data-label")
        style = self._parse_style(element)

        if tag == "rect":
            coords = self._parse_rect(element, vb_x, vb_y, vb_w, vb_h)
        elif tag == "polygon":
            coords = self._parse_polygon(element, vb_x, vb_y, vb_w, vb_h)
        elif tag == "polyline":
            coords = self._parse_polygon(element, vb_x, vb_y, vb_w, vb_h)
        elif tag == "circle" or tag == "ellipse":
            coords = self._parse_circle(element, vb_x, vb_y, vb_w, vb_h)
        elif tag == "path":
            coords = self._parse_path(element, vb_x, vb_y, vb_w, vb_h)

        if coords and len(coords) >= 3:
            poly_type = self._infer_type(current_layer, label, element)
            polygons.append({
                "polygon_type": poly_type,
                "label": label,
                "layer_name": current_layer,
                "coordinates": coords,
                "style": style,
                "area_sqft": self._calculate_area(coords),
                "metadata": {"source": "svg_import"},
            })

        # Recurse into children
        for child in element:
            self._extract_elements(child, polygons, vb_x, vb_y, vb_w, vb_h,
                                   current_layer if tag == "g" else layer_name)

    def _normalize(self, x: float, y: float, vb_x, vb_y, vb_w, vb_h) -> Tuple[float, float]:
        """Convert absolute SVG coordinates to normalized 0-1 range."""
        nx = (x - vb_x) / vb_w if vb_w > 0 else 0
        ny = (y - vb_y) / vb_h if vb_h > 0 else 0
        return round(max(0, min(1, nx)), 6), round(max(0, min(1, ny)), 6)

    def _parse_rect(self, el, vb_x, vb_y, vb_w, vb_h) -> List[List[float]]:
        x = float(el.get("x", 0))
        y = float(el.get("y", 0))
        w = float(el.get("width", 0))
        h = float(el.get("height", 0))
        if w <= 0 or h <= 0:
            return []
        corners = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
        return [list(self._normalize(cx, cy, vb_x, vb_y, vb_w, vb_h)) for cx, cy in corners]

    def _parse_polygon(self, el, vb_x, vb_y, vb_w, vb_h) -> List[List[float]]:
        points_str = el.get("points", "")
        if not points_str:
            return []
        pairs = re.findall(r'([\d.eE+-]+)[,\s]+([\d.eE+-]+)', points_str)
        return [list(self._normalize(float(x), float(y), vb_x, vb_y, vb_w, vb_h)) for x, y in pairs]

    def _parse_circle(self, el, vb_x, vb_y, vb_w, vb_h, segments: int = 12) -> List[List[float]]:
        import math
        cx = float(el.get("cx", 0))
        cy = float(el.get("cy", 0))
        r = float(el.get("r", el.get("rx", 5)))
        coords = []
        for i in range(segments):
            angle = 2 * math.pi * i / segments
            px = cx + r * math.cos(angle)
            py = cy + r * math.sin(angle)
            coords.append(list(self._normalize(px, py, vb_x, vb_y, vb_w, vb_h)))
        return coords

    def _parse_path(self, el, vb_x, vb_y, vb_w, vb_h) -> List[List[float]]:
        """Basic path parser — handles M, L, H, V, Z commands (absolute only)."""
        d = el.get("d", "")
        if not d:
            return []
        coords = []
        commands = re.findall(r'([MLHVZmlhvz])\s*([\d.eE+\-,\s]*)', d)
        cx, cy = 0, 0
        for cmd, args_str in commands:
            nums = [float(n) for n in re.findall(r'[\d.eE+-]+', args_str)]
            if cmd == 'M' and len(nums) >= 2:
                cx, cy = nums[0], nums[1]
                coords.append(list(self._normalize(cx, cy, vb_x, vb_y, vb_w, vb_h)))
                # Process remaining as L
                for i in range(2, len(nums) - 1, 2):
                    cx, cy = nums[i], nums[i + 1]
                    coords.append(list(self._normalize(cx, cy, vb_x, vb_y, vb_w, vb_h)))
            elif cmd == 'L':
                for i in range(0, len(nums) - 1, 2):
                    cx, cy = nums[i], nums[i + 1]
                    coords.append(list(self._normalize(cx, cy, vb_x, vb_y, vb_w, vb_h)))
            elif cmd == 'H' and nums:
                cx = nums[0]
                coords.append(list(self._normalize(cx, cy, vb_x, vb_y, vb_w, vb_h)))
            elif cmd == 'V' and nums:
                cy = nums[0]
                coords.append(list(self._normalize(cx, cy, vb_x, vb_y, vb_w, vb_h)))
            elif cmd in ('Z', 'z'):
                pass  # Close path
        return coords

    def _parse_style(self, el) -> dict:
        """Extract fill and stroke from element attributes or style string."""
        result = {}
        fill = el.get("fill")
        stroke = el.get("stroke")
        opacity = el.get("opacity")

        style_str = el.get("style", "")
        if style_str:
            for prop in style_str.split(";"):
                prop = prop.strip()
                if prop.startswith("fill:"):
                    fill = prop.split(":")[1].strip()
                elif prop.startswith("stroke:"):
                    stroke = prop.split(":")[1].strip()
                elif prop.startswith("opacity:"):
                    opacity = prop.split(":")[1].strip()

        if fill and fill != "none":
            result["fill"] = fill
        if stroke and stroke != "none":
            result["stroke"] = stroke
        if opacity:
            try:
                result["opacity"] = float(opacity)
            except ValueError:
                pass
        return result

    def _infer_type(self, layer_name: Optional[str], label: Optional[str], element) -> str:
        """Infer polygon type from layer name, ID, or class."""
        # Check layer name
        if layer_name:
            ln = layer_name.lower()
            for key, ptype in self.TYPE_MAPPING.items():
                if key in ln:
                    return ptype

        # Check element ID
        if label:
            ll = label.lower()
            for key, ptype in self.TYPE_MAPPING.items():
                if key in ll:
                    return ptype

        # Check class
        cls = element.get("class", "").lower()
        for key, ptype in self.TYPE_MAPPING.items():
            if key in cls:
                return ptype

        return "OTHER"

    def _calculate_area(self, coords: List[List[float]]) -> Optional[float]:
        """Calculate area using the shoelace formula (in normalized units)."""
        n = len(coords)
        if n < 3:
            return None
        area = 0.0
        for i in range(n):
            j = (i + 1) % n
            area += coords[i][0] * coords[j][1]
            area -= coords[j][0] * coords[i][1]
        return abs(area) / 2.0
