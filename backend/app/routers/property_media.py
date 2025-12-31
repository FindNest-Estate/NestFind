"""
Property Media Router - Handles file uploads for property listings.

Endpoints:
- POST /properties/{id}/media - Upload media file
- DELETE /properties/{id}/media/{media_id} - Delete media
- PUT /properties/{id}/media/{media_id}/primary - Set as primary
"""

import os
import uuid
import json
from datetime import datetime
from typing import Optional
from uuid import UUID
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request
from fastapi.responses import JSONResponse
import asyncpg

from app.core.database import get_db
from app.core.auth import get_current_user

router = APIRouter(prefix="/properties", tags=["property-media"])

# Configuration
UPLOAD_DIR = Path("uploads/properties")
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def ensure_upload_dir(property_id: str) -> Path:
    """Create upload directory for property if it doesn't exist."""
    dir_path = UPLOAD_DIR / property_id
    dir_path.mkdir(parents=True, exist_ok=True)
    return dir_path


@router.post("/{property_id}/media")
async def upload_media(
    property_id: UUID,
    request: Request,
    file: UploadFile = File(...),
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a media file for a property.
    
    - Only property owner can upload
    - Only allowed in DRAFT status
    - Max 5MB for images
    - Allowed types: jpg, jpeg, png, webp
    """
    user_id = current_user["user_id"]
    
    async with db.acquire() as conn:
        # Verify property ownership and status
        property_row = await conn.fetchrow(
            """
            SELECT id, seller_id, status::text 
            FROM properties 
            WHERE id = $1 AND deleted_at IS NULL
            """,
            property_id
        )
        
        if not property_row:
            raise HTTPException(status_code=404, detail="Property not found")
        
        if property_row["seller_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if property_row["status"] != "DRAFT":
            raise HTTPException(
                status_code=400, 
                detail="Can only upload media for properties in DRAFT status"
            )
        
        # Validate file type
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}"
            )
        
        # Get file extension
        original_filename = file.filename or "image.jpg"
        ext = Path(original_filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file extension. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Read file and check size
        content = await file.read()
        file_size = len(content)
        
        if file_size > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {MAX_IMAGE_SIZE // (1024*1024)}MB"
            )
        
        # Generate unique filename
        file_uuid = str(uuid.uuid4())
        new_filename = f"{file_uuid}{ext}"
        
        # Create upload directory
        upload_dir = ensure_upload_dir(str(property_id))
        file_path = upload_dir / new_filename
        
        # Save file
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Generate URL (relative to uploads)
        file_url = f"/uploads/properties/{property_id}/{new_filename}"
        
        # Get next display order
        max_order = await conn.fetchval(
            """
            SELECT COALESCE(MAX(display_order), -1) + 1 
            FROM property_media 
            WHERE property_id = $1 AND deleted_at IS NULL
            """,
            property_id
        )
        
        # Check if this is the first image (make it primary)
        existing_count = await conn.fetchval(
            """
            SELECT COUNT(*) FROM property_media 
            WHERE property_id = $1 AND deleted_at IS NULL
            """,
            property_id
        )
        is_primary = existing_count == 0
        
        # Insert media record
        media_id = await conn.fetchval(
            """
            INSERT INTO property_media 
            (property_id, media_type, file_url, file_size_bytes, original_filename, 
             display_order, is_primary, uploaded_by)
            VALUES ($1, 'IMAGE', $2, $3, $4, $5, $6, $7)
            RETURNING id
            """,
            property_id,
            file_url,
            file_size,
            original_filename,
            max_order,
            is_primary,
            user_id
        )
        
        # Audit log
        await conn.execute(
            """
            INSERT INTO audit_logs 
            (user_id, action, entity_type, entity_id, ip_address, details)
            VALUES ($1, 'MEDIA_UPLOADED', 'property_media', $2, $3, $4)
            """,
            user_id,
            media_id,
            request.client.host if request.client else None,
            json.dumps({
                "property_id": str(property_id),
                "filename": original_filename,
                "file_size": file_size
            })
        )
        
        return {
            "success": True,
            "media": {
                "id": str(media_id),
                "media_type": "IMAGE",
                "file_url": file_url,
                "file_size_bytes": file_size,
                "original_filename": original_filename,
                "display_order": max_order,
                "is_primary": is_primary
            }
        }


@router.delete("/{property_id}/media/{media_id}")
async def delete_media(
    property_id: UUID,
    media_id: UUID,
    request: Request,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a media file (soft delete).
    
    - Only property owner can delete
    - Only allowed in DRAFT status
    """
    user_id = current_user["user_id"]
    
    async with db.acquire() as conn:
        async with conn.transaction():
            # Verify property ownership and status
            property_row = await conn.fetchrow(
                """
                SELECT id, seller_id, status::text 
                FROM properties 
                WHERE id = $1 AND deleted_at IS NULL
                """,
                property_id
            )
            
            if not property_row:
                raise HTTPException(status_code=404, detail="Property not found")
            
            if property_row["seller_id"] != user_id:
                raise HTTPException(status_code=403, detail="Not authorized")
            
            if property_row["status"] != "DRAFT":
                raise HTTPException(
                    status_code=400, 
                    detail="Can only delete media for properties in DRAFT status"
                )
            
            # Verify media exists and belongs to property
            media_row = await conn.fetchrow(
                """
                SELECT id, file_url, is_primary 
                FROM property_media 
                WHERE id = $1 AND property_id = $2 AND deleted_at IS NULL
                """,
                media_id,
                property_id
            )
            
            if not media_row:
                raise HTTPException(status_code=404, detail="Media not found")
            
            # Soft delete
            await conn.execute(
                "UPDATE property_media SET deleted_at = NOW() WHERE id = $1",
                media_id
            )
            
            # If deleted was primary, set next one as primary
            if media_row["is_primary"]:
                next_primary = await conn.fetchval(
                    """
                    SELECT id FROM property_media 
                    WHERE property_id = $1 AND deleted_at IS NULL 
                    ORDER BY display_order 
                    LIMIT 1
                    """,
                    property_id
                )
                if next_primary:
                    await conn.execute(
                        "UPDATE property_media SET is_primary = true WHERE id = $1",
                        next_primary
                    )
            
            # Audit log
            await conn.execute(
                """
                INSERT INTO audit_logs 
                (user_id, action, entity_type, entity_id, ip_address, details)
                VALUES ($1, 'MEDIA_DELETED', 'property_media', $2, $3, $4)
                """,
                user_id,
                media_id,
                request.client.host if request.client else None,
                json.dumps({"property_id": str(property_id)})
            )
            
            return {"success": True, "message": "Media deleted"}


@router.put("/{property_id}/media/{media_id}/primary")
async def set_media_primary(
    property_id: UUID,
    media_id: UUID,
    request: Request,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Set a media item as the primary image.
    
    - Only property owner can set primary
    - Only allowed in DRAFT status
    """
    user_id = current_user["user_id"]
    
    async with db.acquire() as conn:
        async with conn.transaction():
            # Verify property ownership and status
            property_row = await conn.fetchrow(
                """
                SELECT id, seller_id, status::text 
                FROM properties 
                WHERE id = $1 AND deleted_at IS NULL
                """,
                property_id
            )
            
            if not property_row:
                raise HTTPException(status_code=404, detail="Property not found")
            
            if property_row["seller_id"] != user_id:
                raise HTTPException(status_code=403, detail="Not authorized")
            
            if property_row["status"] != "DRAFT":
                raise HTTPException(
                    status_code=400, 
                    detail="Can only modify media for properties in DRAFT status"
                )
            
            # Verify media exists and belongs to property
            media_row = await conn.fetchrow(
                """
                SELECT id FROM property_media 
                WHERE id = $1 AND property_id = $2 AND deleted_at IS NULL
                """,
                media_id,
                property_id
            )
            
            if not media_row:
                raise HTTPException(status_code=404, detail="Media not found")
            
            # Remove primary from all other media
            await conn.execute(
                """
                UPDATE property_media 
                SET is_primary = false 
                WHERE property_id = $1 AND deleted_at IS NULL
                """,
                property_id
            )
            
            # Set this one as primary
            await conn.execute(
                "UPDATE property_media SET is_primary = true WHERE id = $1",
                media_id
            )
            
            return {"success": True, "message": "Primary image updated"}


@router.get("/{property_id}/media")
async def list_media(
    property_id: UUID,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    List all media for a property.
    
    - Only property owner can list
    """
    user_id = current_user["user_id"]
    
    async with db.acquire() as conn:
        # Verify property ownership
        property_row = await conn.fetchrow(
            """
            SELECT id, seller_id 
            FROM properties 
            WHERE id = $1 AND deleted_at IS NULL
            """,
            property_id
        )
        
        if not property_row:
            raise HTTPException(status_code=404, detail="Property not found")
        
        if property_row["seller_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Get all media
        rows = await conn.fetch(
            """
            SELECT id, media_type::text, file_url, file_size_bytes, 
                   original_filename, display_order, is_primary, uploaded_at
            FROM property_media 
            WHERE property_id = $1 AND deleted_at IS NULL
            ORDER BY display_order
            """,
            property_id
        )
        
        media = [
            {
                "id": str(row["id"]),
                "media_type": row["media_type"],
                "file_url": row["file_url"],
                "file_size_bytes": row["file_size_bytes"],
                "original_filename": row["original_filename"],
                "display_order": row["display_order"],
                "is_primary": row["is_primary"],
                "uploaded_at": row["uploaded_at"].isoformat() if row["uploaded_at"] else None
            }
            for row in rows
        ]
        
        return {"media": media}
