import secrets
import hashlib
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from uuid import UUID
import asyncpg


class OTPService:
    """
    Email OTP service implementing AUTH_SECURITY_RULES.md Rule 1.
    
    Enforces:
    - Single-use OTP (consumed_at check)
    - 10-minute expiry
    - 3-attempt lockout
    - 30-minute lockout duration
    """
    
    OTP_LENGTH = 6
    OTP_EXPIRY_MINUTES = 10
    MAX_ATTEMPTS = 3
    LOCKOUT_MINUTES = 30
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool
    
    def _generate_otp(self) -> str:
        """Generate 6-digit numeric OTP."""
        return ''.join([str(secrets.randbelow(10)) for _ in range(self.OTP_LENGTH)])
    
    def _hash_otp(self, otp: str) -> str:
        """Hash OTP using SHA-256."""
        return hashlib.sha256(otp.encode()).hexdigest()
    
    async def generate_and_store(
        self,
        user_id: UUID,
        ip_address: str
    ) -> Tuple[str, UUID]:
        """
        Generate OTP and store hashed version.
        
        Returns: (plaintext_otp, otp_record_id)
        """
        otp = self._generate_otp()
        otp_hash = self._hash_otp(otp)
        # Use naive UTC datetime for DB TIMESTAMP columns
        expires_at = datetime.utcnow() + timedelta(minutes=self.OTP_EXPIRY_MINUTES)
        
        async with self.db.acquire() as conn:
            # Verify user exists and get email
            user = await conn.fetchrow(
                "SELECT id, email FROM users WHERE id = $1",
                user_id
            )
            
            if not user:
                raise ValueError(f"User {user_id} not found")
            
            otp_id = await conn.fetchval(
                """
                INSERT INTO email_otp_verifications 
                (user_id, otp_hash, expires_at, attempts, created_at)
                VALUES ($1, $2, $3, 0, NOW())
                RETURNING id
                """,
                user_id, otp_hash, expires_at
            )
            
            await conn.execute(
                """
                INSERT INTO audit_logs 
                (user_id, action, entity_type, entity_id, ip_address, details)
                VALUES ($1, 'OTP_GENERATED', 'email_otp_verifications', $2, $3, $4)
                """,
                user_id, otp_id, ip_address, json.dumps({'expires_at': expires_at.isoformat()})
            )
        
        # Send OTP via email (async, non-blocking)
        from .email_service import EmailService
        email_service = EmailService(self.db)
        
        # [DEV MODE] Print OTP to console for testing (remove in production)
        print(f"[DEV] OTP for {user['email']}: {otp}")
        
        email_sent = await email_service.send_otp_email(user['email'], otp)
        
        if email_sent:
            await email_service.log_email_sent(user_id, user['email'], ip_address)
        else:
            await email_service.log_email_failed(user_id, user['email'], ip_address)
        
        return otp, otp_id
    
    async def verify(
        self,
        user_id: UUID,
        otp: str,
        ip_address: str
    ) -> dict:
        """
        Verify OTP with single-use and lockout enforcement.
        
        Uses transaction with row-level locking to prevent race conditions.
        
        Returns:
        {
            "success": bool,
            "error": Optional[str],
            "locked_until": Optional[datetime]
        }
        """
        otp_hash = self._hash_otp(otp)
        # Use naive UTC datetime for comparison with DB TIMESTAMP columns
        now = datetime.utcnow()
        
        async with self.db.acquire() as conn:
            # Start transaction for atomic verification
            async with conn.transaction():
                # Check if user is locked
                user = await conn.fetchrow(
                    "SELECT login_locked_until FROM users WHERE id = $1",
                    user_id
                )
                
                if user and user['login_locked_until'] and user['login_locked_until'] > now:
                    await conn.execute(
                        """
                        INSERT INTO audit_logs 
                        (user_id, action, entity_type, entity_id, ip_address, details)
                        VALUES ($1, 'OTP_LOCKED', 'users', $1, $2, $3)
                        """,
                        user_id, ip_address, json.dumps({'locked_until': user['login_locked_until'].isoformat()})
                    )
                    return {
                        "success": False,
                        "error": "Account locked due to too many failed attempts",
                        "locked_until": user['login_locked_until']
                    }
                
                # Find and lock most recent unconsumed OTP (prevents race condition)
                otp_record = await conn.fetchrow(
                    """
                    SELECT id, otp_hash, expires_at, attempts, consumed_at
                    FROM email_otp_verifications
                    WHERE user_id = $1 AND consumed_at IS NULL
                    ORDER BY created_at DESC
                    LIMIT 1
                    FOR UPDATE
                    """,
                    user_id
                )
                
                if not otp_record:
                    await conn.execute(
                        """
                        INSERT INTO audit_logs 
                        (user_id, action, entity_type, entity_id, ip_address)
                        VALUES ($1, 'OTP_NOT_FOUND', 'email_otp_verifications', NULL, $2)
                        """,
                        user_id, ip_address
                    )
                    return {"success": False, "error": "No valid OTP found"}
                
                # Check if already consumed (replay attack - should not happen with FOR UPDATE)
                if otp_record['consumed_at']:
                    await conn.execute(
                        """
                        INSERT INTO audit_logs 
                        (user_id, action, entity_type, entity_id, ip_address, details)
                        VALUES ($1, 'OTP_REUSE_BLOCKED', 'email_otp_verifications', $2, $3, $4)
                        """,
                        user_id, otp_record['id'], ip_address, json.dumps({'otp_id': str(otp_record['id'])})
                    )
                    return {"success": False, "error": "OTP already used"}
                
                # Check expiry
                if otp_record['expires_at'] < now:
                    await conn.execute(
                        """
                        INSERT INTO audit_logs 
                        (user_id, action, entity_type, entity_id, ip_address, details)
                        VALUES ($1, 'OTP_EXPIRED', 'email_otp_verifications', $2, $3, $4)
                        """,
                        user_id, otp_record['id'], ip_address, json.dumps({'otp_id': str(otp_record['id'])})
                    )
                    return {"success": False, "error": "OTP expired"}
                
                # Verify OTP hash
                if otp_record['otp_hash'] != otp_hash:
                    # Increment attempts
                    new_attempts = otp_record['attempts'] + 1
                    await conn.execute(
                        """
                        UPDATE email_otp_verifications
                        SET attempts = $1
                        WHERE id = $2
                        """,
                        new_attempts, otp_record['id']
                    )
                    
                    # Check if lockout threshold reached (USER-LEVEL LOCKOUT)
                    if new_attempts >= self.MAX_ATTEMPTS:
                        lockout_until = now + timedelta(minutes=self.LOCKOUT_MINUTES)
                        lockout_until_naive = lockout_until.replace(tzinfo=None)
                        await conn.execute(
                            """
                            UPDATE users
                            SET login_locked_until = $1
                            WHERE id = $2
                            """,
                            lockout_until_naive, user_id
                        )
                        
                        await conn.execute(
                            """
                            INSERT INTO audit_logs 
                            (user_id, action, entity_type, entity_id, ip_address, details)
                            VALUES ($1, 'OTP_LOCKED', 'users', $1, $2, $3)
                            """,
                            user_id, ip_address, json.dumps({
                                'locked_until': lockout_until.isoformat(),
                                'reason': 'max_otp_attempts',
                                'otp_id': str(otp_record['id'])
                            })
                        )
                        
                        return {
                            "success": False,
                            "error": f"Account locked for {self.LOCKOUT_MINUTES} minutes",
                            "locked_until": lockout_until
                        }
                    
                    await conn.execute(
                        """
                        INSERT INTO audit_logs 
                        (user_id, action, entity_type, entity_id, ip_address, details)
                        VALUES ($1, 'OTP_FAILED', 'email_otp_verifications', $2, $3, $4)
                        """,
                        user_id, otp_record['id'], ip_address, json.dumps({
                            'attempts': new_attempts,
                            'remaining': self.MAX_ATTEMPTS - new_attempts,
                            'otp_id': str(otp_record['id'])
                        })
                    )
                    
                    return {
                        "success": False,
                        "error": f"Invalid OTP. {self.MAX_ATTEMPTS - new_attempts} attempts remaining"
                    }
                
                # OTP is valid - mark as consumed (single-use enforcement)
                await conn.execute(
                    """
                    UPDATE email_otp_verifications
                    SET consumed_at = NOW(), consumed_by_ip = $1
                    WHERE id = $2
                    """,
                    ip_address, otp_record['id']
                )
                
                # Load user status and role for state transition
                user_data = await conn.fetchrow(
                    """
                    SELECT u.id, u.status, r.name as role_name
                    FROM users u
                    JOIN user_roles ur ON u.id = ur.user_id
                    JOIN roles r ON ur.role_id = r.id
                    WHERE u.id = $1
                    """,
                    user_id
                )
                
                # Apply state transition based on role
                if user_data and user_data['status'] == 'PENDING_VERIFICATION':
                    # Set email verified timestamp
                    await conn.execute(
                        """
                        UPDATE users
                        SET email_verified_at = NOW()
                        WHERE id = $1
                        """,
                        user_id
                    )
                    
                    # Apply role-specific state transition
                    new_status = None
                    if user_data['role_name'] == 'USER':
                        new_status = 'ACTIVE'
                    elif user_data['role_name'] == 'AGENT':
                        new_status = 'IN_REVIEW'
                    
                    if new_status:
                        await conn.execute(
                            """
                            UPDATE users
                            SET status = $1
                            WHERE id = $2
                            """,
                            new_status, user_id
                        )
                        
                        await conn.execute(
                            """
                            INSERT INTO audit_logs 
                            (user_id, action, entity_type, entity_id, ip_address, details)
                            VALUES ($1, 'EMAIL_VERIFIED', 'users', $1, $2, $3)
                            """,
                            user_id, ip_address, json.dumps({
                                'role': user_data['role_name'],
                                'new_status': new_status,
                                'otp_id': str(otp_record['id'])
                            })
                        )
                
                await conn.execute(
                    """
                    INSERT INTO audit_logs 
                    (user_id, action, entity_type, entity_id, ip_address, details)
                    VALUES ($1, 'OTP_VERIFIED', 'email_otp_verifications', $2, $3, $4)
                    """,
                    user_id, otp_record['id'], ip_address, json.dumps({'otp_id': str(otp_record['id'])})
                )
                
                return {"success": True}
