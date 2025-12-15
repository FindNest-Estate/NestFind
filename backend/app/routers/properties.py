from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
import app.models as models
import app.schemas as schemas
import app.routers.auth as auth
import shutil
import os
import uuid

router = APIRouter(
    prefix="/properties",
    tags=["properties"]
)

@router.get("/", response_model=List[schemas.PropertyOut])
def get_properties(
    skip: int = 0, 
    limit: int = 100, 
    search: Optional[str] = None,
    property_type: Optional[str] = None,
    listing_type: Optional[str] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Property)
    if user_id:
        query = query.filter(models.Property.user_id == user_id)
    if search:
        query = query.filter(models.Property.title.contains(search))
    if property_type:
        query = query.filter(models.Property.property_type == property_type)
    if listing_type:
        query = query.filter(models.Property.listing_type == listing_type)
    
    # Exclude ARCHIVED properties by default
    query = query.filter(models.Property.status != 'ARCHIVED')

    # Backend filter removed to allow frontend to decide display logic (e.g. Landing vs Listing)
    pass
        
    properties = query.offset(skip).limit(limit).all()
    return properties

@router.post("/", response_model=schemas.PropertyOut)
def create_property(
    property: schemas.PropertyCreate, 
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ['seller', 'agent', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized to create properties")
    
    new_property = models.Property(
        **property.dict(), 
        user_id=current_user.id
    )
    db.add(new_property)
    db.commit()
    db.refresh(new_property)
    return new_property

@router.get("/{property_id}", response_model=schemas.PropertyOut)
def get_property(property_id: int, db: Session = Depends(get_db)):
    property = db.query(models.Property).filter(models.Property.id == property_id).first()
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if property.status == 'ARCHIVED':
        raise HTTPException(status_code=404, detail="Property has been deleted")
        
    return property

@router.post("/{property_id}/images")
def upload_property_image(
    property_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    property = db.query(models.Property).filter(models.Property.id == property_id).first()
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    if property.user_id != current_user.id and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")

    # Save file
    # Save file
    # Get backend root directory (3 levels up from app/routers/properties.py)
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
    
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

    file_extension = file.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    # Store relative path in DB for serving
    db_path = f"uploads/{file_name}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Save to DB
    new_image = models.PropertyImage(property_id=property_id, image_path=db_path)
    db.add(new_image)
    db.commit()
    
    return {"image_path": db_path}

@router.delete("/{property_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property_image(
    property_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    property = db.query(models.Property).filter(models.Property.id == property_id).first()
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if property.user_id != current_user.id and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")

    image = db.query(models.PropertyImage).filter(
        models.PropertyImage.id == image_id,
        models.PropertyImage.property_id == property_id
    ).first()

    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    # Delete file from filesystem
    # Get backend root directory (3 levels up from app/routers/properties.py)
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    # image.image_path is relative like "uploads/filename.png"
    file_path = os.path.join(BASE_DIR, image.image_path)
    
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Error deleting file {file_path}: {e}")

    db.delete(image)
    db.commit()
    return None

@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property(
    property_id: int,
    hard_delete: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    property_query = db.query(models.Property).filter(models.Property.id == property_id)
    property = property_query.first()

    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if property.user_id != current_user.id and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized to delete this property")

    if hard_delete:
        # Hard Delete: Remove all images from filesystem and database
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        
        # Get all images for this property
        images = db.query(models.PropertyImage).filter(
            models.PropertyImage.property_id == property_id
        ).all()
        
        # Delete each image file from filesystem
        for image in images:
            file_path = os.path.join(BASE_DIR, image.image_path)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    print(f"Deleted image file: {file_path}")
                except Exception as e:
                    print(f"Error deleting file {file_path}: {e}")
            
            # Delete image record from database
            db.delete(image)
        
        # Delete related bookings (cascade)
        db.query(models.Booking).filter(models.Booking.property_id == property_id).delete()
        
        # Delete related offers (cascade)
        db.query(models.Offer).filter(models.Offer.property_id == property_id).delete()
        
        # Delete related favorites (cascade)
        db.query(models.Favorite).filter(models.Favorite.property_id == property_id).delete()
        
        # Delete the property itself
        db.delete(property)
        db.commit()
        print(f"Hard deleted property {property_id} with all related data")
    else:
        # Soft Delete: Mark as ARCHIVED
        property.status = 'ARCHIVED'
        db.commit()
    
    return None

@router.put("/{property_id}", response_model=schemas.PropertyOut)
def update_property(
    property_id: int,
    updated_property: schemas.PropertyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    property_query = db.query(models.Property).filter(models.Property.id == property_id)
    property = property_query.first()

    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if property.user_id != current_user.id and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized to update this property")

    property_query.update(updated_property.dict(), synchronize_session=False)
    db.commit()
    return property_query.first()
