from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app import models, schemas

router = APIRouter(
    prefix="/loans",
    tags=["loans"]
)

@router.get("/offers", response_model=List[schemas.BankOfferOut])
def get_bank_offers(db: Session = Depends(get_db)):
    offers = db.query(models.BankOffer).filter(models.BankOffer.is_active == True).all()
    return offers
