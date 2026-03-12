from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any
from uuid import UUID

import requests
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload

from ..core.config import QB_ENV
from ..models.invoice import Invoice
from ..services.quickbooks_connection_service import QuickBooksConnectionService
from ..services.quickbooks_tax_code_sync_service import QuickBooksTaxCodeSyncService


@dataclass(frozen=True)
class QuickBooksInvoiceSyncResult:
    qb_invoice_id: str
    payload: dict[str, Any]
    provider_response: dict[str, Any]


class QuickBooksInvoiceService:
    def __init__(self, db: Session):
        self.db = db
        self.connection_service = QuickBooksConnectionService(db)
        self.tax_code_service = QuickBooksTaxCodeSyncService(db)

    def sync_invoice(self, invoice_id: UUID) -> QuickBooksInvoiceSyncResult:
        invoice = (
            self.db.query(Invoice)
            .options(selectinload(Invoice.line_items))
            .filter(Invoice.id == invoice_id)
            .first()
        )
        if invoice is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
        return self.sync_invoice_row(invoice)

    def sync_invoice_row(self, invoice: Invoice) -> QuickBooksInvoiceSyncResult:
        connection = self.connection_service.get_active_connection_or_raise(refresh_if_needed=True)
        # TaxCode has no QuickBooks webhook/CDC support, so refresh it before every invoice sync.
        self.tax_code_service.sync_tax_codes()
        payload = self.build_payload(
            invoice,
            realm_id=connection.realm_id,
            access_token=connection.access_token,
        )
        qb_invoice_id = str(invoice.qb_invoice_id or "").strip()
        if qb_invoice_id:
            response_payload = self._update_invoice(
                realm_id=connection.realm_id,
                access_token=connection.access_token,
                qb_invoice_id=qb_invoice_id,
                payload=payload,
            )
        else:
            response_payload = self._post_invoice(
                realm_id=connection.realm_id,
                access_token=connection.access_token,
                payload=payload,
            )

        invoice_payload = response_payload.get("Invoice") if isinstance(response_payload, dict) else None
        resolved_qb_invoice_id = str((invoice_payload or {}).get("Id") or qb_invoice_id).strip()
        if not resolved_qb_invoice_id:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="QuickBooks invoice response did not include an invoice Id.",
            )

        return QuickBooksInvoiceSyncResult(
            qb_invoice_id=resolved_qb_invoice_id,
            payload=payload,
            provider_response=response_payload,
        )

    def build_payload(self, invoice: Invoice, *, realm_id: str, access_token: str) -> dict[str, Any]:
        qb_customer_id = str(invoice.qb_customer_id or "").strip()
        if not qb_customer_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invoice is missing qb_customer_id and cannot be synced to QuickBooks.",
            )
        if not invoice.line_items:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invoice has no line items to sync to QuickBooks.",
            )
        if not self.tax_code_service.verify_sales_tax_enabled(realm_id=realm_id, access_token=access_token):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="QuickBooks sales tax is disabled in Preferences.TaxPrefs.UsingSalesTax.",
            )

        lines: list[dict[str, Any]] = []
        tax_code_ids: set[str] = set()
        for item in invoice.line_items:
            qb_item_id = str(item.qb_item_id or "").strip()
            if not qb_item_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invoice line '{item.product_service}' is missing qb_item_id.",
                )

            quantity = Decimal(str(item.quantity))
            rate = Decimal(str(item.rate))
            amount = Decimal(str(item.amount))
            internal_tax_code = str(item.tax_code or "EXEMPT").strip().upper()
            qb_tax_code_id = self.tax_code_service.get_tax_code_id_for_internal_code(
                internal_tax_code,
                realm_id=realm_id,
            )
            tax_code_ids.add(qb_tax_code_id)
            lines.append(
                {
                    "Amount": float(amount),
                    "Description": item.description or item.product_service,
                    "DetailType": "SalesItemLineDetail",
                    "SalesItemLineDetail": {
                        "ItemRef": {"value": qb_item_id},
                        "Qty": float(quantity),
                        "UnitPrice": float(rate),
                        "TaxCodeRef": {"value": qb_tax_code_id},
                    },
                }
            )

        payload: dict[str, Any] = {
            "DocNumber": invoice.invoice_number,
            "TxnDate": invoice.invoice_date.isoformat(),
            "DueDate": invoice.due_date.isoformat(),
            "CustomerRef": {"value": qb_customer_id},
            "Line": lines,
        }
        if len(tax_code_ids) == 1:
            payload["TxnTaxDetail"] = {"TxnTaxCodeRef": {"value": next(iter(tax_code_ids))}}
        if invoice.customer_message:
            payload["CustomerMemo"] = {"value": invoice.customer_message}
        return payload

    def _post_invoice(self, *, realm_id: str, access_token: str, payload: dict[str, Any]) -> dict[str, Any]:
        response = requests.post(
            f"{self._company_api_base()}/company/{realm_id}/invoice",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            params={"minorversion": 75},
            json=payload,
            timeout=30,
        )
        try:
            response_payload = response.json()
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="QuickBooks invoice response was not valid JSON.",
            ) from exc

        if not response.ok:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "message": "QuickBooks invoice creation failed.",
                    "provider_status": response.status_code,
                    "provider_response": response_payload,
                },
            )
        return response_payload

    def _update_invoice(
        self,
        *,
        realm_id: str,
        access_token: str,
        qb_invoice_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        existing_invoice = self._get_existing_invoice(
            realm_id=realm_id,
            access_token=access_token,
            qb_invoice_id=qb_invoice_id,
        )
        sync_token = str(((existing_invoice.get("Invoice") or {}).get("SyncToken")) or "").strip()
        if not sync_token:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="QuickBooks invoice update response did not include SyncToken.",
            )

        update_payload = {
            **payload,
            "Id": qb_invoice_id,
            "SyncToken": sync_token,
            "sparse": True,
        }
        return self._post_invoice(
            realm_id=realm_id,
            access_token=access_token,
            payload=update_payload,
        )

    def _get_existing_invoice(self, *, realm_id: str, access_token: str, qb_invoice_id: str) -> dict[str, Any]:
        response = requests.get(
            f"{self._company_api_base()}/company/{realm_id}/invoice/{qb_invoice_id}",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
            params={"minorversion": 75},
            timeout=30,
        )
        try:
            response_payload = response.json()
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="QuickBooks invoice fetch response was not valid JSON.",
            ) from exc

        if not response.ok:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "message": "QuickBooks invoice fetch failed.",
                    "provider_status": response.status_code,
                    "provider_response": response_payload,
                },
            )
        return response_payload

    @staticmethod
    def _company_api_base() -> str:
        if QB_ENV == "production":
            return "https://quickbooks.api.intuit.com/v3"
        return "https://sandbox-quickbooks.api.intuit.com/v3"
