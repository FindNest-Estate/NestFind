import os
import asyncio
import smtplib
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import asyncpg


class EmailService:
    """
    Email service for sending OTP and other transactional emails.
    
    Uses SMTP configuration from environment variables.
    """
    
    def __init__(self, db_pool: Optional[asyncpg.Pool] = None):
        self.db = db_pool
        self.smtp_host = os.getenv("SMTP_HOST", "localhost")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("SMTP_FROM_EMAIL", "noreply@nestfind.com")
    
    def _send_email_sync(self, to_email: str, subject: str, body: str) -> bool:
        """Synchronous email sending (runs in thread)."""
        try:
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = subject
            
            msg.attach(MIMEText(body, 'plain'))
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            return True
        except Exception as e:
            print(f"[ERROR] Failed to send email to {to_email}: {str(e)}")
            return False
    
    async def send_otp_email(self, to_email: str, otp: str) -> bool:
        """
        Send OTP verification email.
        
        Returns True if sent successfully, False otherwise.
        """
        subject = "Your Verification Code"
        body = f"""Your verification code is: {otp}

This code is valid for 10 minutes.

If you did not request this code, please ignore this email.

- NestFind Team"""
        
        return await asyncio.to_thread(self._send_email_sync, to_email, subject, body)
    
    async def log_email_sent(self, user_id, email: str, ip_address: str):
        """Log successful email delivery."""
        if self.db:
            async with self.db.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO audit_logs 
                    (user_id, action, entity_type, entity_id, ip_address, details)
                    VALUES ($1, 'EMAIL_OTP_SENT', 'email_otp_verifications', NULL, $2, $3)
                    """,
                    user_id, ip_address, json.dumps({'email': email})
                )
    
    async def log_email_failed(self, user_id, email: str, ip_address: str):
        """Log failed email delivery."""
        if self.db:
            async with self.db.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO audit_logs 
                    (user_id, action, entity_type, entity_id, ip_address, details)
                    VALUES ($1, 'EMAIL_SEND_FAILED', 'email_otp_verifications', NULL, $2, $3)
                    """,
                    user_id, ip_address, json.dumps({'email': email})
                )

