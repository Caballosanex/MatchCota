#!/usr/bin/env python3
"""
Script de validació de variables d'entorn per MatchCota.

Ús:
    python infrastructure/scripts/validate-env.py

    O des de Docker:
    docker-compose exec backend python /app/../infrastructure/scripts/validate-env.py
"""

import os
import sys
from pathlib import Path
from typing import List, Tuple


class Color:
    """Codis de color ANSI per terminal."""
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'


def print_header(text: str):
    """Imprimeix un header destacat."""
    print(f"\n{Color.BOLD}{Color.BLUE}{'=' * 60}{Color.END}")
    print(f"{Color.BOLD}{Color.BLUE}{text:^60}{Color.END}")
    print(f"{Color.BOLD}{Color.BLUE}{'=' * 60}{Color.END}\n")


def print_success(text: str):
    """Imprimeix missatge d'èxit."""
    print(f"{Color.GREEN}✓{Color.END} {text}")


def print_warning(text: str):
    """Imprimeix advertència."""
    print(f"{Color.YELLOW}⚠{Color.END} {text}")


def print_error(text: str):
    """Imprimeix error."""
    print(f"{Color.RED}✗{Color.END} {text}")


def load_env_file() -> dict:
    """Carrega variables del fitxer .env"""
    env_vars = {}
    env_path = Path(".env")

    if not env_path.exists():
        return env_vars

    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            # Skip comments and empty lines
            if not line or line.startswith('#'):
                continue
            # Parse KEY=VALUE
            if '=' in line:
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip()
                # Remove quotes if present
                if value.startswith('"') and value.endswith('"'):
                    value = value[1:-1]
                elif value.startswith("'") and value.endswith("'"):
                    value = value[1:-1]
                env_vars[key] = value
                # Set in os.environ for rest of script
                os.environ[key] = value

    return env_vars


def check_env_file() -> bool:
    """Verifica que existeixi el fitxer .env"""
    print_header("VERIFICANT FITXER .ENV")

    env_path = Path(".env")
    env_example_path = Path(".env.example")

    if not env_path.exists():
        print_error(".env no existeix!")
        if env_example_path.exists():
            print_warning("Crea'l amb: cp .env.example .env")
        return False

    print_success(".env existeix")

    # Verificar que no sigui buit
    if env_path.stat().st_size == 0:
        print_error(".env està buit!")
        return False

    print_success(f".env té contingut ({env_path.stat().st_size} bytes)")

    # Carregar variables del fitxer
    env_vars = load_env_file()
    print_success(f"Carregades {len(env_vars)} variables d'entorn")

    return True


def check_required_vars() -> Tuple[bool, List[str]]:
    """Verifica que existeixin les variables obligatòries."""
    print_header("VERIFICANT VARIABLES OBLIGATÒRIES")

    required_vars = [
        ("ENVIRONMENT", "development"),
        ("DATABASE_URL", None),
        ("SECRET_KEY", None),
        ("JWT_SECRET_KEY", None),
        ("JWT_ALGORITHM", "HS256"),
    ]

    missing = []
    warnings = []

    for var_name, default in required_vars:
        value = os.getenv(var_name)

        if not value:
            if default:
                print_warning(f"{var_name} no definit, usant defecte: {default}")
                warnings.append(var_name)
            else:
                print_error(f"{var_name} NO DEFINIT (obligatori)")
                missing.append(var_name)
        else:
            print_success(f"{var_name} = {value[:20]}{'...' if len(value) > 20 else ''}")

    return len(missing) == 0, missing


def check_security_vars() -> Tuple[bool, List[str]]:
    """Verifica configuració de seguretat."""
    print_header("VERIFICANT SEGURETAT")

    issues = []

    # Verificar SECRET_KEY
    secret_key = os.getenv("SECRET_KEY", "")
    if "CHANGE-THIS" in secret_key or "your-" in secret_key:
        print_warning("SECRET_KEY usa valor per defecte (canviar en producció)")
        issues.append("SECRET_KEY insegur")
    else:
        print_success("SECRET_KEY configurat")

    # Verificar JWT_SECRET_KEY
    jwt_secret = os.getenv("JWT_SECRET_KEY", "")
    if "CHANGE-THIS" in jwt_secret or "your-" in jwt_secret:
        print_warning("JWT_SECRET_KEY usa valor per defecte (canviar en producció)")
        issues.append("JWT_SECRET_KEY insegur")
    else:
        print_success("JWT_SECRET_KEY configurat")

    # Verificar que siguin diferents
    if secret_key == jwt_secret and secret_key:
        print_warning("SECRET_KEY i JWT_SECRET_KEY són iguals (recomanat que siguin diferents)")
        issues.append("Keys duplicades")

    # En producció, això hauria de fallar
    environment = os.getenv("ENVIRONMENT", "development")
    if environment == "production" and issues:
        return False, issues

    return True, issues


