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


def compute_agent_stats(db: Session, agent: models.User):
    # Reviews
    reviews = db.query(models.Review).filter(models.Review.reviewee_id == agent.id).all()
    review_count = len(reviews)
    avg_rating = sum([r.rating for r in reviews]) / review_count if review_count > 0 else 0.0
    
    # Sales (Completed bookings where user is agent) OR Properties with status 'SOLD'
    # For now, let's count completed visits as 'deals/sales' proxy or check specific Deal Completion logic if exists.
    # We'll use Properties sold for better accuracy
    sales_count = db.query(models.Property).filter(
        models.Property.user_id == agent.id, 
        models.Property.status == 'sold'
    ).count()
    
    # Active Listings
    active_listings_count = db.query(models.Property).filter(
        models.Property.user_id == agent.id,
        models.Property.status != 'sold'
    ).count()

    # Clients (Unique buyers from bookings)
    clients_count = db.query(models.Booking.user_id).filter(
        models.Booking.agent_id == agent.id
    ).distinct().count()

    agent.review_count = review_count
    agent.average_rating = round(avg_rating, 1)
    agent.sales_count = sales_count
    agent.clients_count = clients_count
    agent.active_listings_count = active_listings_count
    return agent

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
            # Compute real stats before adding
            compute_agent_stats(db, agent)
            nearby_agents.append(agent)
            
    # Sort by distance (closest first)
    nearby_agents.sort(key=lambda x: haversine(lng, lat, x.longitude, x.latitude))
    
    return nearby_agents

@router.get("/all", response_model=List[schemas.UserOut])
def list_all_agents(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
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
    
    if search:
        search_term = f"%{search}%"
        from sqlalchemy import or_
        query = query.filter(
            or_(
                models.User.first_name.ilike(search_term),
                models.User.last_name.ilike(search_term),
                models.User.agency_name.ilike(search_term),
                models.User.specialty.ilike(search_term)
            )
        )

    if specialty:
        query = query.filter(models.User.specialty.ilike(f"%{specialty}%"))
    
    if max_commission:
        query = query.filter(models.User.commission_rate <= max_commission)
    
    # Order by availability first, then by id
    query = query.order_by(models.User.is_available.desc(), models.User.id.desc())
    
    agents = query.offset(skip).limit(limit).all()
    
    # Compute stats
    for agent in agents:
        compute_agent_stats(db, agent)
        
    return agents

@router.get("/client-requests", response_model=List[schemas.AgentClientOut])
def get_client_requests(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all hire requests for the current agent.
    """
    if current_user.role != "agent":
        raise HTTPException(status_code=403, detail="Only agents can view requests")
        
    requests = db.query(models.AgentClient).filter(
        models.AgentClient.agent_id == current_user.id
    ).order_by(models.AgentClient.created_at.desc()).all()
    
    return requests

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
    
    compute_agent_stats(db, agent)
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

@router.post("/{agent_id}/hire", response_model=schemas.AgentClientOut)
def hire_agent(
    agent_id: int,
    hire_data: schemas.AgentClientCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 1: Client requests to hire an agent.
    """
    agent = db.query(models.User).filter(models.User.id == agent_id, models.User.role == "agent").first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    # Check if already exists
    existing = db.query(models.AgentClient).filter(
        models.AgentClient.agent_id == agent_id,
        models.AgentClient.client_id == current_user.id,
        models.AgentClient.status.in_(['REQUESTED', 'OFFER_SENT', 'ACTIVE'])
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Active request already exists")

    new_request = models.AgentClient(
        agent_id=agent_id,
        client_id=current_user.id,
        service_type=hire_data.service_type,
        property_preferences=hire_data.property_preferences,
        initial_message=hire_data.initial_message,
        status="REQUESTED"
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    
    # Notify Agent
    notification = models.Notification(
        user_id=agent_id,
        triggered_by_id=current_user.id,
        title="New Hire Request",
        message=f"{current_user.first_name} wants to hire you for {hire_data.service_type}.",
        notification_type="HIRE_REQUEST",
        priority="URGENT",
        related_entity_id=new_request.id,
        related_entity_type="AGENT_CLIENT"
    )
    db.add(notification)
    db.commit()
    
    return new_request


@router.post("/client-requests/{request_id}/propose", response_model=schemas.AgentClientOut)
def propose_terms(
    request_id: int,
    proposal: schemas.AgentClientUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 2: Agent proposes commission and terms.
    """
    request = db.query(models.AgentClient).filter(models.AgentClient.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if request.agent_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if not proposal.commission_rate:
        raise HTTPException(status_code=400, detail="Commission rate required")
        
    request.commission_rate = proposal.commission_rate
    request.status = "OFFER_SENT"
    
    db.commit()
    db.refresh(request)
    
    # Notify Client
    notification = models.Notification(
        user_id=request.client_id,
        triggered_by_id=current_user.id,
        title="Agent sent a proposal",
        message=f"{current_user.first_name} has proposed {proposal.commission_rate}% commission.",
        notification_type="HIRE_PROPOSAL",
        priority="HIGH",
        related_entity_id=request.id,
        related_entity_type="AGENT_CLIENT"
    )
    db.add(notification)
    db.commit()
    
    return request

@router.post("/client-requests/{request_id}/accept", response_model=schemas.AgentClientOut)
def accept_proposal(
    request_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 3: Client accepts the terms. Contract generated.
    """
    request = db.query(models.AgentClient).filter(models.AgentClient.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if request.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if request.status != "OFFER_SENT":
        raise HTTPException(status_code=400, detail="No active offer to accept")
        
    request.status = "ACTIVE"
    request.contract_url = f"https://nestfind.com/contracts/{request.id}.pdf" # Mock PDF generation
    
    db.commit()
    db.refresh(request)
    
    # Notify Agent
    notification = models.Notification(
        user_id=request.agent_id,
        triggered_by_id=current_user.id,
        title="New Client Active!",
        message=f"{current_user.first_name} has accepted your proposal.",
        notification_type="HIRE_ACCEPTED",
        priority="URGENT",
        related_entity_id=request.id,
        related_entity_type="AGENT_CLIENT"
    )
    db.add(notification)
    db.commit()
    
    return request
