"""
Configuració de l'aplicació MatchCota.

Utilitza pydantic-settings per carregar i validar variables d'entorn.
Totes les variables es carreguen des de .env o variables d'entorn del sistema.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """
    Configuració principal de l'aplicació.

    Les variables es carreguen automàticament des de:
    1. Fitxer .env a l'arrel del projecte
    2. Variables d'entorn del sistema
    3. Valors per defecte definits aquí
    """

    # ====================
    # APPLICATION
    # ====================

    environment: str = "development"
    debug: bool = True
    app_name: str = "MatchCota"
    app_version: str = "0.1.0"

    # ====================
    # SECURITY
    # ====================

    secret_key: str = "CHANGE-THIS-IN-PRODUCTION-USE-STRONG-RANDOM-KEY"

    # JWT
    jwt_secret_key: str = "CHANGE-THIS-IN-PRODUCTION-USE-STRONG-RANDOM-KEY"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 hores

    # CORS
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    # ====================
    # DATABASE
    # ====================

    database_url: str = "postgresql://postgres:postgres@db:5432/matchcota"
    db_echo: bool = False  # Si True, SQLAlchemy farà log de totes les queries

    # ====================
    # REDIS (opcional)
    # ====================

    redis_url: Optional[str] = "redis://redis:6379"
    redis_enabled: bool = False  # Per MVP, desactivat

    # ====================
    # AWS S3
    # ====================

    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_region: str = "eu-south-2"
    s3_bucket_name: Optional[str] = None
    s3_enabled: bool = False  # Per desenvolupament, deshabilitat

    # ====================
    # EMAIL
    # ====================

    smtp_host: str = "mailhog"
    smtp_port: int = 1025
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_tls: bool = False
    smtp_ssl: bool = False
    email_from: str = "noreply@matchcota.com"
    email_from_name: str = "MatchCota"

    # ====================
    # MULTI-TENANT
    # ====================

    default_subdomain: str = "demo"  # Subdomain per defecte per testing
    wildcard_domain: str = "matchcota.local"  # Domini base

    # ====================
    # UPLOAD LIMITS
    # ====================

    max_upload_size: int = 10 * 1024 * 1024  # 10 MB
    allowed_image_types: list[str] = ["image/jpeg", "image/png", "image/webp"]

    # ====================
    # PAGINATION
    # ====================

    default_page_size: int = 20
    max_page_size: int = 100

    # ====================
    # RATE LIMITING
    # ====================

    rate_limit_enabled: bool = False  # Per MVP, desactivat
    rate_limit_per_minute: int = 60

    # ====================
    # LOGGING
    # ====================

    log_level: str = "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # Configuració de pydantic-settings
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignorar variables extra
    )

    def is_production(self) -> bool:
        """Retorna True si estem en producció."""
        return self.environment.lower() == "production"

    def is_development(self) -> bool:
        """Retorna True si estem en desenvolupament."""
        return self.environment.lower() == "development"

    def get_database_url(self) -> str:
        """Retorna la URL de la base de dades."""
        return self.database_url

    def get_cors_origins(self) -> list[str]:
        """Retorna els orígens permesos per CORS."""
        if self.is_production():
            # En producció, només dominis específics
            return [
                "https://matchcota.com",
                "https://*.matchcota.com",
            ]
        return self.cors_origins


# Instància global de settings
# Importar-la amb: from app.config import settings
settings = Settings()


# Validacions a l'inici
def validate_settings():
    """Valida que les settings crítiques estiguin configurades correctament."""

    errors = []

    # Producció: verificar secrets
    if settings.is_production():
        if "CHANGE-THIS" in settings.secret_key:
            errors.append("SECRET_KEY no està configurat per producció")

        if "CHANGE-THIS" in settings.jwt_secret_key:
            errors.append("JWT_SECRET_KEY no està configurat per producció")

        if not settings.aws_access_key_id or not settings.aws_secret_access_key:
            errors.append("AWS credentials no configurades per producció")

        if not settings.s3_bucket_name:
            errors.append("S3_BUCKET_NAME no configurat per producció")

    # Base de dades sempre necessària
    if not settings.database_url:
        errors.append("DATABASE_URL no configurat")

    if errors:
        error_msg = "Errors de configuració:\n" + "\n".join(f"  - {e}" for e in errors)
        raise ValueError(error_msg)

    return True


# Executar validació a l'importar
try:
    validate_settings()
except ValueError as e:
    if settings.is_production():
        # En producció, fer crash
        raise
    else:
        # En desenvolupament, només avisar
        print(f"⚠️  AVÍS: {e}")
