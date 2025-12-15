from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.utils.ai_client import generate_text
from app.routers.auth import get_current_user
import app.models as models

router = APIRouter(
    prefix="/ai",
    tags=["ai"]
)

class DescriptionRequest(BaseModel):
    features: str
    tone: str
    property_type: str

class PriceEstimateRequest(BaseModel):
    location: str
    sqft: float
    bhk: int
    property_type: str

@router.post("/generate-description")
def generate_description(request: DescriptionRequest, current_user: models.User = Depends(get_current_user)):
    if current_user.role != "agent":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    prompt = f"""
    Write a {request.tone} real estate property description for a {request.property_type}.
    Key Features: {request.features}.
    
    The description should be engaging, highlight the key features, and be suitable for a property listing.
    Do not include any introductory text like "Here is a description", just output the description itself.
    """
    
    # Using llama3.1:8b as it's good for general text generation
    description = generate_text("llama3.1:8b", prompt, system_prompt="You are a professional real estate copywriter.")
    
    return {"description": description}

@router.post("/estimate-price")
def estimate_price(request: PriceEstimateRequest, current_user: models.User = Depends(get_current_user)):
    if current_user.role != "agent":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    prompt = f"""
    Estimate the price range for a {request.property_type} in {request.location}.
    Details: {request.sqft} sqft, {request.bhk} BHK.
    
    Provide a realistic price range in INR (Indian Rupees) based on general market knowledge for this location.
    Also provide a brief explanation of the factors influencing this estimate.
    
    Format the output exactly as follows:
    Price Range: [Min Price] - [Max Price]
    Explanation: [Your explanation]
    """
    
    # Using mistral:7b as it's decent at reasoning/knowledge
    result = generate_text("mistral:7b", prompt, system_prompt="You are a real estate market analyst for India.")
    
    return {"estimate": result}
