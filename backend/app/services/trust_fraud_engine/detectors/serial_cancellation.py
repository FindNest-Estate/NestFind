"""
Serial Cancellation Detector — Detects sellers with high cancellation rates.

Triggered on DEAL_CANCELLATION events.

Signals:
  SERIAL_CANCELLATION (MEDIUM) — Seller cancellation rate > 50% with ≥ 3 total deals
"""
import logging
from typing import List, Dict, Any
import asyncpg

from .base import FraudDetector, FraudSignal

logger = logging.getLogger(__name__)

CANCELLATION_RATE_THRESHOLD  = 0.50
MIN_TOTAL_DEALS_REQUIRED     = 3
PROPERTY_CANCELLED_LIMIT     = 3


class SerialCancellationDetector(FraudDetector):
    """Detects sellers with a persistent pattern of deal cancellations."""

    @property
    def signal_type(self) -> str:
        return "SERIAL_CANCELLATION"

    @property
    def default_severity(self) -> str:
        return "MEDIUM"

    async def detect(self, conn: asyncpg.Connection, context: Dict[str, Any]) -> List[FraudSignal]:
        property_id = context.get("property_id")
        seller_id = context.get("seller_id")

        if not property_id:
            return []

        signals: List[FraudSignal] = []

        # ─── Check 1: Property-level cancellation count ───────────────────────
        try:
            prop_cancelled = await conn.fetchval(
                """
                SELECT COUNT(*) FROM deals
                WHERE property_id = $1
                  AND status IN ('CANCELLED', 'EXPIRED')
                """,
                property_id,
            )
            if int(prop_cancelled or 0) > PROPERTY_CANCELLED_LIMIT:
                signals.append(FraudSignal(
                    signal_type=self.signal_type,
                    severity="LOW",
                    property_id=property_id,
                    description=(
                        f"This property has {prop_cancelled} cancelled/expired deals "
                        f"(threshold: {PROPERTY_CANCELLED_LIMIT})."
                    ),
                    detected_by="SYSTEM",
                    detector_name=self.__class__.__name__,
                    metadata={"property_cancelled_deals": int(prop_cancelled)},
                ))
        except Exception as e:
            logger.warning(f"[SerialCancellationDetector] Property cancellation check failed: {e}")

        # ─── Check 2: Seller-level cancellation rate ──────────────────────────
        if seller_id:
            try:
                row = await conn.fetchrow(
                    """
                    SELECT
                        COUNT(*)                                        AS total_deals,
                        COUNT(*) FILTER (WHERE status = 'CANCELLED')   AS cancelled_deals
                    FROM deals
                    WHERE seller_id = $1
                    """,
                    seller_id,
                )
                total = int(row["total_deals"] or 0)
                cancelled = int(row["cancelled_deals"] or 0)

                if total >= MIN_TOTAL_DEALS_REQUIRED:
                    rate = cancelled / total
                    if rate > CANCELLATION_RATE_THRESHOLD:
                        signals.append(FraudSignal(
                            signal_type=self.signal_type,
                            severity="MEDIUM",
                            property_id=property_id,
                            description=(
                                f"Seller has a {rate*100:.0f}% cancellation rate "
                                f"({cancelled} of {total} deals cancelled)."
                            ),
                            detected_by="SYSTEM",
                            detector_name=self.__class__.__name__,
                            metadata={
                                "seller_id": str(seller_id),
                                "cancellation_rate": round(rate, 3),
                                "total_deals": total,
                                "cancelled_deals": cancelled,
                            },
                        ))
            except Exception as e:
                logger.warning(f"[SerialCancellationDetector] Seller rate check failed: {e}")

        return signals
