"""
GPS Mismatch Detector — Detects when agent verifies a property from far away.

Uses Haversine formula to compute distance between agent GPS coordinates
and registered property coordinates.

Thresholds:
  > 500m  → HIGH signal
  > 2000m → CRITICAL signal
"""
import logging
import math
from typing import List, Dict, Any
from uuid import UUID
import asyncpg

from .base import FraudDetector, FraudSignal

logger = logging.getLogger(__name__)

EARTH_RADIUS_M = 6371000.0
HIGH_THRESHOLD_M    = 500.0    # 500 meters
CRITICAL_THRESHOLD_M = 2000.0  # 2 kilometers


def _haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute distance in meters between two GPS points."""
    r = EARTH_RADIUS_M
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


class GPSMismatchDetector(FraudDetector):
    """Detects agent verification from incorrect location."""

    @property
    def signal_type(self) -> str:
        return "GPS_MISMATCH"

    @property
    def default_severity(self) -> str:
        return "HIGH"

    async def detect(self, conn: asyncpg.Connection, context: Dict[str, Any]) -> List[FraudSignal]:
        property_id = context.get("property_id")
        agent_lat = context.get("agent_latitude") or context.get("agent_lat")
        agent_lng = context.get("agent_longitude") or context.get("agent_lng")

        if not all([property_id, agent_lat, agent_lng]):
            return []

        try:
            prop = await conn.fetchrow(
                "SELECT latitude, longitude FROM properties WHERE id = $1",
                property_id,
            )
        except Exception as e:
            logger.warning(f"[GPSMismatchDetector] Property fetch failed: {e}")
            return []

        if not prop or prop["latitude"] is None or prop["longitude"] is None:
            return []

        distance_m = _haversine_meters(
            float(agent_lat), float(agent_lng),
            float(prop["latitude"]), float(prop["longitude"]),
        )

        if distance_m <= HIGH_THRESHOLD_M:
            return []

        severity = "CRITICAL" if distance_m > CRITICAL_THRESHOLD_M else "HIGH"
        distance_km = distance_m / 1000

        return [FraudSignal(
            signal_type=self.signal_type,
            severity=severity,
            property_id=property_id,
            description=(
                f"Agent verified property from {distance_m:.0f}m ({distance_km:.2f}km) "
                f"away from the listed property location."
            ),
            detected_by="SYSTEM",
            detector_name=self.__class__.__name__,
            metadata={
                "distance_meters": round(distance_m, 1),
                "distance_km": round(distance_km, 3),
                "agent_lat": float(agent_lat),
                "agent_lng": float(agent_lng),
                "property_lat": float(prop["latitude"]),
                "property_lng": float(prop["longitude"]),
            },
        )]
