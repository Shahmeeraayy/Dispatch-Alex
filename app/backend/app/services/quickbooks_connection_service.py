from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from ..core.config import QB_ENV
from ..models.quickbooks_connection import QuickBooksConnection


class QuickBooksConnectionService:
    def __init__(self, db: Session):
        self.db = db

    def _get_active_connection(self) -> QuickBooksConnection | None:
        return (
            self.db.query(QuickBooksConnection)
            .filter(QuickBooksConnection.is_active.is_(True))
            .order_by(QuickBooksConnection.updated_at.desc())
            .first()
        )

    def upsert_connection(self, payload: dict[str, object]) -> QuickBooksConnection:
        realm_id = str(payload.get("realmId") or "").strip()
        if not realm_id:
            raise ValueError("QuickBooks token payload did not include realmId")

        now = datetime.now(UTC)
        expires_at = now + timedelta(seconds=int(payload.get("expires_in", 0) or 0))
        refresh_expires_at = now + timedelta(seconds=int(payload.get("x_refresh_token_expires_in", 0) or 0))

        row = (
            self.db.query(QuickBooksConnection)
            .filter(QuickBooksConnection.realm_id == realm_id)
            .first()
        )

        if row is None:
            row = QuickBooksConnection(
                realm_id=realm_id,
                access_token=str(payload.get("access_token") or ""),
                refresh_token=str(payload.get("refresh_token") or ""),
                token_type=str(payload.get("token_type") or "") or None,
                scope=str(payload.get("scope") or "") or None,
                expires_at=expires_at,
                refresh_expires_at=refresh_expires_at,
                environment=QB_ENV,
                is_active=True,
            )
            self.db.add(row)
        else:
            row.access_token = str(payload.get("access_token") or "")
            row.refresh_token = str(payload.get("refresh_token") or "")
            row.token_type = str(payload.get("token_type") or "") or None
            row.scope = str(payload.get("scope") or "") or None
            row.expires_at = expires_at
            row.refresh_expires_at = refresh_expires_at
            row.environment = QB_ENV
            row.is_active = True

        (
            self.db.query(QuickBooksConnection)
            .filter(QuickBooksConnection.realm_id != realm_id, QuickBooksConnection.is_active.is_(True))
            .update({QuickBooksConnection.is_active: False}, synchronize_session=False)
        )

        self.db.commit()
        self.db.refresh(row)
        return row

    def get_status(self) -> dict[str, str | bool | None]:
        row = self._get_active_connection()
        if row is None:
            return {
                "connected": False,
                "provider": "quickbooks",
                "environment": QB_ENV,
            }

        return {
            "connected": True,
            "provider": "quickbooks",
            "environment": row.environment,
            "realm_id": row.realm_id,
            "token_type": row.token_type,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
            "access_token_expires_at": row.expires_at.isoformat() if row.expires_at else None,
            "refresh_token_expires_at": row.refresh_expires_at.isoformat() if row.refresh_expires_at else None,
            "is_active": row.is_active,
            "has_access_token": bool(row.access_token),
            "has_refresh_token": bool(row.refresh_token),
        }
