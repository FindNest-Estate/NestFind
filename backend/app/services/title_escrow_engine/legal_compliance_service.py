"""
LegalComplianceService — Stamp duty, registration fee, and TDS calculator.

Indian stamp duty is state-specific and gender-dependent.
TDS (Section 194-IA): 1% if property value > ₹50 Lakhs.
"""
from __future__ import annotations

import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

import asyncpg

from .stamp_duty_data import get_fallback_rate

logger = logging.getLogger(__name__)

TDS_THRESHOLD = Decimal("5000000")   # ₹50 Lakhs
TDS_RATE = Decimal("1.0")            # 1%
HUNDRED = Decimal("100")


class LegalComplianceService:
    """Stamp duty, registration fee, and TDS calculator with DB persistence."""

    def __init__(self, db: asyncpg.Pool):
        self.db = db

    # -----------------------------------------------------------------------
    # MAIN CALCULATOR
    # -----------------------------------------------------------------------

    async def calculate_legal_fees(
        self,
        deal_id: UUID,
        property_value: Decimal,
        state: str,
        buyer_gender: str = "MALE",
        property_type: str = "RESIDENTIAL",
    ) -> Dict[str, Any]:
        """
        Compute stamp duty, registration fee, and TDS for a deal.
        Persists result to legal_fee_calculations and returns full breakdown.
        """
        property_value = Decimal(str(property_value)).quantize(Decimal("0.01"))
        buyer_gender = buyer_gender.upper()
        state_key = state.upper().replace(" ", "_")
        property_type = property_type.upper()

        # 1. Fetch rate from DB
        rate_row = await self.get_stamp_duty_rate(state_key, property_type)

        if rate_row:
            if buyer_gender == "FEMALE":
                stamp_duty_rate = Decimal(str(rate_row["rate_female"]))
            elif buyer_gender == "JOINT":
                stamp_duty_rate = Decimal(str(rate_row["rate_joint"]))
            else:
                stamp_duty_rate = Decimal(str(rate_row["rate_male"]))

            registration_rate = Decimal(str(rate_row["registration_rate"]))
            registration_cap = (
                Decimal(str(rate_row["registration_cap"]))
                if rate_row["registration_cap"]
                else None
            )
        else:
            # Fallback to in-memory rates
            fb = get_fallback_rate(state_key, property_type)
            if buyer_gender == "FEMALE":
                stamp_duty_rate = fb["female"]
            elif buyer_gender == "JOINT":
                stamp_duty_rate = fb["joint"]
            else:
                stamp_duty_rate = fb["male"]

            registration_rate = fb["reg_rate"]
            registration_cap = fb["reg_cap"]

        # 2. Stamp duty
        stamp_duty_amount = (
            property_value * stamp_duty_rate / HUNDRED
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # 3. Registration fee (capped in some states)
        raw_reg_fee = (
            property_value * registration_rate / HUNDRED
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if registration_cap is not None:
            registration_fee_amount = min(raw_reg_fee, registration_cap)
        else:
            registration_fee_amount = raw_reg_fee

        # 4. TDS (Section 194-IA) — 1% if value > ₹50L; exempt if AGRICULTURAL
        tds_applicable = property_value > TDS_THRESHOLD and property_type != "AGRICULTURAL"
        tds_rate = TDS_RATE if tds_applicable else Decimal("0")
        tds_amount = (
            (property_value * tds_rate / HUNDRED).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            if tds_applicable
            else Decimal("0")
        )

        # 5. Total
        total = (stamp_duty_amount + registration_fee_amount + tds_amount).quantize(
            Decimal("0.01")
        )

        # 6. Persist to DB
        async with self.db.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO legal_fee_calculations (
                    deal_id, property_value, state, buyer_gender, property_type,
                    stamp_duty_rate, stamp_duty_amount,
                    registration_fee_rate, registration_fee_amount,
                    tds_applicable, tds_rate, tds_amount,
                    total_statutory_charges
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                """,
                deal_id, property_value, state_key, buyer_gender, property_type,
                stamp_duty_rate, stamp_duty_amount,
                registration_rate, registration_fee_amount,
                tds_applicable, tds_rate, tds_amount,
                total,
            )

        breakdown = {
            "stamp_duty": {
                "rate_pct": float(stamp_duty_rate),
                "amount": float(stamp_duty_amount),
                "description": f"Stamp duty @ {stamp_duty_rate}% ({buyer_gender})",
            },
            "registration_fee": {
                "rate_pct": float(registration_rate),
                "amount": float(registration_fee_amount),
                "capped": registration_cap is not None,
                "cap": float(registration_cap) if registration_cap else None,
                "description": "Sub-Registrar registration fee",
            },
            "tds": {
                "applicable": tds_applicable,
                "rate_pct": float(tds_rate),
                "amount": float(tds_amount),
                "description": (
                    "TDS u/s 194-IA — buyer must deposit Form 26QB within 30 days"
                    if tds_applicable
                    else "TDS not applicable (property value ≤ ₹50 Lakhs)"
                ),
            },
        }

        return {
            "success": True,
            "deal_id": str(deal_id),
            "property_value": float(property_value),
            "state": state_key,
            "buyer_gender": buyer_gender,
            "property_type": property_type,
            "stamp_duty_rate": float(stamp_duty_rate),
            "stamp_duty_amount": float(stamp_duty_amount),
            "registration_fee_rate": float(registration_rate),
            "registration_fee_amount": float(registration_fee_amount),
            "tds_applicable": tds_applicable,
            "tds_rate": float(tds_rate),
            "tds_amount": float(tds_amount),
            "total_statutory_charges": float(total),
            "breakdown": breakdown,
        }

    # -----------------------------------------------------------------------
    # STAMP DUTY RATE LOOKUP
    # -----------------------------------------------------------------------

    async def get_stamp_duty_rate(
        self, state: str, property_type: str = "RESIDENTIAL"
    ) -> Optional[asyncpg.Record]:
        """Fetch from DB; returns DEFAULT row if state not found."""
        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT *
                FROM stamp_duty_rates
                WHERE (state = $1 OR state = 'DEFAULT')
                  AND property_type = $2
                  AND effective_from <= CURRENT_DATE
                  AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
                ORDER BY (CASE WHEN state = $1 THEN 0 ELSE 1 END), effective_from DESC
                LIMIT 1
                """,
                state.upper(),
                property_type.upper(),
            )
        return row

    async def get_all_stamp_duty_rates(
        self, state: Optional[str] = None
    ) -> Dict[str, Any]:
        """List all active stamp duty rates, optionally filtered by state."""
        async with self.db.acquire() as conn:
            if state:
                rows = await conn.fetch(
                    """
                    SELECT * FROM stamp_duty_rates
                    WHERE state = $1
                      AND effective_from <= CURRENT_DATE
                      AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
                    ORDER BY property_type
                    """,
                    state.upper(),
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT * FROM stamp_duty_rates
                    WHERE effective_from <= CURRENT_DATE
                      AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
                    ORDER BY state, property_type
                    """
                )

        return {
            "success": True,
            "rates": [
                {
                    "id": str(r["id"]),
                    "state": r["state"],
                    "property_type": r["property_type"],
                    "rate_male": float(r["rate_male"]),
                    "rate_female": float(r["rate_female"]),
                    "rate_joint": float(r["rate_joint"]),
                    "registration_rate": float(r["registration_rate"]),
                    "registration_cap": float(r["registration_cap"]) if r["registration_cap"] else None,
                    "effective_from": r["effective_from"].isoformat(),
                    "effective_to": r["effective_to"].isoformat() if r["effective_to"] else None,
                }
                for r in rows
            ],
        }

    # -----------------------------------------------------------------------
    # GET PERSISTED CALCULATION
    # -----------------------------------------------------------------------

    async def get_legal_fees_for_deal(self, deal_id: UUID) -> Dict[str, Any]:
        """Fetch the most recent persisted calculation for a deal."""
        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT * FROM legal_fee_calculations
                WHERE deal_id = $1
                ORDER BY computed_at DESC
                LIMIT 1
                """,
                deal_id,
            )
        if not row:
            return {"success": False, "error": "No legal fee calculation found for this deal"}

        return {
            "success": True,
            "calculation": {
                "id": str(row["id"]),
                "deal_id": str(row["deal_id"]),
                "property_value": float(row["property_value"]),
                "state": row["state"],
                "buyer_gender": row["buyer_gender"],
                "property_type": row["property_type"],
                "stamp_duty_rate": float(row["stamp_duty_rate"]),
                "stamp_duty_amount": float(row["stamp_duty_amount"]),
                "registration_fee_rate": float(row["registration_fee_rate"]),
                "registration_fee_amount": float(row["registration_fee_amount"]),
                "tds_applicable": row["tds_applicable"],
                "tds_rate": float(row["tds_rate"]),
                "tds_amount": float(row["tds_amount"]),
                "total_statutory_charges": float(row["total_statutory_charges"]),
                "computed_at": row["computed_at"].isoformat(),
            },
        }
