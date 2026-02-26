from datetime import date, datetime, time
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, validator


class AdminJobListItemResponse(BaseModel):
    id: UUID
    job_code: str
    status: str
    dealership_id: Optional[UUID] = None
    dealership_name: Optional[str] = None
    assigned_technician_id: Optional[UUID] = None
    assigned_technician_name: Optional[str] = None
    pre_assigned_technician_id: Optional[UUID] = None
    pre_assigned_technician_name: Optional[str] = None
    pre_assignment_reason: Optional[str] = None
    service_type: Optional[str] = None
    vehicle: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    requested_service_date: Optional[date] = None
    requested_service_time: Optional[time] = None
    source_system: Optional[str] = None
    source_metadata: Optional[Dict[str, Any]] = None


class AdminJobAssignmentUpdateRequest(BaseModel):
    assigned_technician_id: Optional[UUID] = None


class AdminJobCreateRequest(BaseModel):
    job_code: Optional[str] = None
    dealership_name: str
    service_name: str
    vehicle_summary: str
    pre_assigned_technician_id: Optional[UUID] = None
    requested_service_date: Optional[date] = None
    requested_service_time: Optional[time] = None

    @validator("dealership_name", "service_name", "vehicle_summary")
    def validate_required_text(cls, value: str):
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field is required")
        return normalized

    @validator("job_code")
    def validate_optional_job_code(cls, value: Optional[str]):
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None
