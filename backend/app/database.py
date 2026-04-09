"""
Configuration for the database connection.
"""

from threading import Lock

from sqlalchemy import create_engine
from sqlalchemy import inspect
from sqlalchemy.pool import NullPool, QueuePool
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

# Single source of truth for DB URL
DATABASE_URL = settings.database_url


if settings.is_production():
    # Lambda-safe production mode: avoid persistent pooled connections
    engine = create_engine(
        DATABASE_URL,
        poolclass=NullPool,
        pool_pre_ping=True,
    )
else:
    # Development/test mode: keep queue pool tuning
    engine = create_engine(
        DATABASE_URL,
        poolclass=QueuePool,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=3600,
    )

# Create SessionLocal for DB sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base for models - IMPORTANT: Alembic uses this Base
Base = declarative_base()

_schema_bootstrap_lock = Lock()
_schema_bootstrap_checked = False


def ensure_production_schema_bootstrap() -> None:
    """
    In production, bootstrap core schema once if tables are missing.

    This is a one-time, process-local fallback for environments where
    migrations could not be run from the operator host.
    """

    global _schema_bootstrap_checked

    if not settings.is_production() or _schema_bootstrap_checked:
        return

    with _schema_bootstrap_lock:
        if _schema_bootstrap_checked:
            return

        tenants_table_exists = inspect(engine).has_table("tenants")

        if not tenants_table_exists:
            # Import registers model metadata on Base before create_all.
            from app.models import animal, lead, questionnaire, tenant, user  # noqa: F401

            Base.metadata.create_all(bind=engine)

        _schema_bootstrap_checked = True


def get_db():
    """
    Dependency to get DB session in FastAPI.

    Usage:
        @app.get("/items")
        def read_items(db: Session = Depends(get_db)):
            ...
    """
    ensure_production_schema_bootstrap()

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
