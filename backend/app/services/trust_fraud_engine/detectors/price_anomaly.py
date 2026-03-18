"""
Price Anomaly Detector — Flags properties priced significantly outside city norms.

Uses z-score analysis of price_per_sqft within city + property type.
Requires at least 5 comparable properties to compute statistics.
"""
import logging
from typing import List, Dict, Any
from uuid import UUID
import asyncpg

from .base import FraudDetector, FraudSignal

logger = logging.getLogger(__name__)

Z_SCORE_MEDIUM = 3.0
Z_SCORE_HIGH   = 5.0
MIN_SAMPLE_SIZE = 5


class PriceAnomalyDetector(FraudDetector):
    """Detects statistically anomalous property prices."""

    @property
    def signal_type(self) -> str:
        return "PRICE_ANOMALY"

    @property
    def default_severity(self) -> str:
        return "MEDIUM"

    async def detect(self, conn: asyncpg.Connection, context: Dict[str, Any]) -> List[FraudSignal]:
        property_id = context.get("property_id")
        price = context.get("price")
        area_sqft = context.get("area_sqft")
        city = context.get("city")
        property_type = context.get("property_type") or context.get("type")

        if not all([property_id, price, area_sqft, city]):
            return []
        if float(area_sqft) <= 0:
            return []

        price_per_sqft = float(price) / float(area_sqft)

        try:
            stats = await conn.fetchrow(
                """
                SELECT
                    AVG(price / NULLIF(area_sqft, 0))    AS mean_ppsf,
                    STDDEV(price / NULLIF(area_sqft, 0)) AS stddev_ppsf,
                    COUNT(*)                             AS sample_size
                FROM properties
                WHERE city = $1
                  AND type::text = $2
                  AND status NOT IN ('DELETED')
                  AND deleted_at IS NULL
                  AND area_sqft > 0
                  AND id != $3
                """,
                city, str(property_type), property_id,
            )
        except Exception as e:
            logger.warning(f"[PriceAnomalyDetector] Stats query failed: {e}")
            return []

        if not stats or not stats["sample_size"] or int(stats["sample_size"]) < MIN_SAMPLE_SIZE:
            return []

        mean = float(stats["mean_ppsf"])
        stddev = float(stats["stddev_ppsf"]) if stats["stddev_ppsf"] else 0.0

        if stddev == 0:
            return []

        z_score = abs(price_per_sqft - mean) / stddev

        if z_score <= Z_SCORE_MEDIUM:
            return []

        direction = "above" if price_per_sqft > mean else "below"
        severity = "HIGH" if z_score > Z_SCORE_HIGH else "MEDIUM"

        return [FraudSignal(
            signal_type=self.signal_type,
            severity=severity,
            property_id=property_id,
            description=(
                f"Price per sqft (₹{price_per_sqft:.0f}) is {z_score:.1f} standard deviations "
                f"{direction} the city average (₹{mean:.0f}). "
                f"Sample: {int(stats['sample_size'])} properties in {city}."
            ),
            detected_by="SYSTEM",
            detector_name=self.__class__.__name__,
            metadata={
                "price_per_sqft": round(price_per_sqft, 2),
                "city_mean_ppsf": round(mean, 2),
                "city_stddev_ppsf": round(stddev, 2),
                "z_score": round(z_score, 2),
                "sample_size": int(stats["sample_size"]),
                "city": city,
                "property_type": str(property_type),
            },
        )]
