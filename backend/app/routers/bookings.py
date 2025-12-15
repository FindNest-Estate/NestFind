from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import cast, DateTime
from typing import List, Optional
from app.core.database import get_db
from datetime import datetime, timedelta
import app.models as models
import app.schemas as schemas
import app.routers.auth as auth
import app.routers.auth as auth
import json
from app.core.email import send_visit_confirmation_email, send_visit_otp_email
from fastapi import UploadFile, File
import shutil
import os
import uuid

router = APIRouter(
    prefix="/bookings",
    tags=["bookings"]
)

SLOT_BUFFER_MINUTES = 30

def check_slot_conflict(db: Session, agent_id: int, approved_slot: str) -> bool:
    """
    Check if agent has conflicting visits within SLOT_BUFFER_MINUTES
    """
    try:
        approved_datetime = datetime.fromisoformat(approved_slot)
    except ValueError:
        return False # Invalid format, let validation handle it or assume no conflict if invalid
        
    buffer_start = approved_datetime - timedelta(minutes=SLOT_BUFFER_MINUTES)
    buffer_end = approved_datetime + timedelta(minutes=SLOT_BUFFER_MINUTES)
    
    # SQLite datetime comparison might need string format if stored as string
    # Assuming ISO format strings in DB which sort correctly
    
    conflicts = db.query(models.Booking).filter(
        models.Booking.agent_id == agent_id,
        models.Booking.status.in_(['APPROVED', 'COMPLETED']),
        models.Booking.approved_slot.isnot(None)
    ).all()
    
    for conflict in conflicts:
        if not conflict.approved_slot:
            continue
        try:
            conflict_time = datetime.fromisoformat(conflict.approved_slot)
            if buffer_start <= conflict_time <= buffer_end:
                return True
        except ValueError:
            continue
            
    return False

