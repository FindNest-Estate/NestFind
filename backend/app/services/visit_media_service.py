"""
Visit Media Service for uploading and managing visit documentation images.
"""
from typing import Dict, Any, Optional, List
from uuid import UUID
from pathlib import Path
import os
import uuid as uuid_module
import asyncpg
from fastapi import UploadFile


class VisitMediaService:
    """Service for managing visit documentation images."""
    
    UPLOAD_DIR = Path("uploads/visits")
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
    ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
    VALID_IMAGE_TYPES = ["PROPERTY", "MEETING", "DOCUMENT", "OTHER"]
    
    def __init__(self, db: asyncpg.Pool):
        self.db = db
    
    def _ensure_upload_dir(self, visit_id: str) -> Path:
        """Create upload directory for visit if it doesn't exist."""
        visit_dir = self.UPLOAD_DIR / visit_id
        visit_dir.mkdir(parents=True, exist_ok=True)
        return visit_dir
    
    async def upload_image(
        self,
        visit_id: UUID,
        user_id: UUID,
        file: UploadFile,
        image_type: Optional[str] = None,
        caption: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Upload a visit documentation image.
        
        Both agent and buyer can upload images for their visit.
        """
        async with self.db.acquire() as conn:
            # Verify access
            visit = await conn.fetchrow("""
                SELECT buyer_id, agent_id, status FROM visit_requests WHERE id = $1
            """, visit_id)
            
            if not visit:
                return {"success": False, "error": "Visit not found"}
            
            is_buyer = visit['buyer_id'] == user_id
            is_agent = visit['agent_id'] == user_id
            
            if not is_buyer and not is_agent:
                return {"success": False, "error": "Access denied"}
            
            role = "AGENT" if is_agent else "BUYER"
            
            # Validate file type
            content_type = file.content_type or ""
            if content_type not in self.ALLOWED_TYPES:
                return {"success": False, "error": f"Invalid file type. Allowed: {', '.join(self.ALLOWED_TYPES)}"}
            
            # Check file extension
            ext = Path(file.filename or "").suffix.lower()
            if ext not in self.ALLOWED_EXTENSIONS:
                return {"success": False, "error": f"Invalid file extension. Allowed: {', '.join(self.ALLOWED_EXTENSIONS)}"}
            
            # Read file content
            content = await file.read()
            file_size = len(content)
            
            if file_size > self.MAX_IMAGE_SIZE:
                return {"success": False, "error": f"File too large. Maximum size: {self.MAX_IMAGE_SIZE // (1024*1024)}MB"}
            
            # Validate image type
            if image_type and image_type.upper() not in self.VALID_IMAGE_TYPES:
                image_type = "OTHER"
            elif image_type:
                image_type = image_type.upper()
            
            # Generate unique filename
            unique_id = str(uuid_module.uuid4())[:8]
            safe_filename = f"{unique_id}{ext}"
            
            # Ensure directory exists and save file
            visit_dir = self._ensure_upload_dir(str(visit_id))
            file_path = visit_dir / safe_filename
            
            with open(file_path, "wb") as f:
                f.write(content)
            
            # Generate URL (relative path for serving)
            file_url = f"/uploads/visits/{visit_id}/{safe_filename}"
            
            # Store in database
            image_id = await conn.fetchval("""
                INSERT INTO visit_images (
                    visit_id, uploaded_by, uploader_role, image_type,
                    file_url, file_name, file_size, caption
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
            """, visit_id, user_id, role, image_type,
                file_url, file.filename, file_size, caption)
            
            return {
                "success": True,
                "image": {
                    "id": str(image_id),
                    "file_url": file_url,
                    "file_name": file.filename,
                    "file_size": file_size,
                    "image_type": image_type,
                    "caption": caption,
                    "uploader_role": role
                }
            }
    
    async def get_visit_images(
        self,
        visit_id: UUID,
        user_id: UUID
    ) -> Dict[str, Any]:
        """
        Get all images for a visit.
        
        Both agent and buyer can view images from their visit.
        """
        async with self.db.acquire() as conn:
            # Verify access
            visit = await conn.fetchrow("""
                SELECT buyer_id, agent_id FROM visit_requests WHERE id = $1
            """, visit_id)
            
            if not visit:
                return {"success": False, "error": "Visit not found"}
            
            if visit['buyer_id'] != user_id and visit['agent_id'] != user_id:
                return {"success": False, "error": "Access denied"}
            
            # Get images
            rows = await conn.fetch("""
                SELECT id, uploader_role, image_type, file_url, file_name,
                       file_size, caption, created_at
                FROM visit_images
                WHERE visit_id = $1 AND deleted_at IS NULL
                ORDER BY created_at DESC
            """, visit_id)
            
            images = [
                {
                    "id": str(row['id']),
                    "uploader_role": row['uploader_role'],
                    "image_type": row['image_type'],
                    "file_url": row['file_url'],
                    "file_name": row['file_name'],
                    "file_size": row['file_size'],
                    "caption": row['caption'],
                    "created_at": row['created_at'].isoformat()
                }
                for row in rows
            ]
            
            return {
                "success": True,
                "images": images,
                "total": len(images)
            }
    
    async def delete_image(
        self,
        image_id: UUID,
        user_id: UUID
    ) -> Dict[str, Any]:
        """
        Soft delete an image.
        
        Only the uploader can delete their image.
        """
        async with self.db.acquire() as conn:
            # Verify ownership
            image = await conn.fetchrow("""
                SELECT id, uploaded_by FROM visit_images WHERE id = $1 AND deleted_at IS NULL
            """, image_id)
            
            if not image:
                return {"success": False, "error": "Image not found"}
            
            if image['uploaded_by'] != user_id:
                return {"success": False, "error": "Access denied. You can only delete your own images."}
            
            # Soft delete
            await conn.execute("""
                UPDATE visit_images SET deleted_at = NOW() WHERE id = $1
            """, image_id)
            
            return {
                "success": True,
                "message": "Image deleted successfully"
            }
