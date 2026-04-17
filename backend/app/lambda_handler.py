import os
import subprocess
import sys

from mangum import Mangum
from sqlalchemy import create_engine
from sqlalchemy import inspect
from sqlalchemy.pool import NullPool

from app.bootstrap_runtime import bootstrap_runtime_secrets

bootstrap_runtime_secrets()

from app.main import app

_mangum_handler = Mangum(app, lifespan="off")


def _run_alembic(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "alembic.ini", *args],
        capture_output=True,
        text=True,
        cwd="/var/task",
    )


def _infer_baseline_revision() -> str | None:
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        return None

    engine = create_engine(database_url, poolclass=NullPool)
    inspector = inspect(engine)

    try:
        has_alembic_version = inspector.has_table("alembic_version")
        has_tenants_table = inspector.has_table("tenants")
        if has_alembic_version or not has_tenants_table:
            return None

        has_leads_table = inspector.has_table("leads")
        has_animals_table = inspector.has_table("animals")
        has_users_table = inspector.has_table("users")

        leads_columns = set()
        if has_leads_table:
            leads_columns = {column["name"] for column in inspector.get_columns("leads")}
        has_status = "status" in leads_columns

        if has_status:
            check_names = set()
            if has_leads_table:
                check_names = {
                    check.get("name")
                    for check in inspector.get_check_constraints("leads")
                    if check.get("name")
                }
            if "ck_leads_contact_required" in check_names:
                return "06_lead_contact_contract"
            return "05_lead_status_contract"

        animal_columns = set()
        if has_animals_table:
            animal_columns = {column["name"] for column in inspector.get_columns("animals")}
        has_maintenance_level = "maintenance_level" in animal_columns

        unique_names = set()
        if has_users_table:
            unique_names = {
                constraint.get("name")
                for constraint in inspector.get_unique_constraints("users")
                if constraint.get("name")
            }
        has_tenant_scoped_user_identity = {
            "uq_users_tenant_id_email",
            "uq_users_tenant_id_username",
        }.issubset(unique_names)

        if has_maintenance_level and has_tenant_scoped_user_identity:
            return "04_tenant_scoped_user_identity"
        if has_maintenance_level:
            return "fafb12bebcd4"
        return "53b90f4a258a"
    finally:
        engine.dispose()


def _run_migrations() -> dict[str, object]:
    baseline_revision = _infer_baseline_revision()

    stamp_stdout = ""
    stamp_stderr = ""
    if baseline_revision:
        stamp_result = _run_alembic("stamp", baseline_revision)
        stamp_stdout = stamp_result.stdout
        stamp_stderr = stamp_result.stderr
        if stamp_result.returncode != 0:
            return {
                "status": "error",
                "stdout": stamp_stdout,
                "stderr": stamp_stderr,
                "returncode": stamp_result.returncode,
                "baseline_revision": baseline_revision,
            }

    upgrade_result = _run_alembic("upgrade", "head")
    if upgrade_result.returncode != 0:
        return {
            "status": "error",
            "stdout": f"{stamp_stdout}{upgrade_result.stdout}",
            "stderr": f"{stamp_stderr}{upgrade_result.stderr}",
            "returncode": upgrade_result.returncode,
            "baseline_revision": baseline_revision,
        }

    current_result = _run_alembic("current")
    return {
        "status": "ok" if current_result.returncode == 0 else "error",
        "stdout": f"{stamp_stdout}{upgrade_result.stdout}{current_result.stdout}",
        "stderr": f"{stamp_stderr}{upgrade_result.stderr}{current_result.stderr}",
        "returncode": current_result.returncode,
        "baseline_revision": baseline_revision,
    }


def _run_alembic_current() -> dict[str, object]:
    result = _run_alembic("current")
    return {
        "status": "ok" if result.returncode == 0 else "error",
        "stdout": result.stdout,
        "stderr": result.stderr,
        "returncode": result.returncode,
    }


def handler(event, context):
    task = event.get("task") if isinstance(event, dict) else None
    if task == "migrate":
        return _run_migrations()
    if task == "alembic-current":
        return _run_alembic_current()

    return _mangum_handler(event, context)
