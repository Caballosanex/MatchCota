# MatchCota

Plataforma SaaS multi-tenant que connecta protectores d'animals amb adoptants potencials a través d'un sistema de compatibilitat basat en cosinus de similitud. Cada protectora rep el seu propi subdomini (`{slug}.matchcota.tech`) sobre una infraestructura compartida a AWS.

---

## Índex

- [Arquitectura de Producció](#arquitectura-de-producció)
- [Stack Tecnològic](#stack-tecnològic)
- [Estructura del Projecte](#estructura-del-projecte)
- [Funcionament General](#funcionament-general)
- [Deploy a Producció](#deploy-a-producció)
- [Equip](#equip)

---

## Arquitectura de Producció

```
Adoptant / Admin
       │
       ▼
  Route 53 (*.matchcota.tech)
       │
       ▼
  EC2 + nginx + Let's Encrypt TLS
  (SPA React estàtica)
       │
       ▼ /api/*
  API Gateway HTTP → AWS Lambda (FastAPI + Mangum)
       │                   │
       ▼                   ▼
  RDS PostgreSQL 15    S3 (imatges d'animals)
  (subxarxa privada)   (via VPC Gateway Endpoint)
```

**Components:**

| Component | Servei AWS | Detalls |
|-----------|-----------|---------|
| Frontend SPA | EC2 (t3.micro) + nginx | React 18 + Vite, servit com a estàtica. SSL wildcard amb Let's Encrypt |
| Backend API | AWS Lambda + API Gateway HTTP | FastAPI + Mangum, domini `api.matchcota.tech` |
| Base de dades | RDS PostgreSQL 15 | Subxarxa privada, accés únic des de Lambda |
| Imatges | S3 | Accés Lambda via VPC Gateway Endpoint (sense NAT) |
| DNS | Route 53 | Registre wildcard `*.matchcota.tech` → EIP de l'EC2 |
| Secrets | SSM Parameter Store | Credencials de BD, JWT secret i app secret |
| IaC | Terraform | 4 capes atòmiques: foundation → network → data → runtime |

**Restriccions AWS Academy actives:** LabRole/LabInstanceProfile únicament; sense CloudFront, CloudWatch alarms, SES ni NAT Gateway.

---

## Stack Tecnològic

### Backend

| Tecnologia | Versió | Ús |
|-----------|--------|-----|
| Python | 3.11 | Llenguatge principal |
| FastAPI | 0.109.0 | Framework HTTP |
| SQLAlchemy | 2.0.25 | ORM |
| Alembic | 1.13.1 | Migracions de BD |
| Pydantic | 2.5.3 | Validació i configuració |
| python-jose | 3.3.0 | JWT (Triple Check: signatura + expiració + tenant_id + persistència) |
| passlib / bcrypt | 1.7.4 / 4.1.3 | Hash de contrasenyes |
| numpy | 1.26.3 | Motor de matching (cosinus de similitud) |
| boto3 | 1.34.28 | S3 (imatges) + Route 53 (DNS onboarding) |
| Mangum | — | Adaptador ASGI → Lambda |

### Frontend

| Tecnologia | Versió | Ús |
|-----------|--------|-----|
| React | 18.2.0 | Framework UI |
| React Router DOM | 6.21.3 | Routing SPA |
| Vite | 5.0.11 | Build i dev server |
| Tailwind CSS | 3.4.1 | Estils |
| react-hook-form | 7.71.2 | Formularis |
| zod | 4.3.6 | Validació de formularis |

### Infraestructura

| Tecnologia | Ús |
|-----------|----|
| Terraform | IaC (4 capes: foundation, network, data, runtime) |
| nginx | Reverse proxy + SPA routing + TLS termination |
| GitHub Actions | Notificació de Telegram en push |

---

## Estructura del Projecte

```
matchcota/
├── backend/
│   ├── app/
│   │   ├── main.py              # Entrypoint FastAPI (+ Mangum handler)
│   │   ├── config.py            # Variables d'entorn (Pydantic Settings)
│   │   ├── database.py          # Connexió SQLAlchemy
│   │   ├── core/
│   │   │   ├── security.py      # JWT: creació, verificació, Triple Check
│   │   │   ├── tenant.py        # TenantMiddleware + get_current_tenant dep.
│   │   │   └── dependencies.py
│   │   ├── models/              # SQLAlchemy ORM (Tenant, User, Animal, Lead)
│   │   ├── schemas/             # Pydantic schemas (request/response)
│   │   ├── crud/                # Queries per tenant_id
│   │   ├── api/v1/              # Routers: auth, animals, leads, matching, tenants
│   │   ├── services/            # Lògica de negoci, S3, Route 53
│   │   └── matching/
│   │       ├── questionnaire.py # Definició de les 11 preguntes
│   │       └── engine.py        # Cosinus de similitud (8 dimensions, numpy)
│   ├── alembic/                 # Migracions de BD
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── App.jsx              # Router + context providers
│       ├── contexts/            # TenantContext, AuthContext
│       ├── hooks/               # useApi, useAuth, useTenant
│       ├── layouts/             # PublicLayout, AdminLayout
│       ├── pages/
│       │   ├── public/          # Home, Animals, MatchTest, MatchResults, RegisterTenant
│       │   └── admin/           # Dashboard, AnimalsManager, Leads, Settings, Login
│       ├── components/          # AnimalCard, MatchCard, Question, ImageUpload, …
│       └── api/                 # clients fetch: animals.js, matching.js, leads.js
│
└── infrastructure/
    ├── terraform/environments/prod/   # IaC producció (4 capes)
    └── scripts/
        ├── deploy-backend.sh    # Build zip Lambda + update function code
        └── deploy-frontend.sh   # npm build + rsync/SSM a EC2
```

---

## Funcionament General

### Multi-tenancy

Cada petició arriba amb la capçalera `X-Tenant-Slug` o bé des d'un subdomini `{slug}.matchcota.tech`. El `TenantMiddleware` resol el tenant de la BD i injecta `request.state.tenant_id`. Totes les queries de domini filtren per `tenant_id` — sense excepcions.

### Algoritme de Matching

1. L'adoptant respon 11 preguntes (habitatge, temps, família, experiència, preferències)
2. Les respostes es converteixen a un vector de 8 dimensions numèriques
3. Cada animal té el seu vector precalculat (mateixos 8 eixos)
4. Es calcula la similitud del cosinus entre vectors ponderats
5. Es retornen els top 10 animals per score (0–100) amb explicació en català

**8 dimensions del vector:**
`energy_level`, `attention_needs`, `sociability`, `good_with_children`, `good_with_dogs`, `good_with_cats`, `experience_required`, `maintenance_level`

### Autenticació (Triple Check JWT)

1. Verificació de signatura i expiració
2. Validació que el `tenant_id` del JWT coincideix amb el tenant de la petició
3. Comprovació que l'usuari existeix a la BD

### Rutes de l'aplicació

**Públiques:**
```
/                    → Landing de la protectora
/animals             → Catàleg d'animals disponibles
/animals/:id         → Fitxa de l'animal
/test                → Qüestionari de compatibilitat (11 preguntes)
/test/results        → Resultats del matching (top 10)
/login               → Login admin
/register-tenant     → Alta de nova protectora (només apex matchcota.tech)
```

**Admin (JWT requerit):**
```
/admin               → Dashboard
/admin/animals       → Gestió d'animals (CRUD + upload imatges)
/admin/leads         → Llistat de leads / sol·licituds d'adopció
/admin/leads/:id     → Detall del lead amb respostes i scores
/admin/settings      → Configuració de la protectora
```

---

## Deploy a Producció

### Prerequisits

- AWS CLI configurat amb perfil `matchcota` (LabRole actiu)
- Terraform inicialitzat a `infrastructure/terraform/environments/prod`
- Clau SSH per a l'EC2 (o SSM actiu)

### Seqüència obligatòria

> **Important:** sempre seguir aquest ordre. Invertir-lo provoca errors visibles a producció.

**1. Migració de BD (primer sempre)**
```bash
# Accedir a la instància Lambda via AWS CLI o bastion
alembic upgrade head
```

**2. Deploy backend (Lambda)**
```bash
infrastructure/scripts/deploy-backend.sh
```
El script: construeix el zip amb wheels Linux x86_64 → puja a S3 → actualitza el codi de Lambda → espera confirmació.

**3. Deploy frontend (EC2)**
```bash
FRONTEND_HOST=<ip-ec2> \
FRONTEND_SSH_KEY_PATH=~/.ssh/matchcota.pem \
KNOWN_TENANT_SLUG=<slug-de-prova> \
infrastructure/scripts/deploy-frontend.sh
```
El script: `npm ci` + `npm run build` → rsync a EC2 (o via SSM) → recarrega nginx → verifica contractes de ruta.

### Variables de deploy

| Variable | Descripció |
|----------|-----------|
| `AWS_PROFILE` | Perfil AWS (default: `matchcota`) |
| `FRONTEND_HOST` | IP o hostname de l'EC2 |
| `FRONTEND_SSH_KEY_PATH` | Clau privada SSH |
| `DEPLOY_TRANSPORT` | `auto` \| `ssh` \| `ssm` |
| `KNOWN_TENANT_SLUG` | Slug d'un tenant real per a la verificació post-deploy |

---

## Equip

| Mòdul | Responsabilitats |
|-------|-----------------|
| **ASIX** | Infraestructura AWS, Terraform, nginx, TLS, xarxa, backups, IaC |
| **DAW1** | Backend FastAPI, API, autenticació JWT, algoritme de matching, models de dades |
| **DAW2** | Frontend React, UI/UX, components, integració amb API |
