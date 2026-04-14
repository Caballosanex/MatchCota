# Infraestructura AWS — MatchCota

Documentació tècnica completa de les decisions d'infraestructura, serveis AWS utilitzats, fluxos de desplegament i funcionament intern del sistema en producció.

---

## Índex

1. [Visió general](#1-visió-general)
2. [Serveis AWS i com s'utilitzen](#2-serveis-aws-i-com-sutilitzen)
3. [Arquitectura de xarxa (VPC)](#3-arquitectura-de-xarxa-vpc)
4. [Terraform: estructura i capes](#4-terraform-estructura-i-capes)
5. [Fluxos de desplegament complets](#5-fluxos-de-desplegament-complets)
6. [Gestió de subdominis i DNS](#6-gestió-de-subdominis-i-dns)
7. [EC2 i Nginx en producció](#7-ec2-i-nginx-en-producció)
8. [TLS i certificats](#8-tls-i-certificats)
9. [Gestió de secrets i variables d'entorn](#9-gestió-de-secrets-i-variables-dentorn)
10. [Restriccions AWS Academy](#10-restriccions-aws-academy)
11. [Scripts d'operació](#11-scripts-doperació)
12. [Recuperació després de reset](#12-recuperació-després-de-reset)

---

## 1. Visió general

MatchCota corre completament a **AWS us-east-1** en producció. No hi ha Docker Compose en producció: Docker és exclusiu de l'entorn de desenvolupament local. L'arquitectura de producció es divideix en dos plans:

| Pla | Component | Servei AWS |
|-----|-----------|------------|
| **Frontend / Edge** | SPA React estàtic + Nginx | EC2 t3.micro + Elastic IP |
| **API / Runtime** | FastAPI via Lambda | API Gateway HTTP + Lambda (Python 3.11) |
| **Dades** | PostgreSQL 15 | RDS db.t3.micro (privat) |
| **Emmagatzematge** | Imatges i artefactes | S3 (privat, amb VPC Gateway Endpoint) |
| **Secrets** | Contrasenyes i claus JWT | SSM Parameter Store |
| **DNS** | Dominis i subdominis | Route 53 (zona `matchcota.tech`) |
| **TLS (API)** | Certificat `api.matchcota.tech` | ACM (gestionat per API Gateway) |
| **TLS (Edge)** | Certificat `*.matchcota.tech` | Let's Encrypt via Certbot (EC2 nginx) |
| **Estat Terraform** | Fitxer d'estat remot + bloqueig | S3 + DynamoDB |

**Restricció important:** El projecte corre sobre AWS Academy, que imposa un conjunt de restriccions a IAM i serveis. El rol IAM és sempre `LabRole`, el perfil d'instància és sempre `LabInstanceProfile`, i serveis com CloudFront, CloudWatch, SES, NAT Gateway i RDS Multi-AZ estan prohibits.

---

## 2. Serveis AWS i com s'utilitzen

### 2.1 Amazon EC2 — Frontend Edge

- **Instància:** `t3.micro`, tipus `matchcota-prod-frontend-edge`
- **AMI:** Resolta dinàmicament via SSM Parameter Store (`/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64`). Amazon Linux 2023.
- **Subnet:** Pública (public_a, `10.42.0.0/24`)
- **Funció:** Servir els fitxers estàtics del SPA React via **Nginx**. Redirigir HTTP→HTTPS. Gestionar el routing de subdominis de tenants.
- **Elastic IP:** Associada estàticament (`matchcota-prod-frontend-edge-eip`). Tant el registre A de l'apex (`matchcota.tech`) com el wildcard (`*.matchcota.tech`) apunten a aquesta IP.
- **Volum EBS:** 16 GiB gp3, xifrat.
- **User-data (bootstrap inicial):** Terraform injecta un script cloud-init que instal·la Nginx via `dnf`/`yum` i l'activa com a servei. El script deixa un fitxer de contracte a `/etc/matchcota/edge-bootstrap-contract.txt`.
- **Accés SSH:** Restringit als CIDRs configurats a `frontend_allowed_ssh_cidrs`. Per defecte el transport de desplegament és **SSM-first** (AWS Systems Manager Run Command), amb SSH com a fallback.
- **Security Group (`matchcota-prod-frontend-edge-sg`):**
  - Inbound 22 (SSH) → CIDRs d'operador
  - Inbound 80 (HTTP) → 0.0.0.0/0
  - Inbound 443 (HTTPS) → 0.0.0.0/0
  - Outbound tot → 0.0.0.0/0

### 2.2 AWS Lambda — Runtime del Backend

- **Funció:** `matchcota-prod-api`
- **Runtime:** Python 3.11
- **Handler:** `app.lambda_handler.handler`
- **Timeout:** 30 segons
- **Memòria:** 1024 MB
- **Artefacte:** Fitxer zip pujat a S3 (`s3://matchcota-prod-uploads/runtime/lambda.zip`). Terraform gestiona el zip com a `aws_s3_object.lambda_runtime_artifact`.
- **VPC config:** Lambda corre **dins la VPC privada** (subnets privades `private_a` i `private_b`), amb el Security Group `matchcota-prod-lambda-runtime-sg`. Això li permet connectar-se a RDS directament per xarxa privada.
- **Adaptor FastAPI → Lambda:** Utilitza [Mangum](https://mangum.faun.dev/), que adapta les invocacions d'API Gateway HTTP (format payload 2.0) a l'interface ASGI de FastAPI.
- **Variables d'entorn injectades per Terraform:**
  - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`
  - `DB_PASSWORD_SSM_PARAMETER` → nom del paràmetre SSM (no la contrasenya directament)
  - `APP_SECRET_KEY_SSM_PARAMETER`, `JWT_SECRET_KEY_SSM_PARAMETER`
  - `S3_ENABLED=true`, `S3_BUCKET_NAME`
  - `WILDCARD_DOMAIN=matchcota.tech`
  - `ENVIRONMENT=production`, `DEBUG=false`

### 2.3 Amazon API Gateway HTTP — Frontal de l'API

- **Tipus:** HTTP API (APIGatewayV2), no REST API
- **Nom:** `matchcota-prod-http-api`
- **Integració:** Lambda Proxy (`AWS_PROXY`), payload format 2.0, timeout 29 s
- **Routes:** `ANY /` i `ANY /{proxy+}` → totes les peticions passen a Lambda
- **Stage:** `$default` (auto-deploy activat)
- **Domini personalitzat:** `api.matchcota.tech`, certificat ACM (TLS 1.2, regional)
- **DNS:** Registre A alias a la zona Route 53 que apunta al target domain name d'API Gateway

### 2.4 Amazon RDS PostgreSQL — Base de Dades

- **Identificador:** `matchcota-prod-postgres`
- **Engine:** PostgreSQL 15
- **Instància:** `db.t3.micro`
- **Emmagatzematge:** 20 GiB (sense autoescalat configurat)
- **Backup:** Retenció de 7 dies
- **Multi-AZ:** Desactivat (restricció AWS Academy)
- **Accés públic:** `publicly_accessible = false` — completament privat
- **Subnet group:** Subnets privades (`private_a` i `private_b`, zones `us-east-1a` i `us-east-1b`)
- **Security Group (`matchcota-prod-rds-postgres-sg`):** Ingress al port 5432 **únicament** des del Security Group de Lambda (`matchcota-prod-lambda-runtime-sg`). RDS és inaccessible des de l'exterior.
- **Xifrat en repòs:** Activat (`storage_encrypted = true`)
- **La contrasenya** es passa a Terraform com a variable sensible i també es guarda a SSM Parameter Store (vegeu secció 9)

### 2.5 Amazon S3 — Emmagatzematge d'Objectes

**Bucket d'uploads/artefactes: `matchcota-prod-uploads`**

Un únic bucket S3 privat amb dos usos principals:

| Ús | Prefix de clau | Descripció |
|----|----------------|------------|
| Artefacte Lambda | `runtime/lambda.zip` | Fitxer zip del backend, gestionat per Terraform |
| Uploads de tenants | `{tenant_id}/...` | Imatges d'animals pujades pels admins |
| Staging frontend (SSM deploy) | `deploy/frontend/...` | Arxiu temporal durant el desplegament via SSM |

- **Accés públic:** Completament bloquejat (`block_public_acls`, `ignore_public_acls`, `block_public_policy`, `restrict_public_buckets` = true)
- **Propietat d'objectes:** `BucketOwnerEnforced`
- **Accés Lambda→S3:** Via **VPC Gateway Endpoint** (`com.amazonaws.us-east-1.s3`) associat a la route table privada. Tràfic S3 no surt d'AWS.

### 2.6 Amazon Route 53 — DNS

- **Zona hosted:** `matchcota.tech` (zona pública)
- **Registres gestionats per Terraform:**
  - `matchcota.tech` → A → Elastic IP de l'EC2 (TTL 300)
  - `*.matchcota.tech` → A → Elastic IP de l'EC2 (TTL 300) — **un sol registre wildcard per tots els tenants**
  - `api.matchcota.tech` → A alias → API Gateway domain name target
  - Registres CNAME de validació ACM per `api.matchcota.tech`

**Delegació:** Terraform crea la zona i en retorna els name servers (`route53_hosted_zone_name_servers`). L'operador ha d'actualitzar manualment els NS al registrar DotTech amb exactament aquests valors. Fins que la delegació no es propaga, el sistema no és accessible.

### 2.7 AWS Certificate Manager (ACM)

- **Certificat gestionat:** `api.matchcota.tech` — creat per Terraform, validat via DNS (registre CNAME a Route 53), associat al custom domain d'API Gateway.
- **Certificat wildcard (`*.matchcota.tech`):** **No gestionat per ACM**. Es gestiona via Let's Encrypt a l'EC2 nginx (vegeu secció 8).

### 2.8 AWS SSM Parameter Store — Secrets

Tres paràmetres de tipus `String` (no `SecureString`, limitació Academy):

| Nom del paràmetre | Contingut |
|-------------------|-----------|
| `DB_PASSWORD` | Contrasenya de PostgreSQL |
| `APP_SECRET_KEY` | Clau secreta de l'aplicació FastAPI |
| `JWT_SECRET_KEY` | Clau secreta per signar tokens JWT |

Lambda rep el **nom** del paràmetre com a variable d'entorn (no el valor). A l'arrencada cold start, `bootstrap_runtime.py` crida SSM `get_parameter` per obtenir els valors reals i poblar `os.environ` (vegeu secció 9).

### 2.9 AWS DynamoDB — Bloqueig d'Estat Terraform

- **Taula:** `matchcota-prod-tflock`
- **Ús exclusiu:** Bloqueig distribuït per Terraform (`terraform_lock_table`)
- **Billing mode:** PAY_PER_REQUEST

### 2.10 Amazon VPC Endpoint (S3 Gateway)

- **Tipus:** Gateway endpoint (gratuït, sense overhead de xarxa)
- **Servei:** `com.amazonaws.us-east-1.s3`
- **Route tables:** Associat a la route table privada
- **Política:** Permet `s3:ListBucket`, `s3:GetObject`, `s3:PutObject` al bucket d'uploads
- **Raó:** Lambda corre a la VPC privada i no hi ha NAT Gateway. Sense Gateway Endpoint, Lambda no podria accedir a S3.

---

## 3. Arquitectura de xarxa (VPC)

```
VPC: matchcota-prod-vpc (10.42.0.0/16)
│
├── Internet Gateway: matchcota-prod-igw
│
├── Subnet pública: public_a (10.42.0.0/24) — us-east-1a
│   └── EC2 frontend-edge + Elastic IP
│
├── Subnet pública: public_b (10.42.1.0/24) — us-east-1b
│   └── (reserva / redundància)
│
├── Subnet privada: private_a (10.42.10.0/24) — us-east-1a
│   ├── Lambda (ENI)
│   └── RDS PostgreSQL
│
├── Subnet privada: private_b (10.42.11.0/24) — us-east-1b
│   └── RDS PostgreSQL (subnet group requereix mínim 2 AZ)
│
├── Route Table pública → Internet Gateway (0.0.0.0/0)
├── Route Table privada → VPC Gateway Endpoint S3
│
└── VPC Gateway Endpoint S3 (associat a route table privada)
```

**Regles de tràfic rellevants:**
- EC2 → Internet: directament via IGW (és a subnet pública)
- Lambda → RDS: port 5432 per xarxa privada (SG a SG reference)
- Lambda → S3: via VPC Gateway Endpoint (sense sortida a Internet)
- Internet → EC2: ports 80 i 443 oberts
- Internet → RDS: impossible (`publicly_accessible = false`)

---

## 4. Terraform: estructura i capes

### 4.1 Estructura de fitxers

```
infrastructure/terraform/
├── bootstrap/state-backend/     # Bootstrap independent per crear S3+DynamoDB d'estat
│   ├── main.tf                  # Recursos: aws_s3_bucket (tfstate), aws_dynamodb_table (tflock)
│   ├── variables.tf             # Noms de bucket i taula
│   └── outputs.tf               # terraform_state_bucket_name, terraform_lock_table_name
│
└── environments/prod/           # Root module de producció
    ├── versions.tf              # Terraform ~> 1.14.0, provider AWS ~> 6.39
    ├── providers.tf             # Provider AWS (region, profile opcional)
    ├── backend.tf               # Backend S3 remot (valors injectats via -backend-config)
    ├── variables.tf             # Totes les variables d'entrada
    ├── locals.tf                # Locals: subnet layout, cloud-init scripts, flags de bootstrap
    ├── main.tf                  # Tots els recursos AWS (un únic fitxer flat sense mòduls)
    └── outputs.tf               # Outputs consultats pels scripts de deploy
```

**Decisió de disseny:** No hi ha mòduls separats. Tots els recursos estan a `main.tf` en un únic root module. Simplicitat sobre modularitat per un projecte educatiu.

### 4.2 Bootstrap de l'estat remot

Terraform necessita un bucket S3 i una taula DynamoDB per guardar l'estat abans de poder crear qualsevol altra infraestructura. El bootstrap resol l'ou i la gallina:

```bash
# Pas 1: inicialitzar el bootstrap (estat local temporal)
eval "$(bash infrastructure/scripts/terraform-bootstrap-backend.sh)"
# → Crea matchcota-prod-tfstate (S3, versioning, xifrat AES256, accés públic bloquejat)
# → Crea matchcota-prod-tflock (DynamoDB, PAY_PER_REQUEST)
# → Exporta TF_BACKEND_BUCKET, TF_BACKEND_DYNAMODB_TABLE, TF_BACKEND_REGION

# Pas 2: inicialitzar el root prod amb l'estat remot
terraform -chdir=infrastructure/terraform/environments/prod init -reconfigure \
  -backend-config="bucket=${TF_BACKEND_BUCKET}" \
  -backend-config="dynamodb_table=${TF_BACKEND_DYNAMODB_TABLE}" \
  -backend-config="region=${TF_BACKEND_REGION:-us-east-1}"
```

El bucket d'estat **no** es pot gestionar amb Terraform des del mateix root que l'usa. El bootstrap és un root independent amb estat local.

### 4.3 Capes de desplegament (terraform-apply-layer.sh)

El desplegament es fa en 4 capes seqüencials. Cada capa utilitza `-target` per aplicar únicament un subconjunt de recursos. Això permet recuperació parcial i reducció de risc.

| Capa | Recursos |
|------|---------|
| **foundation** | `terraform_data.academy_guardrails` — valida restriccions IAM/serveis |
| **network** | VPC, IGW, subnets (public_a, public_b, private_a, private_b), route tables, associacions |
| **data** | Security Groups (lambda, rds), regla ingress RDS←Lambda, subnet group, RDS PostgreSQL, S3 bucket + polítiques, VPC Gateway Endpoint S3 |
| **runtime** | EC2 frontend-edge + SG + EIP + associació, Lambda artifact S3 object, Lambda function, API Gateway (HTTP API + integració + routes + stage), permisos Lambda, registres DNS (apex, wildcard, api alias), certificat ACM + validació DNS + custom domain + mapping, contracte TLS bootstrap |

**Motiu de les capes:** La capa `data` crea l'RDS, que pot trigar 5-10 minuts. Si s'aplica tot d'una i falla a la meitat, és difícil reprendre. Amb capes, es pot tornar a executar només la capa fallida.

### 4.4 Guardrails de l'AWS Academy

La capa `foundation` inclou un recurs `terraform_data.academy_guardrails` que valida en temps de `plan`:

- `lab_role_name` ha de ser exactament `"LabRole"`
- `lab_instance_profile_name` ha de ser exactament `"LabInstanceProfile"`
- `enabled_services` no pot contenir: `cloudfront`, `cloudwatch`, `ses`, `nat_gateway`, `rds_multi_az`

Si alguna validació falla, `terraform plan` falla abans d'aplicar res.

---

## 5. Fluxos de desplegament complets

### 5.1 Desplegament del backend (deploy-backend.sh)

El backend corre com a **Lambda**, no com a procés persistent a EC2. El deploy consisteix a:

```
1. Verificar que Terraform estigui inicialitzat (o inicialitzar amb -backend-config)
2. Instal·lar dependències Python per a Lambda (manylinux2014_x86_64, wheels binaris)
   pip install --only-binary=:all: --platform manylinux2014_x86_64 --python-version 3.11 ...
3. Copiar backend/app/ al directori temporal de build
4. Crear backend/dist/lambda.zip
5. Llegir outputs de Terraform (lambda_function_name, rds_endpoint, ssm params, etc.)
6. Verificar que els secrets SSM existeixin (aws ssm get-parameter per cada un)
7. Actualitzar les variables d'entorn de Lambda (aws lambda update-function-configuration)
8. Pujar lambda.zip a S3 (aws s3 cp)
9. Actualitzar el codi de Lambda (aws lambda update-function-code --s3-bucket --s3-key)
10. Esperar que Lambda estigui actualitzada (aws lambda wait function-updated)
```

**Important:** Les dependències s'instal·len amb `--only-binary=:all:` per garantir wheels precompilats per Linux x86_64 (Lambda corre a Linux, el build pot fer-se des de macOS/Windows).

Variables d'entorn requerides per executar el script:
- `AWS_PROFILE` (per defecte: `matchcota`)
- `TF_BACKEND_BUCKET` + `TF_BACKEND_DYNAMODB_TABLE` (si Terraform no està inicialitzat)
- `LAMBDA_ARTIFACT_PATH` (per defecte: `backend/dist/lambda.zip`)

### 5.2 Desplegament del frontend (deploy-frontend.sh)

El frontend és un SPA React que es compila a fitxers estàtics i es copia a l'EC2 Nginx.

```
1. Verificar inputs (VITE_ENVIRONMENT=production, VITE_BASE_DOMAIN=matchcota.tech)
2. Inicialitzar Terraform si cal
3. Resolver FRONTEND_HOST des de Terraform output (frontend_edge_host_for_deploy)
   → Per defecte: IP pública de l'EC2 Elastic IP
4. Verificar el contracte DNS (hosted zone, wildcard EIP, preboot contract)
5. Decidir transport: SSM (preferit) o SSH (fallback)
   - SSM: busca l'instance ID per IP/DNS, verifica que SSM estigui Online
   - SSH: requereix FRONTEND_SSH_KEY_PATH
6. Compilar el frontend:
   npm --prefix frontend ci
   VITE_API_URL=https://api.matchcota.tech VITE_BASE_DOMAIN=matchcota.tech ... npm run build
7. Publicar fitxers estàtics:
   - Transport SSH: rsync -az --delete /dist/ a /tmp/matchcota-frontend-dist/ a l'EC2
   - Transport SSM: empaquetar dist/ en .tar.gz, pujar a S3 staging, descarregar a l'EC2 via SSM
8. A l'EC2 (via script remot): configurar Nginx + verificar
   - Copiar fitxers a FRONTEND_DOCROOT (/usr/share/nginx/html)
   - Escriure /etc/nginx/conf.d/matchcota-http.conf (redirect HTTP→HTTPS)
   - Escriure /etc/nginx/conf.d/matchcota-https.conf (virtual host HTTPS)
   - nginx -t && systemctl reload nginx
   - Verificar que NO hi hagi procés backend corrent (uvicorn/gunicorn)
9. Verificar contractes de rutes públiques (curl a https://matchcota.tech i https://{slug}.matchcota.tech)
10. Verificar contracte del preboot endpoint (/tenant-preboot.js)
```

### 5.3 Seqüència completa de primera posada en marxa

```bash
export AWS_PROFILE=matchcota
eval "$(bash infrastructure/scripts/terraform-bootstrap-backend.sh)"
bash infrastructure/scripts/terraform-apply-layer.sh foundation
bash infrastructure/scripts/terraform-apply-layer.sh network
bash infrastructure/scripts/terraform-apply-layer.sh data
bash infrastructure/scripts/terraform-apply-layer.sh runtime

# Obtenir NS de Route 53 i actualitzar DotTech registrar:
terraform -chdir=infrastructure/terraform/environments/prod output route53_hosted_zone_name_servers
# → Actualitzar manualment NS a DotTech. Esperar propagació (pot trigar hores).

# Verificar delegació DNS:
bash infrastructure/scripts/dns-delegation-check.sh \
  --domain matchcota.tech \
  --wildcard-sample smoke.matchcota.tech \
  --api-host api.matchcota.tech \
  --timeout 900 --interval 30

# Emetre certificat wildcard a l'EC2 (Let's Encrypt, DNS-01):
# → SSH a l'EC2 i executar certbot manualment (vegeu secció 8)

# Verificar TLS:
bash infrastructure/scripts/tls-readiness-check.sh \
  --apex matchcota.tech --wildcard-sample smoke.matchcota.tech \
  --api api.matchcota.tech --timeout 900 --interval 30

# Desplegar backend i frontend:
bash infrastructure/scripts/deploy-backend.sh
bash infrastructure/scripts/deploy-frontend.sh

# Readiness post-deploy (DNS + TLS + API + rutes frontend):
bash infrastructure/scripts/post-deploy-readiness.sh

# Auditoria de dades de producció:
bash infrastructure/scripts/production-data-audit.sh
```

---

## 6. Gestió de subdominis i DNS

### 6.1 Model de subdominis per a multi-tenancy

**Cada protectora (tenant) obté el seu propi subdomini:** `{slug}.matchcota.tech`

Exemples: `protectora-barcelona.matchcota.tech`, `gats-del-maresme.matchcota.tech`

**El secret és el registre DNS wildcard:** Terraform crea `*.matchcota.tech → Elastic IP EC2`. Totes les peticions a qualsevol subdomini arriben al mateix EC2 i Nginx, independentment de si el slug és vàlid o no.

### 6.2 Creació d'un subdomini en afegir un tenant nou

Quan es crea una nova protectora via l'API (`POST /api/v1/tenants/`), el backend crida automàticament `backend/app/services/route53.py` per crear un registre A individual:

```
protectora-barcelona.matchcota.tech  →  A  →  {ELASTIC_IP}  (TTL 300)
```

**Però amb el wildcard DNS, el registre individual és tècnicament innecessari** per resoldre el subdomini. El wildcard ja cobreix qualsevol `*.matchcota.tech`. El registre individual es crea igualment per coherència i per permetre granularitat futura (p.ex. apuntar un tenant a una IP diferent).

Variables de configuració rellevants:
- `ROUTE53_ZONE_ID` — ID de la zona hosted (p.ex. `Z068386214DXGZ36CDSRY`)
- `ELASTIC_IP` — IP pública de l'EC2 edge
- `WILDCARD_DOMAIN` — `matchcota.tech`

### 6.3 Resolució del tenant a partir del subdomini

Quan arriba una petició a `protectora-barcelona.matchcota.tech`:

```
1. DNS: *.matchcota.tech → Elastic IP → arriba a EC2 Nginx (port 443)
2. Nginx extreu el slug del Host header → variable $matchcota_preboot_slug
3. Nginx serveix /tenant-preboot.js amb el context del tenant injectat:
   window.__MATCHCOTA_TENANT_PREBOOT__ = {
     host: "protectora-barcelona.matchcota.tech",
     baseDomain: "matchcota.tech",
     tenantSlug: "protectora-barcelona",
     tenantName: "",
     status: "unresolved"   ← "unresolved" = el frontend ha de fer lookup a l'API
   }
4. Nginx fa SPA fallback → serveix index.html
5. El SPA (React) carrega, llegeix window.__MATCHCOTA_TENANT_PREBOOT__,
   fa GET /api/v1/tenant/current amb X-Tenant-Slug: protectora-barcelona
6. Lambda (FastAPI) fa lookup a BD: SELECT * FROM tenants WHERE slug = 'protectora-barcelona'
7. Si existeix → tenant resolts. Si no → error.
```

**Per a l'apex (`matchcota.tech`):** el preboot retorna `status: "apex"` i el SPA renderitza la landing pública de MatchCota, no cap tenant.

### 6.4 Delegació DNS i el registrar DotTech

El domini `matchcota.tech` està registrat a DotTech. Terraform crea la zona hostatjada a Route 53 i retorna 4 name servers d'AWS. L'operador ha d'anar manualment al panell de DotTech i actualitzar els NS del domini per apuntar als d'AWS.

Fins que la delegació no es propaga (pot trigar fins a 48 hores, normalment menys de 2 hores), el DNS no funciona. El script `dns-delegation-check.sh` verifica que:
1. Els NS del registrar coincideixen amb els de la zona Route 53
2. El registre A de l'apex resol
3. El registre A wildcard (sample) resol
4. El registre A de `api.matchcota.tech` resol

---

## 7. EC2 i Nginx en producció

### 7.1 Rol de l'EC2

L'EC2 (`matchcota-prod-frontend-edge`) **únicament** serveix el frontend estàtic. **No hi ha cap procés backend corrent a l'EC2.** FastAPI corre a Lambda. El script de desplegament del frontend verifica explícitament que no hi hagi `uvicorn`, `gunicorn` ni cap procés Python similar a l'EC2 (i falla si en detecta).

### 7.2 Configuració Nginx desplegada

Quan s'executa `deploy-frontend.sh`, el script crea i instal·la dos fitxers de configuració Nginx:

**`/etc/nginx/conf.d/matchcota-http.conf`** (redirect HTTP→HTTPS):
```nginx
server {
    listen 80;
    server_name matchcota.tech *.matchcota.tech;
    return 301 https://$host$request_uri;
}
```

**`/etc/nginx/conf.d/matchcota-https.conf`** (HTTPS amb routing per subdomini):
```nginx
server {
    listen 443 ssl;
    server_name matchcota.tech *.matchcota.tech;

    ssl_certificate     /etc/letsencrypt/live/matchcota.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/matchcota.tech/privkey.pem;

    root /usr/share/nginx/html;
    index index.html;

    # Detectar context del host
    set $matchcota_preboot_status "invalid";
    set $matchcota_preboot_slug "";

    if ($host = matchcota.tech) {
        set $matchcota_preboot_status "apex";
    }

    if ($host ~ ^([a-z0-9-]+)\.matchcota\.tech$) {
        set $matchcota_preboot_status "unresolved";
        set $matchcota_preboot_slug $1;
    }

    # Endpoint preboot: injecta context del tenant al JavaScript
    location = /tenant-preboot.js {
        default_type application/javascript;
        add_header Cache-Control "no-store";
        return 200 "window.__MATCHCOTA_TENANT_PREBOOT__={...}";
    }

    # Contractes de routing:
    # - Apex NO serveix /test ni /home (redirigeix a /)
    location ~ ^/(test|home)(/.*)?$ {
        if ($host = matchcota.tech) { return 302 /; }
        try_files $uri /index.html;
    }

    # - Subdominis de tenant NO exposen /register-tenant (redirigeix a /)
    location ~ ^/register-tenant(/.*)?$ {
        if ($host ~ ^[a-z0-9-]+\.matchcota\.tech$) { return 302 /; }
        try_files $uri /index.html;
    }

    # SPA fallback: tot a index.html
    location / {
        try_files $uri /index.html;
    }
}
```

### 7.3 Preboot JavaScript

El endpoint `/tenant-preboot.js` és la peça clau del multi-tenancy al frontend. Nginx l'injecta sense fer cap lookup de base de dades, purament a partir del `$host` header. El SPA el carrega com a primer script per tenir el context del tenant disponible abans que React s'inicialitzi.

El valor de `status` pot ser:
- `"apex"` — petició al domini principal `matchcota.tech`
- `"unresolved"` — petició a un subdomini de tenant (cal verificar a l'API)
- `"invalid"` — host no reconegut

### 7.4 Nginx en desenvolupament local

A `infrastructure/nginx/local.conf` hi ha una configuració de referència per a Nginx en local (no s'usa directament a Docker Compose). Fa proxy de `/api/` al backend (port 8000) i de `/` al frontend (port 5173). Inclou suport WebSocket per Vite HMR.

---

## 8. TLS i certificats

### 8.1 Estratègia de certificats dividida

| Domini | Estratègia | Gestionat per |
|--------|------------|---------------|
| `api.matchcota.tech` | ACM | Terraform + API Gateway |
| `matchcota.tech` | Let's Encrypt | Certbot manual a l'EC2 |
| `*.matchcota.tech` | Let's Encrypt | Certbot manual a l'EC2 |

Els certificats wildcard **no poden** emetre's amb `certbot --nginx` (challenge HTTP-01 no suporta wildcards). Cal usar el challenge **DNS-01** manualment.

### 8.2 Emissió del certificat wildcard (Let's Encrypt)

Quan Terraform ha desplegat la capa `runtime` i l'EC2 existeix:

```bash
# SSH a l'EC2
ssh -i ~/.ssh/matchcota.pem ec2-user@{EC2_IP}

# Instal·lar certbot si no està present
sudo dnf install -y certbot

# Emetre certificat apex + wildcard via DNS-01
sudo certbot certonly \
  --manual \
  --preferred-challenges dns \
  --agree-tos \
  --email ops@matchcota.tech \
  --manual-public-ip-logging-ok \
  -d matchcota.tech \
  -d '*.matchcota.tech'

# Certbot demanarà crear un registre TXT a Route 53:
# _acme-challenge.matchcota.tech → TXT → "valor..."
# Crear el registre a la consola AWS o via CLI, esperar propagació, continuar.

# Configurar nginx per usar els certificats
# (deploy-frontend.sh ja escriu les rutes correctes al fitxer de config)

sudo nginx -t && sudo systemctl reload nginx
```

Els certificats es guarden a `/etc/letsencrypt/live/matchcota.tech/`. El deploy de frontend verifica que existeixin `fullchain.pem` i `privkey.pem` abans de publicar els assets.

### 8.3 Renovació de certificats

La renovació automàtica **no està configurada** en la fase actual. Es gestiona manualment per l'operador quan s'apropa la caducitat (90 dies). Recordatori: cal re-emetre el certificat i recarregar Nginx.

---

## 9. Gestió de secrets i variables d'entorn

### 9.1 Filosofia general

En producció **no hi ha fitxer `.env`**. Els secrets mai s'injecten directament com a valors a les variables d'entorn de Lambda. En canvi:

1. Terraform gestiona els secrets com a variables sensibles i els guarda a **SSM Parameter Store**
2. Lambda rep el **nom** del paràmetre SSM (no el valor) com a variable d'entorn
3. En el cold start de Lambda, `bootstrap_runtime.py` fa `ssm.get_parameter()` per obtenir el valor real

### 9.2 Variables d'entorn de Lambda

Injectades per Terraform i actualitzades per `deploy-backend.sh`:

| Variable | Valor | Descripció |
|----------|-------|------------|
| `ENVIRONMENT` | `production` | Mode de l'aplicació |
| `DEBUG` | `false` | Desactiva debug |
| `DB_HOST` | RDS endpoint (p.ex. `matchcota-prod-postgres.xxxxx.us-east-1.rds.amazonaws.com`) | Host de PostgreSQL |
| `DB_PORT` | `5432` | Port de PostgreSQL |
| `DB_NAME` | `matchcota` | Nom de la base de dades |
| `DB_USERNAME` | `matchcota_admin` | Usuari de la base de dades |
| `DB_PASSWORD_SSM_PARAMETER` | `DB_PASSWORD` | Nom del paràmetre SSM (no la contrasenya) |
| `APP_SECRET_KEY_SSM_PARAMETER` | `APP_SECRET_KEY` | Nom del paràmetre SSM |
| `JWT_SECRET_KEY_SSM_PARAMETER` | `JWT_SECRET_KEY` | Nom del paràmetre SSM |
| `S3_ENABLED` | `true` | Activa uploads a S3 |
| `S3_BUCKET_NAME` | `matchcota-prod-uploads` | Bucket d'uploads |
| `APP_AWS_REGION` | `us-east-1` | Regió per al client boto3 de SSM |
| `WILDCARD_DOMAIN` | `matchcota.tech` | Domini base per als tenants |

### 9.3 Bootstrap de secrets al cold start (bootstrap_runtime.py)

```python
# backend/app/lambda_handler.py — ordre d'execució:
from app.bootstrap_runtime import bootstrap_runtime_secrets
bootstrap_runtime_secrets()   # ← primer, abans d'importar l'app
from app.main import app
handler = Mangum(app, lifespan="off")
```

`bootstrap_runtime.py` llegeix els noms de paràmetre SSM de les variables d'entorn, fa `ssm.get_parameter()` per a cadascun, i pobla `os.environ` amb:
- `DB_PASSWORD` — contrasenya de PostgreSQL
- `APP_SECRET_KEY` — clau secreta de l'app
- `JWT_SECRET_KEY` — clau secreta JWT
- `DATABASE_URL` — URL completa `postgresql://user:password@host:port/db?sslmode=require`
- `RUNTIME_SECRETS_BOOTSTRAPPED=true`

El resultat es guarda a `_RUNTIME_CACHE` per evitar crides SSM repetides entre invocacions del mateix container Lambda (warm start).

### 9.4 Variables d'entorn del frontend (Vite)

A la compilació del frontend (`npm run build`):

| Variable | Valor en producció |
|----------|--------------------|
| `VITE_API_URL` | `https://api.matchcota.tech` |
| `VITE_BASE_DOMAIN` | `matchcota.tech` |
| `VITE_ENVIRONMENT` | `production` |

Aquestes variables es "cremen" al bundle estàtic en temps de build. No hi ha variables d'entorn en temps d'execució al frontend.

### 9.5 Validació d'entorn local (validate-env.py)

Per a l'entorn de desenvolupament, `infrastructure/scripts/validate-env.py` verifica:
1. Existència del fitxer `.env`
2. Variables obligatòries: `ENVIRONMENT`, `DATABASE_URL`, `SECRET_KEY`, `JWT_SECRET_KEY`
3. Seguretat: detecta claus per defecte ("CHANGE-THIS", "your-...")
4. Format de `DATABASE_URL` (ha de ser `postgresql://...`)
5. Serveis opcionals: Redis, S3, SMTP

---

## 10. Restriccions AWS Academy

El projecte corre en un compte **AWS Academy** que té les limitacions següents, que afecten les decisions d'infraestructura:

| Restricció | Impacte | Alternativa adoptada |
|------------|---------|----------------------|
| IAM role fix (`LabRole`) | No es poden crear rols IAM | Lambda usa `LabRole` (via `LabInstanceProfile`) |
| No CloudFront | No CDN | Assets estàtics servits directament per Nginx a l'EC2 |
| No CloudWatch | No monitoratge natiu | Logs bàsics de Lambda disponibles però no monitoritzats |
| No SES | No email transaccional | No implementat (fora d'abast MVP) |
| No NAT Gateway | Lambda a VPC no pot sortir a Internet per IP pública | VPC Gateway Endpoint S3 (gratuït) per accedir a S3 sense NAT |
| No Multi-AZ RDS | No alta disponibilitat de BD | RDS Single-AZ (`multi_az = false`) |
| Credencials temporals | Expiren cada ~4 hores | Scripts dissenyats per reprendr'e des de qualsevol capa |

---

## 11. Scripts d'operació

Tots els scripts es troben a `infrastructure/scripts/`. S'han d'executar des de l'arrel del repositori.

### terraform-bootstrap-backend.sh
Crea el bucket S3 i la taula DynamoDB d'estat Terraform. Cal executar-lo **una sola vegada** per compte AWS (o quan es reseta el lab). Retorna les variables `TF_BACKEND_BUCKET`, `TF_BACKEND_DYNAMODB_TABLE`, `TF_BACKEND_REGION` per exportar.

### terraform-preflight.sh
Verifica prerequisits: versió Terraform (~> 1.14), regió AWS (ha de ser us-east-1), credencials actives (STS), accessibilitat del bucket i taula de backend si estan configurats.

### terraform-apply-layer.sh `<foundation|network|data|runtime>`
Aplica una capa específica de Terraform amb `-target`. Inicia Terraform si cal. Crea un pla (`tfplan-{layer}`) i l'aplica. Les capes han d'aplicar-se en ordre.

### terraform-smoke.sh
Executa una bateria de verificació sense mutació:
1. Preflight (versió, credencials, regió)
2. Prerequisites del backend (S3, DynamoDB)
3. `terraform fmt -check` (format del codi)
4. `terraform validate` (sintaxi)
5. `terraform plan` amb variables de placeholder (verifica que el pla genera els recursos esperats)
6. Contractes del pla: verifica que VPC, RDS, S3, Lambda i endpoints apareguin al pla
7. `dns-delegation-check.sh` (DNS resolt)
8. `tls-readiness-check.sh` (HTTPS funcional)
9. Fingerprint de l'API runtime (`GET /api/v1/health` ha de retornar `{"status":"healthy"}`)

### deploy-backend.sh
Build i deploy del backend Lambda. Crea `lambda.zip`, actualitza variables d'entorn de Lambda, puja el zip a S3, i actualitza el codi de la funció.

### deploy-frontend.sh
Build i deploy del frontend React. Compila el SPA, publica els assets a l'EC2 via SSH o SSM, configura Nginx, i verifica els contractes de rutes (apex redirects, tenant root, preboot endpoint).

### post-deploy-readiness.sh
Pipeline de readiness post-deploy en ordre determinista:
1. DNS delegation check
2. TLS readiness check
3. API contract check (`test_api.sh`)
4. Frontend host-routing contract verification

### dns-delegation-check.sh
Verifica que la delegació DNS sigui correcta: NS del registrar coincideixen amb Route 53, i que apex, wildcard sample i api.matchcota.tech resolen via A record. Reinttenta amb interval configurable fins al timeout.

### tls-readiness-check.sh
Verifica que els certificats HTTPS siguin vàlids per a apex, wildcard sample i API host.

### production-data-audit.sh
Auditoria de dades de producció per detectar fuites de dades de fixtures o de test.

### validate-env.py
Validació de variables d'entorn per a l'entorn de desenvolupament local.

### run-ssm-secret-tests.sh
Executa els tests de pytest per al bootstrap de secrets SSM (`test_ssm_secrets.py`) i registra evidència al fitxer de verificació de la fase 12.

### seed.sh / seed-data.sql
Inserció de dades inicials a la base de dades (per a development/testing).

### reset-db.sh
Reseteja la base de dades local (elimina i recrea).

### terraform-budget-check.py
Verifica que l'estimació de cost Terraform no superi el límit configurable (default: $50 USD). S'usa com a porta pressupostària abans d'aplicar.

---

## 12. Recuperació després de reset

Les credencials AWS Academy expiren cada ~4 hores. Quan expiren, cal:

1. Renovar les credencials AWS al portal Academy i actualitzar `~/.aws/credentials` (perfil `matchcota`)
2. Verificar preflight: `bash infrastructure/scripts/terraform-preflight.sh`
3. Si hi havia un lock de Terraform actiu, revisar amb `aws dynamodb describe-table` i fer `terraform force-unlock` manualment si cal
4. Tornar a executar smoke: `bash infrastructure/scripts/terraform-smoke.sh`
5. Reprendre des de la capa fallida: `bash infrastructure/scripts/terraform-apply-layer.sh <capa>`

**Seqüència de recuperació completa** (quan el lab es reseta del tot):

```bash
export AWS_PROFILE=matchcota

# Bootstrap de l'estat (recrea bucket + DynamoDB)
eval "$(bash infrastructure/scripts/terraform-bootstrap-backend.sh)"

# Aplicar les 4 capes
bash infrastructure/scripts/terraform-apply-layer.sh foundation
bash infrastructure/scripts/terraform-apply-layer.sh network
bash infrastructure/scripts/terraform-apply-layer.sh data
bash infrastructure/scripts/terraform-apply-layer.sh runtime

# Desplegar backend i frontend
bash infrastructure/scripts/deploy-backend.sh
bash infrastructure/scripts/deploy-frontend.sh

# Verificar readiness complet
bash infrastructure/scripts/post-deploy-readiness.sh
bash infrastructure/scripts/production-data-audit.sh
```

**Nota sobre la delegació DNS:** Quan el lab es reseta, la zona Route 53 es recrea amb nous name servers. Cal actualitzar els NS a DotTech altra vegada. Mentre la delegació no propagui, `dns-delegation-check.sh` fallarà amb exit code 2 (timeout d'espera). Cal repetir l'execució fins que passi.

---

*Documentació generada manualment a partir del codi font. Per a detalls d'operació consultar també `infrastructure/terraform/environments/prod/operations-runbook.md`.*
