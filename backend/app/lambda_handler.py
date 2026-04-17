from mangum import Mangum

from app.bootstrap_runtime import bootstrap_runtime_secrets
# key-link: backend/app/lambda_handler.py -> backend/app/bootstrap_runtime.py (bootstrap before app import)

bootstrap_runtime_secrets()

from app.main import app

_mangum_handler = Mangum(app, lifespan="off")


def handler(event, context):
    """
    Lambda entry point.

    Routes ``{"task": "migrate"}`` events to Alembic ``upgrade head`` and
    delegates all other events (standard HTTP via API Gateway) to Mangum.

    Returns for migrate task:
        {
            "status": "ok" | "error",
            "stdout": str,
            "stderr": str,
            "returncode": int,
        }
    """
    if event.get("task") == "migrate":
        import subprocess
        import sys

        result = subprocess.run(
            [sys.executable, "-m", "alembic", "-c", "alembic.ini", "upgrade", "head"],
            capture_output=True,
            text=True,
            cwd="/var/task",
        )
        return {
            "status": "ok" if result.returncode == 0 else "error",
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
        }

    return _mangum_handler(event, context)
