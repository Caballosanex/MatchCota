"""
Funcions de seguretat per MatchCota.

Inclou:
- Hashing de passwords amb bcrypt
- Creació i validació de JWT tokens
"""

from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings


# Context per hashing de passwords amb bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica que una password coincideix amb el seu hash.

    Args:
        plain_password: Password en text pla
        hashed_password: Hash bcrypt guardat a BD

    Returns:
        True si coincideixen, False si no
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Genera un hash bcrypt d'una password.

    Args:
        password: Password en text pla

    Returns:
        Hash bcrypt per guardar a BD
    """
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crea un JWT token.

    Args:
        data: Dades a incloure al payload (normalment: sub, tenant_id)
        expires_delta: Temps d'expiració (per defecte: settings.jwt_expire_minutes)

    Returns:
        Token JWT codificat com a string

    Exemple:
        token = create_access_token(
            data={"sub": str(user.id), "tenant_id": str(tenant.id)}
        )
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm
    )

    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Descodifica i valida un JWT token.

    Args:
        token: Token JWT a validar

    Returns:
        Payload del token (dict) si és vàlid, None si no

    El token és invàlid si:
        - La signatura no coincideix
        - Ha expirat
        - El format és incorrecte
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError:
        return None
