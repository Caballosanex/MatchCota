"""
Servei d'emmagatzematge per fitxers (imatges).

En desenvolupament: emmagatzematge local a /app/uploads/
En producció: S3
"""

import uuid
from pathlib import Path
from typing import Optional

from fastapi import UploadFile, HTTPException, status

from app.config import settings


UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"


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
    import boto3

    s3_client = boto3.client(
        "s3",
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region,
    )

    key = f"animals/{tenant_id}/{filename}"

    s3_client.put_object(
        Bucket=settings.s3_bucket_name,
        Key=key,
        Body=content,
        ContentType=content_type,
    )

    return f"https://{settings.s3_bucket_name}.s3.{settings.aws_region}.amazonaws.com/{key}"
