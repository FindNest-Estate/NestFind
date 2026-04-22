"""
Developer Offer Service — Multi-buyer negotiation engine.

Key rules:
  1. Multiple buyers can submit offers for the same unit simultaneously
  2. Developer can Accept, Reject, or Counter any offer
  3. When Accept: unit → NEGOTIATION (hold), deal is created automatically
  4. When Offer Accepted: all other pending offers → REJECTED with auto-reason
  5. Counter offer goes to buyer; buyer can accept/reject/re-offer
  6. History timeline maintained in dev_offer_history

State machine:
  PENDING → UNDER_REVIEW → ACCEPTED | REJECTED | COUNTERED
  COUNTERED → ACCEPTED (by buyer) | REJECTED | PENDING (new offer)
"""
import json
from uuid import UUID
from datetime import datetime, timezone, timedelta
from typing import Optional


class DeveloperOfferService:
    def __init__(self, pool):
        self.pool = pool

    # -----------------------------------------------------------------------
    # BUYER ACTIONS
    # -----------------------------------------------------------------------

    async def submit_offer(
        self,
        unit_id: UUID,
        buyer_id: UUID,
        offer_price: float,
        buyer_message: Optional[str] = None,
        expiry_hours: int = 48,
        ip_address: Optional[str] = None,
    ) -> dict:
        """Buyer submits an offer on a unit."""
        try:
            async with self.pool.acquire() as conn:
                # 1. Row Locking & Auto-Rejection Check
                # Fetch developer profile settings and unit price
                row = await conn.fetchrow(
                    """
                    SELECT u.price, dp.settings, p.developer_id, p.project_name, p.id as project_id
                    FROM dev_units u
                    JOIN dev_projects p ON p.id = u.project_id
                    JOIN developer_profiles dp ON dp.user_id = p.developer_id
                    WHERE u.id = $1 AND u.is_deleted = FALSE AND p.is_deleted = FALSE
                    FOR UPDATE OF u
                    """,
                    unit_id
                )
                if not row:
                    return {"success": False, "error": "Unit not found"}

                unit_price = row["price"]
                settings = row["settings"] or {}
                developer_id = row["developer_id"]
                project_id = row["project_id"]

                # Auto-reject check
                if settings.get("auto_reject_low_offers"):
                    min_pct = settings.get("min_offer_percentage", 90)
                    min_price = float(unit_price) * (min_pct / 100.0)
                    if offer_price < min_price:
                        return {
                            "success": False, 
                            "error": f"Offer price ₹{offer_price:,.2f} is below the minimum threshold (₹{min_price:,.2f})."
                        }

                # Check unit status (post-lock)
                current_status = await conn.fetchval("SELECT status FROM dev_units WHERE id = $1", unit_id)
                if current_status in ("RESERVED", "BOOKED", "SOLD", "BLOCKED"):
                    return {
                        "success": False,
                        "error": f"Unit is {current_status} and no longer accepting offers."
                    }

                # 2. Check for duplicate active offers by same buyer
                existing = await conn.fetchrow(
                    """
                    SELECT id FROM dev_offers
                    WHERE unit_id = $1 AND buyer_id = $2
                      AND status IN ('PENDING', 'UNDER_REVIEW', 'COUNTERED')
                    """,
                    unit_id, buyer_id
                )
                if existing:
                    return {"success": False, "error": "You already have an active offer on this unit"}

                expires_at = datetime.now(timezone.utc) + timedelta(hours=expiry_hours)

                # 3. Insert Offer
                offer = await conn.fetchrow(
                    """
                    INSERT INTO dev_offers (
                        unit_id, buyer_id, offer_price, status,
                        buyer_message, expires_at, ip_address
                    ) VALUES ($1,$2,$3,'PENDING',$4,$5,$6)
                    RETURNING *
                    """,
                    unit_id, buyer_id, offer_price,
                    buyer_message, expires_at, ip_address
                )

                # Log history
                await self._log_history(
                    conn, offer["id"], "SUBMITTED", buyer_id, "BUYER",
                    amount=offer_price, message=buyer_message
                )

                # Update unit status to NEGOTIATION if it's AVAILABLE
                await conn.execute(
                    "UPDATE dev_units SET status = 'NEGOTIATION', updated_at = NOW() WHERE id = $1 AND status = 'AVAILABLE'",
                    unit_id
                )

                # Create/Update Lead
                await conn.execute(
                    """
                    INSERT INTO dev_leads (developer_id, buyer_id, unit_id, project_id, source, lead_status)
                    VALUES ($1,$2,$3,$4,'OFFER','NEGOTIATION')
                    ON CONFLICT (developer_id, buyer_id, project_id) DO UPDATE SET
                        unit_id = EXCLUDED.unit_id,
                        lead_status = 'NEGOTIATION',
                        updated_at = NOW()
                    """,
                    developer_id, buyer_id, unit_id, project_id
                )

                await self._audit(
                    conn, developer_id, buyer_id, "OFFER_SUBMITTED",
                    "dev_offers", offer["id"], {"offer_price": offer_price}
                )

                return {"success": True, "data": dict(offer)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def buyer_accept_counter(self, offer_id: UUID, buyer_id: UUID) -> dict:
        """Buyer accepts a counter offer from developer."""
        try:
            async with self.pool.acquire() as conn:
                offer = await conn.fetchrow(
                    "SELECT * FROM dev_offers WHERE id = $1 AND buyer_id = $2",
                    offer_id, buyer_id
                )
                if not offer:
                    return {"success": False, "error": "Offer not found"}
                if offer["status"] != "COUNTERED":
                    return {"success": False, "error": "Offer is not in COUNTERED state"}

                # Accept at counter price
                final_price = offer["counter_price"] or offer["offer_price"]

                await conn.execute(
                    "UPDATE dev_offers SET status = 'ACCEPTED', updated_at = NOW() WHERE id = $1",
                    offer_id
                )

                await self._log_history(
                    conn, offer_id, "ACCEPTED", buyer_id, "BUYER",
                    amount=final_price, message="Buyer accepted counter offer"
                )

                # Trigger deal creation and reject other offers
                await self._on_offer_accepted(
                    conn, offer_id, offer["unit_id"], buyer_id, final_price
                )

                return {"success": True, "message": "Counter offer accepted", "final_price": final_price}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def buyer_reject_counter(
        self, offer_id: UUID, buyer_id: UUID, reason: Optional[str] = None
    ) -> dict:
        """Buyer rejects a counter offer."""
        try:
            async with self.pool.acquire() as conn:
                offer = await conn.fetchrow(
                    "SELECT * FROM dev_offers WHERE id = $1 AND buyer_id = $2",
                    offer_id, buyer_id
                )
                if not offer:
                    return {"success": False, "error": "Offer not found"}
                if offer["status"] != "COUNTERED":
                    return {"success": False, "error": "Offer is not in COUNTERED state"}

                await conn.execute(
                    """
                    UPDATE dev_offers
                    SET status = 'REJECTED', rejection_reason = $2, updated_at = NOW()
                    WHERE id = $1
                    """,
                    offer_id, reason or "Buyer rejected counter offer"
                )

                await self._log_history(
                    conn, offer_id, "REJECTED", buyer_id, "BUYER",
                    message=reason or "Buyer rejected counter offer"
                )

                # Check if any other offers remain active on this unit
                await self._maybe_revert_unit_status(conn, offer["unit_id"])

                return {"success": True, "message": "Counter offer rejected"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # -----------------------------------------------------------------------
    # DEVELOPER ACTIONS
    # -----------------------------------------------------------------------

    async def accept_offer(
        self, offer_id: UUID, developer_id: UUID
    ) -> dict:
        """Developer accepts a buyer's offer. Creates a deal, rejects others."""
        try:
            async with self.pool.acquire() as conn:
                offer = await conn.fetchrow("SELECT * FROM dev_offers WHERE id = $1", offer_id)
                if not offer:
                    return {"success": False, "error": "Offer not found"}

                # Start transaction for atomic acceptance and deal creation
                async with conn.transaction():
                    # 1. Lock the unit for atomic status check and reservation
                    # FOR UPDATE ensures no other process can accept a different offer simultaneously
                    row = await conn.fetchrow(
                        """
                        SELECT u.id, u.status, p.developer_id 
                        FROM dev_units u
                        JOIN dev_projects p ON p.id = u.project_id
                        WHERE u.id = $1
                        FOR UPDATE OF u
                        """,
                        offer["unit_id"]
                    )
                    
                    if not row or row["developer_id"] != developer_id:
                        return {"success": False, "error": "Access denied or unit not found"}

                    if row["status"] in ("RESERVED", "BOOKED", "SOLD"):
                        return {"success": False, "error": f"Unit is already {row['status']}"}

                    if offer["status"] not in ("PENDING", "UNDER_REVIEW"):
                        return {"success": False, "error": f"Offer cannot be accepted in status '{offer['status']}'"}

                    final_price = offer["offer_price"]

                    await conn.execute(
                        "UPDATE dev_offers SET status = 'ACCEPTED', updated_at = NOW() WHERE id = $1",
                        offer_id
                    )

                    await self._log_history(
                        conn, offer_id, "ACCEPTED", developer_id, "DEVELOPER",
                        amount=final_price, message="Developer accepted offer"
                    )

                    await self._on_offer_accepted(
                        conn, offer_id, offer["unit_id"], offer["buyer_id"],
                        final_price, developer_id=developer_id
                    )

                return {"success": True, "message": "Offer accepted and deal created"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def reject_offer(
        self,
        offer_id: UUID,
        developer_id: UUID,
        rejection_reason: Optional[str] = None,
    ) -> dict:
        """Developer rejects an offer."""
        try:
            async with self.pool.acquire() as conn:
                offer = await conn.fetchrow("SELECT * FROM dev_offers WHERE id = $1", offer_id)
                if not offer:
                    return {"success": False, "error": "Offer not found"}

                unit_dev = await conn.fetchrow(
                    """
                    SELECT p.developer_id FROM dev_units u
                    JOIN dev_projects p ON p.id = u.project_id
                    WHERE u.id = $1
                    """,
                    offer["unit_id"]
                )
                if not unit_dev or unit_dev["developer_id"] != developer_id:
                    return {"success": False, "error": "Access denied"}

                if offer["status"] not in ("PENDING", "UNDER_REVIEW", "COUNTERED"):
                    return {"success": False, "error": f"Cannot reject offer in status '{offer['status']}'"}

                await conn.execute(
                    """
                    UPDATE dev_offers
                    SET status = 'REJECTED', rejection_reason = $2, updated_at = NOW()
                    WHERE id = $1
                    """,
                    offer_id, rejection_reason or "Offer rejected by developer"
                )

                await self._log_history(
                    conn, offer_id, "REJECTED", developer_id, "DEVELOPER",
                    message=rejection_reason or "Offer rejected by developer"
                )

                await self._maybe_revert_unit_status(conn, offer["unit_id"])

                return {"success": True, "message": "Offer rejected"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def counter_offer(
        self,
        offer_id: UUID,
        developer_id: UUID,
        counter_price: float,
        seller_message: Optional[str] = None,
        expiry_hours: int = 48,
    ) -> dict:
        """Developer counters a buyer's offer."""
        try:
            async with self.pool.acquire() as conn:
                offer = await conn.fetchrow("SELECT * FROM dev_offers WHERE id = $1", offer_id)
                if not offer:
                    return {"success": False, "error": "Offer not found"}

                unit_dev = await conn.fetchrow(
                    """
                    SELECT p.developer_id FROM dev_units u
                    JOIN dev_projects p ON p.id = u.project_id
                    WHERE u.id = $1
                    """,
                    offer["unit_id"]
                )
                if not unit_dev or unit_dev["developer_id"] != developer_id:
                    return {"success": False, "error": "Access denied"}

                if offer["status"] not in ("PENDING", "UNDER_REVIEW"):
                    return {"success": False, "error": f"Cannot counter offer in status '{offer['status']}'"}

                expires_at = datetime.now(timezone.utc) + timedelta(hours=expiry_hours)

                await conn.execute(
                    """
                    UPDATE dev_offers
                    SET status = 'COUNTERED', counter_price = $2,
                        seller_message = $3, expires_at = $4, updated_at = NOW()
                    WHERE id = $1
                    """,
                    offer_id, counter_price, seller_message, expires_at
                )

                await self._log_history(
                    conn, offer_id, "COUNTERED", developer_id, "DEVELOPER",
                    amount=counter_price, message=seller_message
                )

                return {"success": True, "message": "Counter offer sent", "counter_price": counter_price}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # -----------------------------------------------------------------------
    # QUERIES
    # -----------------------------------------------------------------------

    async def list_offers(
        self,
        developer_id: UUID,
        unit_id: Optional[UUID] = None,
        status: Optional[str] = None,
        page: int = 1,
        per_page: int = 20,
    ) -> dict:
        """List offers for a developer's units."""
        try:
            offset = (page - 1) * per_page
            filters = ["p.developer_id = $1"]
            params = [developer_id]
            idx = 2

            if unit_id:
                filters.append(f"o.unit_id = ${idx}")
                params.append(unit_id)
                idx += 1
            if status:
                filters.append(f"o.status = ${idx}")
                params.append(status)
                idx += 1

            where = " AND ".join(filters)

            async with self.pool.acquire() as conn:
                total = await conn.fetchval(
                    f"""
                    SELECT COUNT(*) FROM dev_offers o
                    JOIN dev_units u ON u.id = o.unit_id
                    JOIN dev_projects p ON p.id = u.project_id
                    WHERE {where}
                    """,
                    *params
                )
                rows = await conn.fetch(
                    f"""
                    SELECT o.*, u.unit_number, p.project_name,
                        usr.full_name AS buyer_name
                    FROM dev_offers o
                    JOIN dev_units u ON u.id = o.unit_id
                    JOIN dev_projects p ON p.id = u.project_id
                    LEFT JOIN users usr ON usr.id = o.buyer_id
                    WHERE {where}
                    ORDER BY o.created_at DESC
                    LIMIT ${idx} OFFSET ${idx+1}
                    """,
                    *params, per_page, offset
                )

            return {
                "success": True,
                "data": [dict(r) for r in rows],
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_offer_with_history(self, offer_id: UUID, developer_id: UUID) -> dict:
        """Get offer detail with full negotiation history."""
        try:
            async with self.pool.acquire() as conn:
                offer = await conn.fetchrow(
                    """
                    SELECT o.*, u.unit_number, p.project_name, p.developer_id,
                        usr.full_name AS buyer_name
                    FROM dev_offers o
                    JOIN dev_units u ON u.id = o.unit_id
                    JOIN dev_projects p ON p.id = u.project_id
                    LEFT JOIN users usr ON usr.id = o.buyer_id
                    WHERE o.id = $1
                    """,
                    offer_id
                )
                if not offer:
                    return {"success": False, "error": "Offer not found"}
                if offer["developer_id"] != developer_id:
                    return {"success": False, "error": "Access denied"}

                history = await conn.fetch(
                    "SELECT * FROM dev_offer_history WHERE offer_id = $1 ORDER BY created_at ASC",
                    offer_id
                )

                data = dict(offer)
                data["history"] = [dict(h) for h in history]
                return {"success": True, "data": data}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # -----------------------------------------------------------------------
    # PRIVATE HELPERS
    # -----------------------------------------------------------------------

    async def _on_offer_accepted(
        self, conn, offer_id, unit_id, buyer_id, final_price, developer_id=None
    ):
        """
        When an offer is accepted:
        1. Set unit status → RESERVED
        2. Reject all other active offers with auto-reason
        3. Create a deal record
        """
        # Step 1: Reserve the unit
        await conn.execute(
            "UPDATE dev_units SET status = 'RESERVED', updated_at = NOW() WHERE id = $1",
            unit_id
        )

        # Step 2: Get developer_id from unit if not passed
        if not developer_id:
            row = await conn.fetchrow(
                "SELECT p.developer_id FROM dev_units u JOIN dev_projects p ON p.id = u.project_id WHERE u.id = $1",
                unit_id
            )
            developer_id = row["developer_id"]

        # Step 3: Reject all other active offers
        other_offers = await conn.fetch(
            """
            SELECT id FROM dev_offers
            WHERE unit_id = $1 AND id != $2 AND status IN ('PENDING','UNDER_REVIEW','COUNTERED')
            """,
            unit_id, offer_id
        )
        for other in other_offers:
            await conn.execute(
                """
                UPDATE dev_offers SET status = 'REJECTED',
                    rejection_reason = 'Another buyer''s offer was accepted by the seller.',
                    updated_at = NOW()
                WHERE id = $1
                """,
                other["id"]
            )
            await self._log_history(
                conn, other["id"], "REJECTED", None, "SYSTEM",
                message="Another buyer's offer was accepted by the seller."
            )

        # Step 4: Create deal
        token_deadline = datetime.now(timezone.utc) + timedelta(hours=48)
        await conn.execute(
            """
            INSERT INTO dev_deals (
                offer_id, unit_id, buyer_id, developer_id, final_price,
                deal_stage, token_deadline
            ) VALUES ($1,$2,$3,$4,$5,'DEAL_STARTED',$6)
            ON CONFLICT (unit_id) DO NOTHING
            """,
            offer_id, unit_id, buyer_id, developer_id, final_price, token_deadline
        )

    async def _maybe_revert_unit_status(self, conn, unit_id):
        """If no active offers remain, revert unit to AVAILABLE."""
        active_count = await conn.fetchval(
            """
            SELECT COUNT(*) FROM dev_offers
            WHERE unit_id = $1 AND status IN ('PENDING','UNDER_REVIEW','COUNTERED')
            """,
            unit_id
        )
        if active_count == 0:
            await conn.execute(
                """
                UPDATE dev_units SET status = 'AVAILABLE', updated_at = NOW()
                WHERE id = $1 AND status = 'NEGOTIATION'
                """,
                unit_id
            )

    async def _log_history(
        self, conn, offer_id, action, actor_id, actor_role,
        amount=None, message=None
    ):
        await conn.execute(
            """
            INSERT INTO dev_offer_history (offer_id, action, actor_id, actor_role, amount, message)
            VALUES ($1,$2,$3,$4,$5,$6)
            """,
            offer_id, action, actor_id, actor_role, amount, message
        )

    async def _audit(self, conn, developer_id, actor_id, action, entity_type, entity_id, details=None):
        await conn.execute(
            """
            INSERT INTO dev_audit_logs (developer_id, actor_id, action, entity_type, entity_id, details)
            VALUES ($1,$2,$3,$4,$5,$6::jsonb)
            """,
            developer_id, actor_id, action, entity_type, entity_id,
            json.dumps(details or {})
        )
