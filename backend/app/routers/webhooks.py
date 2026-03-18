from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Header, HTTPException, Request

from ..core.database import get_db_pool
from ..services.payment_engine.webhook_service import WebhookService


router = APIRouter(prefix="/webhooks", tags=["Payment Webhooks"])


async def _read_payload(request: Request) -> Dict[str, Any]:
    try:
        body = await request.json()
        if not isinstance(body, dict):
            raise ValueError("Payload must be an object")
        return body
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid webhook payload: {exc}")


@router.post("/mock")
async def mock_webhook(
    request: Request,
    x_signature: str | None = Header(default=None, alias="X-Signature"),
):
    payload = await _read_payload(request)
    pool = get_db_pool()
    service = WebhookService(pool)

    result = await service.receive_webhook(provider="MOCK", payload=payload, signature=x_signature)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Webhook processing failed"))
    return result


@router.post("/{provider}")
async def generic_provider_webhook(
    provider: str,
    request: Request,
    x_signature: str | None = Header(default=None, alias="X-Signature"),
):
    payload = await _read_payload(request)
    pool = get_db_pool()
    service = WebhookService(pool)

    try:
        result = await service.receive_webhook(provider=provider.upper(), payload=payload, signature=x_signature)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Webhook processing failed"))

    return result
