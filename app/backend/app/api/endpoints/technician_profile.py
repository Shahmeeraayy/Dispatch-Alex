from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...api import deps
from ...core.enums import UserRole
from ...core.security import AuthenticatedUser
from ...schemas.technician_profile import (
    EmailChangeRequestCreateRequest,
    EmailChangeRequestResponse,
    TechnicianJobActionResponse,
    TechnicianJobDelayRequest,
    TechnicianAvailabilityUpdateRequest,
    TechnicianJobRefuseRequest,
    TechnicianProfileResponse,
    TechnicianProfileUpdateRequest,
    TechnicianJobFeedResponse,
)
from ...services.technician_jobs_service import TechnicianJobsService
from ...services.technician_profile_service import TechnicianProfileService

router = APIRouter(prefix="/technicians/me", tags=["technician-profile"])


@router.get("", response_model=TechnicianProfileResponse)
def get_my_profile(
    db: Session = Depends(deps.get_db),
    current_user: AuthenticatedUser = Depends(deps.require_roles(UserRole.TECHNICIAN)),
):
    return TechnicianProfileService(db, current_user).get_profile()


@router.put("", response_model=TechnicianProfileResponse)
def update_my_profile(
    payload: TechnicianProfileUpdateRequest,
    db: Session = Depends(deps.get_db),
    current_user: AuthenticatedUser = Depends(deps.require_roles(UserRole.TECHNICIAN)),
):
    return TechnicianProfileService(db, current_user).update_profile(payload)


@router.put("/availability", response_model=TechnicianProfileResponse)
def update_my_availability(
    payload: TechnicianAvailabilityUpdateRequest,
    db: Session = Depends(deps.get_db),
    current_user: AuthenticatedUser = Depends(deps.require_roles(UserRole.TECHNICIAN)),
):
    return TechnicianProfileService(db, current_user).update_availability(payload)


@router.post("/email-change-request", response_model=EmailChangeRequestResponse, status_code=201)
def request_email_change(
    payload: EmailChangeRequestCreateRequest,
    db: Session = Depends(deps.get_db),
    current_user: AuthenticatedUser = Depends(deps.require_roles(UserRole.TECHNICIAN)),
):
    return TechnicianProfileService(db, current_user).request_email_change(payload)


@router.get("/email-change-requests", response_model=List[EmailChangeRequestResponse])
def list_my_email_change_requests(
    db: Session = Depends(deps.get_db),
    current_user: AuthenticatedUser = Depends(deps.require_roles(UserRole.TECHNICIAN)),
):
    return TechnicianProfileService(db, current_user).list_my_email_change_requests()


@router.get("/jobs-feed", response_model=TechnicianJobFeedResponse)
def get_my_jobs_feed(
    db: Session = Depends(deps.get_db),
    current_user: AuthenticatedUser = Depends(deps.require_roles(UserRole.TECHNICIAN)),
):
    return TechnicianJobsService(db).get_job_feed(current_user.user_id)


@router.post("/jobs/{job_id}/start", response_model=TechnicianJobActionResponse)
def start_my_job(
    job_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: AuthenticatedUser = Depends(deps.require_roles(UserRole.TECHNICIAN)),
):
    row = TechnicianJobsService(db).start_my_job(current_user.user_id, job_id)
    return TechnicianJobActionResponse(job_id=row.id, status=row.status)


@router.post("/jobs/{job_id}/accept", response_model=TechnicianJobActionResponse)
def accept_my_job(
    job_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: AuthenticatedUser = Depends(deps.require_roles(UserRole.TECHNICIAN)),
):
    row = TechnicianJobsService(db).accept_my_job(current_user.user_id, job_id)
    return TechnicianJobActionResponse(job_id=row.id, status=row.status)


@router.post("/jobs/{job_id}/complete", response_model=TechnicianJobActionResponse)
def complete_my_job(
    job_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: AuthenticatedUser = Depends(deps.require_roles(UserRole.TECHNICIAN)),
):
    row = TechnicianJobsService(db).complete_my_job(current_user.user_id, job_id)
    return TechnicianJobActionResponse(job_id=row.id, status=row.status)


@router.post("/jobs/{job_id}/delay", response_model=TechnicianJobActionResponse)
def delay_my_job(
    job_id: UUID,
    payload: TechnicianJobDelayRequest,
    db: Session = Depends(deps.get_db),
    current_user: AuthenticatedUser = Depends(deps.require_roles(UserRole.TECHNICIAN)),
):
    row = TechnicianJobsService(db).delay_my_job(
        current_user.user_id,
        job_id,
        minutes=payload.minutes,
        note=payload.note,
    )
    return TechnicianJobActionResponse(job_id=row.id, status=row.status)


@router.post("/jobs/{job_id}/refuse", response_model=TechnicianJobActionResponse)
def refuse_my_job(
    job_id: UUID,
    payload: TechnicianJobRefuseRequest,
    db: Session = Depends(deps.get_db),
    current_user: AuthenticatedUser = Depends(deps.require_roles(UserRole.TECHNICIAN)),
):
    row = TechnicianJobsService(db).refuse_my_job(
        current_user.user_id,
        job_id,
        reason=payload.reason,
        comment=payload.comment,
    )
    return TechnicianJobActionResponse(job_id=row.id, status=row.status)
