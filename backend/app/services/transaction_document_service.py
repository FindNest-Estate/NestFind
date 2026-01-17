"""
Transaction Document Service for managing document uploads and verification.

Handles:
- Document uploads by buyer, seller, agent
- Agreement signing tracking
- Admin verification of documents
"""
from typing import Dict, Any, Optional, List
from uuid import UUID
from datetime import datetime, timezone
import asyncpg


# Valid document types
DOCUMENT_TYPES = [
    'NESTFIND_AGREEMENT',
    'REGISTRATION_CERTIFICATE',
    'SALE_DEED',
    'VERIFICATION_PHOTO',
    'ID_PROOF',
    'OTHER'
]

# Required documents per role
REQUIRED_DOCUMENTS = {
    'BUYER': ['NESTFIND_AGREEMENT', 'REGISTRATION_CERTIFICATE'],
    'SELLER': ['NESTFIND_AGREEMENT', 'SALE_DEED'],
    'AGENT': ['VERIFICATION_PHOTO']
}


class TransactionDocumentService:
    """Service for managing transaction documents and signatures."""
    
    def __init__(self, db: asyncpg.Pool):
        self.db = db
    
    async def upload_document(
        self,
        transaction_id: UUID,
        uploader_id: UUID,
        uploader_role: str,
        document_type: str,
        file_url: str,
        file_name: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Upload a document for a transaction.
        
        Validates:
        - Transaction exists and user is a party
        - Document type is valid
        - Transaction is in appropriate status
        """
        if document_type not in DOCUMENT_TYPES:
            return {"success": False, "error": f"Invalid document type. Must be one of: {DOCUMENT_TYPES}"}
        
        if uploader_role not in ['BUYER', 'SELLER', 'AGENT']:
            return {"success": False, "error": "Invalid uploader role"}
        
        async with self.db.acquire() as conn:
            # Verify transaction and access
            transaction = await conn.fetchrow("""
                SELECT t.*, 
                       t.buyer_id, t.seller_id, t.agent_id,
                       t.status
                FROM transactions t
                WHERE t.id = $1
            """, transaction_id)
            
            if not transaction:
                return {"success": False, "error": "Transaction not found"}
            
            # Verify uploader is the correct party
            role_to_id = {
                'BUYER': transaction['buyer_id'],
                'SELLER': transaction['seller_id'],
                'AGENT': transaction['agent_id']
            }
            
            if role_to_id.get(uploader_role) != uploader_id:
                return {"success": False, "error": "You are not authorized to upload as this role"}
            
            # Check transaction status allows uploads
            allowed_statuses = ['SELLER_PAID', 'DOCUMENTS_PENDING', 'ADMIN_REVIEW']
            if transaction['status'] not in allowed_statuses:
                return {
                    "success": False, 
                    "error": f"Documents cannot be uploaded in {transaction['status']} status"
                }
            
            # Insert document
            doc = await conn.fetchrow("""
                INSERT INTO transaction_documents (
                    transaction_id, uploader_id, uploader_role,
                    document_type, file_url, file_name
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, uploaded_at
            """, transaction_id, uploader_id, uploader_role,
                document_type, file_url, file_name)
            
            # Check if all required documents are uploaded
            await self._check_and_update_status(conn, transaction_id)
            
            return {
                "success": True,
                "document": {
                    "id": str(doc['id']),
                    "transaction_id": str(transaction_id),
                    "document_type": document_type,
                    "file_url": file_url,
                    "uploaded_at": doc['uploaded_at'].isoformat()
                }
            }
    
    async def _check_and_update_status(self, conn, transaction_id: UUID):
        """Check if all required documents are uploaded and update status."""
        # Get current documents
        docs = await conn.fetch("""
            SELECT uploader_role, document_type 
            FROM transaction_documents 
            WHERE transaction_id = $1
        """, transaction_id)
        
        # Group by role
        uploaded = {}
        for doc in docs:
            role = doc['uploader_role']
            if role not in uploaded:
                uploaded[role] = set()
            uploaded[role].add(doc['document_type'])
        
        # Check if all required docs are present
        all_uploaded = True
        for role, required_types in REQUIRED_DOCUMENTS.items():
            role_docs = uploaded.get(role, set())
            if not all(req in role_docs for req in required_types):
                all_uploaded = False
                break
        
        if all_uploaded:
            # Move to ADMIN_REVIEW
            await conn.execute("""
                UPDATE transactions SET status = 'ADMIN_REVIEW'
                WHERE id = $1 AND status = 'DOCUMENTS_PENDING'
            """, transaction_id)
    
    async def get_documents(
        self,
        transaction_id: UUID,
        user_id: UUID
    ) -> Dict[str, Any]:
        """Get all documents for a transaction."""
        async with self.db.acquire() as conn:
            # Verify access
            transaction = await conn.fetchrow("""
                SELECT buyer_id, seller_id, agent_id
                FROM transactions WHERE id = $1
            """, transaction_id)
            
            if not transaction:
                return {"success": False, "error": "Transaction not found"}
            
            # Check if user is admin or party to transaction
            is_party = user_id in [
                transaction['buyer_id'], 
                transaction['seller_id'], 
                transaction['agent_id']
            ]
            
            # Check if admin
            is_admin = await conn.fetchval("""
                SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND role = 'admin')
            """, user_id)
            
            if not is_party and not is_admin:
                return {"success": False, "error": "Access denied"}
            
            # Fetch documents
            docs = await conn.fetch("""
                SELECT 
                    d.id, d.uploader_id, d.uploader_role,
                    d.document_type, d.file_url, d.file_name,
                    d.admin_verified, d.admin_notes, d.uploaded_at,
                    u.full_name as uploader_name
                FROM transaction_documents d
                JOIN users u ON u.id = d.uploader_id
                WHERE d.transaction_id = $1
                ORDER BY d.uploaded_at DESC
            """, transaction_id)
            
            return {
                "success": True,
                "documents": [
                    {
                        "id": str(d['id']),
                        "uploader_id": str(d['uploader_id']),
                        "uploader_name": d['uploader_name'],
                        "uploader_role": d['uploader_role'],
                        "document_type": d['document_type'],
                        "file_url": d['file_url'],
                        "file_name": d['file_name'],
                        "admin_verified": d['admin_verified'],
                        "admin_notes": d['admin_notes'],
                        "uploaded_at": d['uploaded_at'].isoformat()
                    }
                    for d in docs
                ],
                "required": REQUIRED_DOCUMENTS
            }
    
    async def admin_verify_document(
        self,
        document_id: UUID,
        admin_id: UUID,
        approved: bool,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Admin verifies/rejects a document."""
        async with self.db.acquire() as conn:
            # Verify admin role
            is_admin = await conn.fetchval("""
                SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND role = 'admin')
            """, admin_id)
            
            if not is_admin:
                return {"success": False, "error": "Admin access required"}
            
            # Update document
            result = await conn.execute("""
                UPDATE transaction_documents
                SET admin_verified = $2,
                    admin_verified_by = $3,
                    admin_verified_at = NOW(),
                    admin_notes = $4
                WHERE id = $1
            """, document_id, approved, admin_id, notes)
            
            if result == 'UPDATE 0':
                return {"success": False, "error": "Document not found"}
            
            return {
                "success": True,
                "message": f"Document {'approved' if approved else 'rejected'}"
            }
    
    async def sign_agreement(
        self,
        transaction_id: UUID,
        user_id: UUID,
        role: str,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Record digital signature of NestFind agreement."""
        if role not in ['BUYER', 'SELLER', 'AGENT']:
            return {"success": False, "error": "Invalid role"}
        
        async with self.db.acquire() as conn:
            # Verify transaction and role
            transaction = await conn.fetchrow("""
                SELECT buyer_id, seller_id, agent_id, status,
                       buyer_signed_at, seller_signed_at, agent_signed_at
                FROM transactions WHERE id = $1
            """, transaction_id)
            
            if not transaction:
                return {"success": False, "error": "Transaction not found"}
            
            role_to_id = {
                'BUYER': transaction['buyer_id'],
                'SELLER': transaction['seller_id'],
                'AGENT': transaction['agent_id']
            }
            
            if role_to_id.get(role) != user_id:
                return {"success": False, "error": "You cannot sign as this role"}
            
            # Update signature timestamp
            column = f"{role.lower()}_signed_at"
            await conn.execute(f"""
                UPDATE transactions SET {column} = NOW()
                WHERE id = $1
            """, transaction_id)
            
            # Check if all signed
            updated = await conn.fetchrow("""
                SELECT buyer_signed_at, seller_signed_at, agent_signed_at
                FROM transactions WHERE id = $1
            """, transaction_id)
            
            all_signed = (
                updated['buyer_signed_at'] is not None and
                updated['seller_signed_at'] is not None and
                updated['agent_signed_at'] is not None
            )
            
            return {
                "success": True,
                "message": f"{role.title()} signature recorded",
                "all_signed": all_signed,
                "signatures": {
                    "buyer": updated['buyer_signed_at'] is not None,
                    "seller": updated['seller_signed_at'] is not None,
                    "agent": updated['agent_signed_at'] is not None
                }
            }
    
    async def check_all_signed(self, transaction_id: UUID) -> bool:
        """Check if all parties have signed the agreement."""
        async with self.db.acquire() as conn:
            result = await conn.fetchrow("""
                SELECT buyer_signed_at, seller_signed_at, agent_signed_at
                FROM transactions WHERE id = $1
            """, transaction_id)
            
            if not result:
                return False
            
            return (
                result['buyer_signed_at'] is not None and
                result['seller_signed_at'] is not None and
                result['agent_signed_at'] is not None
            )
