from unittest.mock import MagicMock

import app.database as database


def _reset_bootstrap_state(monkeypatch):
    monkeypatch.setattr(database, "_schema_bootstrap_checked", False)


def test_schema_bootstrap_skips_when_not_production(monkeypatch):
    _reset_bootstrap_state(monkeypatch)
    monkeypatch.setattr(database.settings.__class__, "is_production", lambda _: False)

    inspect_mock = MagicMock()
    monkeypatch.setattr(database, "inspect", inspect_mock)

    database.ensure_production_schema_bootstrap()

    inspect_mock.assert_not_called()
    assert database._schema_bootstrap_checked is False


def test_schema_bootstrap_creates_tables_when_tenants_missing(monkeypatch):
    _reset_bootstrap_state(monkeypatch)
    monkeypatch.setattr(database.settings.__class__, "is_production", lambda _: True)

    inspector = MagicMock()
    inspector.has_table.return_value = False
    monkeypatch.setattr(database, "inspect", lambda _: inspector)

    create_all_mock = MagicMock()
    monkeypatch.setattr(database.Base.metadata, "create_all", create_all_mock)

    database.ensure_production_schema_bootstrap()

    inspector.has_table.assert_called_once_with("tenants")
    create_all_mock.assert_called_once_with(bind=database.engine)
    assert database._schema_bootstrap_checked is True


def test_schema_bootstrap_runs_once_per_process(monkeypatch):
    _reset_bootstrap_state(monkeypatch)
    monkeypatch.setattr(database.settings.__class__, "is_production", lambda _: True)

    inspector = MagicMock()
    inspector.has_table.return_value = True
    monkeypatch.setattr(database, "inspect", lambda _: inspector)

    create_all_mock = MagicMock()
    monkeypatch.setattr(database.Base.metadata, "create_all", create_all_mock)

    database.ensure_production_schema_bootstrap()
    database.ensure_production_schema_bootstrap()

    inspector.has_table.assert_called_once_with("tenants")
    create_all_mock.assert_not_called()
    assert database._schema_bootstrap_checked is True
