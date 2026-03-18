from __future__ import annotations

import json
from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Optional

import asyncpg


class ReconciliationService:
    """Daily reconciliation generation and retrieval."""

    def __init__(self, db: asyncpg.Pool):
        self.db = db

    async def generate_report(self, report_date: date, provider: str) -> Dict[str, Any]:
        provider_upper = provider.upper()
        captured, settled, refunded = await self._compute_totals(report_date, provider_upper)

        details: List[Dict[str, Any]] = []
        discrepancy = Decimal("0.00")

        if provider_upper == "MOCK":
            details.append({
                "rule": "mock_self_reconciliation",
                "result": "MATCHED",
                "note": "Mock provider uses platform-native records.",
            })
        else:
            details.append({
                "rule": "external_provider_report",
                "result": "PENDING",
                "note": "External provider report integration pending implementation.",
            })

        status = "MATCHED" if discrepancy == Decimal("0.00") else "DISCREPANCY"

        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO reconciliation_reports (
                    report_date,
                    provider,
                    total_captured,
                    total_settled,
                    total_refunded,
                    discrepancy_amount,
                    status,
                    details
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7::reconciliation_status, $8::jsonb)
                ON CONFLICT (report_date, provider)
                DO UPDATE SET
                    total_captured = EXCLUDED.total_captured,
                    total_settled = EXCLUDED.total_settled,
                    total_refunded = EXCLUDED.total_refunded,
                    discrepancy_amount = EXCLUDED.discrepancy_amount,
                    status = EXCLUDED.status,
                    details = EXCLUDED.details
                RETURNING *
                """,
                report_date,
                provider_upper,
                captured,
                settled,
                refunded,
                discrepancy,
                status,
                json.dumps(details),
            )

        return {
            "success": True,
            "report": self._format_report(row),
        }

    async def get_report(self, report_date: date, provider: str) -> Dict[str, Any]:
        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT *
                FROM reconciliation_reports
                WHERE report_date = $1
                  AND provider = $2
                """,
                report_date,
                provider.upper(),
            )

        if not row:
            return {"success": False, "error": "Reconciliation report not found"}

        return {"success": True, "report": self._format_report(row)}

    async def run_daily_reconciliation(self, target_date: Optional[date] = None) -> Dict[str, Any]:
        report_date = target_date or date.today()
        providers = ["MOCK", "RAZORPAY", "STRIPE"]
        results = []
        for provider in providers:
            try:
                result = await self.generate_report(report_date=report_date, provider=provider)
                results.append({"provider": provider, "success": result.get("success", False)})
            except Exception as exc:
                results.append({"provider": provider, "success": False, "error": str(exc)})

        return {
            "success": True,
            "report_date": report_date.isoformat(),
            "results": results,
        }

    async def _compute_totals(self, report_date: date, provider: str) -> tuple[Decimal, Decimal, Decimal]:
        start = f"{report_date.isoformat()} 00:00:00"
        end = f"{report_date.isoformat()} 23:59:59"

        async with self.db.acquire() as conn:
            captured = await conn.fetchval(
                """
                SELECT COALESCE(SUM(pt.amount), 0)
                FROM payment_transactions pt
                JOIN payment_intents pi ON pi.id = pt.intent_id
                WHERE pt.transaction_type = 'CAPTURE'
                  AND pt.status = 'COMPLETED'
                  AND pi.provider = $1
                  AND pt.created_at BETWEEN $2::timestamp AND $3::timestamp
                """,
                provider,
                start,
                end,
            )
            settled = await conn.fetchval(
                """
                SELECT COALESCE(SUM(pt.amount), 0)
                FROM payment_transactions pt
                JOIN payment_intents pi ON pi.id = pt.intent_id
                WHERE pt.transaction_type = 'SETTLEMENT'
                  AND pt.status = 'COMPLETED'
                  AND pi.provider = $1
                  AND pt.created_at BETWEEN $2::timestamp AND $3::timestamp
                """,
                provider,
                start,
                end,
            )
            refunded = await conn.fetchval(
                """
                SELECT COALESCE(SUM(pt.amount), 0)
                FROM payment_transactions pt
                JOIN payment_intents pi ON pi.id = pt.intent_id
                WHERE pt.transaction_type = 'REFUND'
                  AND pt.status = 'COMPLETED'
                  AND pi.provider = $1
                  AND pt.created_at BETWEEN $2::timestamp AND $3::timestamp
                """,
                provider,
                start,
                end,
            )

        return (
            Decimal(str(captured or 0)).quantize(Decimal("0.01")),
            Decimal(str(settled or 0)).quantize(Decimal("0.01")),
            Decimal(str(refunded or 0)).quantize(Decimal("0.01")),
        )

    def _format_report(self, row: asyncpg.Record) -> Dict[str, Any]:
        details = row["details"]
        if isinstance(details, str):
            details = json.loads(details)

        return {
            "id": str(row["id"]),
            "report_date": row["report_date"].isoformat(),
            "provider": row["provider"],
            "total_captured": float(row["total_captured"]),
            "total_settled": float(row["total_settled"]),
            "total_refunded": float(row["total_refunded"]),
            "discrepancy_amount": float(row["discrepancy_amount"]),
            "status": row["status"],
            "details": details or [],
            "resolved_by": str(row["resolved_by"]) if row["resolved_by"] else None,
            "resolved_at": row["resolved_at"].isoformat() if row["resolved_at"] else None,
            "created_at": row["created_at"].isoformat(),
        }
