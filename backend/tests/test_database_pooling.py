import importlib

from sqlalchemy.pool import NullPool, QueuePool

from app.config import settings


def test_database_uses_settings_database_url_source():
    original_database_url = settings.database_url
    original_environment = settings.environment

    try:
        settings.environment = "development"
        settings.database_url = "postgresql://from-settings-user:pw@localhost:5432/from_settings_db"

        import app.database as database_module

        database_module = importlib.reload(database_module)

        assert database_module.DATABASE_URL == settings.database_url
    finally:
        settings.database_url = original_database_url
        settings.environment = original_environment


def test_database_uses_nullpool_in_production():
    original_environment = settings.environment

    try:
        settings.environment = "production"

        import app.database as database_module

        database_module = importlib.reload(database_module)

        assert isinstance(database_module.engine.pool, NullPool)
    finally:
        settings.environment = original_environment


def test_database_keeps_queuepool_outside_production():
    original_environment = settings.environment

    try:
        settings.environment = "development"

        import app.database as database_module

        database_module = importlib.reload(database_module)

        assert isinstance(database_module.engine.pool, QueuePool)
    finally:
        settings.environment = original_environment
