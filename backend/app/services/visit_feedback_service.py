"""
Visit Feedback Service for agent and buyer feedback after property visits.
"""
from typing import Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timezone
import asyncpg


class VisitFeedbackService:
    """Service for managing visit feedback from agents and buyers."""
    
    # Valid values for enums
    VALID_ACTIONS = ['PROCEED', 'NEGOTIATE', 'PASS', 'UNDECIDED']
    VALID_BUDGETS = ['LOW', 'MEDIUM', 'HIGH', 'PREMIUM']
    VALID_INTEREST_LEVELS = ['HIGH', 'MEDIUM', 'LOW', 'NOT_INTERESTED']
    
    def __init__(self, db: asyncpg.Pool):
        self.db = db
    
    async def submit_agent_feedback(
        self,
        visit_id: UUID,
        agent_id: UUID,
        buyer_interest_level: Optional[int] = None,
        buyer_perceived_budget: Optional[str] = None,
        property_condition_notes: Optional[str] = None,
        buyer_questions: Optional[str] = None,
        follow_up_required: bool = False,
        recommended_action: Optional[str] = None,
        additional_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Agent submits feedback after visit completion.
        
        Can update existing feedback if already submitted.
        """
        async with self.db.acquire() as conn:
            # Verify visit exists and belongs to agent
            visit = await conn.fetchrow("""
                SELECT id, agent_id, status FROM visit_requests WHERE id = $1
            """, visit_id)
            
            if not visit:
                return {"success": False, "error": "Visit not found"}
            
            if visit['agent_id'] != agent_id:
                return {"success": False, "error": "Access denied"}
            
            # Validate buyer interest level
            if buyer_interest_level is not None and not (1 <= buyer_interest_level <= 5):
                return {"success": False, "error": "Interest level must be between 1 and 5"}
            
            # Validate budget
            if buyer_perceived_budget and buyer_perceived_budget.upper() not in self.VALID_BUDGETS:
                return {"success": False, "error": f"Budget must be one of: {', '.join(self.VALID_BUDGETS)}"}
            
            # Validate recommended action
            if recommended_action and recommended_action.upper() not in self.VALID_ACTIONS:
                return {"success": False, "error": f"Action must be one of: {', '.join(self.VALID_ACTIONS)}"}
            
            # Upsert feedback
            feedback_id = await conn.fetchval("""
                INSERT INTO visit_feedback_agent (
                    visit_id, buyer_interest_level, buyer_perceived_budget,
                    property_condition_notes, buyer_questions, follow_up_required,
                    recommended_action, additional_notes
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (visit_id) DO UPDATE SET
                    buyer_interest_level = EXCLUDED.buyer_interest_level,
                    buyer_perceived_budget = EXCLUDED.buyer_perceived_budget,
                    property_condition_notes = EXCLUDED.property_condition_notes,
                    buyer_questions = EXCLUDED.buyer_questions,
                    follow_up_required = EXCLUDED.follow_up_required,
                    recommended_action = EXCLUDED.recommended_action,
                    additional_notes = EXCLUDED.additional_notes,
                    updated_at = NOW()
                RETURNING id
            """, visit_id, buyer_interest_level, 
                buyer_perceived_budget.upper() if buyer_perceived_budget else None,
                property_condition_notes, buyer_questions, follow_up_required,
                recommended_action.upper() if recommended_action else None,
                additional_notes)
            
            return {
                "success": True,
                "feedback_id": str(feedback_id),
                "message": "Feedback submitted successfully"
            }
    
    async def submit_buyer_feedback(
        self,
        visit_id: UUID,
        buyer_id: UUID,
        overall_rating: Optional[int] = None,
        agent_professionalism: Optional[int] = None,
        property_condition_rating: Optional[int] = None,
        property_as_described: Optional[bool] = None,
        interest_level: Optional[str] = None,
        liked_aspects: Optional[str] = None,
        concerns: Optional[str] = None,
        would_recommend: Optional[bool] = None
    ) -> Dict[str, Any]:
        """
        Buyer submits feedback after visit completion.
        
        Can update existing feedback if already submitted.
        """
        async with self.db.acquire() as conn:
            # Verify visit exists and belongs to buyer
            visit = await conn.fetchrow("""
                SELECT id, buyer_id, status FROM visit_requests WHERE id = $1
            """, visit_id)
            
            if not visit:
                return {"success": False, "error": "Visit not found"}
            
            if visit['buyer_id'] != buyer_id:
                return {"success": False, "error": "Access denied"}
            
            # Validate ratings
            for rating_name, rating_val in [
                ('Overall rating', overall_rating),
                ('Agent professionalism', agent_professionalism),
                ('Property condition rating', property_condition_rating)
            ]:
                if rating_val is not None and not (1 <= rating_val <= 5):
                    return {"success": False, "error": f"{rating_name} must be between 1 and 5"}
            
            # Validate interest level
            if interest_level and interest_level.upper() not in self.VALID_INTEREST_LEVELS:
                return {"success": False, "error": f"Interest level must be one of: {', '.join(self.VALID_INTEREST_LEVELS)}"}
            
            # Upsert feedback
            feedback_id = await conn.fetchval("""
                INSERT INTO visit_feedback_buyer (
                    visit_id, overall_rating, agent_professionalism,
                    property_condition_rating, property_as_described,
                    interest_level, liked_aspects, concerns, would_recommend
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (visit_id) DO UPDATE SET
                    overall_rating = EXCLUDED.overall_rating,
                    agent_professionalism = EXCLUDED.agent_professionalism,
                    property_condition_rating = EXCLUDED.property_condition_rating,
                    property_as_described = EXCLUDED.property_as_described,
                    interest_level = EXCLUDED.interest_level,
                    liked_aspects = EXCLUDED.liked_aspects,
                    concerns = EXCLUDED.concerns,
                    would_recommend = EXCLUDED.would_recommend,
                    updated_at = NOW()
                RETURNING id
            """, visit_id, overall_rating, agent_professionalism,
                property_condition_rating, property_as_described,
                interest_level.upper() if interest_level else None,
                liked_aspects, concerns, would_recommend)
            
            return {
                "success": True,
                "feedback_id": str(feedback_id),
                "message": "Feedback submitted successfully"
            }
    
    async def get_visit_feedback(
        self,
        visit_id: UUID,
        user_id: UUID
    ) -> Dict[str, Any]:
        """
        Get feedback for a visit.
        
        Agent sees buyer feedback, buyer sees agent feedback.
        """
        async with self.db.acquire() as conn:
            # Verify access
            visit = await conn.fetchrow("""
                SELECT buyer_id, agent_id FROM visit_requests WHERE id = $1
            """, visit_id)
            
            if not visit:
                return {"success": False, "error": "Visit not found"}
            
            is_buyer = visit['buyer_id'] == user_id
            is_agent = visit['agent_id'] == user_id
            
            if not is_buyer and not is_agent:
                return {"success": False, "error": "Access denied"}
            
            # Get agent feedback
            agent_feedback = None
            if is_agent or is_buyer:  # Both can see agent feedback
                row = await conn.fetchrow("""
                    SELECT * FROM visit_feedback_agent WHERE visit_id = $1
                """, visit_id)
                if row:
                    agent_feedback = {
                        "id": str(row['id']),
                        "buyer_interest_level": row['buyer_interest_level'],
                        "buyer_perceived_budget": row['buyer_perceived_budget'],
                        "property_condition_notes": row['property_condition_notes'],
                        "buyer_questions": row['buyer_questions'],
                        "follow_up_required": row['follow_up_required'],
                        "recommended_action": row['recommended_action'],
                        "additional_notes": row['additional_notes'],
                        "created_at": row['created_at'].isoformat()
                    }
            
            # Get buyer feedback
            buyer_feedback = None
            if is_buyer or is_agent:  # Both can see buyer feedback
                row = await conn.fetchrow("""
                    SELECT * FROM visit_feedback_buyer WHERE visit_id = $1
                """, visit_id)
                if row:
                    buyer_feedback = {
                        "id": str(row['id']),
                        "overall_rating": row['overall_rating'],
                        "agent_professionalism": row['agent_professionalism'],
                        "property_condition_rating": row['property_condition_rating'],
                        "property_as_described": row['property_as_described'],
                        "interest_level": row['interest_level'],
                        "liked_aspects": row['liked_aspects'],
                        "concerns": row['concerns'],
                        "would_recommend": row['would_recommend'],
                        "created_at": row['created_at'].isoformat()
                    }
            
            return {
                "success": True,
                "agent_feedback": agent_feedback,
                "buyer_feedback": buyer_feedback
            }
