"""
SLA Service — Breach detection, notification intents, and agent compliance.

Implements:
- Config-driven SLA thresholds (admin-adjustable)
- Periodic deal scanning for SLA breaches
- Progressive escalation (WARNING → ESCALATION)
- Notification intent generation (signals, not email/SMS)
- Agent SLA compliance metrics (derived, not manual)

CRITICAL: This service NEVER mutates deal state.
It only READS deals and INSERTS breach/intent records.
"""
from typing import Dict, Any, List, Optional
from uuid import UUID
from datetime import datetime, timezone
import asyncpg
import logging

from .notifications_service import NotificationsService

logger = logging.getLogger(__name__)


# Mapping of deal states to the user role responsible for advancing
DEFAULT_RESPONSIBLE = {
    'INITIATED': 'AGENT',
    'VISIT_SCHEDULED': 'AGENT',
    'OFFER_MADE': 'SELLER',
    'NEGOTIATION': 'AGENT',
    'PRICE_AGREED': 'BUYER',
    'TOKEN_PENDING': 'BUYER',
    'TOKEN_PAID': 'AGENT',
    'AGREEMENT_SIGNED': 'AGENT',
    'REGISTRATION': 'AGENT',
    'DISPUTED': 'ADMIN',
}


class SLAService:
    """
    Read-only observer of deal states + insert-only breach recorder.
    
    Never modifies deal state. All escalation is signal-based.
    """
    
    def __init__(self, db: asyncpg.Pool):
        self.db = db
        self.notifications = NotificationsService(db)
    
    # ========================================================================
    # PART 1: SLA CONFIGURATION
    # ========================================================================
    
    async def get_sla_configs(self) -> Dict[str, Any]:
        """Get all SLA configurations."""
        async with self.db.acquire() as conn:
            configs = await conn.fetch("""
                SELECT * FROM sla_configs
                WHERE is_active = true
                ORDER BY 
                    CASE deal_state
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
                "configs": [
                    {
                        "id": str(c['id']),
                        "deal_state": c['deal_state'],
                        "max_days": c['max_days'],
                        "notify_after_days": c['notify_after_days'],
                        "escalate_after_days": c['escalate_after_days'],
                        "responsible_role": c['responsible_role'],
                        "is_active": c['is_active'],
                        "updated_at": c['updated_at'].isoformat()
                    }
                    for c in configs
                ]
            }
    
    async def update_sla_config(
        self,
        deal_state: str,
        admin_id: UUID,
        max_days: Optional[int] = None,
        notify_after_days: Optional[int] = None,
        escalate_after_days: Optional[int] = None,
        responsible_role: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Dict[str, Any]:
        """Admin updates SLA thresholds for a deal state."""
        async with self.db.acquire() as conn:
            existing = await conn.fetchrow("""
                SELECT * FROM sla_configs WHERE deal_state = $1
            """, deal_state)
            
            if not existing:
                return {"success": False, "error": f"No SLA config for state: {deal_state}"}
            
            # Apply updates
            new_max = max_days if max_days is not None else existing['max_days']
            new_notify = notify_after_days if notify_after_days is not None else existing['notify_after_days']
            new_escalate = escalate_after_days if escalate_after_days is not None else existing['escalate_after_days']
            new_role = responsible_role if responsible_role is not None else existing['responsible_role']
            new_active = is_active if is_active is not None else existing['is_active']
            
            # Validate constraints
            if new_notify > new_escalate:
                return {"success": False, "error": "notify_after_days must be <= escalate_after_days"}
            if new_escalate > new_max:
                return {"success": False, "error": "escalate_after_days must be <= max_days"}
            
            await conn.execute("""
                UPDATE sla_configs
                SET max_days = $2, notify_after_days = $3, escalate_after_days = $4,
                    responsible_role = $5, is_active = $6
                WHERE deal_state = $1
            """, deal_state, new_max, new_notify, new_escalate, new_role, new_active)
            
            # Log admin action
            await conn.execute("""
                INSERT INTO admin_actions (
                    admin_id, action, target_type, target_id,
                    reason, previous_state, new_state
                )
                VALUES ($1, 'UPDATE_SLA_CONFIG', 'sla_config', $2, $3, $4, $5)
            """, admin_id, existing['id'],
                f'SLA config updated for {deal_state}',
                f'notify={existing["notify_after_days"]},escalate={existing["escalate_after_days"]},max={existing["max_days"]}',
                f'notify={new_notify},escalate={new_escalate},max={new_max}')
            
            return {
                "success": True,
                "message": f"SLA config updated for {deal_state}",
                "config": {
                    "deal_state": deal_state,
                    "max_days": new_max,
                    "notify_after_days": new_notify,
                    "escalate_after_days": new_escalate,
                    "responsible_role": new_role,
                    "is_active": new_active
                }
            }
    
    # ========================================================================
    # PART 2: SLA CHECKING ENGINE
    # ========================================================================
    
    async def check_deal_slas(self) -> Dict[str, Any]:
        """
        Scan all active deals against SLA thresholds.
        
        Called periodically by the background job.
        
        Logic:
        1. Load active SLA configs
        2. Find deals exceeding thresholds
        3. Record breaches (idempotent via UNIQUE constraint)
        4. Generate notification intents
        5. Auto-resolve breaches for deals that have moved
        
        NEVER mutates deal state.
        """
        warnings_created = 0
        escalations_created = 0
        intents_created = 0
        auto_resolved = 0
        
        async with self.db.acquire() as conn:
            # Load active SLA configs
            configs = await conn.fetch("""
                SELECT * FROM sla_configs WHERE is_active = true
            """)
            
            if not configs:
                return {"success": True, "message": "No active SLA configs"}
            
            config_map = {c['deal_state']: c for c in configs}
            
            # Find all active (non-terminal) deals with time in state
            active_deals = await conn.fetch("""
                SELECT 
                    d.id, d.status, d.buyer_id, d.seller_id, d.agent_id,
                    EXTRACT(EPOCH FROM (NOW() - d.updated_at)) / 86400 as days_in_state
                FROM deals d
                WHERE d.status NOT IN ('COMPLETED', 'COMMISSION_RELEASED', 'CANCELLED', 'EXPIRED')
            """)
            
            for deal in active_deals:
                state = deal['status']
                config = config_map.get(state)
                
                if not config:
                    continue
                
                days = float(deal['days_in_state'])
                
                # Determine responsible user
                responsible_user_id = self._get_responsible_user(deal, config['responsible_role'])
                
                # Check ESCALATION threshold first (higher severity)
                if days >= config['escalate_after_days']:
                    created = await self._record_breach(
                        conn=conn,
                        deal_id=deal['id'],
                        deal_state=state,
                        breach_type='ESCALATION',
                        responsible_role=config['responsible_role'],
                        responsible_user_id=responsible_user_id,
                        days_in_state=days,
                        sla_threshold_days=config['escalate_after_days']
                    )
                    if created:
                        escalations_created += 1
                        intent = await self._generate_intent(
                            conn=conn,
                            deal=deal,
                            breach_type='ESCALATION',
                            config=config,
                            days=days
                        )
                        if intent:
                            intents_created += 1
                
                # Check WARNING threshold
                elif days >= config['notify_after_days']:
                    created = await self._record_breach(
                        conn=conn,
                        deal_id=deal['id'],
                        deal_state=state,
                        breach_type='WARNING',
                        responsible_role=config['responsible_role'],
                        responsible_user_id=responsible_user_id,
                        days_in_state=days,
                        sla_threshold_days=config['notify_after_days']
                    )
                    if created:
                        warnings_created += 1
                        intent = await self._generate_intent(
                            conn=conn,
                            deal=deal,
                            breach_type='WARNING',
                            config=config,
                            days=days
                        )
                        if intent:
                            intents_created += 1
            
            # Auto-resolve breaches for deals that have moved past the breached state
            resolved = await conn.execute("""
                UPDATE sla_breaches sb
                SET resolved_at = NOW(), resolved_by = 'SYSTEM'
                WHERE sb.resolved_at IS NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM deals d
                      WHERE d.id = sb.deal_id AND d.status = sb.deal_state
                  )
            """)
            auto_resolved = int(resolved.split()[-1]) if resolved.startswith('UPDATE') else 0
        
        result = {
            "success": True,
            "warnings_created": warnings_created,
            "escalations_created": escalations_created,
            "intents_created": intents_created,
            "auto_resolved": auto_resolved
        }
        
        logger.info(f"SLA check complete: {result}")
        return result
    
    def _get_responsible_user(self, deal, role: str) -> Optional[UUID]:
        """Map responsible role to user ID from deal."""
        role_map = {
            'BUYER': deal['buyer_id'],
            'SELLER': deal['seller_id'],
            'AGENT': deal['agent_id'],
            'ADMIN': None  # Admin breaches don't target a specific user
        }
        return role_map.get(role)
    
    async def _record_breach(
        self, conn, deal_id, deal_state, breach_type,
        responsible_role, responsible_user_id, days_in_state, sla_threshold_days
    ) -> bool:
        """
        Record an SLA breach. Idempotent via UNIQUE constraint.
        Returns True if a new breach was created, False if it already existed.
        """
        try:
            await conn.execute("""
                INSERT INTO sla_breaches (
                    deal_id, deal_state, breach_type,
                    responsible_role, responsible_user_id,
                    days_in_state, sla_threshold_days
                )
                VALUES ($1, $2, $3::sla_breach_type, $4, $5, $6, $7)
                ON CONFLICT (deal_id, deal_state, breach_type) DO NOTHING
            """, deal_id, deal_state, breach_type,
                responsible_role, responsible_user_id,
                days_in_state, sla_threshold_days)
            return True
        except Exception as e:
            logger.warning(f"Failed to record SLA breach: {e}")
            return False
    
    async def _generate_intent(self, conn, deal, breach_type, config, days) -> bool:
        """Generate a notification intent for an SLA breach."""
        severity = 'WARNING' if breach_type == 'WARNING' else 'URGENT'
        role = config['responsible_role']
        target_user_id = self._get_responsible_user(deal, role)
        
        if not target_user_id:
            return False
        
        state = deal['status']
        days_rounded = round(days, 1)
        
        if breach_type == 'WARNING':
            title = f"Deal SLA Warning: {state}"
            body = f"Deal has been in {state} for {days_rounded} days. Please take action."
        else:
            title = f"Deal SLA Escalation: {state}"
            body = f"Deal has been in {state} for {days_rounded} days — SLA breached. Immediate attention required."
        
        try:
            # Get the breach ID for linking
            breach = await conn.fetchrow("""
                SELECT id FROM sla_breaches
                WHERE deal_id = $1 AND deal_state = $2 AND breach_type = $3::sla_breach_type
            """, deal['id'], state, breach_type)
            
            await conn.execute("""
                INSERT INTO notification_intents (
                    deal_id, target_user_id, target_role,
                    message_type, severity, title, body,
                    source, source_breach_id
                )
                VALUES ($1, $2, $3, $4, $5::notification_severity, $6, $7, 'SLA_CHECKER', $8)
            """, deal['id'], target_user_id, role,
                f'SLA_{breach_type}', severity, title, body,
                breach['id'] if breach else None)
            
            # Also create an in-app notification via existing service
            await self.notifications.create_notification(
                user_id=target_user_id,
                notification_type=f'SLA_{breach_type}',
                title=title,
                body=body,
                link=f'/deals/{deal["id"]}'
            )
            
            return True
        except Exception as e:
            logger.warning(f"Failed to generate notification intent: {e}")
            return False
    
    # ========================================================================
    # PART 3: BREACH VISIBILITY (ADMIN)
    # ========================================================================
    
    async def get_breaches(
        self,
        resolved: Optional[bool] = None,
        breach_type: Optional[str] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get SLA breaches for admin dashboard."""
        async with self.db.acquire() as conn:
            where_clauses = ["1=1"]
            params = []
            idx = 1
            
            if resolved is not None:
                if resolved:
                    where_clauses.append(f"sb.resolved_at IS NOT NULL")
                else:
                    where_clauses.append(f"sb.resolved_at IS NULL")
            
            if breach_type:
                where_clauses.append(f"sb.breach_type = ${idx}::sla_breach_type")
                params.append(breach_type)
                idx += 1
            
            params.append(limit)
            limit_param = f"${idx}"
            
            where_stmt = " AND ".join(where_clauses)
            
            breaches = await conn.fetch(f"""
                SELECT 
                    sb.*,
                    d.status as current_deal_status,
                    p.title as property_title,
                    u.full_name as responsible_name
                FROM sla_breaches sb
                JOIN deals d ON d.id = sb.deal_id
                JOIN properties p ON p.id = d.property_id
                LEFT JOIN users u ON u.id = sb.responsible_user_id
                WHERE {where_stmt}
                ORDER BY sb.created_at DESC
                LIMIT {limit_param}
            """, *params)
            
            return {
                "success": True,
                "breaches": [
                    {
                        "id": str(b['id']),
                        "deal_id": str(b['deal_id']),
                        "deal_state": b['deal_state'],
                        "current_deal_status": b['current_deal_status'],
                        "property_title": b['property_title'],
                        "breach_type": b['breach_type'],
                        "responsible_role": b['responsible_role'],
                        "responsible_name": b['responsible_name'],
                        "days_in_state": float(b['days_in_state']),
                        "sla_threshold_days": b['sla_threshold_days'],
                        "is_resolved": b['resolved_at'] is not None,
                        "resolved_at": b['resolved_at'].isoformat() if b['resolved_at'] else None,
                        "created_at": b['created_at'].isoformat()
                    }
                    for b in breaches
                ]
            }
    
    async def resolve_breach(
        self,
        breach_id: UUID,
        admin_id: UUID
    ) -> Dict[str, Any]:
        """Admin manually resolves an SLA breach."""
        async with self.db.acquire() as conn:
            breach = await conn.fetchrow("""
                SELECT * FROM sla_breaches WHERE id = $1
            """, breach_id)
            
            if not breach:
                return {"success": False, "error": "Breach not found"}
            
            if breach['resolved_at'] is not None:
                return {"success": False, "error": "Breach already resolved"}
            
            await conn.execute("""
                UPDATE sla_breaches
                SET resolved_at = NOW(), resolved_by = $2
                WHERE id = $1
            """, breach_id, str(admin_id))
            
            return {
                "success": True,
                "message": "Breach resolved"
            }
    
    # ========================================================================
    # PART 4: AGENT SLA COMPLIANCE (DERIVED)
    # ========================================================================
    
    async def get_agent_sla_metrics(self, agent_id: Optional[UUID] = None) -> Dict[str, Any]:
        """
        Per-agent SLA compliance derived from breach records.
        
        Metrics:
        - Total warnings
        - Total escalations
        - Unresolved breaches
        - Breach rate (breaches / deals assigned)
        """
        async with self.db.acquire() as conn:
            if agent_id:
                agent_filter = "WHERE sb.responsible_user_id = $1"
                params = [agent_id]
            else:
                agent_filter = "WHERE sb.responsible_role = 'AGENT'"
                params = []
            
            metrics = await conn.fetch(f"""
                SELECT 
                    sb.responsible_user_id as agent_id,
                    u.full_name as agent_name,
                    COUNT(*) FILTER (WHERE sb.breach_type = 'WARNING') as total_warnings,
                    COUNT(*) FILTER (WHERE sb.breach_type = 'ESCALATION') as total_escalations,
                    COUNT(*) FILTER (WHERE sb.resolved_at IS NULL) as unresolved_breaches,
                    COUNT(DISTINCT sb.deal_id) as deals_with_breaches
                FROM sla_breaches sb
                JOIN users u ON u.id = sb.responsible_user_id
                {agent_filter}
                GROUP BY sb.responsible_user_id, u.full_name
                ORDER BY total_escalations DESC, total_warnings DESC
            """, *params)
            
            # Get total deals per agent for breach rate
            result_list = []
            for m in metrics:
                total_deals = await conn.fetchval("""
                    SELECT COUNT(*) FROM deals WHERE agent_id = $1
                """, m['agent_id'])
                
                result_list.append({
                    "agent_id": str(m['agent_id']),
                    "agent_name": m['agent_name'],
                    "total_warnings": m['total_warnings'],
                    "total_escalations": m['total_escalations'],
                    "unresolved_breaches": m['unresolved_breaches'],
                    "deals_with_breaches": m['deals_with_breaches'],
                    "total_deals": total_deals,
                    "breach_rate": round(m['deals_with_breaches'] / total_deals, 3) if total_deals > 0 else 0,
                    "risk_flag": self._compute_risk_flag(m['total_escalations'], m['total_warnings'], total_deals)
                })
            
            return {
                "success": True,
                "agent_sla_metrics": result_list
            }
    
    def _compute_risk_flag(self, escalations: int, warnings: int, total_deals: int) -> str:
        """
        Compute agent risk flag. Derived only, never stored.
        
        - RELIABLE: 0 escalations
        - SLOW: any warnings but no escalations  
        - RISKY: escalation rate > 20% or >2 escalations
        """
        if total_deals == 0:
            return "NEW"
        
        escalation_rate = escalations / total_deals
        
        if escalations == 0 and warnings == 0:
            return "RELIABLE"
        elif escalations == 0:
            return "SLOW"
        elif escalation_rate > 0.2 or escalations > 2:
            return "RISKY"
        else:
            return "SLOW"