def check_database_connection() -> bool:
    """Verifica configuració de base de dades."""
    print_header("VERIFICANT BASE DE DADES")

    db_url = os.getenv("DATABASE_URL")

    if not db_url:
        print_error("DATABASE_URL no definit")
        return False

    print_success(f"DATABASE_URL definit")

    # Verificar format
    if not db_url.startswith("postgresql://"):
        print_error("DATABASE_URL no té format postgresql://")
        return False

    print_success("Format DATABASE_URL correcte")

    # Extreure components
    try:
        parts = db_url.replace("postgresql://", "").split("@")
        if len(parts) == 2:
            creds, location = parts
            user_pass = creds.split(":")
            host_db = location.split("/")

            print_success(f"  User: {user_pass[0]}")
            print_success(f"  Host: {host_db[0].split(':')[0]}")
            print_success(f"  Database: {host_db[1] if len(host_db) > 1 else 'N/A'}")
    except Exception as e:
        print_warning(f"No s'ha pogut parsejar DATABASE_URL: {e}")

    return True


def check_optional_services() -> None:
    """Verifica serveis opcionals."""
    print_header("VERIFICANT SERVEIS OPCIONALS")

    # Redis
    redis_url = os.getenv("REDIS_URL")
    redis_enabled = os.getenv("REDIS_ENABLED", "false").lower() == "true"

    if redis_enabled:
        if redis_url:
            print_success(f"Redis activat: {redis_url}")
        else:
            print_warning("Redis activat però REDIS_URL no definit")
    else:
        print_success("Redis desactivat (correcte per MVP)")

    # S3
    s3_enabled = os.getenv("S3_ENABLED", "false").lower() == "true"
    aws_key = os.getenv("AWS_ACCESS_KEY_ID")

    if s3_enabled:
        if aws_key and "your-" not in aws_key:
            print_success("S3 activat i credencials configurades")
        else:
            print_warning("S3 activat però credencials AWS no configurades")
    else:
        print_success("S3 desactivat (fitxers locals en dev)")

    # SMTP
    smtp_host = os.getenv("SMTP_HOST", "mailhog")
    print_success(f"SMTP: {smtp_host}")


def check_frontend_vars() -> None:
    """Verifica variables del frontend."""
    print_header("VERIFICANT VARIABLES FRONTEND")

    vite_api = os.getenv("VITE_API_URL")
    vite_env = os.getenv("VITE_ENVIRONMENT")

    if vite_api:
        print_success(f"VITE_API_URL = {vite_api}")
    else:
        print_warning("VITE_API_URL no definit")

    if vite_env:
        print_success(f"VITE_ENVIRONMENT = {vite_env}")
    else:
        print_warning("VITE_ENVIRONMENT no definit")


def main():
    """Funció principal."""
    print(f"\n{Color.BOLD}MatchCota - Validació de Variables d'Entorn{Color.END}\n")

    # Canviar al directori arrel del projecte
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    os.chdir(project_root)

    print(f"Directori de treball: {Color.BOLD}{project_root}{Color.END}\n")

    all_ok = True

    # 1. Verificar fitxer .env
    if not check_env_file():
        all_ok = False

    # 2. Verificar variables obligatòries
    required_ok, missing = check_required_vars()
    if not required_ok:
        all_ok = False

    # 3. Verificar seguretat
    security_ok, security_issues = check_security_vars()
    if not security_ok:
        all_ok = False

    # 4. Verificar base de dades
    if not check_database_connection():
        all_ok = False

    # 5. Verificar opcionals (no afecten all_ok)
    check_optional_services()

    # 6. Verificar frontend
    check_frontend_vars()

    # Resum final
    print_header("RESUM")

    if all_ok:
        print_success("Configuració d'entorn correcta! ✓")
        print(f"\n{Color.GREEN}Pots executar: docker-compose up{Color.END}\n")
        return 0
    else:
        print_error("Hi ha problemes amb la configuració")
        if missing:
            print(f"\n{Color.RED}Variables obligatòries faltants:{Color.END}")
            for var in missing:
                print(f"  - {var}")
        print(f"\n{Color.YELLOW}Revisa .env i compara amb .env.example{Color.END}\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
