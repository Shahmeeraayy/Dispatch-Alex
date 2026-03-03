import base64

import requests
from fastapi import APIRouter, HTTPException, Query

from ...core.config import QB_CLIENT_ID, QB_CLIENT_SECRET, QB_REDIRECT_URI

router = APIRouter(prefix="/integrations/quickbooks", tags=["integrations-quickbooks"])

TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"


@router.get("/callback")
def qb_callback(
    code: str = Query(...),
    realmId: str = Query(...),
):
    if not QB_CLIENT_ID or not QB_CLIENT_SECRET or not QB_REDIRECT_URI:
        raise HTTPException(
            status_code=500,
            detail="QuickBooks OAuth environment variables are not fully configured.",
        )

    auth = base64.b64encode(f"{QB_CLIENT_ID}:{QB_CLIENT_SECRET}".encode("utf-8")).decode("utf-8")

    headers = {
        "Authorization": f"Basic {auth}",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": QB_REDIRECT_URI,
    }

    response = requests.post(TOKEN_URL, headers=headers, data=data, timeout=30)

    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="QuickBooks token response was not valid JSON.") from exc

    if not response.ok:
        raise HTTPException(status_code=response.status_code, detail=payload)

    payload["realmId"] = realmId
    return payload
