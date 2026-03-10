"""
Operations Service — Read-only operational visibility for brokerage.

Provides:
- Deal pipeline metrics (status breakdown, stuck deals, disputes)
- Agent performance (derived from deal events)
- Financial visibility (GMV, commission, locked money)
- Compliance reports (agreement delays, dispute aging, cancellations)

All queries are read-only. No state mutation.
"""
from typing import Dict, Any, List, Optional
from uuid import UUID
from datetime import datetime, timedelta
import asyncpg
from decimal import Decimal


class OperationsService:
    """
    Read-only service for operational dashboards and compliance reporting.
    
    All metrics are computed from existing data — no manual scores or overrides.
    """
    
    def __init__(self, db: asyncpg.Pool):
        self.db = db
    
    # ========================================================================
    # PART 1: DEAL PIPELINE
    # ========================================================================
    
    async def get_deal_pipeline(self) -> Dict[str, Any]:
        """
        Get deal status breakdown with counts and average age per state.
        
        Shows:
        - How many deals in each status
        - Average days in current state
        """
        async with self.db.acquire() as conn:
            pipeline = await conn.fetch("""
                SELECT 
                    status,
                    COUNT(*) as count,
                    ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - updated_at)) / 86400), 1) as avg_days_in_state
                FROM deals
                WHERE status NOT IN ('COMPLETED', 'COMMISSION_RELEASED', 'CANCELLED', 'EXPIRED')
                GROUP BY status
                ORDER BY 
                    CASE status
                        WHEN 'INITIATED' THEN 1
                        WHEN 'VISIT_SCHEDULED' THEN 2
                        WHEN 'OFFER_MADE' THEN 3
                        WHEN 'NEGOTIATION' THEN 4
                        WHEN 'PRICE_AGREED' THEN 5
                        WHEN 'TOKEN_PENDING' THEN 6
                        WHEN 'TOKEN_PAID' THEN 7
                        WHEN 'AGREEMENT_SIGNED' THEN 8
                        WHEN 'REGISTRATION' THEN 9
                        WHEN 'DISPUTED' THEN 10
                        ELSE 11
                    END
            """)
            
            return {
                "success": True,
                "pipeline": [
                    {
                        "status": row['status'],
                        "count": row['count'],
                        "avg_days_in_state": float(row['avg_days_in_state']) if row['avg_days_in_state'] else 0
                    }
                    for row in pipeline
                ]
            }
    
    async def get_stuck_deals(self, threshold_days: int = 7) -> Dict[str, Any]:
        """
        Get deals stuck in current state > threshold days.
        
        Excludes terminal states. Useful for identifying bottlenecks.
        """
        async with self.db.acquire() as conn:
            stuck = await conn.fetch("""
                SELECT 
                    d.id, d.status, d.property_id,
                    EXTRACT(EPOCH FROM (NOW() - d.updated_at)) / 86400 as days_stuck,
                    p.title as property_title,
                    buyer.full_name as buyer_name,
                    seller.full_name as seller_name,
                    agent.full_name as agent_name
                FROM deals d
                JOIN properties p ON p.id = d.property_id
                JOIN users buyer ON buyer.id = d.buyer_id
                JOIN users seller ON seller.id = d.seller_id
                JOIN users agent ON agent.id = d.agent_id
                WHERE d.status NOT IN ('COMPLETED', 'COMMISSION_RELEASED', 'CANCELLED', 'EXPIRED')
                  AND (NOW() - d.updated_at) > INTERVAL '1 day' * $1
                ORDER BY (NOW() - d.updated_at) DESC
                LIMIT 50
            """, threshold_days)
            
            return {
                "success": True,
                "threshold_days": threshold_days,
                "stuck_deals": [
                    {
                        "id": str(row['id']),
                        "status": row['status'],
                        "property_id": str(row['property_id']),
                        "property_title": row['property_title'],
                        "days_stuck": round(float(row['days_stuck']), 1),
                        "buyer_name": row['buyer_name'],
                        "seller_name": row['seller_name'],
                        "agent_name": row['agent_name']
                    }
                    for row in stuck
                ]
            }
    
    async def get_disputed_deals(self) -> Dict[str, Any]:
        """
        Get all deals currently in DISPUTED status with dispute details.
        """
        async with self.db.acquire() as conn:
            disputed = await conn.fetch("""
                SELECT 
                    d.id, d.property_id, d.agreed_price, d.pre_dispute_status,
                    p.title as property_title,
                    buyer.full_name as buyer_name,
                    seller.full_name as seller_name,
                    agent.full_name as agent_name,
                    disp.id as dispute_id, disp.status as dispute_status,
                    disp.category as dispute_category, disp.amount_involved,
                    disp.refund_status, disp.created_at as dispute_created_at,
                    EXTRACT(EPOCH FROM (NOW() - disp.created_at)) / 86400 as dispute_age_days
                FROM deals d
                JOIN properties p ON p.id = d.property_id
                JOIN users buyer ON buyer.id = d.buyer_id
                JOIN users seller ON seller.id = d.seller_id
                JOIN users agent ON agent.id = d.agent_id
                LEFT JOIN disputes disp ON disp.deal_id = d.id 
                    AND disp.status IN ('OPEN', 'UNDER_REVIEW')
                WHERE d.status = 'DISPUTED'
                ORDER BY disp.created_at DESC
            """)
            
            return {
                "success": True,
                "disputed_deals": [
                    {
                        "id": str(row['id']),
                        "property_id": str(row['property_id']),
                        "property_title": row['property_title'],
                        "agreed_price": float(row['agreed_price']) if row['agreed_price'] else None,
                        "pre_dispute_status": row['pre_dispute_status'],
                        "buyer_name": row['buyer_name'],
                        "seller_name": row['seller_name'],
                        "agent_name": row['agent_name'],
                        "dispute": {
                            "id": str(row['dispute_id']) if row['dispute_id'] else None,
                            "status": row['dispute_status'],
                            "category": row['dispute_category'],
                            "amount_involved": float(row['amount_involved']) if row['amount_involved'] else None,
                            "refund_status": row['refund_status'],
                            "age_days": round(float(row['dispute_age_days']), 1) if row['dispute_age_days'] else None
                        } if row['dispute_id'] else None
                    }
                    for row in disputed
                ]
            }
    
    async def get_deals_awaiting_agreements(self) -> Dict[str, Any]:
        """
        Get deals at TOKEN_PAID or AGREEMENT_SIGNED without required signed agreements.
        
        Identifies compliance gaps where deals advanced without proper signatures.
        """
        async with self.db.acquire() as conn:
            # Deals at TOKEN_PAID without TOKEN agreement SIGNED
            missing_token = await conn.fetch("""
                SELECT 
                    d.id, d.status, d.property_id, d.agreed_price,
                    p.title as property_title,
                    buyer.full_name as buyer_name,
                    seller.full_name as seller_name,
                    'TOKEN' as missing_agreement_type
                FROM deals d
                JOIN properties p ON p.id = d.property_id
                JOIN users buyer ON buyer.id = d.buyer_id
                JOIN users seller ON seller.id = d.seller_id
                WHERE d.status IN ('TOKEN_PAID', 'AGREEMENT_SIGNED', 'REGISTRATION')
                  AND NOT EXISTS (
                      SELECT 1 FROM agreements a
                      WHERE a.deal_id = d.id 
                        AND a.agreement_type = 'TOKEN'
                        AND a.status = 'SIGNED'
                  )
            """)
            
            # Deals at REGISTRATION without SALE agreement SIGNED
            missing_sale = await conn.fetch("""
                SELECT 
                    d.id, d.status, d.property_id, d.agreed_price,
                    p.title as property_title,
                    buyer.full_name as buyer_name,
                    seller.full_name as seller_name,
                    'SALE' as missing_agreement_type
                FROM deals d
                JOIN properties p ON p.id = d.property_id
                JOIN users buyer ON buyer.id = d.buyer_id
                JOIN users seller ON seller.id = d.seller_id
                WHERE d.status IN ('REGISTRATION', 'COMPLETED')
                  AND NOT EXISTS (
                      SELECT 1 FROM agreements a
                      WHERE a.deal_id = d.id 
                        AND a.agreement_type = 'SALE'
                        AND a.status = 'SIGNED'
                  )
            """)
            
            all_missing = list(missing_token) + list(missing_sale)
            
            return {
                "success": True,
                "awaiting_agreements": [
                    {
                        "id": str(row['id']),
                        "status": row['status'],
                        "property_id": str(row['property_id']),
                        "property_title": row['property_title'],
                        "agreed_price": float(row['agreed_price']) if row['agreed_price'] else None,
                        "buyer_name": row['buyer_name'],
                        "seller_name": row['seller_name'],
                        "missing_agreement_type": row['missing_agreement_type']
                    }
                    for row in all_missing
                ]
            }
    
    # ========================================================================
    # PART 2: AGENT PERFORMANCE
    # ========================================================================
    
    async def get_agent_metrics(self, agent_id: Optional[UUID] = None) -> Dict[str, Any]:
        """
        Get per-agent performance metrics derived from deal data.
        
        Metrics:
        - Deals assigned
        - Deals completed
        - Average negotiation duration (OFFER_MADE → PRICE_AGREED in days)
        - Dispute rate (deals with disputes / total deals)
        - Commission earned
        
        No manual scoring. All computed facts.
        """
        async with self.db.acquire() as conn:
            if agent_id:
                agent_filter = "WHERE d.agent_id = $1"
                params = [agent_id]
            else:
                agent_filter = ""
                params = []
            
            metrics = await conn.fetch(f"""
                SELECT 
                    a.id as agent_id,
                    a.full_name as agent_name,
                    COUNT(d.id) as deals_assigned,
                    COUNT(d.id) FILTER (WHERE d.status IN ('COMPLETED', 'COMMISSION_RELEASED')) as deals_completed,
                    COUNT(DISTINCT disp.id) as disputes_raised,
                    COALESCE(SUM(d.agent_commission), 0) as total_commission_earned
                FROM users a
                JOIN deals d ON d.agent_id = a.id
                LEFT JOIN disputes disp ON disp.deal_id = d.id
                {agent_filter}
                GROUP BY a.id, a.full_name
                ORDER BY deals_completed DESC
            """, *params)
            
            return {
                "success": True,
                "agent_metrics": [
                    {
                        "agent_id": str(row['agent_id']),
                        "agent_name": row['agent_name'],
                        "deals_assigned": row['deals_assigned'],
                        "deals_completed": row['deals_completed'],
                        "disputes_raised": row['disputes_raised'],
                        "dispute_rate": round(row['disputes_raised'] / row['deals_assigned'], 3) if row['deals_assigned'] > 0 else 0,
                        "total_commission_earned": float(row['total_commission_earned'])
                    }
                    for row in metrics
                ]
            }
    
    # ========================================================================
    # PART 3: FINANCIAL VISIBILITY
    # ========================================================================
    
    async def get_financial_summary(self) -> Dict[str, Any]:
        """
        Get platform financial overview.
        
        - Total GMV (gross merchandise value from completed deals)
        - Platform fees earned
        - Commission released vs pending
        - Token money locked in disputes
        
        Read-only. No edits.
        """
        async with self.db.acquire() as conn:
            # GMV and fees from completed deals
            completed = await conn.fetchrow("""
                SELECT 
                    COALESCE(SUM(agreed_price), 0) as total_gmv,
                    COALESCE(SUM(platform_fee), 0) as platform_fees_earned,
                    COALESCE(SUM(agent_commission), 0) as total_agent_commission
                FROM deals
                WHERE status IN ('COMPLETED', 'COMMISSION_RELEASED')
            """)
            
            # Commission pending (deals completed but commission not released)
            pending = await conn.fetchrow("""
                SELECT 
                    COALESCE(SUM(agent_commission), 0) as commission_pending
                FROM deals
                WHERE status = 'COMPLETED'
            """)
            
            # Commission released
            released = await conn.fetchrow("""
                SELECT 
                    COALESCE(SUM(agent_commission), 0) as commission_released
                FROM deals
                WHERE status = 'COMMISSION_RELEASED'
            """)
            
            # Token money locked in disputes
            disputed_tokens = await conn.fetchrow("""
                SELECT 
                    COALESCE(SUM(token_amount), 0) as token_locked_in_disputes
                FROM deals
                WHERE status = 'DISPUTED'
            """)
            
            return {
                "success": True,
                "financial_summary": {
                    "total_gmv": float(completed['total_gmv']),
                    "platform_fees_earned": float(completed['platform_fees_earned']),
                    "agent_commission": {
                        "total": float(completed['total_agent_commission']),
                        "released": float(released['commission_released']),
                        "pending": float(pending['commission_pending'])
                    },
                    "token_locked_in_disputes": float(disputed_tokens['token_locked_in_disputes'])
                }
            }
    
    # ========================================================================
    # PART 4: COMPLIANCE & AUDIT
    # ========================================================================
    
    async def get_agreement_compliance(self) -> Dict[str, Any]:
        """
        Agreement signing delay report.
        
        Shows DRAFT agreements older than threshold without signatures.
        """
        async with self.db.acquire() as conn:
            delays = await conn.fetch("""
                SELECT 
                    a.id, a.deal_id, a.agreement_type, a.version,
                    EXTRACT(EPOCH FROM (NOW() - a.created_at)) / 86400 as days_pending,
                    d.status as deal_status,
                    p.title as property_title,
                    buyer.full_name as buyer_name,
                    seller.full_name as seller_name,
                    a.signed_by_buyer_at IS NOT NULL as buyer_signed,
                    a.signed_by_seller_at IS NOT NULL as seller_signed
                FROM agreements a
                JOIN deals d ON d.id = a.deal_id
                JOIN properties p ON p.id = d.property_id
                JOIN users buyer ON buyer.id = d.buyer_id
                JOIN users seller ON seller.id = d.seller_id
                WHERE a.status = 'DRAFT'
                  AND (NOW() - a.created_at) > INTERVAL '3 days'
                ORDER BY a.created_at ASC
                LIMIT 50
            """)
            
            return {
                "success": True,
                "agreement_delays": [
                    {
                        "agreement_id": str(row['id']),
                        "deal_id": str(row['deal_id']),
                        "agreement_type": row['agreement_type'],
                        "version": row['version'],
                        "days_pending": round(float(row['days_pending']), 1),
                        "deal_status": row['deal_status'],
                        "property_title": row['property_title'],
                        "buyer_name": row['buyer_name'],
                        "seller_name": row['seller_name'],
                        "buyer_signed": row['buyer_signed'],
                        "seller_signed": row['seller_signed']
                    }
                    for row in delays
                ]
            }
    
    async def get_dispute_aging(self) -> Dict[str, Any]:
        """
        Dispute aging report by status and age bucket.
        
        Shows open/under_review disputes grouped by:
        - < 7 days
        - 7-14 days
        - 14-30 days
        - > 30 days
        """
        async with self.db.acquire() as conn:
            aging = await conn.fetch("""
                SELECT 
                    status,
                    CASE 
                        WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 < 7 THEN '< 7 days'
                        WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 < 14 THEN '7-14 days'
                        WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 < 30 THEN '14-30 days'
                        ELSE '> 30 days'
                    END as age_bucket,
                    COUNT(*) as count
                FROM disputes
                WHERE status IN ('OPEN', 'UNDER_REVIEW')
                GROUP BY status, age_bucket
                ORDER BY status, 
                    CASE age_bucket
                        WHEN '< 7 days' THEN 1
                        WHEN '7-14 days' THEN 2
                        WHEN '14-30 days' THEN 3
                        ELSE 4
                    END
            """)
            
            return {
                "success": True,
                "dispute_aging": [
                    {
                        "status": row['status'],
                        "age_bucket": row['age_bucket'],
                        "count": row['count']
                    }
                    for row in aging
                ]
            }
    
    async def get_cancellation_report(self) -> Dict[str, Any]:
        """
        Cancellation reasons report with counts by deal state at time of cancellation.
        """
        async with self.db.acquire() as conn:
            cancellations = await conn.fetch("""
                SELECT 
                    de1.from_status as cancelled_from_state,
                    de1.notes as cancellation_reason,
                    COUNT(*) as count
                FROM deal_events de1
                WHERE de1.event_type = 'STATUS_CHANGED'
                  AND de1.to_status = 'CANCELLED'
                GROUP BY de1.from_status, de1.notes
                ORDER BY count DESC
                LIMIT 20
            """)
            
            return {
                "success": True,
                "cancellations": [
                    {
                        "cancelled_from_state": row['cancelled_from_state'],
                        "reason": row['cancellation_reason'],
                        "count": row['count']
                    }
                    for row in cancellations
                ]
            }
    
    async def get_admin_action_log(self, limit: int = 50) -> Dict[str, Any]:
        """
        Recent admin actions log for compliance.
        
        Includes: VOID_AGREEMENT, RESOLVE_DISPUTE, deal unfreeze, etc.
        """
        async with self.db.acquire() as conn:
            actions = await conn.fetch("""
                SELECT 
                    aa.id, aa.admin_id, aa.action, aa.target_type, aa.target_id,
                    aa.reason, aa.previous_state, aa.new_state, aa.timestamp,
                    u.full_name as admin_name
                FROM admin_actions aa
                JOIN users u ON u.id = aa.admin_id
                ORDER BY aa.timestamp DESC
                LIMIT $1
            """, limit)
            
            return {
                "success": True,
                "admin_actions": [
                    {
                        "id": str(row['id']),
                        "admin_id": str(row['admin_id']),
                        "admin_name": row['admin_name'],
                        "action": row['action'],
                        "target_type": row['target_type'],
                        "target_id": str(row['target_id']),
                        "reason": row['reason'],
                        "previous_state": row['previous_state'],
                        "new_state": row['new_state'],
                        "timestamp": row['timestamp'].isoformat()
                    }
                    for row in actions
                ]
            }
