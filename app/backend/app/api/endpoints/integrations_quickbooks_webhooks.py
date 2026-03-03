import base64
import hashlib
import hmac
import json
import logging
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request

from ...core.config import (
    QUICKBOOKS_WEBHOOK_DEVELOPMENT_VERIFIER_TOKEN,
    QUICKBOOKS_WEBHOOK_PRODUCTION_VERIFIER_TOKEN,
    QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations/quickbooks", tags=["integrations-quickbooks"])


def _configured_verifier_tokens() -> list[str]:
    return [
        token
        for token in {
            QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN.strip(),
            QUICKBOOKS_WEBHOOK_DEVELOPMENT_VERIFIER_TOKEN.strip(),
            QUICKBOOKS_WEBHOOK_PRODUCTION_VERIFIER_TOKEN.strip(),
        }
        if token
    ]


def _signature_for_payload(payload: bytes, verifier_token: str) -> str:
    digest = hmac.new(
        verifier_token.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).digest()
    return base64.b64encode(digest).decode("utf-8")


def _validate_intuit_signature(payload: bytes, signature: str) -> bool:
    for verifier_token in _configured_verifier_tokens():
        candidate = _signature_for_payload(payload, verifier_token)
        if hmac.compare_digest(candidate, signature):
            return True
    return False


@router.get("/webhook")
def quickbooks_webhook_status() -> dict[str, Any]:
    tokens = _configured_verifier_tokens()
    return {
        "status": "ok",
        "provider": "quickbooks",
        "configured": bool(tokens),
        "path": "/integrations/quickbooks/webhook",
    }


@router.post("/webhook")
async def receive_quickbooks_webhook(
    request: Request,
    intuit_signature: str | None = Header(default=None, alias="intuit-signature"),
) -> dict[str, Any]:
    tokens = _configured_verifier_tokens()
    if not tokens:
        raise HTTPException(
            status_code=503,
            detail="QuickBooks webhook verifier token is not configured.",
        )

    if not intuit_signature:
        raise HTTPException(status_code=400, detail="Missing intuit-signature header.")

    payload = await request.body()
    if not payload:
        raise HTTPException(status_code=400, detail="Webhook payload is empty.")

    if not _validate_intuit_signature(payload, intuit_signature.strip()):
        raise HTTPException(status_code=401, detail="Invalid QuickBooks webhook signature.")

    try:
        parsed = json.loads(payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=400, detail="Invalid QuickBooks webhook JSON payload.") from exc

    event_count = len(parsed) if isinstance(parsed, list) else 1
    logger.info("Accepted QuickBooks webhook notification with %s event(s).", event_count)

    return {
        "status": "accepted",
        "event_count": event_count,
    }
