import os
from typing import Dict

import boto3
from botocore.exceptions import BotoCoreError, ClientError


_RUNTIME_CACHE: Dict[str, str] = {}
_REQUIRED_REFERENCE_VARS = {
    "DB_PASSWORD_SSM_PARAMETER": "DB_PASSWORD",
    "APP_SECRET_KEY_SSM_PARAMETER": "SECRET_KEY",
    "JWT_SECRET_KEY_SSM_PARAMETER": "JWT_SECRET_KEY",
}
_REQUIRED_DB_ENV_VARS = ("DB_HOST", "DB_PORT", "DB_NAME", "DB_USERNAME")


def _require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Runtime secret bootstrap failed: missing {name}")
    return value


def _require_reference_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(
            f"Runtime secret bootstrap failed: missing {name} (before SSM client init)"
        )
    return value


def _resolve_ssm_parameter(ssm_client, parameter_name: str) -> str:
    try:
        response = ssm_client.get_parameter(Name=parameter_name, WithDecryption=False)
    except (BotoCoreError, ClientError) as exc:
        raise RuntimeError(f"Runtime secret bootstrap failed: unable to read {parameter_name}") from exc

    value = response.get("Parameter", {}).get("Value", "")
    if not value:
        raise RuntimeError(f"Runtime secret bootstrap failed: empty value for {parameter_name}")
    return value


def bootstrap_runtime_secrets() -> Dict[str, str]:
    if _RUNTIME_CACHE:
        os.environ.update(_RUNTIME_CACHE)
        return dict(_RUNTIME_CACHE)

    reference_values: Dict[str, str] = {}
    for reference_env in _REQUIRED_REFERENCE_VARS:
        reference_values[reference_env] = _require_reference_env(reference_env)

    db_values: Dict[str, str] = {}
    for env_name in _REQUIRED_DB_ENV_VARS:
        db_values[env_name] = _require_env(env_name)

    region = os.getenv("APP_AWS_REGION", "us-east-1")
    ssm_client = boto3.client("ssm", region_name=region)

    resolved: Dict[str, str] = {}
    for reference_env, runtime_env in _REQUIRED_REFERENCE_VARS.items():
        parameter_name = reference_values[reference_env]
        resolved[runtime_env] = _resolve_ssm_parameter(ssm_client, parameter_name)

    db_host = db_values["DB_HOST"]
    db_port = db_values["DB_PORT"]
    db_name = db_values["DB_NAME"]
    db_username = db_values["DB_USERNAME"]

    resolved["DATABASE_URL"] = (
        f"postgresql://{db_username}:{resolved['DB_PASSWORD']}@{db_host}:{db_port}/{db_name}?sslmode=require"
    )
    resolved["RUNTIME_SECRETS_BOOTSTRAPPED"] = "true"

    _RUNTIME_CACHE.update(resolved)
    os.environ.update(resolved)
    return dict(resolved)
