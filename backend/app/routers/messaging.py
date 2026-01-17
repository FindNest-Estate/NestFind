"""
Messaging Router - API endpoints for buyer-agent messaging.

Endpoints:
- GET /conversations - List user's conversations
- GET /conversations/{id}/messages - Get messages
- POST /conversations - Start new conversation
- POST /conversations/{id}/messages - Send message
- PUT /conversations/{id}/read - Mark messages read
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID

from ..services.messaging_service import MessagingService
from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..core.database import get_db_pool


router = APIRouter(prefix="/conversations", tags=["Messaging"])


# ============================================================================
# SCHEMAS
# ============================================================================

class OtherParty(BaseModel):
    id: str
    name: str
    email: str
    role: str


class ConversationItem(BaseModel):
    id: str
    property_id: Optional[str]
    property_title: Optional[str]
    other_party: OtherParty
    last_message: Optional[str]
    last_message_at: Optional[str]
    unread_count: int
    updated_at: str


class ConversationListResponse(BaseModel):
    conversations: List[ConversationItem]
    pagination: dict


class MessageItem(BaseModel):
    id: str
    sender_id: str
    sender_name: str
    content: str
    is_own: bool
    read_at: Optional[str]
    created_at: str


class MessageListResponse(BaseModel):
    messages: List[MessageItem]
    pagination: dict


class StartConversationRequest(BaseModel):
    agent_id: str
    property_id: Optional[str] = None


class StartConversationResponse(BaseModel):
    conversation_id: str
    is_new: bool


class SendMessageRequest(BaseModel):
    content: str


class SendMessageResponse(BaseModel):
    success: bool
    message_id: str


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("", response_model=ConversationListResponse)
async def list_conversations(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """Get all conversations for current user."""
    service = MessagingService(db_pool)
    result = await service.get_user_conversations(
        user_id=current_user.user_id,
        page=page,
        per_page=per_page
    )
    
    return ConversationListResponse(
        conversations=[ConversationItem(**c) for c in result["conversations"]],
        pagination=result["pagination"]
    )


@router.post("", response_model=StartConversationResponse)
async def start_conversation(
    body: StartConversationRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """Start a new conversation with an agent."""
    service = MessagingService(db_pool)
    result = await service.get_or_create_conversation(
        user_id=current_user.user_id,
        agent_id=UUID(body.agent_id),
        property_id=UUID(body.property_id) if body.property_id else None
    )
    
    return StartConversationResponse(
        conversation_id=result["conversation_id"],
        is_new=result["is_new"]
    )


@router.get("/{conversation_id}/messages", response_model=MessageListResponse)
async def get_messages(
    conversation_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """Get messages in a conversation."""
    service = MessagingService(db_pool)
    result = await service.get_messages(
        conversation_id=conversation_id,
        user_id=current_user.user_id,
        page=page,
        per_page=per_page
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=result.get("code", 500),
            detail=result.get("error")
        )
    
    return MessageListResponse(
        messages=[MessageItem(**m) for m in result["messages"]],
        pagination=result["pagination"]
    )


@router.post("/{conversation_id}/messages", response_model=SendMessageResponse)
async def send_message(
    conversation_id: UUID,
    body: SendMessageRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """Send a message in a conversation."""
    service = MessagingService(db_pool)
    result = await service.send_message(
        conversation_id=conversation_id,
        sender_id=current_user.user_id,
        content=body.content
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=result.get("code", 500),
            detail=result.get("error")
        )
    
    return SendMessageResponse(
        success=True,
        message_id=result["message_id"]
    )


@router.put("/{conversation_id}/read")
async def mark_read(
    conversation_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """Mark messages in conversation as read."""
    service = MessagingService(db_pool)
    result = await service.mark_messages_read(
        conversation_id=conversation_id,
        user_id=current_user.user_id
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=result.get("code", 500),
            detail=result.get("error")
        )
    
    return {"success": True}
