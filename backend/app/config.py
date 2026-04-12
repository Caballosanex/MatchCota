"""
Configuració de l'aplicació MatchCota.

Utilitza pydantic-settings per carregar i validar variables d'entorn.
Totes les variables es carreguen des de .env o variables d'entorn del sistema.
"""

import os

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
    aws_session_token: Optional[str] = None
    aws_region: str = "us-east-1"
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
    email_from: str = "noreply@matchcota.tech"
    email_from_name: str = "MatchCota"

    # ====================
    # MULTI-TENANT
    # ====================

    default_subdomain: str = "demo"  # Subdomain per defecte per testing
    wildcard_domain: str = "matchcota.local"  # Domini base

    # ====================
    # UPLOAD LIMITS
    # ====================

    # API Gateway HTTP + Lambda proxy starts failing before 10MB multipart uploads.
    # Keep this below gateway/Lambda payload limits to avoid edge 413 responses.
    max_upload_size: int = 4 * 1024 * 1024  # 4 MB
    allowed_image_types: list[str] = ["image/jpeg", "image/png", "image/webp"]

    # Field validator per parsejar llistes des de CSV strings
    # NOTA: Comentat temporalment perquè causava problemes amb Pydantic v2
    # @field_validator("allowed_image_types", "cors_origins", mode="before")
    # @classmethod
    # def parse_list_from_str(cls, v):
    #     if isinstance(v, str):
    #         return [x.strip() for x in v.split(",") if x.strip()]
    #     return v

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
        """
        Retorna els orígens permesos per CORS.

        En producció, es llegeixen de la variable CORS_ORIGINS al .env.
        Exemple: CORS_ORIGINS=["https://matchcota.tech","https://demo.matchcota.tech"]

        IMPORTANT: Els wildcards (https://*.matchcota.tech) NO funcionen amb
        allow_credentials=True. Cal llistar els subdominis explícitament
        o usar un middleware CORS custom que validi dinàmicament.
        """
        if self.is_production():
            # En producció, usar la llista de cors_origins del .env
            # Si no s'ha configurat, retornar el domini principal com a mínim
            if self.cors_origins and "localhost" not in self.cors_origins[0]:
                return self.cors_origins
            return ["https://matchcota.tech"]
        return self.cors_origins


# Instància global de settings
# Importar-la amb: from app.config import settings
settings = Settings()


# Validacions a l'inici
def validate_settings():
    """Valida que les settings crítiques estiguin configurades correctament."""

    errors = []

    # Producció: verificar secrets — SEMPRE crash si falta algo crític
    if settings.is_production():
        if os.getenv("RUNTIME_SECRETS_BOOTSTRAPPED") != "true":
            errors.append("Runtime secret bootstrap is required in production")

        if "CHANGE-THIS" in settings.secret_key:
            errors.append("SECRET_KEY no està configurat per producció")

        if "CHANGE-THIS" in settings.jwt_secret_key:
            errors.append("JWT_SECRET_KEY no està configurat per producció")

        if not settings.s3_bucket_name or not settings.s3_enabled:
            errors.append("S3 ha d'estar configurat i habilitat en producció")

        if settings.debug:
            errors.append("DEBUG ha de ser False en producció")

    # S3 habilitat: verificar credentials (qualsevol entorn)
    # Nota: en EC2 amb IAM role, les credentials venen automàticament via boto3.
    # Només validem si s'han configurat explícitament sense IAM role.
    if settings.s3_enabled and not settings.s3_bucket_name:
        errors.append("S3_BUCKET_NAME requerit quan S3 està habilitat")

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
        # En producció, CRASH IMMEDIAT — mai arrencar amb config invàlida
        raise
    else:
        # En desenvolupament, només avisar
        print(f"⚠️  AVÍS: {e}")
