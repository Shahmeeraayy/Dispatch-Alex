from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect
from sqlalchemy.exc import OperationalError

from .api import deps
from .api.endpoints import (
    admin_jobs,
    admin_dealerships,
    admin_email_change_requests,
    admin_reports,
    admin_services,
    admin_settings,
    admin_technicians,
    auth,
    integrations_make_jobs,
    integrations_quickbooks_oauth,
    integrations_quickbooks_webhooks,
    invoices,
    signup_requests,
    technician_profile,
    technician_time_off,
)
from .core.config import CORS_ALLOW_ORIGINS
from .models.job import Job
from .models.base import Base
from .services.job_services_service import JobServicesService

app = FastAPI(
    title="SM2 Dispatch Technician API",
    description="Backend APIs for admin technician profile, scheduling, and availability.",
    version="2.0.0",
)


@app.on_event("startup")
def ensure_runtime_schema() -> None:
    with deps.engine.begin() as conn:
        Base.metadata.create_all(bind=conn)
        admin_columns = {
            column["name"]
            for column in inspect(conn).get_columns("admin_credential_settings")
        }
        if admin_columns and "recovery_email" not in admin_columns:
            conn.exec_driver_sql("ALTER TABLE admin_credential_settings ADD COLUMN recovery_email VARCHAR(255)")

        invoice_columns = {column["name"] for column in inspect(conn).get_columns("invoices")}
        if invoice_columns and "approval_note" not in invoice_columns:
            conn.exec_driver_sql("ALTER TABLE invoices ADD COLUMN approval_note TEXT")

        job_service_columns = {column["name"] for column in inspect(conn).get_columns("job_services")}
        if job_service_columns and "quantity" not in job_service_columns:
            conn.exec_driver_sql("ALTER TABLE job_services ADD COLUMN quantity NUMERIC(10,2) DEFAULT 1 NOT NULL")
        if job_service_columns and "unit_price" not in job_service_columns:
            conn.exec_driver_sql("ALTER TABLE job_services ADD COLUMN unit_price NUMERIC(12,2) DEFAULT 0 NOT NULL")
    with deps.SessionLocal() as session:
        service = JobServicesService(session)
        changed = False
        for row in session.query(Job).all():
            changed = service.backfill_job(row) or changed
        if changed:
            session.commit()

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_technicians.router)
app.include_router(admin_jobs.router)
app.include_router(admin_dealerships.router)
app.include_router(admin_email_change_requests.router)
app.include_router(admin_reports.router)
app.include_router(admin_services.router)
app.include_router(admin_services.catalog_router)
app.include_router(admin_settings.router)
app.include_router(technician_profile.router)
app.include_router(technician_time_off.router)
app.include_router(auth.router)
app.include_router(invoices.router)
app.include_router(integrations_make_jobs.router)
app.include_router(integrations_quickbooks_oauth.router)
app.include_router(integrations_quickbooks_webhooks.router)
app.include_router(signup_requests.public_router)
app.include_router(signup_requests.admin_router)


@app.exception_handler(OperationalError)
def handle_database_operational_error(_: Request, __: OperationalError):
    return JSONResponse(
        status_code=503,
        content={"detail": "Database connection failed. Check DATABASE_URL and database settings."},
    )


@app.get("/")
def root():
    return {"message": "SM2 Dispatch technician profile APIs are active."}
