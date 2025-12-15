from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
import app.models as models
import app.schemas as schemas
from app.routers.auth import get_current_user
from typing import List, Optional
from math import radians, cos, sin, asin, sqrt

router = APIRouter(
    prefix="/agents",
    tags=["agents"]
)

def haversine(lon1, lat1, lon2, lat2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    """
    # convert decimal degrees to radians 
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])

    # haversine formula 
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a)) 
    r = 6371 # Radius of earth in kilometers. Use 3956 for miles
    return c * r

@router.get("/nearby", response_model=List[schemas.UserOut])
def find_nearby_agents(
    lat: float, 
    lng: float, 
    radius: float = 50.0, 
    db: Session = Depends(get_db)
):
    """
    Find agents within a specific radius (km) of the given coordinates.
    """
    # 1. Get all active agents
    agents = db.query(models.User).filter(
        models.User.role == "agent",
        models.User.is_active == True,
        models.User.is_available == True,
        models.User.latitude.isnot(None),
        models.User.longitude.isnot(None)
    ).all()
    
    nearby_agents = []
    
    for agent in agents:
        # 2. Calculate distance
        dist = haversine(lng, lat, agent.longitude, agent.latitude)
        
        # 3. Check if within radius AND within agent's service radius
        if dist <= radius and dist <= (agent.service_radius or 50):
            # Add distance to agent object (optional, if schema supports it)
            # For now, just return the agent
            nearby_agents.append(agent)
            
    # Sort by distance (closest first)
    nearby_agents.sort(key=lambda x: haversine(lng, lat, x.longitude, x.latitude))
    
    return nearby_agents

@router.get("/all", response_model=List[schemas.UserOut])
def list_all_agents(
    skip: int = 0,
    limit: int = 20,
    specialty: Optional[str] = None,
    min_rating: Optional[float] = None,
    max_commission: Optional[float] = None,
    available_only: bool = False,
    db: Session = Depends(get_db)
):
    """
    List all verified agents with optional filters.
    """
    query = db.query(models.User).filter(
        models.User.role == "agent",
        models.User.is_active == True
    )
    
    if available_only:
        query = query.filter(models.User.is_available == True)
    
    if specialty:
        query = query.filter(models.User.specialty.ilike(f"%{specialty}%"))
    
    if max_commission:
        query = query.filter(models.User.commission_rate <= max_commission)
    
    # Order by availability first, then by id
    query = query.order_by(models.User.is_available.desc(), models.User.id.desc())
    
    agents = query.offset(skip).limit(limit).all()
    return agents

@router.get("/{agent_id}", response_model=schemas.UserOut)
def get_agent_by_id(
    agent_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a single agent's details by ID.
    """
    agent = db.query(models.User).filter(
        models.User.id == agent_id,
        models.User.role == "agent",
        models.User.is_active == True
    ).first()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return agent

@router.put("/profile", response_model=schemas.UserOut)
def update_agent_profile(
    profile_data: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update agent's profile including location and service details.
    """
    if current_user.role != "agent":
        raise HTTPException(status_code=403, detail="Only agents can update these details")
        
    for key, value in profile_data.dict(exclude_unset=True).items():
        setattr(current_user, key, value)
        
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/{agent_id}/hire")
def hire_agent(
    agent_id: int,
    message: str = "I would like to hire you for my property needs.",
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    'Hire' an agent by sending a high-priority message/notification.
    """
    agent = db.query(models.User).filter(models.User.id == agent_id, models.User.role == "agent").first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    # 1. Create a Message
    new_message = models.Message(
        sender_id=current_user.id,
        receiver_id=agent_id,
        message_text=f"[HIRE REQUEST] {message}",
        is_read=False
    )
    db.add(new_message)
    
    # 2. Create a Notification
    notification = models.Notification(
        user_id=agent_id,
        triggered_by_id=current_user.id,
        title="New Hire Request!",
        message=f"{current_user.first_name} wants to hire you: {message[:50]}...",
        notification_type="HIRE_REQUEST",
        priority="URGENT",
        related_entity_id=current_user.id, # Link to user profile for now
        related_entity_type="USER"
    )
    db.add(notification)
    
    db.commit()
    
    return {"status": "success", "message": "Hire request sent successfully"}
