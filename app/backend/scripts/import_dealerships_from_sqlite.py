import argparse
import sqlite3
import sys
from pathlib import Path

from sqlalchemy import create_engine, text


SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import DATABASE_URL
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Upsert dealership data from a local SQLite database into the configured backend database.",
    )
    parser.add_argument(
        "--source",
        default=str(BACKEND_ROOT / "project_local.db"),
        help="Path to the SQLite source database. Defaults to backend/project_local.db",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would change without writing to the target database.",
    )
    return parser.parse_args()


def normalize_value(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        value = str(value)
    normalized = value.strip()
    return normalized or None


def load_source_rows(source_path: Path) -> list[sqlite3.Row]:
    conn = sqlite3.connect(source_path)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """
            SELECT
                code,
                name,
                phone,
                email,
                address,
                city,
                postal_code,
                status,
                notes,
                created_at,
                updated_at
            FROM dealerships
            ORDER BY code
            """
        ).fetchall()
    finally:
        conn.close()
    return rows


def sync_dealerships(source_rows: list[sqlite3.Row], dry_run: bool) -> tuple[int, int]:
    engine = create_engine(DATABASE_URL, pool_pre_ping=not DATABASE_URL.startswith("sqlite"))
    inserted = 0
    updated = 0

    with engine.begin() as conn:
        existing_rows = conn.execute(
            text(
                """
                SELECT code, name, phone, email, address, city, postal_code, status, notes
                FROM dealerships
                """
            )
        ).mappings()
        existing_by_code = {row["code"]: dict(row) for row in existing_rows}

        for source in source_rows:
            code = normalize_value(source["code"])
            name = normalize_value(source["name"])
            if not code or not name:
                continue

            payload = {
                "code": code,
                "name": name,
                "phone": normalize_value(source["phone"]),
                "email": normalize_value(source["email"]),
                "address": normalize_value(source["address"]),
                "city": normalize_value(source["city"]),
                "postal_code": normalize_value(source["postal_code"]),
                "status": normalize_value(source["status"]) or "active",
                "notes": normalize_value(source["notes"]),
            }

            existing = existing_by_code.get(code)
            if existing is None:
                inserted += 1
                if dry_run:
                    continue
                conn.execute(
                    text(
                        """
                        INSERT INTO dealerships (
                            id,
                            code,
                            name,
                            phone,
                            email,
                            address,
                            city,
                            postal_code,
                            status,
                            notes
                        )
                        VALUES (
                            gen_random_uuid(),
                            :code,
                            :name,
                            :phone,
                            :email,
                            :address,
                            :city,
                            :postal_code,
                            :status,
                            :notes
                        )
                        """
                    ),
                    payload,
                )
                existing_by_code[code] = payload
                continue

            changed = any(existing.get(field) != value for field, value in payload.items() if field != "code")
            if not changed:
                continue

            updated += 1
            if dry_run:
                continue
            conn.execute(
                text(
                    """
                    UPDATE dealerships
                    SET
                        name = :name,
                        phone = :phone,
                        email = :email,
                        address = :address,
                        city = :city,
                        postal_code = :postal_code,
                        status = :status,
                        notes = :notes,
                        updated_at = NOW()
                    WHERE code = :code
                    """
                ),
                payload,
            )

        if dry_run:
            conn.rollback()

    return inserted, updated


def main() -> None:
    args = parse_args()
    source_path = Path(args.source).resolve()
    if not source_path.exists():
        raise SystemExit(f"Source database not found: {source_path}")

    rows = load_source_rows(source_path)
    inserted, updated = sync_dealerships(rows, args.dry_run)

    mode = "DRY RUN" if args.dry_run else "SYNCED"
    print(f"{mode}: source_rows={len(rows)} inserted={inserted} updated={updated}")


if __name__ == "__main__":
    main()
