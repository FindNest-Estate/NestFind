"""
Reservation Expiry Job

Automatically releases expired reservations and returns properties to ACTIVE status.
Runs every hour.
"""
import asyncpg
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


async def release_expired_reservations(db_pool: asyncpg.Pool):
    """
    Release reservations where end_date < NOW().
    
    State transitions:
    - reservations: ACTIVE → EXPIRED
    - properties: RESERVED → ACTIVE
    
    Uses transaction to ensure atomicity.
    """
    try:
        async with db_pool.acquire() as conn:
            async with conn.transaction():
                # Get expired reservations with property IDs
                expired_reservations = await conn.fetch("""
                    SELECT id, property_id, buyer_id
                    FROM reservations
                    WHERE status = 'ACTIVE'
                        AND end_date < NOW()
                """)
                
                if not expired_reservations:
                    logger.debug("No reservations to expire")
                    return
                
                count = len(expired_reservations)
                property_ids = [r['property_id'] for r in expired_reservations]
                reservation_ids = [r['id'] for r in expired_reservations]
                
                # Update reservations to EXPIRED
                await conn.execute("""
                    UPDATE reservations
                    SET status = 'EXPIRED'
                    WHERE id = ANY($1::uuid[])
                """, reservation_ids)
                
                # Return properties to ACTIVE status
                # Only update if property is still RESERVED
                properties_updated = await conn.execute("""
                    UPDATE properties
                    SET status = 'ACTIVE'
                    WHERE id = ANY($1::uuid[])
                        AND status = 'RESERVED'
                """, property_ids)
                
                props_count = int(properties_updated.split()[-1]) if properties_updated.startswith('UPDATE') else 0
                
                logger.info(f"Released {count} expired reservations, returned {props_count} properties to ACTIVE")
                
                # Create audit log entries
                for reservation in expired_reservations:
                    await conn.execute("""
                        INSERT INTO audit_logs (
                            user_id, action, entity_type, entity_id, 
                            ip_address, details
                        )
                        VALUES (
                            $1, 'RESERVATION_AUTO_EXPIRED', 'reservations', $2,
                            '0.0.0.0',
                            jsonb_build_object(
                                'reason', 'Automatic expiry by scheduled job',
                                'property_id', $3::text
                            )
                        )
                    """, 
                    reservation['buyer_id'], 
                    reservation['id'], 
                    reservation['property_id']
                    )
                
                logger.info(f"Created {count} audit log entries for expired reservations")
                
    except Exception as e:
        logger.error(f"Error releasing expired reservations: {e}")
        # Don't re-raise - allow scheduler to continue
