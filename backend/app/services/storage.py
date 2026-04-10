"""
Servei d'emmagatzematge per fitxers (imatges).

En desenvolupament: emmagatzematge local a /app/uploads/
En producció: S3
"""

import uuid
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

from fastapi import UploadFile, HTTPException, status

from app.config import settings


UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"


def _create_s3_client():
    import boto3

    return boto3.client(
        "s3",
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        aws_session_token=settings.aws_session_token,
        region_name=settings.aws_region,
    )


def _build_upload_proxy_url(tenant_id: str, filename: str) -> str:
    api_host = f"api.{settings.wildcard_domain}".strip(".")
    return f"https://{api_host}/api/v1/uploads/{tenant_id}/{filename}"


def normalize_upload_url(url: Optional[str]) -> Optional[str]:
    """Converteix URLs S3 directes en URLs proxy signades via API."""
    if not url:
        return url

    if url.startswith("/uploads/"):
        parts = url.strip("/").split("/")
        if len(parts) >= 3:
            tenant_id = parts[1]
            filename = "/".join(parts[2:])
            return _build_upload_proxy_url(tenant_id, filename)
        return url

    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        return url

    key = ""
    virtual_host = f"{settings.s3_bucket_name}.s3.{settings.aws_region}.amazonaws.com"
    if parsed.netloc == virtual_host:
        key = parsed.path.lstrip("/")
    elif parsed.netloc.endswith("amazonaws.com") and parsed.path.startswith(f"/{settings.s3_bucket_name}/"):
        key = parsed.path.lstrip("/").split("/", 1)[1]
    else:
        return url

    if not key.startswith("animals/"):
        return url

    key_parts = key.split("/", 2)
    if len(key_parts) != 3:
        return url

    _, tenant_id, filename = key_parts
    return _build_upload_proxy_url(tenant_id, filename)


def normalize_upload_urls(urls: Optional[list[str]]) -> Optional[list[str]]:
    if not urls:
        return urls
    return [normalize_upload_url(url) for url in urls]


def _ensure_upload_dir(tenant_id: str) -> Path:
    """Crea el directori d'uploads del tenant si no existeix."""
    tenant_dir = UPLOAD_DIR / tenant_id
    tenant_dir.mkdir(parents=True, exist_ok=True)
    return tenant_dir


def _validate_file(file: UploadFile) -> None:
    """Valida tipus del fitxer."""
    if file.content_type not in settings.allowed_image_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipus de fitxer no permes: {file.content_type}. Permesos: {', '.join(settings.allowed_image_types)}"
        )


def _generate_filename(original_filename: str) -> str:
    """Genera un nom unic per evitar col·lisions."""
    ext = Path(original_filename).suffix.lower() if original_filename else ".jpg"
    return f"{uuid.uuid4().hex}{ext}"


async def upload_file(file: UploadFile, tenant_id: str) -> str:
    """
    Puja un fitxer i retorna la URL.

    Args:
        file: Fitxer a pujar
        tenant_id: ID del tenant (per organitzar per carpeta)

    Returns:
        URL publica del fitxer
    """
    _validate_file(file)

    content = await file.read()
    if len(content) > settings.max_upload_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Fitxer massa gran. Maxim: {settings.max_upload_size // (1024 * 1024)}MB"
        )

    filename = _generate_filename(file.filename)

    if settings.s3_enabled:
        return await _upload_to_s3(content, filename, tenant_id, file.content_type)
    else:
        return _save_locally(content, filename, tenant_id)


def _save_locally(content: bytes, filename: str, tenant_id: str) -> str:
    """Guarda fitxer localment i retorna la URL."""
    tenant_dir = _ensure_upload_dir(tenant_id)
    file_path = tenant_dir / filename
    file_path.write_bytes(content)
    return f"/uploads/{tenant_id}/{filename}"


async def _upload_to_s3(content: bytes, filename: str, tenant_id: str, content_type: str) -> str:
    """Puja fitxer a S3 i retorna la URL."""
    s3_client = _create_s3_client()

    key = f"animals/{tenant_id}/{filename}"

    s3_client.put_object(
        Bucket=settings.s3_bucket_name,
        Key=key,
        Body=content,
        ContentType=content_type,
    )

    return _build_upload_proxy_url(tenant_id, filename)


def get_presigned_file_url(tenant_id: str, filename: str, expires_seconds: int = 3600) -> str:
    """Genera una URL temporal signada per descarregar una imatge de S3."""
    s3_client = _create_s3_client()
    key = f"animals/{tenant_id}/{filename}"
    return s3_client.generate_presigned_url(
        ClientMethod="get_object",
        Params={
            "Bucket": settings.s3_bucket_name,
            "Key": key,
        },
        ExpiresIn=expires_seconds,
    )
