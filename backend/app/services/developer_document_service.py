"""
Developer Document Service — Project document upload/management.
"""
import os
import json
import uuid
from pathlib import Path
from uuid import UUID
from typing import Optional


UPLOADS_BASE = Path("uploads/developer")


class DeveloperDocumentService:
    def __init__(self, pool):
        self.pool = pool

    async def save_document(
        self,
        developer_id: UUID,
        project_id: Optional[UUID],
        doc_type: str,
        doc_name: str,
        file_content: bytes,
        mime_type: str,
    ) -> dict:
        """Save a document file and create DB record."""
        try:
            # Determine save path
            if project_id:
                save_dir = UPLOADS_BASE / str(developer_id) / str(project_id)
            else:
                save_dir = UPLOADS_BASE / str(developer_id)

            save_dir.mkdir(parents=True, exist_ok=True)

            ext = self._ext_from_mime(mime_type)
            filename = f"{uuid.uuid4()}{ext}"
            filepath = save_dir / filename
            filepath.write_bytes(file_content)

            file_url = f"/uploads/developer/{developer_id}/{project_id or ''}/{filename}".replace("//", "/")

            async with self.pool.acquire() as conn:
                doc = await conn.fetchrow(
                    """
                    INSERT INTO dev_documents (
                        developer_id, project_id, doc_type, doc_name,
                        file_url, file_size_bytes, mime_type
                    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
                    RETURNING *
                    """,
                    developer_id, project_id, doc_type, doc_name,
                    file_url, len(file_content), mime_type
                )

                await conn.execute(
                    """
                    INSERT INTO dev_audit_logs (developer_id, actor_id, action, entity_type, entity_id, details)
                    VALUES ($1,$1,'DOCUMENT_UPLOADED','dev_documents',$2,$3::jsonb)
                    """,
                    developer_id, doc["id"],
                    json.dumps({"doc_name": doc_name, "doc_type": doc_type})
                )

                return {"success": True, "data": dict(doc)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def list_documents(
        self,
        developer_id: UUID,
        project_id: Optional[UUID] = None,
        doc_type: Optional[str] = None,
        page: int = 1,
        per_page: int = 50,
    ) -> dict:
        """List documents with optional filters."""
        try:
            offset = (page - 1) * per_page
            filters = ["d.developer_id = $1", "d.is_deleted = FALSE"]
            params = [developer_id]
            idx = 2

            if project_id:
                filters.append(f"d.project_id = ${idx}")
                params.append(project_id)
                idx += 1
            if doc_type:
                filters.append(f"d.doc_type = ${idx}")
                params.append(doc_type)
                idx += 1

            where = " AND ".join(filters)

            async with self.pool.acquire() as conn:
                total = await conn.fetchval(
                    f"SELECT COUNT(*) FROM dev_documents d WHERE {where}", *params
                )
                rows = await conn.fetch(
                    f"""
                    SELECT d.*, p.project_name
                    FROM dev_documents d
                    LEFT JOIN dev_projects p ON p.id = d.project_id
                    WHERE {where}
                    ORDER BY d.uploaded_at DESC
                    LIMIT ${idx} OFFSET ${idx+1}
                    """,
                    *params, per_page, offset
                )

            return {
                "success": True,
                "data": [dict(r) for r in rows],
                "total": total,
                "page": page,
                "per_page": per_page,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def delete_document(self, doc_id: UUID, developer_id: UUID) -> dict:
        """Soft-delete a document."""
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(
                    "UPDATE dev_documents SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1 AND developer_id = $2 RETURNING id",
                    doc_id, developer_id
                )
                if not row:
                    return {"success": False, "error": "Document not found or access denied"}
                return {"success": True, "message": "Document deleted"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _ext_from_mime(self, mime_type: str) -> str:
        mapping = {
            "application/pdf": ".pdf",
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "application/msword": ".doc",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
        }
        return mapping.get(mime_type, ".bin")
