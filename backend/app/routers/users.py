from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.core.database import get_db
import app.models as models
import app.schemas as schemas
import app.routers.auth as auth

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

# --- Profile Management ---

@router.put("/profile", response_model=schemas.UserOut)
def update_profile(
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Update fields
    for field, value in user_update.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/avatar", response_model=schemas.UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    import shutil
    import os
    import uuid

    UPLOAD_DIR = "uploads/avatars"
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Update user avatar URL
    # Assuming the backend serves uploads from /uploads
    avatar_url = f"/uploads/avatars/{filename}"
    current_user.avatar_url = avatar_url
    
    db.commit()
    db.refresh(current_user)
    return current_user

# --- Favorites ---

@router.post("/favorites/{property_id}", response_model=schemas.Favorite)
def add_favorite(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Check if property exists
    property = db.query(models.Property).filter(models.Property.id == property_id).first()
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if property.status == 'ARCHIVED':
        raise HTTPException(status_code=404, detail="Property has been deleted")

    # Check if already favorite
    existing_favorite = db.query(models.Favorite).filter(
        models.Favorite.user_id == current_user.id,
        models.Favorite.property_id == property_id
    ).first()

    if existing_favorite:
        return existing_favorite

    new_favorite = models.Favorite(user_id=current_user.id, property_id=property_id)
    db.add(new_favorite)
    db.commit()
    db.refresh(new_favorite)
    return new_favorite

@router.delete("/favorites/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    favorite = db.query(models.Favorite).filter(
        models.Favorite.user_id == current_user.id,
        models.Favorite.property_id == property_id
    ).first()

    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")

    db.delete(favorite)
    db.commit()
    return None

@router.get("/favorites", response_model=List[schemas.PropertyOut])
def get_favorites(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    favorites = db.query(models.Favorite).join(models.Property).filter(
        models.Favorite.user_id == current_user.id,
        models.Property.status != 'ARCHIVED'
    ).all()
    # Return the properties associated with favorites
    return [fav.property for fav in favorites]


# --- Recently Viewed ---

@router.post("/recently-viewed/{property_id}", response_model=schemas.RecentlyViewed)
def add_recently_viewed(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Check if property exists
    property = db.query(models.Property).filter(models.Property.id == property_id).first()
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
        
    if property.status == 'ARCHIVED':
        # Don't add to history if deleted
        raise HTTPException(status_code=404, detail="Property has been deleted")

    # Check if already exists, update timestamp if so
    existing_view = db.query(models.RecentlyViewed).filter(
        models.RecentlyViewed.user_id == current_user.id,
        models.RecentlyViewed.property_id == property_id
    ).first()

    if existing_view:
        existing_view.viewed_at = func.now() # Update timestamp
        db.commit()
        db.refresh(existing_view)
        return existing_view

    new_view = models.RecentlyViewed(user_id=current_user.id, property_id=property_id)
    db.add(new_view)
    db.commit()
    db.refresh(new_view)
    return new_view

@router.get("/recently-viewed", response_model=List[schemas.PropertyOut])
def get_recently_viewed(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    views = db.query(models.RecentlyViewed).join(models.Property).filter(
        models.RecentlyViewed.user_id == current_user.id,
        models.Property.status != 'ARCHIVED'
    ).order_by(models.RecentlyViewed.viewed_at.desc()).all()
    
    # Deduplicate by property_id, keeping the most recent one (already sorted by desc)
    seen_properties = set()
    unique_properties = []
    for view in views:
        if view.property_id not in seen_properties:
            # Handle case where property might have been deleted
            if view.property:
                seen_properties.add(view.property_id)
                unique_properties.append(view.property)
            
            if len(unique_properties) >= limit:
                break
    
    return unique_properties
