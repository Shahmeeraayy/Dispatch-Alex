from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..core.config import (
    PASSWORD_RESET_MAX_ATTEMPTS,
    PASSWORD_RESET_MAX_REQUESTS_PER_HOUR,
    PASSWORD_RESET_OTP_TTL_MINUTES,
    PASSWORD_RESET_TOKEN_TTL_MINUTES,
)
from ..core.security import create_password_reset_token, decode_password_reset_token
from ..models.password_reset_token import PasswordResetToken
from .admin_credential_settings_service import (
    AdminCredentialSettingsService,
    hash_password,
    serialize_recovery_emails,
)
from .email_service import EmailService

GENERIC_RESET_MESSAGE = "If an account exists for that email, a verification code has been sent."
logger = logging.getLogger(__name__)


def hash_otp(otp_code: str) -> str:
    return hashlib.sha256(otp_code.encode("utf-8")).hexdigest()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def mask_email(email: str) -> str | None:
    local_part, separator, domain = email.strip().partition("@")
    if not separator or not local_part or not domain:
        return None

    if len(local_part) <= 2:
        visible = local_part[:1]
    else:
        visible = local_part[:2]

    return f"{visible}***@{domain}"


class PasswordResetService:
    def __init__(self, db: Session, email_service: EmailService | None = None):
        self.db = db
        self.email_service = email_service or EmailService()
        self.admin_settings = AdminCredentialSettingsService(db)

    def request_password_reset(self, email: str) -> dict[str, object]:
        normalized_email = email.strip().lower()
        now_utc = utc_now()

        if not normalized_email:
            return {"message": GENERIC_RESET_MESSAGE}

        recent_request_count = (
            self.db.query(PasswordResetToken)
            .filter(
                PasswordResetToken.email == normalized_email,
                PasswordResetToken.created_at >= now_utc - timedelta(hours=1),
            )
            .count()
        )
        if recent_request_count >= PASSWORD_RESET_MAX_REQUESTS_PER_HOUR:
            return {"message": GENERIC_RESET_MESSAGE}

        settings = self.admin_settings.get_settings()
        if normalized_email != settings["admin_email"].strip().lower():
            return {"message": GENERIC_RESET_MESSAGE}

        delivery_emails = [
            str(item).strip().lower()
            for item in settings.get("recovery_emails", [])
            if str(item).strip()
        ]
        otp_code = f"{secrets.randbelow(1_000_000):06d}"
        row = PasswordResetToken(
            email=normalized_email,
            delivery_email=serialize_recovery_emails(delivery_emails),
            otp_hash=hash_otp(otp_code),
            expires_at=now_utc + timedelta(minutes=PASSWORD_RESET_OTP_TTL_MINUTES),
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)

        successful_delivery_emails: list[str] = []
        for recipient_email in delivery_emails:
            try:
                self.email_service.send_password_reset_otp(
                    recipient_email=recipient_email,
                    otp_code=otp_code,
                )
                successful_delivery_emails.append(recipient_email)
            except Exception:
                logger.exception(
                    "Failed to send password reset OTP for admin account.",
                    extra={
                        "admin_email": normalized_email,
                        "delivery_email": recipient_email,
                    },
                )

        if not successful_delivery_emails:
            self.db.delete(row)
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Password reset email could not be sent. Verify the recovery email and SMTP configuration.",
            )

        response: dict[str, object] = {"message": GENERIC_RESET_MESSAGE}
        delivery_hints = [
            masked
            for masked in (mask_email(email) for email in successful_delivery_emails)
            if masked
        ]
        if delivery_hints:
            response["delivery_email_hints"] = delivery_hints
            response["delivery_email_hint"] = delivery_hints[0]
        return response

    def verify_otp(self, email: str, otp_code: str) -> dict[str, str]:
        normalized_email = email.strip().lower()
        normalized_otp = otp_code.strip()
        if not normalized_email or not normalized_otp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email and OTP are required")

        row = (
            self.db.query(PasswordResetToken)
            .filter(
                PasswordResetToken.email == normalized_email,
                PasswordResetToken.is_used.is_(False),
            )
            .order_by(PasswordResetToken.created_at.desc())
            .first()
        )
        if row is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

        now_utc = utc_now()
        if row.attempts >= PASSWORD_RESET_MAX_ATTEMPTS:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="OTP attempt limit reached")
        if now_utc >= ensure_utc(row.expires_at):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

        if not secrets.compare_digest(row.otp_hash, hash_otp(normalized_otp)):
            row.attempts += 1
            self.db.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

        row.verified_at = now_utc
        self.db.commit()
        self.db.refresh(row)

        reset_token = create_password_reset_token(
            token_id=row.id,
            email=row.email,
            expires_at=now_utc + timedelta(minutes=PASSWORD_RESET_TOKEN_TTL_MINUTES),
        )
        return {"reset_token": reset_token}

    def reset_password(self, reset_token: str, new_password: str) -> dict[str, str]:
        normalized_password = new_password.strip()
        if len(normalized_password) < 6:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="New password must be at least 6 characters")

        token_subject = decode_password_reset_token(reset_token)
        row = (
            self.db.query(PasswordResetToken)
            .filter(PasswordResetToken.id == token_subject.token_id)
            .first()
        )
        if row is None or row.email != token_subject.email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid reset token")

        now_utc = utc_now()
        if row.is_used or row.verified_at is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid reset token")

        settings_row = self.admin_settings._ensure_recovery_email(self.admin_settings._get_or_create_settings_row())
        if token_subject.email != settings_row.admin_email.strip().lower():
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid reset token")

        settings_row.password_hash = hash_password(normalized_password)
        settings_row.password_changed_at = now_utc

        (
            self.db.query(PasswordResetToken)
            .filter(
                PasswordResetToken.email == token_subject.email,
                PasswordResetToken.is_used.is_(False),
            )
            .update(
                {
                    PasswordResetToken.is_used: True,
                    PasswordResetToken.used_at: now_utc,
                },
                synchronize_session=False,
            )
        )

        self.db.commit()
        return {"status": "ok"}
