from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect
from sqlalchemy.exc import OperationalError
import logging
from threading import Event, Thread

from .api import deps
from .api.endpoints import (
    admin_quickbooks,
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
from .core.config import CORS_ALLOW_ORIGINS, QUICKBOOKS_ITEMS_SYNC_INTERVAL_SECONDS
from .models.job import Job
from .models.base import Base
from .services.job_services_service import JobServicesService
from .services.quickbooks_connection_service import QuickBooksConnectionService
from .services.quickbooks_item_sync_service import QuickBooksItemSyncService


logger = logging.getLogger(__name__)
_quickbooks_sync_stop_event: Event | None = None
_quickbooks_sync_thread: Thread | None = None

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

        invoice_line_item_columns = {column["name"] for column in inspect(conn).get_columns("invoice_line_items")}
        if invoice_line_item_columns and "qb_item_id" not in invoice_line_item_columns:
            conn.exec_driver_sql("ALTER TABLE invoice_line_items ADD COLUMN qb_item_id VARCHAR(64)")

        job_service_columns = {column["name"] for column in inspect(conn).get_columns("job_services")}
        if job_service_columns and "quantity" not in job_service_columns:
            conn.exec_driver_sql("ALTER TABLE job_services ADD COLUMN quantity NUMERIC(10,2) DEFAULT 1 NOT NULL")
        if job_service_columns and "unit_price" not in job_service_columns:
            conn.exec_driver_sql("ALTER TABLE job_services ADD COLUMN unit_price NUMERIC(12,2) DEFAULT 0 NOT NULL")

        service_catalog_columns = {column["name"] for column in inspect(conn).get_columns("service_catalog")}
        if service_catalog_columns and "qb_item_id" not in service_catalog_columns:
            conn.exec_driver_sql("ALTER TABLE service_catalog ADD COLUMN qb_item_id VARCHAR(64)")
        if service_catalog_columns and "sku" not in service_catalog_columns:
            conn.exec_driver_sql("ALTER TABLE service_catalog ADD COLUMN sku VARCHAR(128)")
        if service_catalog_columns and "description" not in service_catalog_columns:
            conn.exec_driver_sql("ALTER TABLE service_catalog ADD COLUMN description TEXT")
        if service_catalog_columns and "qb_type" not in service_catalog_columns:
            conn.exec_driver_sql("ALTER TABLE service_catalog ADD COLUMN qb_type VARCHAR(64)")
    with deps.SessionLocal() as session:
        service = JobServicesService(session)
        changed = False
        for row in session.query(Job).all():
            changed = service.backfill_job(row) or changed
        if changed:
            session.commit()

    _sync_quickbooks_items_once()
    _start_quickbooks_sync_worker()


@app.on_event("shutdown")
def stop_quickbooks_sync_worker() -> None:
    global _quickbooks_sync_stop_event, _quickbooks_sync_thread
    if _quickbooks_sync_stop_event is not None:
        _quickbooks_sync_stop_event.set()
    if _quickbooks_sync_thread is not None and _quickbooks_sync_thread.is_alive():
        _quickbooks_sync_thread.join(timeout=2)
    _quickbooks_sync_stop_event = None
    _quickbooks_sync_thread = None


def _sync_quickbooks_items_once() -> None:
    try:
        with deps.SessionLocal() as db:
            connection_status = QuickBooksConnectionService(db).get_status()
            if not bool(connection_status.get("connected")):
                return
            result = QuickBooksItemSyncService(db).sync_items()
            logger.info(
                "QuickBooks item auto-sync completed: synced=%s created=%s updated=%s archived=%s",
                result.synced_count,
                result.created_count,
                result.updated_count,
                result.archived_count,
            )
    except Exception:
        logger.exception("QuickBooks item auto-sync failed.")


def _quickbooks_sync_worker(stop_event: Event, interval_seconds: int) -> None:
    while not stop_event.wait(interval_seconds):
        _sync_quickbooks_items_once()


def _start_quickbooks_sync_worker() -> None:
    global _quickbooks_sync_stop_event, _quickbooks_sync_thread

    if QUICKBOOKS_ITEMS_SYNC_INTERVAL_SECONDS <= 0:
        return
    if _quickbooks_sync_thread is not None and _quickbooks_sync_thread.is_alive():
        return

    _quickbooks_sync_stop_event = Event()
    _quickbooks_sync_thread = Thread(
        target=_quickbooks_sync_worker,
        args=(_quickbooks_sync_stop_event, QUICKBOOKS_ITEMS_SYNC_INTERVAL_SECONDS),
        daemon=True,
        name="quickbooks-item-sync-worker",
    )
    _quickbooks_sync_thread.start()

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_technicians.router)
app.include_router(admin_quickbooks.router)
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
