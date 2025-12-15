from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
import app.models as models
import app.schemas as schemas
import app.routers.auth as auth
from app.utils.pdf_generator import generate_receipt
from datetime import datetime

router = APIRouter(
    prefix="/transactions",
    tags=["transactions"]
)

@router.post("/pay-token", response_model=schemas.TransactionOut)
def pay_token(
    payment: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # 1. Verify Offer
    offer = db.query(models.Offer).filter(models.Offer.id == payment.offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    if offer.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to pay for this offer")

    if offer.status != 'accepted':
        raise HTTPException(status_code=400, detail="Offer must be accepted before paying token")

    # 2. Create Transaction Record
    new_transaction = models.Transaction(
        offer_id=offer.id,
        buyer_id=current_user.id,
        amount=payment.amount,
        status='success',
        method='mock_gateway_v1'
    )
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)

    # 2.1 Create DealPayment Record (New Flow)
    new_payment = models.DealPayment(
        offer_id=offer.id,
        payment_type='TOKEN',
        amount=payment.amount,
        payment_method='ONLINE_MOCK',
        transaction_reference=str(new_transaction.id),
        status='VERIFIED', # Auto-verified
        verified_at=datetime.utcnow()
    )
    db.add(new_payment)

    # 3. Generate Receipt
    buyer_name = f"{current_user.first_name} {current_user.last_name}"
    receipt_url = generate_receipt(
        buyer_name=buyer_name,
        property_title=offer.property.title,
        transaction_id=new_transaction.id,
        amount=payment.amount
    )

    # 4. Update Offer & Property Status
    offer.status = 'token_paid'
    offer.receipt_url = receipt_url
    
    # Save receipt path to transaction as well
    new_transaction.receipt_path = receipt_url
    
    property = offer.property
    property.status = 'reserved'

    db.commit()
    db.refresh(new_transaction)

    return new_transaction

@router.post("/finalize", response_model=schemas.TransactionOut)
def finalize_transaction(
    transaction_data: schemas.TransactionCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Final Registration Step:
    1. Validates Token was paid.
    2. Calculates Balance (Price - 10k).
    3. Calculates Commissions (Platform 1%, Agent 2%).
    4. Generates Sale Deed.
    """
    from app.utils.pdf_generator import generate_sale_deed

    # 1. Validate Offer
    offer = db.query(models.Offer).filter(models.Offer.id == transaction_data.offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    if offer.status != 'token_paid':
        raise HTTPException(status_code=400, detail="Token must be paid before finalizing")

    # 2. Create Final Transaction Record
    new_transaction = models.Transaction(
        offer_id=offer.id,
        buyer_id=current_user.id,
        amount=transaction_data.amount, # This is the Balance Amount
        status="success",
        method="mock_gateway_final",
        type="final"
    )
    db.add(new_transaction)
    db.commit() # Commit to get ID
    db.refresh(new_transaction)
    
    # 3. Generate Sale Deed
    property_obj = offer.property
    seller = property_obj.owner
    
    deed_filename = generate_sale_deed(
        buyer_name=f"{current_user.first_name} {current_user.last_name}",
        seller_name=f"{seller.first_name} {seller.last_name}",
        property_title=property_obj.title,
        property_address=f"{property_obj.address}, {property_obj.city}",
        sale_price=offer.amount,
        transaction_id=new_transaction.id
    )
    
    # 4. Update Statuses
    new_transaction.receipt_path = deed_filename # Reusing column for deed link
    offer.sale_deed_url = deed_filename
    offer.status = "completed"
    property_obj.status = "sold"
    
    db.commit()
    db.refresh(new_transaction)
    
    return new_transaction
