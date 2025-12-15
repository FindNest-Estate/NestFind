from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.core.database import get_db
import app.models as models
import app.schemas as schemas
from app.routers.auth import get_current_user
from datetime import datetime, timedelta

router = APIRouter(
    prefix="/admin",
    tags=["admin"]
)

# --- Dependency: Admin Only ---
def get_current_admin(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # For now, we'll assume any user with role 'admin' or 'super_admin' is an admin
    # In a real app, we'd check the AdminUser table
    if current_user.role not in ['admin', 'super_admin']:
        # Fallback: Check if they are in the AdminUser table
        admin_entry = db.query(models.AdminUser).filter(models.AdminUser.user_id == current_user.id).first()
        if not admin_entry:
             raise HTTPException(status_code=403, detail="Not authorized as admin")
        return admin_entry
    
    # If they have the role in User table, we ensure they have an AdminUser entry
    admin_entry = db.query(models.AdminUser).filter(models.AdminUser.user_id == current_user.id).first()
    if not admin_entry:
        # Auto-create for existing admin users (migration convenience)
        admin_entry = models.AdminUser(user_id=current_user.id, role='admin', permissions=["*"])
        db.add(admin_entry)
        db.commit()
        db.refresh(admin_entry)
    
    return admin_entry

# --- Dashboard Stats ---
@router.get("/dashboard/stats")
def get_admin_stats(current_admin: models.AdminUser = Depends(get_current_admin), db: Session = Depends(get_db)):
    today = datetime.utcnow().date()
    month_start = today.replace(day=1)

    # 1. Total Revenue (From CompanyRevenue table)
    total_revenue = db.query(func.sum(models.CompanyRevenue.amount)).scalar() or 0.0
    revenue_this_month = db.query(func.sum(models.CompanyRevenue.amount)).filter(
        models.CompanyRevenue.created_at >= month_start
    ).scalar() or 0.0

    # 2. Users
    total_users = db.query(models.User).count()
    active_users = db.query(models.User).filter(models.User.is_active == True).count()
    new_users_today = db.query(models.User).filter(func.date(models.User.created_at) == today).count()

    # 3. Properties
    total_properties = db.query(models.Property).count()
    pending_properties = db.query(models.Property).filter(models.Property.status == 'pending').count()

    # 4. Bookings/Deals
    total_deals = db.query(models.Offer).count()
    completed_deals = db.query(models.Offer).filter(models.Offer.status == 'completed').count()

    # 5. Revenue Trend (Last 12 months)
    # Initialize 12 months with 0
    revenue_trend = [0] * 12
    
    # Get revenue for current year
    current_year = today.year
    monthly_revenue = db.query(
        func.strftime("%m", models.CompanyRevenue.created_at).label("month"),
        func.sum(models.CompanyRevenue.amount).label("total")
    ).filter(
        func.strftime("%Y", models.CompanyRevenue.created_at) == str(current_year)
    ).group_by("month").all()
    
    for month_str, total in monthly_revenue:
        month_idx = int(month_str) - 1 # 0-indexed
        if 0 <= month_idx < 12:
            revenue_trend[month_idx] = total

    # 6. Recent Activity (Aggregated)
    recent_activity = []
    
    # Get recent users
    recent_users = db.query(models.User).order_by(models.User.created_at.desc()).limit(5).all()
    for u in recent_users:
        recent_activity.append({
            "type": "New User Registration",
            "description": f"{u.first_name} {u.last_name} created an account",
            "time": u.created_at,
            "timestamp": u.created_at.timestamp()
        })
        
    # Get recent properties
    recent_props = db.query(models.Property).order_by(models.Property.created_at.desc()).limit(5).all()
    for p in recent_props:
        owner_name = f"{p.owner.first_name} {p.owner.last_name}" if p.owner else "Unknown"
        recent_activity.append({
            "type": "New Property Listed",
            "description": f"{owner_name} listed {p.title}",
            "time": p.created_at,
            "timestamp": p.created_at.timestamp()
        })
        
    # Get recent offers
    recent_offers = db.query(models.Offer).order_by(models.Offer.created_at.desc()).limit(5).all()
    for o in recent_offers:
        buyer_name = f"{o.buyer.first_name} {o.buyer.last_name}" if o.buyer else "Unknown"
        recent_activity.append({
            "type": "New Offer Received",
            "description": f"{buyer_name} made an offer on {o.property.title}",
            "time": o.created_at,
            "timestamp": o.created_at.timestamp()
        })

    # Sort by timestamp desc and take top 10
    recent_activity.sort(key=lambda x: x["timestamp"], reverse=True)
    recent_activity = recent_activity[:10]

    return {
        "revenue": {
            "total": total_revenue,
            "this_month": revenue_this_month,
            "growth": 12.5 # Mock growth for now
        },
        "users": {
            "total": total_users,
            "active": active_users,
            "new_today": new_users_today
        },
        "properties": {
            "total": total_properties,
            "pending": pending_properties
        },
        "deals": {
            "total": total_deals,
            "completed": completed_deals
        },
        "revenue_trend": revenue_trend,
        "recent_activity": recent_activity
    }

# --- Revenue Ledger ---
@router.get("/finance/revenue", response_model=List[schemas.CompanyRevenueOut])
def get_revenue_ledger(
    skip: int = 0, 
    limit: int = 50, 
    current_admin: models.AdminUser = Depends(get_current_admin), 
    db: Session = Depends(get_db)
):
    revenue = db.query(models.CompanyRevenue).order_by(models.CompanyRevenue.created_at.desc()).offset(skip).limit(limit).all()
    return revenue

@router.get("/finance/summary", response_model=schemas.FinancialSummary)
def get_financial_summary(
    current_admin: models.AdminUser = Depends(get_current_admin), 
    db: Session = Depends(get_db)
):
    # 1. Total Platform Revenue (CompanyRevenue)
    total_revenue = db.query(func.sum(models.CompanyRevenue.amount)).scalar() or 0.0
    
    # 2. Total Agent Commission Payouts (Commission.agent_share)
    # Note: Commission table stores 'agent_share' which is the amount PAYABLE to agent.
    # We assume 'payout_status'='PROCESSED' means it's paid, but for 'Expenses' we might want all accrued.
    # Let's count all accrued commissions as liability/expense.
    total_commission_paid = db.query(func.sum(models.Commission.agent_share)).scalar() or 0.0
    
    # 3. Net Profit
    net_profit = total_revenue - total_commission_paid
    
    # 4. Total Transaction Volume (All DealPayments)
    total_transaction_volume = db.query(func.sum(models.DealPayment.amount)).scalar() or 0.0
    
    return {
        "total_revenue": total_revenue,
        "total_commission_paid": total_commission_paid,
        "net_profit": net_profit,
        "total_transaction_volume": total_transaction_volume
    }

@router.get("/finance/property-revenue", response_model=List[schemas.PropertyRevenue])
def get_property_revenue(
    current_admin: models.AdminUser = Depends(get_current_admin), 
    db: Session = Depends(get_db)
):
    # Group DealPayments by Offer -> Property
    # This is complex in ORM. We can do it via raw SQL or Python aggregation.
    # Given scale is small, Python aggregation is fine and safer.
    
    # Fetch all completed payments with related offer and property
    payments = db.query(models.DealPayment).filter(models.DealPayment.status == 'VERIFIED').all()
    
    property_map = {}
    
    for payment in payments:
        if not payment.offer or not payment.offer.property:
            continue
            
        prop_id = payment.offer.property.id
        if prop_id not in property_map:
            property_map[prop_id] = {
                "property_id": prop_id,
                "property_title": payment.offer.property.title,
                "total_collected": 0.0,
                "platform_share": 0.0,
                "agent_share": 0.0
            }
        
        property_map[prop_id]["total_collected"] += payment.amount
        
        # Logic to split share:
        # If payment is PLATFORM_COMMISSION (Success Fee), it's split 20/80 usually.
        # If payment is TOKEN, it's held by platform until settlement.
        # For simplicity in this view:
        # We will use the Commission table to find exact splits for the OFFER.
        
    # Better approach: Iterate Properties and sum their revenues
    # But that's inefficient.
    
    # Let's stick to simple total collected per property for now.
    # And use Commission table for shares.
    
    results = []
    properties = db.query(models.Property).all()
    for prop in properties:
        # Get all offers for this property
        offers = db.query(models.Offer).filter(models.Offer.property_id == prop.id).all()
        total_collected = 0.0
        platform_share = 0.0
        agent_share = 0.0
        
        for offer in offers:
            # Sum verified payments
            paid = db.query(func.sum(models.DealPayment.amount)).filter(
                models.DealPayment.offer_id == offer.id,
                models.DealPayment.status == 'VERIFIED'
            ).scalar() or 0.0
            total_collected += paid
            
            # Get commission split if exists
            if offer.commission:
                platform_share += offer.commission.platform_share
                agent_share += offer.commission.agent_share
        
        if total_collected > 0:
            results.append({
                "property_id": prop.id,
                "property_title": prop.title,
                "total_collected": total_collected,
                "platform_share": platform_share,
                "agent_share": agent_share
            })
            
    return results

@router.get("/finance/transactions", response_model=List[schemas.DealPaymentOut])
def get_deal_payments(
    skip: int = 0, 
    limit: int = 50, 
    current_admin: models.AdminUser = Depends(get_current_admin), 
    db: Session = Depends(get_db)
):
    payments = db.query(models.DealPayment).order_by(models.DealPayment.created_at.desc()).offset(skip).limit(limit).all()
    return payments

@router.get("/finance/settlements", response_model=List[schemas.DealSettlementOut])
def get_deal_settlements(
    current_admin: models.AdminUser = Depends(get_current_admin), 
    db: Session = Depends(get_db)
):
    # Fetch all properties that have at least one offer in progress or completed
    # This is a complex join, so we'll iterate properties for simplicity and safety
    properties = db.query(models.Property).all()
    results = []
    
    for prop in properties:
        offers = db.query(models.Offer).filter(models.Offer.property_id == prop.id).all()
        deal_offers = []
        
        for offer in offers:
            # Only include offers that have started the payment process
            if offer.status == 'pending' or offer.status == 'rejected':
                continue
                
            # Fetch payments
            token_payment = db.query(models.DealPayment).filter(
                models.DealPayment.offer_id == offer.id,
                models.DealPayment.payment_type.in_(['BOOKING_TOKEN', 'TOKEN'])
            ).order_by(models.DealPayment.created_at.desc()).first()
            
            # Fetch all registration payments (Buyer and Seller)
            deed_payments = db.query(models.DealPayment).filter(
                models.DealPayment.offer_id == offer.id,
                models.DealPayment.payment_type == 'REGISTRATION_GOVT'
            ).all()
            
            buyer_deed_payment = next((p for p in deed_payments if p.uploaded_by_id == offer.buyer_id), None)
            seller_deed_payment = next((p for p in deed_payments if p.uploaded_by_id == offer.property.user_id), None)
            
            commission_payment = db.query(models.DealPayment).filter(
                models.DealPayment.offer_id == offer.id,
                models.DealPayment.payment_type == 'PLATFORM_COMMISSION'
            ).first()
            
            commission_record = db.query(models.Commission).filter(models.Commission.offer_id == offer.id).first()
            
            # Determine Agent Payout Status
            agent_payout_status = 'PENDING'
            if commission_record:
                if commission_record.payout_status == 'PENDING':
                    agent_payout_status = 'READY_TO_DISBURSE'
                else:
                    agent_payout_status = commission_record.payout_status
            elif commission_payment and commission_payment.status == 'VERIFIED':
                 agent_payout_status = 'READY_TO_DISBURSE'
            
            deal_offers.append({
                "offer_id": offer.id,
                "buyer_name": f"{offer.buyer.first_name} {offer.buyer.last_name}",
                "amount": offer.amount,
                "status": offer.status,
                "token_payment": token_payment,
                "sale_deed_url": offer.sale_deed_url, # Legacy/Fallback
                "registration_doc_url": offer.final_registration_doc_url, # New field
                "registration_doc_verified": offer.admin_doc_verified,    # New field
                "buyer_deed_payment": buyer_deed_payment,
                "seller_deed_payment": seller_deed_payment,
                "commission_payment": commission_payment,
                "commission_record": commission_record,
                "agent_payout_status": agent_payout_status
            })
            
        if deal_offers:
            results.append({
                "property_id": prop.id,
                "property_title": prop.title,
                "property_address": f"{prop.address}, {prop.city}",
                "property_image": prop.images[0].image_path if prop.images else None,
                "agent_name": f"{prop.owner.first_name} {prop.owner.last_name}",
                "agent_email": prop.owner.email,
                "offers": deal_offers
            })
            
    return results

@router.post("/finance/disburse/{commission_id}")
def disburse_commission(
    commission_id: int,
    transaction_reference: str,
    current_admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    commission = db.query(models.Commission).filter(models.Commission.id == commission_id).first()
    if not commission:
        raise HTTPException(status_code=404, detail="Commission record not found")
        
    commission.payout_status = 'PAID'
    
    audit_log = models.AuditLog(
        admin_id=current_admin.id,
        action="disburse_commission",
        resource_type="commission",
        resource_id=commission.id,
        new_value={"payout_status": "PAID", "transaction_ref": transaction_reference},
        timestamp=datetime.utcnow()
    )
    db.add(audit_log)
    db.commit()
    
    return {"message": "Commission disbursed successfully"}

@router.post("/finance/verify-document")
def verify_document(
    document_type: str, # 'token_receipt', 'sale_deed', 'commission_receipt'
    id: int,
    status: str, # 'VERIFIED', 'REJECTED'
    current_admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    if document_type == 'token_receipt' or document_type == 'commission_receipt':
        payment = db.query(models.DealPayment).filter(models.DealPayment.id == id).first()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        payment.status = status
        payment.verified_at = datetime.utcnow()
        payment.verified_by_id = current_admin.user_id
        db.commit()
        
    elif document_type == 'sale_deed':
        payment = db.query(models.DealPayment).filter(
            models.DealPayment.offer_id == id,
            models.DealPayment.payment_type == 'REGISTRATION_GOVT'
        ).first()
        
        if not payment:
             payment = db.query(models.DealPayment).filter(models.DealPayment.id == id).first()
        
        if payment:
            payment.status = status
            payment.verified_at = datetime.utcnow()
            payment.verified_by_id = current_admin.user_id
            db.commit()
            
    elif document_type == 'registration_doc':
        # ID is offer_id here
        offer = db.query(models.Offer).filter(models.Offer.id == id).first()
        if not offer:
             raise HTTPException(status_code=404, detail="Offer not found")
        
        offer.admin_doc_verified = (status == 'VERIFIED')
        db.commit()
        
    return {"message": f"Document {status.lower()} successfully"}

# --- Recent Activity (Audit Log) ---
@router.get("/audit-logs", response_model=List[schemas.AuditLogOut])
def get_audit_logs(
    skip: int = 0, 
    limit: int = 20, 
    current_admin: models.AdminUser = Depends(get_current_admin), 
    db: Session = Depends(get_db)
):
    logs = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    return logs

# --- User Management ---
@router.get("/users", response_model=List[schemas.UserOut])
def get_users(
    skip: int = 0, 
    limit: int = 50, 
    role: str = None,
    current_admin: models.AdminUser = Depends(get_current_admin), 
    db: Session = Depends(get_db)
):
    query = db.query(models.User)
    if role:
        query = query.filter(models.User.role == role)
    
    users = query.order_by(models.User.created_at.desc()).offset(skip).limit(limit).all()
    return users

@router.put("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    is_active: bool,
    current_admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Log the action
    audit_log = models.AuditLog(
        admin_id=current_admin.id,
        action="update_user_status",
        resource_type="user",
        resource_id=user.id,
        old_value={"is_active": user.is_active},
        new_value={"is_active": is_active},
        timestamp=datetime.utcnow()
    )
    db.add(audit_log)

    user.is_active = is_active
    db.commit()
    

# --- Property Management ---
@router.get("/properties", response_model=List[schemas.PropertyOut])
def get_properties(
    skip: int = 0, 
    limit: int = 50, 
    status: str = None,
    current_admin: models.AdminUser = Depends(get_current_admin), 
    db: Session = Depends(get_db)
):
    query = db.query(models.Property)
    if status:
        query = query.filter(models.Property.status == status)
    
    properties = query.order_by(models.Property.created_at.desc()).offset(skip).limit(limit).all()
    return properties

@router.put("/properties/{property_id}/status")
def update_property_status(
    property_id: int,
    status: str,
    current_admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    property_item = db.query(models.Property).filter(models.Property.id == property_id).first()
    if not property_item:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Log the action
    audit_log = models.AuditLog(
        admin_id=current_admin.id,
        action="update_property_status",
        resource_type="property",
        resource_id=property_item.id,
        old_value={"status": property_item.status},
        new_value={"status": status},
        timestamp=datetime.utcnow()
    )
    db.add(audit_log)

    property_item.status = status
    if status == 'verified':
        property_item.is_verified = True
    
    db.commit()
    
    return {"message": "Property status updated successfully"}
