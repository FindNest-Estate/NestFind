from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
import app.models as models
import app.schemas as schemas
from app.routers.auth import get_current_user
from datetime import datetime, timedelta
from sqlalchemy import func

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"]
)

@router.get("/agent/stats")
def get_agent_stats(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "agent":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Active Listings (Count of properties that are not sold/hidden)
    active_listings = db.query(models.Property).filter(
        models.Property.user_id == current_user.id,
        models.Property.status.in_(['active', 'pending', 'reserved'])
    ).count()
    
    # Total Leads (Unique users who have booked a visit)
    total_leads = db.query(models.Booking.user_id).join(models.Property).filter(
        models.Property.user_id == current_user.id
    ).distinct().count()
    
    # Total Views (Unique users who have viewed the properties)
    total_views = db.query(models.RecentlyViewed.user_id).join(models.Property).filter(
        models.Property.user_id == current_user.id
    ).distinct().count()
    
    return {
        "active_listings": active_listings,
        "total_leads": total_leads,
        "total_views": total_views
    }

@router.get("/buyer/stats")
def get_buyer_stats(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Favorites Count
    favorites_count = db.query(models.Favorite).filter(models.Favorite.user_id == current_user.id).count()
    
    # Bookings Count
    bookings_count = db.query(models.Booking).filter(models.Booking.user_id == current_user.id).count()
    
    return {
        "favorites_count": favorites_count,
        "bookings_count": bookings_count
    }

@router.get("/agent/finance")
def get_agent_finance(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "agent":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Query Commissions for this agent's properties
    # Join Commission -> Offer -> Property -> User (Agent)
    query = db.query(models.Commission).join(models.Offer).join(models.Property).filter(
        models.Property.user_id == current_user.id
    )
    
    commissions = query.all()
    
    total_earned = sum(c.agent_share for c in commissions if c.payout_status == 'PAID')
    pending_clearance = sum(c.agent_share for c in commissions if c.payout_status == 'PENDING')
    
    # Get recent transactions (Paid commissions)
    recent_transactions = []
    for c in commissions:
        if c.payout_status == 'PAID':
            recent_transactions.append({
                "id": c.id,
                "amount": c.agent_share,
                "property_title": c.offer.property.title,
                "date": c.created_at, # Ideally this should be payout date, but we might not have it stored on Commission model directly yet, using created_at for now or we can check AuditLog
                "status": "PAID",
                "reference": f"PAY-{c.id}" # Placeholder or fetch from audit log if needed
            })
            
    # Sort by date desc
    recent_transactions.sort(key=lambda x: x['date'], reverse=True)
    
    # Calculate Monthly Revenue Trend (Last 6 months)
    # Group paid commissions by month
    today = datetime.utcnow()
    six_months_ago = today - timedelta(days=180)
    
    revenue_trend = []
    for i in range(6):
        month_date = today - timedelta(days=30 * (5 - i))
        month_name = month_date.strftime("%b")
        month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if month_date.month == 12:
            month_end = month_date.replace(year=month_date.year + 1, month=1, day=1)
        else:
            month_end = month_date.replace(month=month_date.month + 1, day=1)
            
        # Sum commissions paid in this month
        monthly_amount = sum(c.agent_share for c in commissions if c.payout_status == 'PAID' and c.created_at >= month_start and c.created_at < month_end)
        
        revenue_trend.append({
            "name": month_name,
            "amount": monthly_amount
        })

    # Calculate Next Payout Date
    # Logic: If there are pending commissions, next payout is 15th of next month. Else, "N/A"
    next_payout = "N/A"
    if pending_clearance > 0:
        if today.day > 15:
            # Next month 15th
            if today.month == 12:
                next_payout_date = today.replace(year=today.year + 1, month=1, day=15)
            else:
                next_payout_date = today.replace(month=today.month + 1, day=15)
        else:
            # This month 15th
            next_payout_date = today.replace(day=15)
        next_payout = next_payout_date.strftime("%b %d")

    return {
        "total_earned": total_earned,
        "pending_clearance": pending_clearance,
        "transactions": recent_transactions,
        "revenue_trend": revenue_trend,
        "next_payout": next_payout
    }

@router.get("/agent/analytics")
def get_agent_analytics(time_range: str = '7d', current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "agent":
        raise HTTPException(status_code=403, detail="Not authorized")
    

    now = datetime.utcnow()
    days = 7
    if time_range == '30d':
        days = 30
    elif time_range == '90d':
        days = 90
        
    start_date = now - timedelta(days=days)
    
    # 1. Key Metrics
    # Total Views (All time or in range? Usually all time for the big number, but let's do in range for "Performance")
    # Let's return Total All Time for the Cards, and Daily for the Chart
    
    total_views_all_time = db.query(models.RecentlyViewed).join(models.Property).filter(
        models.Property.user_id == current_user.id
    ).count()
    
    unique_leads_all_time = db.query(models.Booking.user_id).join(models.Property).filter(
        models.Property.user_id == current_user.id
    ).distinct().count()
    
    # Click Rate (Mock logic: Leads / Views * 100)
    click_rate = 0
    if total_views_all_time > 0:
        click_rate = (unique_leads_all_time / total_views_all_time) * 100
        
    # 2. Performance Over Time (Daily)
    # Group RecentlyViewed by date
    views_daily = db.query(
        func.date(models.RecentlyViewed.viewed_at).label('date'),
        func.count(models.RecentlyViewed.id).label('count')
    ).join(models.Property).filter(
        models.Property.user_id == current_user.id,
        models.RecentlyViewed.viewed_at >= start_date
    ).group_by(func.date(models.RecentlyViewed.viewed_at)).all()
    
    # Group Bookings (Leads) by date
    leads_daily = db.query(
        func.date(models.Booking.created_at).label('date'),
        func.count(models.Booking.id).label('count')
    ).join(models.Property).filter(
        models.Property.user_id == current_user.id,
        models.Booking.created_at >= start_date
    ).group_by(func.date(models.Booking.created_at)).all()
    
    # Merge into a single list of dicts for the chart
    # Create a map of date -> {views, leads}
    daily_data_map = {}
    
    # Initialize with 0s for all days in range
    for i in range(days):
        d = (now - timedelta(days=days-1-i)).strftime('%Y-%m-%d')
        daily_data_map[d] = {'date': d, 'views': 0, 'leads': 0}
        
    for v in views_daily:
        if v.date in daily_data_map:
            daily_data_map[v.date]['views'] = v.count
            
    for l in leads_daily:
        if l.date in daily_data_map:
            daily_data_map[l.date]['leads'] = l.count
            
    chart_data = list(daily_data_map.values())
    chart_data.sort(key=lambda x: x['date'])
    
    # 3. Lead Sources
    # We don't track source, so we'll return a default distribution based on actual leads count
    # If we have 0 leads, return empty. If we have leads, attribute 100% to "Direct Search"
    source_data = []
    if unique_leads_all_time > 0:
        source_data = [
            { "name": 'Direct Search', "value": 100, "color": '#8884d8' }
        ]
    else:
        source_data = [
             { "name": 'No Data', "value": 100, "color": '#e5e7eb' }
        ]

    # 4. Top Properties
    top_properties_query = db.query(
        models.Property.title,
        func.count(models.RecentlyViewed.id).label('views')
    ).join(models.RecentlyViewed).filter(
        models.Property.user_id == current_user.id
    ).group_by(models.Property.id).order_by(func.count(models.RecentlyViewed.id).desc()).limit(5).all()
    
    top_properties = []
    for p in top_properties_query:
        # Get leads for this property
        leads_count = db.query(models.Booking).join(models.Property).filter(
            models.Property.title == p.title, # Simplified, ideally use ID
            models.Property.user_id == current_user.id
        ).count()
        top_properties.append({
            "title": p.title,
            "views": p.views,
            "leads": leads_count
        })

    # 5. Conversion Funnel
    # Views -> Leads -> Offers -> Deals
    total_offers = db.query(models.Offer).join(models.Property).filter(
        models.Property.user_id == current_user.id
    ).count()
    
    total_deals = db.query(models.Offer).join(models.Property).filter(
        models.Property.user_id == current_user.id,
        models.Offer.status.in_(['accepted', 'token_paid', 'completed'])
    ).count()
    
    funnel_data = [
        { "stage": "Views", "count": total_views_all_time, "fill": "#8b5cf6" },
        { "stage": "Leads", "count": unique_leads_all_time, "fill": "#10b981" },
        { "stage": "Offers", "count": total_offers, "fill": "#f59e0b" },
        { "stage": "Deals", "count": total_deals, "fill": "#ef4444" }
    ]

    return {
        "metrics": {
            "total_views": total_views_all_time,
            "unique_leads": unique_leads_all_time,
            "click_rate": round(click_rate, 1),
            "avg_time": "2m 15s" # Mocked for now
        },
        "chart_data": chart_data,
        "source_data": source_data,
        "top_properties": top_properties,
        "funnel_data": funnel_data
    }
