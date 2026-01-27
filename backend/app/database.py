"""
Configuration for the database connection.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Get DB URL from environment variable
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@db:5432/matchcota"
)

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)

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