@router.post("/", response_model=schemas.BookingOut)
def create_booking(
    booking: schemas.BookingCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    property = db.query(models.Property).filter(models.Property.id == booking.property_id).first()
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Check if user is owner
    if property.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot book visit for your own property")

    # Check for existing active booking
    existing_booking = db.query(models.Booking).filter(
        models.Booking.user_id == current_user.id,
        models.Booking.property_id == booking.property_id,
        models.Booking.status.notin_(['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'])
    ).first()

    if existing_booking:
        raise HTTPException(status_code=400, detail="You already have an active booking for this property")

    # Create Booking
    new_booking = models.Booking(
        property_id=booking.property_id,
        user_id=current_user.id,
        agent_id=property.user_id,
        preferred_time_slots=booking.preferred_time_slots, # List of strings
        buyer_message=booking.buyer_message,
        status=models.VisitStatusEnum.PENDING.value,
        expiry_date=datetime.utcnow() + timedelta(days=7)
    )
    
    # Backward compatibility
    # Backward compatibility & DB Constraints
    if booking.visit_date and booking.visit_time:
        new_booking.visit_date = booking.visit_date
        new_booking.visit_time = booking.visit_time
        # Add to preferred slots if empty
        if not new_booking.preferred_time_slots:
             # Combine date and time to ISO
             try:
                 dt = datetime.strptime(f"{booking.visit_date} {booking.visit_time}", "%Y-%m-%d %H:%M")
                 new_booking.preferred_time_slots = [dt.isoformat()]
             except:
                 pass
    elif booking.preferred_time_slots and len(booking.preferred_time_slots) > 0:
        # If new flow (slots) but DB needs visit_date (old schema constraint)
        try:
            # Assuming slot is ISO format string
            first_slot = booking.preferred_time_slots[0]
            # Handle potential double encoding if it comes as stringified json inside list
            if isinstance(first_slot, str) and first_slot.startswith('"'):
                 import json
                 first_slot = json.loads(first_slot)
            
            dt = datetime.fromisoformat(first_slot.replace('Z', '+00:00'))
            new_booking.visit_date = dt.strftime("%Y-%m-%d")
            new_booking.visit_time = dt.strftime("%H:%M")
        except Exception as e:
            print(f"Error parsing slot for legacy fields: {e}")
            # Fallback to current time or dummy if strictly required, but let's hope parsing works
            new_booking.visit_date = datetime.utcnow().strftime("%Y-%m-%d")
            new_booking.visit_time = "00:00"

    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    
    # Create Notification for Agent
    notification = models.Notification(
        user_id=property.user_id,
        triggered_by_id=current_user.id,
        title="New Visit Request",
        message=f"{current_user.first_name} requested a visit for {property.title}",
        action_url=f"/dashboard/visits?id={new_booking.id}",
        notification_type="VISIT_REQUEST",
        priority="HIGH",
        related_entity_id=new_booking.id,
        related_entity_type="VISIT"
    )
    db.add(notification)
    db.commit()
    
    return new_booking

@router.get("/", response_model=List[schemas.BookingOut])
def get_bookings(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Booking).join(models.Property).filter(models.Property.status != 'ARCHIVED')
    
    if current_user.role == 'admin':
        pass
    else:
        # Buyer or Agent
        query = query.filter(
            (models.Booking.user_id == current_user.id) | 
            (models.Booking.agent_id == current_user.id)
        )
    
    if status:
        query = query.filter(models.Booking.status == status)
        
    total = query.count()
    bookings = query.order_by(models.Booking.created_at.desc()).offset(skip).limit(limit).all()
    
    return bookings

@router.get("/my-visits", response_model=List[schemas.BookingOut])
def get_my_visits(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get visits where current user is the buyer
    """
    return db.query(models.Booking).join(models.Property).filter(
        models.Booking.user_id == current_user.id,
        models.Property.status != 'ARCHIVED'
    ).order_by(models.Booking.created_at.desc()).all()

@router.get("/agent-schedule", response_model=schemas.AgentSchedule)
def get_agent_schedule(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get agent's schedule grouped by status
    """
    if current_user.role != 'agent':
        # Allow if user has properties, effectively treating them as agent/seller
        pass

    # Base query - join with Property to filter out ARCHIVED properties
    base_query = db.query(models.Booking).join(
        models.Property, models.Booking.property_id == models.Property.id
    ).filter(
        models.Booking.agent_id == current_user.id,
        models.Property.status != 'ARCHIVED'  # Exclude deleted properties
    )
    
    requests = base_query.filter(models.Booking.status == 'PENDING').order_by(models.Booking.created_at.desc()).all()
    
    # Define "Upcoming" as:
    # 1. Status is IN_PROGRESS (Currently happening)
    # 2. Status is COUNTER_PROPOSED (Waiting for buyer action)
    # 3. Status is APPROVED and time is in future OR within last 24 hours (Allowing late starts)
    
    cutoff_time = (datetime.utcnow() - timedelta(hours=24)).isoformat()
    
    upcoming = base_query.filter(
        (models.Booking.status == 'IN_PROGRESS') |
        (models.Booking.status == 'COUNTER_PROPOSED') |
        (
            (models.Booking.status == 'APPROVED') & 
            (models.Booking.approved_slot >= cutoff_time)
        )
    ).order_by(models.Booking.approved_slot).all()
    
    # Define "Past" as:
    # 1. Status is COMPLETED, CANCELLED, REJECTED
    # 2. Status is APPROVED but older than 24 hours (Expired/Missed)
    
    past = base_query.filter(
        (models.Booking.status == 'COMPLETED') |
        (models.Booking.status == 'CANCELLED') |
        (models.Booking.status == 'REJECTED') |
        (
            (models.Booking.status == 'APPROVED') & 
            (models.Booking.approved_slot < cutoff_time)
        )
    ).order_by(models.Booking.approved_slot.desc()).all()
    
    return {
        "requests": requests,
        "upcoming": upcoming,
        "past": past
    }


@router.get("/{booking_id}", response_model=schemas.BookingOut)
def get_booking(
    booking_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if not (booking.user_id == current_user.id or booking.agent_id == current_user.id or current_user.role == 'admin'):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return booking

@router.get("/{booking_id}/activity-log", response_model=List[schemas.VisitAuditLogOut])
def get_visit_history(
    booking_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if not (booking.user_id == current_user.id or booking.agent_id == current_user.id or current_user.role == 'admin'):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    logs = db.query(models.VisitAuditLog).filter(models.VisitAuditLog.visit_id == booking_id).order_by(models.VisitAuditLog.created_at.desc()).all()
    return logs

@router.put("/{booking_id}/status", response_model=schemas.BookingOut)
def update_booking_status(
    booking_id: int,
    update: schemas.BookingUpdateStatus,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Optimistic Locking
    if update.expected_version and booking.version != update.expected_version:
        raise HTTPException(status_code=409, detail="Visit was modified by another user")

    previous_status = booking.status
    new_status = None
    audit_details = {}
    notification_recipient_id = None
    notification_title = ""
    notification_message = ""
    
    # Logic based on Action
    if update.action == 'APPROVE':
        # Case 1: Agent approving PENDING
        if booking.status == 'PENDING':
            if booking.agent_id != current_user.id:
                raise HTTPException(status_code=403, detail="Only agent can approve pending requests")
        # Case 2: Buyer accepting COUNTER_PROPOSED
        elif booking.status == 'COUNTER_PROPOSED':
            if booking.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="Only buyer can accept counter-proposals")
        else:
            raise HTTPException(status_code=400, detail="Invalid status transition")

        if not update.slot:
            raise HTTPException(status_code=400, detail="Slot required for approval")
            
        # Conflict Check - Always check the AGENT's schedule
        if check_slot_conflict(db, booking.agent_id, update.slot):
            raise HTTPException(status_code=409, detail="The agent has a conflict at this time")
            
        new_status = 'APPROVED'
        booking.approved_slot = update.slot
        booking.approved_at = datetime.utcnow()
        booking.agent_notes = update.notes
        
        # Notify the OTHER party
        if booking.status == 'PENDING': # Agent approved
            notification_recipient_id = booking.user_id
            notification_title = "Visit Approved! 🎉"
            notification_message = f"Your visit request for {booking.property.title} has been approved for {update.slot}."
        else: # Buyer accepted counter
            notification_recipient_id = booking.agent_id
            notification_title = "Counter-Proposal Accepted! 🎉"
            notification_message = f"Buyer accepted your proposed time for {booking.property.title}: {update.slot}."

        # Trigger Email (only if Agent approved, or maybe both? For now keep existing logic for buyer notification)
        if booking.user.email and booking.status == 'PENDING':
            image_url = ""
            if booking.property.images and len(booking.property.images) > 0:
                image_url = f"http://localhost:8000/{booking.property.images[0].image_path}"
            
            background_tasks.add_task(
                send_visit_confirmation_email,
                to_email=booking.user.email,
                buyer_name=booking.user.first_name,
                property_title=booking.property.title,
                property_address=f"{booking.property.address}, {booking.property.city}",
                visit_time=update.slot,
                agent_name=f"{current_user.first_name} {current_user.last_name}",
                agent_phone=current_user.phone,
                agent_notes=update.notes,
                property_image_url=image_url
            )
        
    elif update.action == 'REJECT':
        # Case 1: Agent rejecting PENDING
        if booking.status == 'PENDING':
            if booking.agent_id != current_user.id:
                raise HTTPException(status_code=403, detail="Only agent can reject")
            notification_recipient_id = booking.user_id
            notification_title = "Visit Rejected"
            notification_message = f"Your visit request for {booking.property.title} was rejected. Reason: {update.reason}"
            
        # Case 2: Buyer rejecting COUNTER_PROPOSED
        elif booking.status == 'COUNTER_PROPOSED':
            if booking.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="Only buyer can reject counter-proposals")
            notification_recipient_id = booking.agent_id
            notification_title = "Counter-Proposal Rejected"
            notification_message = f"Buyer rejected your proposed time for {booking.property.title}. Reason: {update.reason}"
        else:
             raise HTTPException(status_code=400, detail="Invalid status transition")

        new_status = 'REJECTED'
        booking.rejected_at = datetime.utcnow()
        booking.agent_notes = update.reason

    elif update.action == 'COUNTER':
        if booking.agent_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only agent can counter")
        if not update.slot:
            raise HTTPException(status_code=400, detail="Slot required for counter offer")
            
        new_status = 'COUNTER_PROPOSED'
        booking.agent_suggested_slot = update.slot
        booking.agent_notes = update.notes
        
        notification_recipient_id = booking.user_id
        notification_title = "New Time Proposed"
        notification_message = f"Agent proposed a new time for your visit to {booking.property.title}: {update.slot}"

    elif update.action == 'CANCEL':
        if booking.user_id != current_user.id and booking.agent_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
            
        new_status = 'CANCELLED'
        booking.cancelled_at = datetime.utcnow()
        booking.cancellation_reason = update.reason
        booking.cancelled_by = 'AGENT' if booking.agent_id == current_user.id else 'BUYER'
        
        notification_recipient_id = booking.user_id if booking.agent_id == current_user.id else booking.agent_id
        notification_title = "Visit Cancelled"
        notification_message = f"Visit for {booking.property.title} was cancelled by {current_user.first_name}."

    elif update.action == 'COMPLETE':
        if booking.agent_id != current_user.id:
             raise HTTPException(status_code=403, detail="Only agent can mark complete")
        if booking.status != 'APPROVED':
             raise HTTPException(status_code=400, detail="Only approved visits can be completed")
             
        new_status = 'COMPLETED'
        booking.completed_at = datetime.utcnow()
        
        notification_recipient_id = booking.user_id
        notification_title = "Visit Completed"
        notification_message = f"How was your visit to {booking.property.title}? Please rate your experience."
        
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    # Apply Updates
    booking.status = new_status
    booking.last_status_changed_at = datetime.utcnow()
    booking.version += 1
    
    # Audit Log
    audit = models.VisitAuditLog(
        visit_id=booking.id,
        action=update.action,
        performed_by_id=current_user.id,
        previous_status=previous_status,
        new_status=new_status,
        details=audit_details
    )
    db.add(audit)
    
    # Notification
    if notification_recipient_id:
        notification = models.Notification(
            user_id=notification_recipient_id,
            triggered_by_id=current_user.id,
            title=notification_title,
            message=notification_message,
            action_url=f"/dashboard/visits?id={booking.id}",
            notification_type=f"VISIT_{new_status}",
            related_entity_id=booking.id,
            related_entity_type="VISIT"
        )
        db.add(notification)
        # TODO: Trigger async email task here using background_tasks
        # background_tasks.add_task(send_email_notification, notification.id)

    db.commit()
    db.refresh(booking)
    return booking

@router.post("/{booking_id}/rate", response_model=schemas.BookingOut)
def rate_visit(
    booking_id: int,
    rating: schemas.BookingRate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if booking.status != 'COMPLETED':
        raise HTTPException(status_code=400, detail="Can only rate completed visits")
        
    if booking.user_id == current_user.id:
        # Buyer rating
        booking.buyer_rating = rating.rating
        booking.buyer_feedback = rating.feedback
    elif booking.agent_id == current_user.id:
        # Agent rating
        booking.agent_rating = rating.rating
        booking.agent_feedback = rating.feedback
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db.commit()
    db.refresh(booking)
    db.commit()
    db.refresh(booking)
    return booking



@router.post("/{booking_id}/otp/generate")
def generate_visit_otp(
    booking_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if booking.agent_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only agent can generate OTP")
        
    if booking.status != 'APPROVED':
        raise HTTPException(status_code=400, detail="Can only generate OTP for approved visits")

    # Generate 4 digit OTP
    import random
    otp = f"{random.randint(1000, 9999)}"
    booking.visit_otp = otp
    booking.visit_otp_expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    # Notify Buyer with OTP (In-App)
    notification = models.Notification(
        user_id=booking.user_id,
        triggered_by_id=current_user.id,
        title="Visit Start Code",
        message=f"Agent is starting the visit. Share this code with them: {otp}",
        action_url=f"/dashboard/visits?id={booking.id}",
        notification_type="VISIT_OTP",
        priority="URGENT",
        related_entity_id=booking.id,
        related_entity_type="VISIT"
    )
    db.add(notification)
    
    db.commit()
    
    # Send OTP via Email (Background Task)
    if booking.user.email:
        property_address = f"{booking.property.address}, {booking.property.city}"
        background_tasks.add_task(
            send_visit_otp_email,
            to_email=booking.user.email,
            buyer_name=booking.user.first_name,
            property_title=booking.property.title,
            property_address=property_address,
            otp=otp,
            agent_name=f"{current_user.first_name} {current_user.last_name}"
        )
    
    return {"message": "OTP sent to buyer via app and email"}


@router.post("/{booking_id}/start", response_model=schemas.BookingOut)
def start_visit(
    booking_id: int,
    otp: str = Query(..., description="4-digit OTP provided by buyer"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if booking.agent_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only agent can start visit")
        
    if booking.status != 'APPROVED':
        raise HTTPException(status_code=400, detail="Only approved visits can be started")
        
    # Verify OTP
    if not booking.visit_otp or booking.visit_otp != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    if booking.visit_otp_expires_at and booking.visit_otp_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP Expired. Please regenerate.")

    booking.status = models.VisitStatusEnum.IN_PROGRESS.value
    booking.visit_start_time = datetime.utcnow()
    booking.last_status_changed_at = datetime.utcnow()
    # Clear OTP after successful use
    booking.visit_otp = None
    
    # Audit Log
    audit = models.VisitAuditLog(
        visit_id=booking.id,
        action="START_VISIT",
        performed_by_id=current_user.id,
        previous_status="APPROVED",
        new_status="IN_PROGRESS"
    )
    db.add(audit)
    
    db.commit()
    db.refresh(booking)
    return booking


import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_lat / 2) * math.sin(d_lat / 2) + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(d_lon / 2) * math.sin(d_lon / 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c * 1000 # Return in meters

@router.post("/{booking_id}/complete", response_model=schemas.BookingOut)
def complete_visit(
    booking_id: int,
    report: schemas.VisitReport,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if booking.agent_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only agent can complete visit")
        
    if booking.status != 'IN_PROGRESS':
        raise HTTPException(status_code=400, detail="Visit must be in progress to complete")
        
    # Location Verification
    location_result = "NOT_VERIFIED"
    if report.latitude and report.longitude and booking.property.latitude and booking.property.longitude:
        distance = haversine(report.latitude, report.longitude, booking.property.latitude, booking.property.longitude)
        location_result = "MATCH" if distance < 500 else "MISMATCH" # 500 meters tolerance
    
    booking.status = models.VisitStatusEnum.COMPLETED.value
    booking.visit_end_time = datetime.utcnow()
    booking.completed_at = datetime.utcnow()
    booking.check_in_location = report.check_in_location
    
    booking.agent_notes = report.agent_notes
    booking.visit_images = report.visit_images
    
    # Enhanced Feedback
    booking.buyer_interest = report.buyer_interest
    booking.buyer_timeline = report.buyer_timeline
    booking.buyer_budget_feedback = report.buyer_budget_feedback
    booking.location_check_result = location_result or report.location_check_result
    
    booking.last_status_changed_at = datetime.utcnow()
    
    # Audit Log
    audit = models.VisitAuditLog(
        visit_id=booking.id,
        action="COMPLETE_VISIT",
        performed_by_id=current_user.id,
        previous_status="IN_PROGRESS",
        new_status="COMPLETED",
        details={"location_check": location_result}
    )
    db.add(audit)
    
    # Notification to Buyer
    notification = models.Notification(
        user_id=booking.user_id,
        triggered_by_id=current_user.id,
        title="Visit Completed",
        message=f"How was your visit to {booking.property.title}? Please rate your experience.",
        action_url=f"/dashboard/my-visits?id={booking.id}",
        notification_type="VISIT_COMPLETED",
        related_entity_id=booking.id,
        related_entity_type="VISIT"
    )
    db.add(notification)
    
    db.commit()
    db.refresh(booking)
    return booking


@router.post("/{booking_id}/review", response_model=schemas.ReviewOut)
def create_review(
    booking_id: int,
    review: schemas.ReviewCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Determine reviewer and reviewee
    if booking.user_id == current_user.id:
        reviewer_id = booking.user_id
        reviewee_id = booking.agent_id
    elif booking.agent_id == current_user.id:
        reviewer_id = booking.agent_id
        reviewee_id = booking.user_id
    else:
        raise HTTPException(status_code=403, detail="Not authorized to review this booking")

    # Check if review already exists
    existing_review = db.query(models.Review).filter(
        models.Review.booking_id == booking_id,
        models.Review.reviewer_id == reviewer_id
    ).first()
    
    if existing_review:
        raise HTTPException(status_code=400, detail="You have already reviewed this visit")

    new_review = models.Review(
        booking_id=booking_id,
        reviewer_id=reviewer_id,
        reviewee_id=reviewee_id,
        rating=review.rating,
        comment=review.comment,
        visit_outcome=review.visit_outcome
    )
    
    db.add(new_review)
    
    # Update Booking model with rating/feedback for easier access
    if reviewer_id == booking.user_id:
        booking.buyer_rating = review.rating
        booking.buyer_feedback = review.comment
    elif reviewer_id == booking.agent_id:
        booking.agent_rating = review.rating
        booking.agent_feedback = review.comment
        
    db.commit()
    db.refresh(new_review)
    
    return new_review

@router.post("/upload-image")
def upload_visit_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Save file
    # Get backend root directory (3 levels up from app/routers/bookings.py)
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    UPLOAD_DIR = os.path.join(BASE_DIR, "uploads", "visits")
    
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

    file_extension = file.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    # Store relative path for serving
    db_path = f"uploads/visits/{file_name}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {"image_path": db_path}
