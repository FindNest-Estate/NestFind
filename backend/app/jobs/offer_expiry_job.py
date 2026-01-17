"""
Offer Expiry Job

Automatically expires PENDING offers that have passed their expiration time.
Runs every hour.
"""
import asyncpg
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


async def expire_stale_offers(db_pool: asyncpg.Pool):
    """
    Expire all PENDING offers where expires_at < NOW().
    
    State transition: PENDING → EXPIRED
    """
    try:
        async with db_pool.acquire() as conn:
            # Update offers
            result = await conn.execute("""
                UPDATE offers
                SET status = 'EXPIRED'
                WHERE status = 'PENDING' 
                    AND expires_at < NOW()
            """)
            
            # Extract count from result string like "UPDATE 5"
            count = int(result.split()[-1]) if result.startswith('UPDATE') else 0
            
            if count > 0:
                logger.info(f"Expired {count} stale offers")
                
                # Optional: Create audit log entries
                await conn.execute("""
                    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, details)
                    SELECT 
                        buyer_id,
                        'OFFER_AUTO_EXPIRED',
                        'offers',
                        id,
                        '0.0.0.0',
                        jsonb_build_object('reason', 'Automatic expiry by scheduled job')
                    FROM offers
                    WHERE status = 'EXPIRED' 
                        AND id IN (
                            SELECT id FROM offers 
                            WHERE status = 'EXPIRED' 
                            ORDER BY updated_at DESC 
                            LIMIT $1
                        )
                """, count)
                logger.info(f"Created {count} audit log entries for expired offers")
            else:
                logger.debug("No offers to expire")
                
    except Exception as e:
        logger.error(f"Error expiring stale offers: {e}")
        # Don't re-raise - allow scheduler to continue
