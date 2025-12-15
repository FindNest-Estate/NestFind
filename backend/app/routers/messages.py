from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import List, Dict
from app.core.database import get_db
import app.models as models
import app.schemas as schemas
import app.routers.auth as auth
import json
from datetime import datetime

router = APIRouter(
    prefix="/messages",
    tags=["messages"]
)

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        # Map user_id to list of active websockets (for multiple devices/tabs)
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error sending message to user {user_id}: {e}")

manager = ConnectionManager()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int, db: Session = Depends(get_db)):
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Wait for messages from the client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # We expect message_data to contain 'receiver_id' and 'message_text'
            # In a real app, you'd validate this more strictly
            receiver_id = message_data.get('receiver_id')
            message_text = message_data.get('message_text')
            property_id = message_data.get('property_id')
            
            if receiver_id and message_text:
                # Save to DB
                new_message = models.Message(
                    sender_id=user_id,
                    receiver_id=receiver_id,
                    property_id=property_id,
                    message_text=message_text
                )
                db.add(new_message)
                db.commit()
                db.refresh(new_message)
                
                # Create Notification
                notification = models.Notification(
                    user_id=receiver_id,
                    triggered_by_id=user_id,
                    title="New Message",
                    message=f"You have a new message",
                    action_url=f"/dashboard/messages",
                    notification_type="NEW_MESSAGE",
                    related_entity_id=new_message.id,
                    related_entity_type="MESSAGE"
                )
                db.add(notification)
                db.commit()
                
                # Prepare payload
                payload = {
                    "id": new_message.id,
                    "sender_id": new_message.sender_id,
                    "receiver_id": new_message.receiver_id,
                    "message_text": new_message.message_text,
                    "created_at": new_message.created_at.isoformat(),
                    "is_read": new_message.is_read
                }
                
                # Send to receiver
                await manager.send_personal_message(payload, receiver_id)
                
                # Send back to sender (confirmation/update UI)
                await manager.send_personal_message(payload, user_id)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket, user_id)

@router.post("/", response_model=schemas.MessageOut)
async def send_message(
    message: schemas.MessageCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Verify receiver exists
    receiver = db.query(models.User).filter(models.User.id == message.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    new_message = models.Message(
        sender_id=current_user.id,
        receiver_id=message.receiver_id,
        property_id=message.property_id,
        message_text=message.message_text
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    # Create Notification
    notification = models.Notification(
        user_id=message.receiver_id,
        triggered_by_id=current_user.id,
        title="New Message",
        message=f"New message from {current_user.first_name}",
        action_url=f"/dashboard/messages",
        notification_type="NEW_MESSAGE",
        related_entity_id=new_message.id,
        related_entity_type="MESSAGE"
    )
    db.add(notification)
    db.commit()
    
    # Broadcast via WebSocket
    payload = {
        "id": new_message.id,
        "sender_id": new_message.sender_id,
        "receiver_id": new_message.receiver_id,
        "message_text": new_message.message_text,
        "created_at": new_message.created_at.isoformat(),
        "is_read": new_message.is_read
    }
    await manager.send_personal_message(payload, message.receiver_id)
    
    return new_message

@router.get("/conversation/{other_user_id}", response_model=List[schemas.MessageOut])
def get_conversation(
    other_user_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    messages = db.query(models.Message).filter(
        or_(
            and_(models.Message.sender_id == current_user.id, models.Message.receiver_id == other_user_id),
            and_(models.Message.sender_id == other_user_id, models.Message.receiver_id == current_user.id)
        )
    ).order_by(models.Message.created_at.asc()).all()
    
    return messages

@router.get("/conversations", response_model=List[schemas.ConversationOut])
def get_conversations(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # This is a bit complex in SQL. We want the latest message for each unique conversation partner.
    # For simplicity in this MVP, we'll fetch all messages involving the user and process in Python.
    # In production, use a proper SQL GROUP BY query.
    
    all_messages = db.query(models.Message).filter(
        or_(models.Message.sender_id == current_user.id, models.Message.receiver_id == current_user.id)
    ).order_by(models.Message.created_at.desc()).all()
    
    conversations = {}
    for msg in all_messages:
        partner_id = msg.receiver_id if msg.sender_id == current_user.id else msg.sender_id
        if partner_id not in conversations:
            partner = msg.receiver if msg.sender_id == current_user.id else msg.sender
            conversations[partner_id] = {
                "partner": partner,
                "last_message": msg
            }
            
    return [
        {"partner": data["partner"], "last_message": data["last_message"]}
        for data in conversations.values()
    ]
