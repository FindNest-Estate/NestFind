"""
Price Anomaly Sweep Job — Weekly scan for price anomalies.

Runs every Sunday at 04:00 AM.
Re-runs PriceAnomalyDetector against all ACTIVE properties and creates
new fraud signals for newly-anomalous properties.
"""
import logging
import asyncpg

logger = logging.getLogger(__name__)


async def sweep_price_anomalies(db_pool: asyncpg.Pool) -> None:
    """
    Weekly job: scan all ACTIVE properties for price anomalies.

    Only creates new signals — does not modify existing ones.
    Recomputes trust scores for any properties that receive new signals.
    """
    logger.info("[PriceAnomalySweep] Starting weekly price anomaly sweep...")

    from ..services.trust_fraud_engine.detectors.price_anomaly import PriceAnomalyDetector
    from ..services.trust_fraud_engine.fraud_detection_service import FraudDetectionService

    fraud_svc = FraudDetectionService(db_pool)
    detector  = PriceAnomalyDetector()
    signals_created = 0
    checked = 0

    try:
        async with db_pool.acquire() as conn:
            properties = await conn.fetch(
                """
                SELECT id, price, area_sqft, city, type::text as property_type
                FROM properties
                WHERE status = 'ACTIVE'
                  AND deleted_at IS NULL
                  AND price > 0
                  AND area_sqft > 0
                ORDER BY id
                """
            )

        for prop in properties:
            context = {
                "property_id": prop["id"],
                "price": float(prop["price"]),
                "area_sqft": float(prop["area_sqft"]),
                "city": prop["city"],
                "property_type": prop["property_type"],
            }
            try:
                async with db_pool.acquire() as conn:
                    raw_signals = await detector.detect(conn, context)

                    for signal in raw_signals:
                        # Avoid re-creating unresolved signals of same type
                        existing = await conn.fetchval(
                            """
                            SELECT id FROM property_fraud_signals
                            WHERE property_id = $1
                              AND signal_type = 'PRICE_ANOMALY'
                              AND resolved = FALSE
                            LIMIT 1
                            """,
                            prop["id"],
                        )
                        if not existing:
                            await fraud_svc.create_signal(
                                property_id=signal.property_id,
                                signal_type=signal.signal_type,
                                severity=signal.severity,
                                description=signal.description,
                                detected_by="SYSTEM",
                                metadata=signal.metadata,
                            )
                            signals_created += 1
                checked += 1
            except Exception as e:
                logger.warning(f"[PriceAnomalySweep] Skipping property {prop['id']}: {e}")

        logger.info(
            f"[PriceAnomalySweep] Done. Checked={checked}, new signals={signals_created}"
        )
    except Exception as e:
        logger.error(f"[PriceAnomalySweep] Sweep failed: {e}")
