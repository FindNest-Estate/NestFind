"""
OTP Cleanup Job

Deletes consumed and expired OTP verification records.
Runs every 5 minutes for security and database hygiene.
"""
import asyncpg
import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)


async def cleanup_expired_otps(db_pool: asyncpg.Pool):
    """
    Delete OTP records that are:
    1. Consumed (consumed_at IS NOT NULL) and older than 1 hour
    2. Expired (expires_at < NOW) and never consumed
    
    Keeps recent consumed OTPs for audit purposes.
    """
    try:
        async with db_pool.acquire() as conn:
            # Delete old consumed OTPs (older than 1 hour)
            consumed_result = await conn.execute("""
                DELETE FROM email_otp_verifications
                WHERE consumed_at IS NOT NULL
                    AND consumed_at < NOW() - INTERVAL '1 hour'
            """)
            
            # Delete expired unconsumed OTPs
            expired_result = await conn.execute("""
                DELETE FROM email_otp_verifications
                WHERE consumed_at IS NULL
                    AND expires_at < NOW()
            """)
            
            # Extract counts
            consumed_count = int(consumed_result.split()[-1]) if consumed_result.startswith('DELETE') else 0
            expired_count = int(expired_result.split()[-1]) if expired_result.startswith('DELETE') else 0
            
            total = consumed_count + expired_count
            
            if total > 0:
                logger.info(f"Cleaned up {total} OTP records ({consumed_count} consumed, {expired_count} expired)")
            else:
                logger.debug("No OTPs to clean up")
                
    except Exception as e:
        logger.error(f"Error cleaning up OTPs: {e}")
        # Don't re-raise - allow scheduler to continue
