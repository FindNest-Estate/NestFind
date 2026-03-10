"""
Visit Follow-Up Service

Manages post-visit follow-up workflows for agents and buyers:
- Phase 1: Contextual follow-up retrieval (messaging integration)
- Phase 2: Feedback-driven dashboard (follow-up required visits)
- Phase 3: Automated notification triggers
"""
from typing import Dict, Any, Optional, List
from uuid import UUID
from datetime import datetime, timezone, timedelta
import asyncpg

from .notifications_service import NotificationsService


class VisitFollowUpService:
    """Service for managing post-visit follow-up workflows."""

    def __init__(self, db: asyncpg.Pool):
        self.db = db

    # ========================================================================
    # PHASE 1: Follow-Up Context for Messaging
    # ========================================================================

    async def get_followup_context(
        self,
        visit_id: UUID,
        user_id: UUID
    ) -> Dict[str, Any]:
        """
        Get complete follow-up context for a completed visit.
        
        Returns visit summary, feedback data, and participant info
        so messaging or deal initiation can reference it.
        """
        async with self.db.acquire() as conn:
            visit = await conn.fetchrow("""
                SELECT vr.id, vr.property_id, vr.buyer_id, vr.agent_id,
                       vr.status, vr.confirmed_date, vr.created_at,
                       p.title AS property_title, p.price AS property_price,
                       p.city AS property_city,
                       buyer.full_name AS buyer_name, buyer.email AS buyer_email,
                       agent_user.full_name AS agent_name
                FROM visit_requests vr
                JOIN properties p ON p.id = vr.property_id
                JOIN users buyer ON buyer.id = vr.buyer_id
                JOIN users agent_user ON agent_user.id = vr.agent_id
                WHERE vr.id = $1
            """, visit_id)

            if not visit:
                return {"success": False, "error": "Visit not found"}

            is_buyer = visit['buyer_id'] == user_id
            is_agent = visit['agent_id'] == user_id

            if not is_buyer and not is_agent:
                return {"success": False, "error": "Access denied"}

            # Get agent feedback
            agent_fb = await conn.fetchrow("""
                SELECT buyer_interest_level, buyer_perceived_budget,
                       recommended_action, follow_up_required, additional_notes
                FROM visit_feedback_agent WHERE visit_id = $1
            """, visit_id)

            # Get buyer feedback
            buyer_fb = await conn.fetchrow("""
                SELECT overall_rating, interest_level, concerns,
                       liked_aspects, would_recommend
                FROM visit_feedback_buyer WHERE visit_id = $1
            """, visit_id)

            # Get verification info
            verification = await conn.fetchrow("""
                SELECT gps_verified_at, otp_verified_at, completed_at, duration_minutes
                FROM visit_verifications WHERE visit_id = $1
            """, visit_id)

            # Check for existing offer
            offer = await conn.fetchrow("""
                SELECT id, offered_price, status, created_at
                FROM offers
                WHERE property_id = $1 AND buyer_id = $2
                ORDER BY created_at DESC LIMIT 1
            """, visit['property_id'], visit['buyer_id'])

            return {
                "success": True,
                "context": {
                    "visit": {
                        "id": str(visit['id']),
                        "status": visit['status'],
                        "visit_date": visit['confirmed_date'].isoformat() if visit['confirmed_date'] else None,
                        "property": {
                            "id": str(visit['property_id']),
                            "title": visit['property_title'],
                            "price": float(visit['property_price']) if visit['property_price'] else None,
                            "city": visit['property_city']
                        },
                        "buyer": {
                            "id": str(visit['buyer_id']),
                            "name": visit['buyer_name'],
                            "email": visit['buyer_email'] if is_agent else None,
                            "phone": None
                        },
                        "agent": {
                            "id": str(visit['agent_id']),
                            "name": visit['agent_name'],
                            "phone": None
                        }
                    },
                    "verification": {
                        "gps_verified": verification['gps_verified_at'] is not None if verification else False,
                        "otp_verified": verification.get('otp_verified_at') is not None if verification else False,
                        "duration_minutes": verification['duration_minutes'] if verification else None
                    } if verification else None,
                    "agent_feedback": {
                        "interest_level": agent_fb['buyer_interest_level'],
                        "budget": agent_fb['buyer_perceived_budget'],
                        "recommended_action": agent_fb['recommended_action'],
                        "follow_up_required": agent_fb['follow_up_required'],
                        "notes": agent_fb['additional_notes']
                    } if agent_fb else None,
                    "buyer_feedback": {
                        "overall_rating": buyer_fb['overall_rating'],
                        "interest_level": buyer_fb['interest_level'],
                        "concerns": buyer_fb['concerns'],
                        "liked_aspects": buyer_fb['liked_aspects'],
                        "would_recommend": buyer_fb['would_recommend']
                    } if buyer_fb else None,
                    "offer": {
                        "id": str(offer['id']),
                        "amount": float(offer['offered_price']),
                        "status": offer['status'],
                        "created_at": offer['created_at'].isoformat()
                    } if offer else None,
                    "suggested_actions": self._compute_suggested_actions(
                        is_agent, is_buyer, agent_fb, buyer_fb, offer, visit['status']
                    )
                }
            }

    def _compute_suggested_actions(
        self, is_agent, is_buyer, agent_fb, buyer_fb, offer, status
    ) -> List[str]:
        """Compute contextual follow-up action suggestions."""
        actions = []

        if status != 'COMPLETED':
            return actions

        if is_agent:
            if not agent_fb:
                actions.append("SUBMIT_FEEDBACK")
            if agent_fb and agent_fb['follow_up_required']:
                actions.append("MESSAGE_BUYER")
            if agent_fb and agent_fb['recommended_action'] == 'PROCEED' and not offer:
                actions.append("SUGGEST_OFFER")
            if not offer:
                actions.append("MESSAGE_BUYER")

        if is_buyer:
            if not buyer_fb:
                actions.append("SUBMIT_FEEDBACK")
            if not offer:
                actions.append("MAKE_OFFER")
            actions.append("MESSAGE_AGENT")

        return actions

    # ========================================================================
    # PHASE 2: Agent Follow-Up Dashboard
    # ========================================================================

    async def get_followup_dashboard(
        self,
        agent_id: UUID
    ) -> Dict[str, Any]:
        """
        Get visits that require agent follow-up.

        Returns visits where:
        - Agent marked follow_up_required = true
        - Visit completed but no agent feedback yet
        - Buyer showed high interest but no offer made yet
        """
        async with self.db.acquire() as conn:
            # 1. Visits needing follow-up (agent flagged)
            flagged_rows = await conn.fetch("""
                SELECT vr.id AS visit_id, vr.confirmed_date, vr.status,
                       p.title AS property_title, p.city AS property_city,
                       buyer.full_name AS buyer_name,
                       fa.recommended_action, fa.buyer_interest_level,
                       fa.buyer_perceived_budget,
                       fa.created_at AS feedback_at
                FROM visit_requests vr
                JOIN properties p ON p.id = vr.property_id
                JOIN users buyer ON buyer.id = vr.buyer_id
                JOIN visit_feedback_agent fa ON fa.visit_id = vr.id
                WHERE vr.agent_id = $1
                  AND vr.status = 'COMPLETED'
                  AND fa.follow_up_required = true
                ORDER BY fa.created_at DESC
                LIMIT 20
            """, agent_id)

            # 2. Visits completed but feedback not yet submitted
            pending_feedback_rows = await conn.fetch("""
                SELECT vr.id AS visit_id, vr.confirmed_date, vr.status,
                       p.title AS property_title,
                       buyer.full_name AS buyer_name,
                       vr.updated_at
                FROM visit_requests vr
                JOIN properties p ON p.id = vr.property_id
                JOIN users buyer ON buyer.id = vr.buyer_id
                LEFT JOIN visit_feedback_agent fa ON fa.visit_id = vr.id
                WHERE vr.agent_id = $1
                  AND vr.status = 'COMPLETED'
                  AND fa.id IS NULL
                ORDER BY vr.updated_at DESC
                LIMIT 10
            """, agent_id)

            # 3. High-interest visits with no offer
            hot_leads_rows = await conn.fetch("""
                SELECT vr.id AS visit_id, vr.confirmed_date,
                       p.id AS property_id, p.title AS property_title,
                       p.price AS property_price,
                       buyer.full_name AS buyer_name,
                       fa.buyer_interest_level, fa.recommended_action,
                       fb.interest_level AS buyer_interest
                FROM visit_requests vr
                JOIN properties p ON p.id = vr.property_id
                JOIN users buyer ON buyer.id = vr.buyer_id
                LEFT JOIN visit_feedback_agent fa ON fa.visit_id = vr.id
                LEFT JOIN visit_feedback_buyer fb ON fb.visit_id = vr.id
                LEFT JOIN offers o ON o.property_id = vr.property_id 
                    AND o.buyer_id = vr.buyer_id
                    AND o.status IN ('PENDING', 'ACCEPTED', 'COUNTERED')
                WHERE vr.agent_id = $1
                  AND vr.status = 'COMPLETED'
                  AND o.id IS NULL
                  AND (
                      (fa.buyer_interest_level >= 4)
                      OR (fa.recommended_action IN ('PROCEED', 'NEGOTIATE'))
                      OR (fb.interest_level = 'HIGH')
                  )
                ORDER BY fa.buyer_interest_level DESC NULLS LAST
                LIMIT 10
            """, agent_id)

            def serialize_row(row, fields):
                return {f: (str(row[f]) if isinstance(row[f], (UUID,)) else
                           row[f].isoformat() if isinstance(row[f], datetime) else
                           float(row[f]) if hasattr(row[f], '__float__') and f.endswith('price') else
                           row[f])
                        for f in fields if f in row.keys()}

            return {
                "success": True,
                "follow_up_required": [
                    {
                        "visit_id": str(r['visit_id']),
                        "property_title": r['property_title'],
                        "property_city": r['property_city'],
                        "buyer_name": r['buyer_name'],
                        "interest_level": r['buyer_interest_level'],
                        "budget": r['buyer_perceived_budget'],
                        "recommended_action": r['recommended_action'],
                        "feedback_at": r['feedback_at'].isoformat() if r['feedback_at'] else None,
                        "visit_date": r['confirmed_date'].isoformat() if r['confirmed_date'] else None
                    }
                    for r in flagged_rows
                ],
                "pending_feedback": [
                    {
                        "visit_id": str(r['visit_id']),
                        "property_title": r['property_title'],
                        "buyer_name": r['buyer_name'],
                        "completed_at": r['updated_at'].isoformat() if r['updated_at'] else None,
                        "visit_date": r['confirmed_date'].isoformat() if r['confirmed_date'] else None
                    }
                    for r in pending_feedback_rows
                ],
                "hot_leads": [
                    {
                        "visit_id": str(r['visit_id']),
                        "property_id": str(r['property_id']),
                        "property_title": r['property_title'],
                        "property_price": float(r['property_price']) if r['property_price'] else None,
                        "buyer_name": r['buyer_name'],
                        "agent_interest_score": r['buyer_interest_level'],
                        "agent_action": r['recommended_action'],
                        "buyer_interest": r['buyer_interest'],
                        "visit_date": r['confirmed_date'].isoformat() if r['confirmed_date'] else None
                    }
                    for r in hot_leads_rows
                ],
                "summary": {
                    "follow_up_count": len(flagged_rows),
                    "pending_feedback_count": len(pending_feedback_rows),
                    "hot_leads_count": len(hot_leads_rows)
                }
            }

    # ========================================================================
    # PHASE 3: Automated Notification Triggers
    # ========================================================================

    async def send_post_visit_reminders(self) -> Dict[str, Any]:
        """
        Background job: Send notifications for recently completed visits.

        Triggers:
        - 2h after completion: Remind buyer to submit feedback / make offer
        - 2h after completion: Remind agent to submit feedback
        - 24h after completion: Nudge high-interest buyers who haven't made offers
        """
        notifications_sent = 0

        async with self.db.acquire() as conn:
            now = datetime.now(timezone.utc)

            # --- 2-hour reminders ---
            two_hours_ago = now - timedelta(hours=2)
            three_hours_ago = now - timedelta(hours=3)

            # Find visits completed 2-3 hours ago (window to avoid duplication)
            recent_completed = await conn.fetch("""
                SELECT vr.id AS visit_id, vr.buyer_id, vr.agent_id,
                       vr.property_id,
                       p.title AS property_title,
                       buyer.full_name AS buyer_name
                FROM visit_requests vr
                JOIN properties p ON p.id = vr.property_id
                JOIN users buyer ON buyer.id = vr.buyer_id
                JOIN visit_verifications vv ON vv.visit_id = vr.id
                WHERE vr.status = 'COMPLETED'
                  AND vv.completed_at BETWEEN $1 AND $2
            """, three_hours_ago, two_hours_ago)

            ns = NotificationsService(self.db)

            for visit in recent_completed:
                # Check if buyer feedback exists
                buyer_fb = await conn.fetchval("""
                    SELECT id FROM visit_feedback_buyer WHERE visit_id = $1
                """, visit['visit_id'])

                if not buyer_fb:
                    await ns.create_notification(
                        user_id=visit['buyer_id'],
                        notification_type='VISIT_FOLLOWUP_BUYER',
                        title='How was your visit?',
                        body=f'Share your experience visiting {visit["property_title"]}. Your feedback helps us improve!',
                        link=f'/visits/{visit["visit_id"]}'
                    )
                    notifications_sent += 1

                # Check if agent feedback exists
                agent_fb = await conn.fetchval("""
                    SELECT id FROM visit_feedback_agent WHERE visit_id = $1
                """, visit['visit_id'])

                if not agent_fb:
                    await ns.create_notification(
                        user_id=visit['agent_id'],
                        notification_type='VISIT_FOLLOWUP_AGENT',
                        title='Submit your visit notes',
                        body=f'Don\'t forget to record your observations for the visit with {visit["buyer_name"]} at {visit["property_title"]}.',
                        link=f'/agent/visits/{visit["visit_id"]}'
                    )
                    notifications_sent += 1

            # --- 24-hour nudge for high-interest buyers ---
            one_day_ago = now - timedelta(hours=24)
            one_day_plus_one = now - timedelta(hours=25)

            high_interest_visits = await conn.fetch("""
                SELECT vr.id AS visit_id, vr.buyer_id, vr.property_id,
                       p.title AS property_title
                FROM visit_requests vr
                JOIN properties p ON p.id = vr.property_id
                JOIN visit_verifications vv ON vv.visit_id = vr.id
                LEFT JOIN visit_feedback_buyer fb ON fb.visit_id = vr.id
                LEFT JOIN visit_feedback_agent fa ON fa.visit_id = vr.id
                LEFT JOIN offers o ON o.property_id = vr.property_id 
                    AND o.buyer_id = vr.buyer_id
                    AND o.status IN ('PENDING', 'ACCEPTED', 'COUNTERED')
                WHERE vr.status = 'COMPLETED'
                  AND vv.completed_at BETWEEN $1 AND $2
                  AND o.id IS NULL
                  AND (
                      (fb.interest_level = 'HIGH')
                      OR (fb.overall_rating >= 4)
                      OR (fa.recommended_action IN ('PROCEED', 'NEGOTIATE'))
                      OR (fa.buyer_interest_level >= 4)
                  )
            """, one_day_plus_one, one_day_ago)

            for visit in high_interest_visits:
                await ns.create_notification(
                    user_id=visit['buyer_id'],
                    notification_type='VISIT_OFFER_NUDGE',
                    title='Ready to make your move?',
                    body=f'You showed great interest in {visit["property_title"]}. Make an offer before someone else does!',
                    link=f'/visits/{visit["visit_id"]}'
                )
                notifications_sent += 1

        return {
            "success": True,
            "notifications_sent": notifications_sent
        }
