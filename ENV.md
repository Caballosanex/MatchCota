# Guia de Variables d'Entorn - MatchCota

## Índex

1. [Setup Inicial](#setup-inicial)
2. [Com Funcionen les Variables](#com-funcionen-les-variables)
3. [Variables per Entorn](#variables-per-entorn)
4. [Validació](#validació)
5. [Troubleshooting](#troubleshooting)
6. [Seguretat](#seguretat)

---

## Setup Inicial

### 1. Crear fitxer .env

```bash
# Des de l'arrel del projecte
cp .env.example .env
```

### 2. Modificar valors (opcional per dev)

Per desenvolupament local amb Docker, els valors per defecte de `.env.example` són correctes. **NO cal modificar res** per començar.

```bash
# Verificar configuració
python infrastructure/scripts/validate-env.py
```

### 3. Arrencar Docker

```bash
docker-compose up -d
```

---

## Com Funcionen les Variables

### Jerarquia de càrrega

Les variables es carreguen en aquest ordre (les últimes sobreescriuen):

1. **Valors per defecte** a [backend/app/config.py](backend/app/config.py)
2. **Fitxer .env** (si existeix)
3. **Variables d'entorn del sistema**
4. **docker-compose.yml** `environment:` (només algunes variables crítiques)

### Backend (FastAPI)

El backend usa **pydantic-settings** per gestionar la configuració:

```python
# backend/app/config.py
from app.config import settings

# Accedir a variables
print(settings.database_url)
print(settings.jwt_secret_key)
print(settings.is_production())  # Helper
```

**Característiques:**
- ✅ Validació automàtica de tipus
- ✅ Valors per defecte
- ✅ Conversió de tipus (string → bool, int, etc.)
- ✅ Documentació inline

### Frontend (Vite + React)

El frontend només pot accedir a variables amb prefix `VITE_`:

```javascript
// frontend/src/...
const apiUrl = import.meta.env.VITE_API_URL
const environment = import.meta.env.VITE_ENVIRONMENT
```

**⚠️ IMPORTANT:**
- Variables `VITE_*` són **públiques** (enviades al navegador)
- **NO posar secrets** amb prefix VITE_
- Només usar per configuració client-side

### Docker Compose

`docker-compose.yml` fa servir el fitxer `.env`:

```yaml
services:
  backend:
    env_file:
      - .env           # Carrega totes les variables
    environment:
      # Override per Docker networking
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/matchcota
```

**Per què override?**
- Dins de Docker, els serveis es comuniquen per **nom del servei** (`db`, `redis`)
- Fora de Docker, usaries `localhost`

---

## Variables per Entorn

### Development (Local amb Docker)

Configuració mínima per desenvolupar:

```bash
# .env
ENVIRONMENT=development
DEBUG=true
DATABASE_URL=postgresql://postgres:postgres@db:5432/matchcota
SECRET_KEY=dev-secret-key
JWT_SECRET_KEY=dev-jwt-secret

VITE_API_URL=http://localhost:8000/api/v1
```

**Serveis actius:**
- PostgreSQL: `localhost:5432`
- Backend API: `localhost:8000`
- Frontend: `localhost:5173`
- MailHog UI: `localhost:8025`
- Redis: `localhost:6379`

### Staging (Pre-producció AWS)

```bash
ENVIRONMENT=staging
DEBUG=false
DATABASE_URL=postgresql://user:pass@staging-db.xxxxx.us-east-1.rds.amazonaws.com:5432/matchcota
SECRET_KEY=<generat amb openssl rand -hex 32>
JWT_SECRET_KEY=<generat amb openssl rand -hex 32>

AWS_ACCESS_KEY_ID=<IAM credentials>
AWS_SECRET_ACCESS_KEY=<IAM credentials>
S3_BUCKET_NAME=matchcota-uploads-staging
S3_ENABLED=true

SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=<SES SMTP user>
SMTP_PASSWORD=<SES SMTP password>
SMTP_TLS=true

VITE_API_URL=https://api-staging.matchcota.tech/api/v1
```

### Production (AWS)

**⚠️ MAI guardar secrets en .env en producció!**

Usar **AWS Systems Manager Parameter Store (SSM)** amb contracte de resolució en runtime.

```bash
ENVIRONMENT=production
DEBUG=false

# Runtime Lambda rep referències SSM (no valors secrets en shell deploy)
DB_PASSWORD_SSM_PARAMETER=DB_PASSWORD
APP_SECRET_KEY_SSM_PARAMETER=APP_SECRET_KEY
JWT_SECRET_KEY_SSM_PARAMETER=JWT_SECRET_KEY

# Variables de connexió no secretes
DB_HOST=<from terraform output rds_endpoint>
DB_PORT=<from terraform output rds_port>
DB_NAME=<from terraform output db_name>
DB_USERNAME=<from terraform output db_username>

# Infra/runtime
AWS_REGION=us-east-1
S3_BUCKET_NAME=matchcota-uploads-prod
S3_ENABLED=true

VITE_API_URL=https://api.matchcota.tech/api/v1
WILDCARD_DOMAIN=matchcota.tech
```

### Rotació de secrets en producció

Contracte Phase 9: **manual rotate + redeploy**.

1. Actualitzar valor del paràmetre SSM via Terraform (`ssm_*_value`).
2. Aplicar Terraform a `infrastructure/terraform/environments/prod`.
3. Executar `bash infrastructure/scripts/deploy-backend.sh` per forçar nou cold start amb valors actualitzats.

No hi ha hot refresh de secrets en runtime en aquesta fase.

---

## Validació

### Script de validació

Executar abans d'arrencar l'aplicació:

```bash
python infrastructure/scripts/validate-env.py
```

**Output d'exemple:**
```
✓ .env existeix
✓ ENVIRONMENT = development
✓ DATABASE_URL = postgresql://postgres:...
✓ SECRET_KEY = dev-secret-key
⚠ SECRET_KEY usa valor per defecte (canviar en producció)
✓ S3 desactivat (fitxers locals en dev)
```

### Validació manual

```bash
# Verificar que Docker carrega les variables
docker-compose config

# Comprovar variables dins del contenidor
docker-compose exec backend env | grep DATABASE_URL
docker-compose exec frontend env | grep VITE_API_URL
```

### Test des del codi

```python
# backend/app/main.py
from app.config import settings

@app.get("/health")
def health():
    return {
        "status": "ok",
        "environment": settings.environment,
        "database": "connected" if settings.database_url else "not configured"
    }
```

---

## Troubleshooting

### Backend no connecta a PostgreSQL

**Problema:** `connection refused` o `could not connect to server`

**Solució:**
```bash
# Verificar que db està actiu
docker-compose ps db

# Verificar DATABASE_URL dins del contenidor
docker-compose exec backend env | grep DATABASE_URL

# Hauria de ser: postgresql://postgres:postgres@db:5432/matchcota
# NO localhost! (dins de Docker, usar nom del servei)
```

### Frontend no veu l'API

**Problema:** `Network Error` al frontend

**Solució:**
```bash
# Verificar VITE_API_URL
docker-compose exec frontend env | grep VITE_API_URL

# Des del navegador, hauria de ser:
# http://localhost:8000/api/v1

# NO http://backend:8000 (això només funciona dins de Docker)
```

### Variables no es carreguen

**Problema:** Canvis a `.env` no tenen efecte

**Solucions:**
```bash
# 1. Recrear contenidors
docker-compose down
docker-compose up -d

# 2. Rebuild si cal
docker-compose up -d --build

# 3. Verificar que .env està a l'arrel del projecte
ls -la .env

# 4. Verificar sintaxi (sense espais al voltant de =)
# CORRECTE:
DATABASE_URL=postgresql://...

# INCORRECTE:
DATABASE_URL = postgresql://...
```

### pydantic-settings no carrega .env

**Problema:** `settings.database_url` retorna valor per defecte

**Solució:**
```python
# Verificar que pydantic-settings està instal·lat
pip list | grep pydantic

# Hauria de mostrar:
# pydantic                 2.5.0
# pydantic-settings        2.1.0

# Si no, instal·lar:
pip install pydantic-settings
```

---

## Seguretat

### ⚠️ Secrets en Producció

**MAI fer:**
- ❌ Pujar `.env` a Git (ja està a `.gitignore`)
- ❌ Compartir secrets per Slack/Email
- ❌ Hardcodejar secrets al codi
- ❌ Usar mateix secret per dev i producció
- ❌ Posar secrets en variables `VITE_*`

**Sempre fer:**
- ✅ Generar secrets únics per entorn
- ✅ Usar AWS Secrets Manager en producció
- ✅ Rotar secrets periòdicament
- ✅ Limitar accés a secrets (IAM policies)
- ✅ Auditar accessos a secrets

### Generar Secrets Segurs

```bash
# SECRET_KEY i JWT_SECRET_KEY
openssl rand -hex 32

# Output exemple:
# a1b2c3d4e5f6...

# Usar secrets DIFERENTS per cada variable
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET_KEY=$(openssl rand -hex 32)
```

### AWS Secrets Manager (Producció)

```bash
# Crear secret
aws secretsmanager create-secret \
  --name matchcota/prod/database-url \
  --secret-string "postgresql://user:pass@host:5432/db"

# Obtenir secret des del codi Python
import boto3

client = boto3.client('secretsmanager', region_name='us-east-1')
response = client.get_secret_value(SecretId='matchcota/prod/database-url')
database_url = response['SecretString']
```

### Checklist de Seguretat

- [ ] `.env` està a `.gitignore`
- [ ] Secrets generats amb `openssl rand -hex 32`
- [ ] Secrets diferents per dev/staging/prod
- [ ] Variables `VITE_*` no contenen secrets
- [ ] AWS credentials tenen mínim privilegi (IAM)
- [ ] Logs no exposen secrets
- [ ] Backups de BD estan encriptats

---

## Referències

- [Pydantic Settings Documentation](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Docker Compose Environment Variables](https://docs.docker.com/compose/environment-variables/)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)

---

## Contacte

Si tens problemes amb la configuració:

1. Executar script de validació: `python infrastructure/scripts/validate-env.py`
2. Revisar logs: `docker-compose logs backend`
3. Consultar [CLAUDE.md](CLAUDE.md) per arquitectura
4. Preguntar a l'equip

---

**Última actualització:** Sprint 2 - 28/01/2026
