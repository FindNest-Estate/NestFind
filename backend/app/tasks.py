from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
import app.models as models
from datetime import datetime, timedelta
import resend
import os
import logging

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Resend (Use environment variable or placeholder)
resend.api_key = os.getenv("RESEND_API_KEY", "re_test_key_for_testing") 

def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_expired_visits():
    """
    Mark PENDING visits as EXPIRED if expiry_date < now
    """
    logger.info("Running check_expired_visits job...")
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        expired_visits = db.query(models.Booking).filter(
            models.Booking.status == 'PENDING',
            models.Booking.expiry_date < now
        ).all()
        
        for visit in expired_visits:
            visit.status = 'EXPIRED'
            visit.last_status_changed_at = now
            
            # Notify Buyer
            notification = models.Notification(
                user_id=visit.user_id,
                title="Visit Request Expired",
                message=f"Your visit request for {visit.property.title} has expired.",
                notification_type="VISIT_EXPIRED",
                related_entity_id=visit.id,
                related_entity_type="VISIT"
            )
            db.add(notification)
            
        db.commit()
        logger.info(f"Expired {len(expired_visits)} visits.")
    except Exception as e:
        logger.error(f"Error in check_expired_visits: {e}")
    finally:
        db.close()

def send_visit_reminders():
    """
    Send reminders for APPROVED visits happening tomorrow
    """
    logger.info("Running send_visit_reminders job...")
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        tomorrow = now + timedelta(days=1)
        start_window = tomorrow - timedelta(hours=1) # Check visits around this time tomorrow
        end_window = tomorrow + timedelta(hours=1)
        
        # This logic is simplified. Ideally check strictly for visits in [tomorrow_start, tomorrow_end] range
        # Assuming approved_slot is ISO string
        
        upcoming_visits = db.query(models.Booking).filter(
            models.Booking.status == 'APPROVED',
            models.Booking.reminder_sent_at.is_(None)
        ).all()
        
        count = 0
        for visit in upcoming_visits:
            if not visit.approved_slot:
                continue
            try:
                visit_time = datetime.fromisoformat(visit.approved_slot)
                # Check if visit is within 24 hours (approx)
                time_diff = visit_time - now
                if timedelta(hours=23) <= time_diff <= timedelta(hours=25):
                    # Send Reminder
                    notification = models.Notification(
                        user_id=visit.user_id,
                        title="Visit Reminder 🏠",
                        message=f"Reminder: You have a visit for {visit.property.title} tomorrow at {visit_time.strftime('%H:%M')}.",
                        notification_type="VISIT_REMINDER",
                        priority="HIGH",
                        related_entity_id=visit.id,
                        related_entity_type="VISIT"
                    )
                    db.add(notification)
                    visit.reminder_sent_at = now
                    count += 1
            except ValueError:
                continue
                
        db.commit()
        logger.info(f"Sent {count} reminders.")
    except Exception as e:
        logger.error(f"Error in send_visit_reminders: {e}")
    finally:
        db.close()

def send_email_notification(notification_id: int):
    """
    Async task to send email via Resend
    """
    db = SessionLocal()
    try:
        notification = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
        if not notification or not notification.user.email:
            return

        # Check if email channel is enabled (assuming 'EMAIL' in channels list)
        # SQLite JSON is stored as list/string
        channels = notification.channels
        if isinstance(channels, str):
            import json
            channels = json.loads(channels)
            
        if "EMAIL" not in channels and "IN_APP" not in channels: # Defaulting to send if only IN_APP for now as per user request to prioritize email
             pass # Actually user said "Implement async email... priority". So let's send it.
        
        # For MVP, let's try to send if email is available
        try:
            r = resend.Emails.send({
                "from": "onboarding@resend.dev",
                "to": notification.user.email,
                "subject": notification.title,
                "html": f"<p>{notification.message}</p><br><a href='http://localhost:3000{notification.action_url}'>View Details</a>"
            })
            notification.email_sent = True
            notification.email_status = 'SENT'
        except Exception as e:
            logger.error(f"Resend Error: {e}")
            notification.email_status = 'FAILED'
            
        db.commit()
    except Exception as e:
        logger.error(f"Error sending email: {e}")
    finally:
        db.close()

# Initialize Scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(check_expired_visits, 'interval', hours=24)
scheduler.add_job(send_visit_reminders, 'interval', hours=1)

def start_scheduler():
    scheduler.start()
