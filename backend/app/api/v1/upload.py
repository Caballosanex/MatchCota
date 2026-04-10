"""Endpoints per pujar i servir imatges."""

from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import RedirectResponse

from app.models.user import User
from app.models.tenant import Tenant
from app.models.animal import Animal
from app.core.tenant import get_current_tenant
from app.api.v1.auth import get_current_user
from app.database import get_db
from sqlalchemy.orm import Session

from app.config import settings
from app.services.storage import upload_file, get_presigned_file_url

router = APIRouter(tags=["upload"])


@router.post("/admin/upload")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
):
    """
    Pujar una imatge (nomes admin).

    Retorna la URL de la imatge pujada.
    En dev: emmagatzematge local a /uploads/
    En prod: S3
    """
    url = await upload_file(file, str(tenant.id))
    return {"url": url}


@router.get("/uploads/{tenant_id}/{filename:path}")
def resolve_upload_url(
    tenant_id: str,
    filename: str,
    db: Session = Depends(get_db),
):
    """Serveix imatges pujant via URL proxy estable (local o S3)."""
    clean_filename = Path(filename).name
    if not clean_filename:
        raise HTTPException(status_code=404, detail="File not found")

    if settings.s3_enabled:
        try:
            signed_url = get_presigned_file_url(tenant_id, clean_filename)
        except Exception as exc:
            raise HTTPException(status_code=404, detail="File not found") from exc
        return RedirectResponse(url=signed_url, status_code=307)

    animal = db.query(Animal).filter(Animal.tenant_id == tenant_id).first()
    if not animal:
        raise HTTPException(status_code=404, detail="File not found")

    return RedirectResponse(url=f"/uploads/{tenant_id}/{clean_filename}", status_code=307)
