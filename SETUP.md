# Setup del Projecte MatchCota - Sprint 1

## Estructura Creada ✅

```
matchcota/
├── .env.example              # Variables d'entorn template
├── .gitignore                # Git ignore configurat
├── docker-compose.yml        # Configuració dev amb hot reload
├── docker-compose.prod.yml   # Configuració producció (TODO Sprint 6)
├── README.md                 # Documentació principal
├── CLAUDE.md                 # System prompt del projecte
│
├── backend/
│   ├── Dockerfile           # Python 3.11-slim
│   ├── requirements.txt     # Dependencies FastAPI
│   ├── alembic.ini         # Configuració migracions
│   ├── alembic/versions/   # Carpeta per migracions
│   └── app/
│       ├── core/           # Security, tenant, dependencies
│       ├── models/         # SQLAlchemy models
│       ├── schemas/        # Pydantic schemas
│       ├── api/v1/         # Endpoints API
│       ├── services/       # Auth, email, storage
│       ├── matching/       # Algoritme matching
│       └── tests/          # Tests pytest
│
├── frontend/
│   ├── Dockerfile          # Node 20-alpine
│   ├── package.json        # React 18 + Vite
│   ├── vite.config.js      # Hot reload activat
│   ├── tailwind.config.js  # Tailwind amb colors
│   ├── postcss.config.js   # PostCSS config
│   ├── index.html          # HTML principal
│   ├── public/assets/      # Assets estàtics
│   └── src/
│       ├── api/            # API client
│       ├── contexts/       # React Context (Tenant, Auth)
│       ├── hooks/          # Custom hooks
│       ├── layouts/        # PublicLayout, AdminLayout
│       ├── pages/
│       │   ├── public/     # Home, Animals, MatchTest, etc.
│       │   └── admin/      # Dashboard, AnimalsManager, Leads, etc.
│       └── components/
│           ├── ui/         # Button, Input, Card, Modal
│           ├── animals/    # AnimalCard, AnimalFilters
│           └── matching/   # Question, ProgressBar, MatchCard
│
└── infrastructure/
    ├── nginx/
    │   └── local.conf      # Nginx config de referència
    ├── scripts/
    │   ├── deploy-backend.sh   # TODO Sprint 6
    │   └── deploy-frontend.sh  # TODO Sprint 6
    └── terraform/
        ├── README.md
        ├── modules/
        │   ├── networking/ # TODO Sprint 6
        │   ├── compute/    # TODO Sprint 6
        │   ├── database/   # TODO Sprint 6
        │   ├── storage/    # TODO Sprint 6
        │   └── security/   # TODO Sprint 6
        └── environments/
            ├── dev/        # TODO Sprint 6
            └── prod/       # TODO Sprint 6
```

## Serveis Docker Configurats

### Desenvolupament (docker-compose.yml)

1. **PostgreSQL 15** - Port 5432
   - Database: matchcota
   - User/Pass: postgres/postgres
   - Volume persistent
   - Healthcheck configurat

2. **Redis 7** - Port 6379
   - Cache opcional pel MVP
   - Healthcheck configurat

3. **MailHog** - Ports 1025 (SMTP) / 8025 (Web UI)
   - Testing d'emails en local
   - Interface web: http://localhost:8025

4. **Backend FastAPI** - Port 8000
   - Python 3.11
   - Hot reload amb --reload
   - Volume mount per desenvolupament
   - API docs: http://localhost:8000/docs

5. **Frontend React** - Port 5173
   - Node 20
   - Vite HMR activat
   - Volume mount per desenvolupament
   - App: http://localhost:5173

## Propers Passos

### 1. Provar Docker (ASIX)

```bash
# Construir i arrencar
docker-compose up -d

# Veure logs
docker-compose logs -f

# Verificar que tot funciona
docker-compose ps
```

### 2. Backend Inicial (DAW1)

Crear aquests fitxers bàsics:
- `backend/app/main.py` - FastAPI app inicial
- `backend/app/config.py` - Settings amb pydantic-settings
- `backend/app/database.py` - Connexió PostgreSQL

### 3. Frontend Inicial (DAW2)

Crear aquests fitxers bàsics:
- `frontend/src/main.jsx` - Entry point React
- `frontend/src/App.jsx` - Component principal
- `frontend/src/index.css` - Tailwind imports

### 4. Instal·lar Dependencies

```bash
# Frontend (primer cop)
cd frontend
npm install
cd ..

# Després ja ho farà Docker automàticament
docker-compose up --build
```

## Verificacions

- [ ] Docker Compose construeix correctament
- [ ] PostgreSQL accessible
- [ ] Redis accessible
- [ ] MailHog UI funciona
- [ ] Backend serveix (encara que sigui 404)
- [ ] Frontend serveix (encara que sigui en blanc)
- [ ] Hot reload funciona al backend
- [ ] Vite HMR funciona al frontend

## Notes Importants

- Tot està configurat per hot reload / HMR
- Els canvis es veuen en temps real sense reconstruir
- Les dependencies es guarden en volums per velocitat
- .env.example està creat però .env és opcional per dev
- Git ignore configurat per no pujar secrets

---

**Sprint 1 Completat**: Estructura de carpetes i Docker setup ✅
**Proper Sprint**: Backend base amb Auth i CRUD
