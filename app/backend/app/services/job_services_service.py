from __future__ import annotations

from collections.abc import Iterable
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from ..models.job import Job
from ..models.job_event import JobEvent
from ..models.job_service import JobService
from ..models.service_catalog import ServiceCatalog


class JobServicesService:
    def __init__(self, db: Session):
        self.db = db

    def list_service_rows(self, job: Job) -> list[JobService]:
        if getattr(job, "job_services", None):
            return sorted(job.job_services, key=lambda item: (item.sort_order, item.created_at, item.id))

        rows = (
            self.db.query(JobService)
            .filter(JobService.job_id == job.id)
            .order_by(JobService.sort_order.asc(), JobService.created_at.asc())
            .all()
        )
        return rows

    def list_service_names(self, job: Job) -> list[str]:
        rows = self.list_service_rows(job)
        if rows:
            return [row.service_name_snapshot.strip() for row in rows if row.service_name_snapshot and row.service_name_snapshot.strip()]

        legacy = (job.service_type or "").strip()
        return [legacy] if legacy else []

    def replace_services(
        self,
        *,
        job: Job,
        service_names: Iterable[str],
        source: str,
        created_by_user_id: UUID | None = None,
    ) -> list[JobService]:
        normalized = self._normalize_service_names(service_names)
        job.job_services.clear()

        for index, service_name in enumerate(normalized):
            job.job_services.append(
                JobService(
                    service_name_snapshot=service_name,
                    service_catalog_id=self._resolve_service_catalog_id(service_name),
                    source=source,
                    sort_order=index,
                    created_by_user_id=created_by_user_id,
                )
            )

        job.service_type = normalized[0]
        return list(job.job_services)

    def add_service(
        self,
        *,
        job: Job,
        service_name: str,
        source: str,
        notes: str | None = None,
        created_by_user_id: UUID | None = None,
        audit_actor_type: str | None = None,
    ) -> JobService:
        normalized = self._normalize_service_names([service_name])[0]
        existing_names = {name.lower() for name in self.list_service_names(job)}
        if normalized.lower() in existing_names:
            for row in self.list_service_rows(job):
                if row.service_name_snapshot.strip().lower() == normalized.lower():
                    return row

        next_sort_order = len(self.list_service_rows(job))
        row = JobService(
            job_id=job.id,
            service_name_snapshot=normalized,
            service_catalog_id=self._resolve_service_catalog_id(normalized),
            source=source,
            notes=(notes or "").strip() or None,
            sort_order=next_sort_order,
            created_by_user_id=created_by_user_id,
        )
        self.db.add(row)
        self.db.flush()

        if not (job.service_type or "").strip():
            job.service_type = normalized

        if audit_actor_type:
            self.db.add(
                JobEvent(
                    job_id=job.id,
                    event_type="JOB_SERVICE_ADDED",
                    actor_type=audit_actor_type,
                    payload_json={
                        "service_name": normalized,
                        "source": source,
                        "notes": row.notes,
                        "created_by_user_id": str(created_by_user_id) if created_by_user_id is not None else None,
                    },
                )
            )

        return row

    def backfill_job(self, job: Job) -> bool:
        rows = self.list_service_rows(job)
        if rows:
            primary = rows[0].service_name_snapshot.strip()
            if primary and job.service_type != primary:
                job.service_type = primary
                return True
            return False

        legacy = (job.service_type or "").strip()
        if not legacy:
            return False

        self.db.add(
            JobService(
                job_id=job.id,
                service_name_snapshot=legacy,
                source="dealership",
                sort_order=0,
            )
        )
        return True

    @staticmethod
    def serialize_service_rows(rows: list[JobService]) -> list[dict[str, Any]]:
        return [
            {
                "id": str(row.id),
                "service_name": row.service_name_snapshot,
                "source": row.source,
                "notes": row.notes,
                "sort_order": row.sort_order,
            }
            for row in rows
        ]

    @staticmethod
    def _normalize_service_names(service_names: Iterable[str]) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for item in service_names:
            trimmed = item.strip()
            if not trimmed:
                continue
            key = trimmed.lower()
            if key in seen:
                continue
            seen.add(key)
            normalized.append(trimmed)
        if not normalized:
            raise ValueError("At least one service is required")
        return normalized

    def _resolve_service_catalog_id(self, service_name: str) -> UUID | None:
        row = (
            self.db.query(ServiceCatalog.id)
            .filter(ServiceCatalog.name.ilike(service_name.strip()))
            .first()
        )
        return row[0] if row is not None else None
