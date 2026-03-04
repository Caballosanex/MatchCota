"""
Endpoint per pujar imatges.
"""

from fastapi import APIRouter, Depends, UploadFile, File

from app.models.user import User
from app.models.tenant import Tenant
from app.core.tenant import get_current_tenant
from app.api.v1.auth import get_current_user
from app.services.storage import upload_file

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
