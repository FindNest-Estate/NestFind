"""
Velocity Detector — Detects suspicious deal creation velocity.

Signals:
  VELOCITY_ABUSE (MEDIUM)     — Buyer has > 5 active deals simultaneously
  SERIAL_CANCELLATION (LOW)   — Property has > 3 cancelled deals
"""
import logging
from typing import List, Dict, Any
import asyncpg

from .base import FraudDetector, FraudSignal

logger = logging.getLogger(__name__)

BUYER_ACTIVE_DEAL_LIMIT = 5
PROPERTY_CANCELLED_DEAL_LIMIT = 3

# Statuses that count as "active" (not terminal)
NON_TERMINAL_STATUSES = (
    'INITIATED', 'VISIT_SCHEDULED', 'OFFER_MADE', 'NEGOTIATION',
    'PRICE_AGREED', 'TOKEN_PENDING', 'TOKEN_PAID', 'AGREEMENT_SIGNED',
    'REGISTRATION', 'DISPUTED',
)


class VelocityDetector(FraudDetector):
    """Detects buyer deal velocity abuse and property-level cancellation patterns."""

    @property
    def signal_type(self) -> str:
        return "VELOCITY_ABUSE"

    @property
    def default_severity(self) -> str:
        return "MEDIUM"

    async def detect(self, conn: asyncpg.Connection, context: Dict[str, Any]) -> List[FraudSignal]:
        buyer_id = context.get("buyer_id")
        property_id = context.get("property_id")

        if not property_id:
            return []

        signals: List[FraudSignal] = []

        # ─── Check 1: Buyer active deal count ────────────────────────────────
        if buyer_id:
            try:
                active_count = await conn.fetchval(
                    """
                    SELECT COUNT(*) FROM deals
                    WHERE buyer_id = $1
                      AND status = ANY($2::text[])
                    """,
                    buyer_id,
                    list(NON_TERMINAL_STATUSES),
                )
                if int(active_count or 0) > BUYER_ACTIVE_DEAL_LIMIT:
                    signals.append(FraudSignal(
                        signal_type="VELOCITY_ABUSE",
                        severity="MEDIUM",
                        property_id=property_id,
                        description=(
                            f"Buyer has {active_count} simultaneously active deals "
                            f"(limit: {BUYER_ACTIVE_DEAL_LIMIT})."
                        ),
                        detected_by="SYSTEM",
                        detector_name=self.__class__.__name__,
                        metadata={
                            "buyer_id": str(buyer_id),
                            "active_deals": int(active_count),
                        },
                    ))
            except Exception as e:
                logger.warning(f"[VelocityDetector] Buyer active deal check failed: {e}")

        # ─── Check 2: Property cancellation velocity ─────────────────────────
        try:
            cancelled_count = await conn.fetchval(
                """
                SELECT COUNT(*) FROM deals
                WHERE property_id = $1
                  AND status IN ('CANCELLED', 'EXPIRED')
                """,
                property_id,
            )
            if int(cancelled_count or 0) > PROPERTY_CANCELLED_DEAL_LIMIT:
                signals.append(FraudSignal(
                    signal_type="SERIAL_CANCELLATION",
                    severity="LOW",
                    property_id=property_id,
                    description=(
                        f"Property has {cancelled_count} cancelled/expired deals "
                        f"(threshold: {PROPERTY_CANCELLED_DEAL_LIMIT})."
                    ),
                    detected_by="SYSTEM",
                    detector_name=self.__class__.__name__,
                    metadata={
                        "cancelled_deals": int(cancelled_count),
                    },
                ))
        except Exception as e:
            logger.warning(f"[VelocityDetector] Property cancellation check failed: {e}")

        return signals
