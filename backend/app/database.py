"""
Configuration for the database connection.
"""

from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Get DB URL from environment variable
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@db:5432/matchcota"
)

# Create SQLAlchemy engine with connection pooling
# pool_size: number of persistent connections kept open
# max_overflow: extra connections allowed when pool is full (temporary)
# pool_pre_ping: test connection health before using it (handles RDS restarts)
# pool_recycle: recycle connections after 1h (prevents stale connections)
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
