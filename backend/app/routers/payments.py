from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
import app.models as models
import app.schemas as schemas
import app.routers.auth as auth
from datetime import datetime
import shutil
import os
import uuid

router = APIRouter(
    prefix="/payments",
    tags=["payments"]
)

UPLOAD_DIR = "uploads/proofs"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 5 * 1024 * 1024 # 5MB

@router.post("/upload-proof", response_model=schemas.DealPaymentOut)
async def upload_payment_proof(
    offer_id: int,
    payment_type: str, # 'TOKEN', 'REGISTRATION_GOVT', 'PLATFORM_COMMISSION'
    amount: float,
    payment_method: str,
    transaction_reference: str = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # 1. Verify Offer
    offer = db.query(models.Offer).filter(models.Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    is_buyer = offer.buyer_id == current_user.id
    is_agent = offer.property.user_id == current_user.id

    if not (is_buyer or is_agent):
        raise HTTPException(status_code=403, detail="Not authorized")

    # 2. Validate File
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, JPG, PNG allowed.")
    
    # Check file size (approximate, as we are reading stream)
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB allowed.")

    # 3. State Enforcement
    if payment_type == 'PLATFORM_COMMISSION':
        # Ensure Registration is verified first
        if not offer.registration_date:
             raise HTTPException(status_code=400, detail="Registration date must be scheduled before paying commission.")
        
        # Check if user is seller/agent (only seller pays the 0.9% commission)
        if not is_agent:
            raise HTTPException(status_code=400, detail="Only the seller/agent pays the final platform commission.")

    if payment_type == 'TOKEN':
        # Only buyer pays the 0.1% token
        if not is_buyer:
            raise HTTPException(status_code=400, detail="Only the buyer pays the booking token.")

    # Check for existing upload by THIS user for THIS type
    existing_payment = db.query(models.DealPayment).filter(
        models.DealPayment.offer_id == offer_id,
        models.DealPayment.payment_type == payment_type,
        models.DealPayment.uploaded_by_id == current_user.id
    ).first()

    if existing_payment and existing_payment.status != 'REJECTED':
         raise HTTPException(status_code=400, detail="You have already uploaded a proof for this step.")

    # 4. Save File
    filename = f"{uuid.uuid4()}{file_ext}"
    file_path = f"{UPLOAD_DIR}/{filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 5. Create Payment Record
    new_payment = models.DealPayment(
        offer_id=offer_id,
        payment_type=payment_type,
        amount=amount,
        payment_method=payment_method,
        transaction_reference=transaction_reference,
        proof_file_url=file_path,
        uploaded_by_id=current_user.id,
        status='PENDING'
    )
    
    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)
    
    return new_payment

@router.post("/{payment_id}/verify", response_model=schemas.DealPaymentOut)
def verify_payment(
    payment_id: int,
    action: str, # 'APPROVE', 'REJECT'
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    payment = db.query(models.DealPayment).filter(models.DealPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
        
    # Only Agent (Property Owner) or Admin can verify
    # Exception: If Agent uploaded the commission proof, Admin must verify it. Agent can't verify their own payment.
    offer = payment.offer
    is_agent_upload = payment.uploaded_by_id == offer.property.user_id
    
    if is_agent_upload:
        if current_user.role != 'admin':
             raise HTTPException(status_code=403, detail="Only Admin can verify agent payments")
    else:
        if offer.property.user_id != current_user.id and current_user.role != 'admin':
            raise HTTPException(status_code=403, detail="Not authorized to verify")
        
    # Idempotency Check
    if payment.status in ['VERIFIED', 'REJECTED']:
        raise HTTPException(status_code=400, detail=f"Payment is already {payment.status}")
        
    if action == 'APPROVE':
        payment.status = 'VERIFIED'
        payment.verified_at = datetime.utcnow()
        payment.verified_by_id = current_user.id
        
        # Update Offer Status based on payment type
        if payment.payment_type == 'TOKEN':
            offer.status = 'token_paid'
        elif payment.payment_type == 'REGISTRATION_GOVT':
            offer.sale_deed_url = payment.proof_file_url
        elif payment.payment_type == 'PLATFORM_COMMISSION':
            # Create Commission Record
            # Logic:
            # 1. Buyer pays 0.1% (Booking Token) -> 100% to Platform
            # 2. Seller pays 0.9% (Success Fee) -> Split: 80% to Agent, 20% to Platform
            
            property_price = offer.amount
            token_amount = property_price * 0.001 # 0.1%
            success_fee = property_price * 0.009 # 0.9%
            
            agent_share = success_fee * 0.80 # 80% of 0.9%
            platform_share_from_seller = success_fee * 0.20 # 20% of 0.9%
            
            total_platform_revenue = token_amount + platform_share_from_seller
            
            new_commission = models.Commission(
                offer_id=offer.id,
                total_commission_amount=token_amount + success_fee, # Total 1%
                platform_share=total_platform_revenue,
                agent_share=agent_share,
                payout_status='PENDING'
            )
            db.add(new_commission)
            offer.status = 'completed' # Deal is fully settled
            
    elif action == 'REJECT':
        payment.status = 'REJECTED'
        
    db.commit()
    db.refresh(payment)
    return payment

@router.get("/breakdown/{offer_id}")
def get_cost_breakdown(
    offer_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    offer = db.query(models.Offer).filter(models.Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
        
    # Permission Check
    is_buyer = offer.buyer_id == current_user.id
    is_agent = offer.property.user_id == current_user.id
    if not (is_buyer or is_agent or current_user.role == 'admin'):
        raise HTTPException(status_code=403, detail="Not authorized to view breakdown")
        
    # Calculations
    property_price = offer.amount
    govt_charges = property_price * 0.06 # Approx 6%
    
    # New Split Logic
    token_amount = property_price * 0.001 # 0.1% (Buyer pays)
    final_commission = property_price * 0.009 # 0.9% (Seller pays)
    total_commission = property_price * 0.01 # 1%
    
    # Fetch payments
    payments = db.query(models.DealPayment).filter(models.DealPayment.offer_id == offer_id).all()
    payments_data = [
        {
            "id": p.id,
            "payment_type": p.payment_type,
            "amount": p.amount,
            "status": p.status,
            "proof_file_url": p.proof_file_url,
            "uploaded_by_id": p.uploaded_by_id,
            "created_at": p.created_at
        } for p in payments
    ]

    return {
        "property_price": property_price,
        "govt_charges_approx": govt_charges,
        "token_amount": token_amount,
        "final_commission": final_commission,
        "total_commission": total_commission,
        "total_payable": property_price + govt_charges + total_commission,
        "agent_share_info": "80% of the total 1% commission goes to the agent.",
        "registration_date": offer.registration_date,
        "payments": payments_data
    }
