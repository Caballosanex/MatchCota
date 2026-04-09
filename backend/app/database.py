"""
Configuration for the database connection.
"""

from sqlalchemy import create_engine
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


def get_db():
    """
    Dependency to get DB session in FastAPI.

    Usage:
        @app.get("/items")
        def read_items(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
