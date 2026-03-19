# MatchCota

Plataforma SaaS multi-tenant que connecta protectores d'animals amb adoptants mitjançant un sistema intel·ligent de compatibilitat.

## Stack Tecnològic

- **Backend:** Python 3.11+ amb FastAPI
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Base de Dades:** PostgreSQL 15
- **Cache:** Redis 7
- **Infraestructura:** Docker, AWS, Terraform

## Requisits Previs

- Docker Desktop
- Docker Compose
- Git

## Instal·lació i Ús Local

### 1. Clonar el repositori

```bash
git clone [URL_DEL_REPO]
cd MatchCota
```

### 2. Configurar variables d'entorn (opcional)

```bash
cp .env.example .env
# Editar .env si cal canviar alguna configuració
```

### 3. Arrencar tots els serveis

```bash
docker-compose up -d
```

Això llençarà:
- **Backend API:** http://localhost:8000
- **Frontend:** http://localhost:5173
- **Base de dades PostgreSQL:** localhost:5432
- **Redis:** localhost:6379
- **MailHog UI:** http://localhost:8025

### 4. Veure logs

```bash
# Tots els serveis
docker-compose logs -f

# Només backend
docker-compose logs -f backend

# Només frontend
docker-compose logs -f frontend
```

### 5. Executar migracions (quan estiguin creades)

```bash
docker-compose exec backend alembic upgrade head
```

### 6. Aturar els serveis

```bash
docker-compose down

# Amb volums (esborra la BD)
docker-compose down -v
```

## Estructura del Projecte

```
matchcota/
├── backend/           # API FastAPI
├── frontend/          # React + Vite
├── infrastructure/    # Terraform + scripts
├── docker-compose.yml
└── README.md
```

Per més detalls sobre l'arquitectura i convencions, consulta [CLAUDE.md](CLAUDE.md).

## Desenvolupament

- **Backend:** Hot reload activat amb `--reload`
- **Frontend:** Vite HMR activat automàticament
- Els canvis es reflecteixen en temps real

## Equip

- **ASIX:** Infraestructura, Docker, AWS
- **DAW1:** Backend, API, algoritme matching
- **DAW2:** Frontend, UI/UX

## Sprint Actual

**Sprint 1 (19/01):** Setup inicial - Docker, GitHub, estructura projecte
