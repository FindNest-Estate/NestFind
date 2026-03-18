"""
Duplicate Address Detector — Detects listings that appear to be duplicate properties.

Checks:
  1. Address text similarity using pg_trgm (with word-overlap fallback)
  2. GPS proximity within ~50m (0.0005 degrees)
"""
import logging
import re
from typing import List, Dict, Any
from uuid import UUID
import asyncpg

from .base import FraudDetector, FraudSignal

logger = logging.getLogger(__name__)

# pg_trgm similarity threshold for exact match
HIGH_SIMILARITY_THRESHOLD = 0.85
# Combined: GPS within 50m AND address similarity > this
GPS_PLUS_SIMILARITY_THRESHOLD = 0.50
# ~50 meters in degrees (very approximate)
GPS_PROXIMITY_DEGREES = 0.0005


def _word_overlap_similarity(a: str, b: str) -> float:
    """Fallback similarity if pg_trgm extension not available."""
    a_clean = re.sub(r'[^a-z0-9\s]', '', a.lower())
    b_clean = re.sub(r'[^a-z0-9\s]', '', b.lower())
    words_a = set(a_clean.split())
    words_b = set(b_clean.split())
    if not words_a or not words_b:
        return 0.0
    common = words_a & words_b
    union = words_a | words_b
    return len(common) / len(union)


class DuplicateAddressDetector(FraudDetector):
    """Detects duplicate or near-duplicate property listings."""

    @property
    def signal_type(self) -> str:
        return "DUPLICATE_ADDRESS"

    @property
    def default_severity(self) -> str:
        return "HIGH"

    async def detect(self, conn: asyncpg.Connection, context: Dict[str, Any]) -> List[FraudSignal]:
        property_id = context.get("property_id")
        address = context.get("address", "")
        city = context.get("city", "")
        latitude = context.get("latitude")
        longitude = context.get("longitude")

        if not property_id:
            return []

        signals: List[FraudSignal] = []
        detected_pairs: set = set()

        # ─── Try pg_trgm address similarity ──────────────────────────────────
        try:
            # Test if pg_trgm is available
            await conn.fetchval("SELECT similarity('test', 'test')")
            use_trgm = True
        except Exception:
            use_trgm = False

        try:
            if use_trgm and address:
                rows = await conn.fetch(
                    """
                    SELECT id, address, city,
                           similarity(address, $1) AS sim
                    FROM properties
                    WHERE city = $2
                      AND status NOT IN ('DELETED', 'SOLD')
                      AND deleted_at IS NULL
                      AND id != $3
                    ORDER BY sim DESC
                    LIMIT 15
                    """,
                    address, city, property_id,
                )
                for row in rows:
                    sim = float(row["sim"])
                    if sim > HIGH_SIMILARITY_THRESHOLD:
                        matched_id = row["id"]
                        pair = (min(property_id, matched_id), max(property_id, matched_id))
                        if pair not in detected_pairs:
                            detected_pairs.add(pair)
                            # Record in duplicate_property_detection
                            try:
                                await conn.execute(
                                    """
                                    INSERT INTO duplicate_property_detection
                                        (property_id, matched_property_id, similarity_score, detection_method)
                                    VALUES ($1, $2, $3, 'ADDRESS_MATCH')
                                    ON CONFLICT (property_id, matched_property_id) DO NOTHING
                                    """,
                                    property_id, matched_id, sim,
                                )
                            except Exception:
                                pass
                            signals.append(FraudSignal(
                                signal_type=self.signal_type,
                                severity="HIGH",
                                property_id=property_id,
                                description=f"Address is {sim*100:.0f}% similar to property {matched_id}.",
                                detected_by="SYSTEM",
                                detector_name=self.__class__.__name__,
                                metadata={"matched_property_id": str(matched_id), "similarity": sim},
                            ))
            else:
                # Word-overlap fallback
                rows = await conn.fetch(
                    """
                    SELECT id, address FROM properties
                    WHERE city = $1
                      AND status NOT IN ('DELETED', 'SOLD')
                      AND deleted_at IS NULL
                      AND id != $2
                      AND address IS NOT NULL
                    LIMIT 50
                    """,
                    city, property_id,
                )
                for row in rows:
                    sim = _word_overlap_similarity(address, row["address"] or "")
                    matched_id = row["id"]
                    if sim > HIGH_SIMILARITY_THRESHOLD:
                        pair = (min(property_id, matched_id), max(property_id, matched_id))
                        if pair not in detected_pairs:
                            detected_pairs.add(pair)
                            signals.append(FraudSignal(
                                signal_type=self.signal_type,
                                severity="HIGH",
                                property_id=property_id,
                                description=f"Address word overlap {sim*100:.0f}% with property {matched_id}.",
                                detected_by="SYSTEM",
                                detector_name=self.__class__.__name__,
                                metadata={"matched_property_id": str(matched_id), "similarity": sim},
                            ))
        except Exception as e:
            logger.warning(f"[DuplicateAddressDetector] Address similarity check failed: {e}")

        # ─── GPS proximity check ──────────────────────────────────────────────
        if latitude and longitude:
            try:
                gps_rows = await conn.fetch(
                    """
                    SELECT id, address,
                           ABS(latitude - $1) AS lat_diff,
                           ABS(longitude - $2) AS lon_diff
                    FROM properties
                    WHERE city = $3
                      AND status NOT IN ('DELETED', 'SOLD')
                      AND deleted_at IS NULL
                      AND id != $4
                      AND latitude IS NOT NULL AND longitude IS NOT NULL
                      AND ABS(latitude - $1) < $5
                      AND ABS(longitude - $2) < $5
                    """,
                    latitude, longitude, city, property_id, GPS_PROXIMITY_DEGREES,
                )
                for row in gps_rows:
                    matched_id = row["id"]
                    # Also check address similarity for this GPS-close property
                    matched_addr = row["address"] or ""
                    if use_trgm and address:
                        sim = await conn.fetchval(
                            "SELECT similarity($1, $2)", address, matched_addr
                        )
                    else:
                        sim = _word_overlap_similarity(address, matched_addr)

                    sim = float(sim) if sim is not None else 0.0
                    if sim > GPS_PLUS_SIMILARITY_THRESHOLD:
                        pair = (min(property_id, matched_id), max(property_id, matched_id))
                        if pair not in detected_pairs:
                            detected_pairs.add(pair)
                            try:
                                await conn.execute(
                                    """
                                    INSERT INTO duplicate_property_detection
                                        (property_id, matched_property_id, similarity_score, detection_method)
                                    VALUES ($1, $2, $3, 'GPS_MATCH')
                                    ON CONFLICT (property_id, matched_property_id) DO NOTHING
                                    """,
                                    property_id, matched_id, sim,
                                )
                            except Exception:
                                pass
                            signals.append(FraudSignal(
                                signal_type=self.signal_type,
                                severity="HIGH",
                                property_id=property_id,
                                description=f"Property GPS within 50m of {matched_id} (also {sim*100:.0f}% address match).",
                                detected_by="SYSTEM",
                                detector_name=self.__class__.__name__,
                                metadata={
                                    "matched_property_id": str(matched_id),
                                    "similarity": sim,
                                    "detection_method": "GPS_PLUS_ADDRESS",
                                },
                            ))
            except Exception as e:
                logger.warning(f"[DuplicateAddressDetector] GPS proximity check failed: {e}")

        return signals
