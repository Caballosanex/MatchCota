import os
from unittest.mock import MagicMock

import pytest

from app import bootstrap_runtime


def _reset_runtime_cache(monkeypatch):
    monkeypatch.setattr(bootstrap_runtime, "_RUNTIME_CACHE", {})


def _set_required_env(monkeypatch):
    monkeypatch.setenv("APP_AWS_REGION", "us-east-1")
    monkeypatch.setenv("DB_PASSWORD_SSM_PARAMETER", "DB_PASSWORD")
    monkeypatch.setenv("APP_SECRET_KEY_SSM_PARAMETER", "APP_SECRET_KEY")
    monkeypatch.setenv("JWT_SECRET_KEY_SSM_PARAMETER", "JWT_SECRET_KEY")
    monkeypatch.setenv("DB_HOST", "db.example.internal")
    monkeypatch.setenv("DB_PORT", "5432")
    monkeypatch.setenv("DB_NAME", "matchcota")
    monkeypatch.setenv("DB_USERNAME", "matchcota_admin")


def test_bootstrap_resolves_and_sets_runtime_env(monkeypatch):
    _reset_runtime_cache(monkeypatch)
    _set_required_env(monkeypatch)

    values = {
        "DB_PASSWORD": "db-pass",
        "APP_SECRET_KEY": "app-secret",
        "JWT_SECRET_KEY": "jwt-secret",
    }

    ssm_client = MagicMock()
    ssm_client.get_parameter.side_effect = lambda Name, WithDecryption=False: {
        "Parameter": {"Value": values[Name]}
    }
    monkeypatch.setattr(bootstrap_runtime.boto3, "client", lambda *args, **kwargs: ssm_client)

    resolved = bootstrap_runtime.bootstrap_runtime_secrets()

    assert resolved["SECRET_KEY"] == "app-secret"
    assert resolved["JWT_SECRET_KEY"] == "jwt-secret"
    assert resolved["RUNTIME_SECRETS_BOOTSTRAPPED"] == "true"
    assert os.environ["DATABASE_URL"] == "postgresql://matchcota_admin:db-pass@db.example.internal:5432/matchcota?sslmode=require"
    assert ssm_client.get_parameter.call_count == 3


def test_bootstrap_fails_closed_when_reference_is_missing(monkeypatch):
    _reset_runtime_cache(monkeypatch)
    _set_required_env(monkeypatch)
    monkeypatch.delenv("JWT_SECRET_KEY_SSM_PARAMETER")
    client_factory = MagicMock()
    monkeypatch.setattr(bootstrap_runtime.boto3, "client", client_factory)

    with pytest.raises(
        RuntimeError,
        match=r"missing JWT_SECRET_KEY_SSM_PARAMETER \(before SSM client init\)",
    ):
        bootstrap_runtime.bootstrap_runtime_secrets()

    assert client_factory.call_count == 0
    assert "RUNTIME_SECRETS_BOOTSTRAPPED" not in os.environ


def test_bootstrap_reuses_process_cache(monkeypatch):
    _reset_runtime_cache(monkeypatch)
    _set_required_env(monkeypatch)

    ssm_client = MagicMock()
    ssm_client.get_parameter.return_value = {"Parameter": {"Value": "same-value"}}
    monkeypatch.setattr(bootstrap_runtime.boto3, "client", lambda *args, **kwargs: ssm_client)

    bootstrap_runtime.bootstrap_runtime_secrets()
    bootstrap_runtime.bootstrap_runtime_secrets()

    assert ssm_client.get_parameter.call_count == 3
