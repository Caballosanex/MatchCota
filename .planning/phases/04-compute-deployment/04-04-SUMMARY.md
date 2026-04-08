---
phase: 04-compute-deployment
plan: 04
subsystem: infra
tags: [react, vite, nginx, postgresql, aws-rds, frontend-build, seed-data]

# Dependency graph
requires:
  - phase: 04-03
    provides: "Backend running on EC2, nginx configured, RDS accessible"
provides:
  - "React SPA built with production VITE_API_URL=https://matchcota.tech"
  - "nginx serving frontend from /opt/matchcota/frontend/dist"
  - "Tenant protectora-pilot seeded in RDS"
  - "Admin user created (admin@protectora-pilot.matchcota.tech / admin123)"
  - "4 sample animals loaded (Luna, Max, Coco, Misha)"
affects: [04-05-verification, e2e-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vite build with VITE_* env vars embedded at build time (not runtime)"
    - "OAuth2 form-encoded login (not JSON POST)"
    - "Tenant resolved via X-Tenant-Slug header (nginx injects from subdomain)"

key-files:
  created:
    - /opt/matchcota/frontend/dist/index.html
    - /opt/matchcota/frontend/dist/assets/index-Bxr5ku-i.js
    - /opt/matchcota/frontend/dist/assets/index-DRTNAacq.css
    - .planning/phases/04-compute-deployment/artifacts/frontend-verification.txt
    - .planning/phases/04-compute-deployment/artifacts/test-data-created.txt
  modified: []

key-decisions:
  - "Frontend built directly on EC2 (not shipped as artifact) — ensures native Linux build for rollup"
  - "npm install required full reinstall (delete node_modules + package-lock.json) due to rollup optional deps npm bug"
  - "Tenant API is at /api/v1/tenants/current (plural) not /api/v1/tenant/current (plan had wrong URL)"
  - "Login endpoint uses OAuth2 form encoding, not JSON — username field accepts email"
  - "Animals table has no status column — removed from seed SQL per actual Alembic migration schema"

patterns-established:
  - "EC2 frontend build: sudo -u matchcota HOME=/home/matchcota VITE_API_URL=... npm run build"
  - "Seed data: separate INSERT statements with explicit ::date casts (UNION ALL has type inference issues)"

requirements-completed: [FE-01, FE-02, FE-03, DATA-01, DATA-02, DATA-03]

# Metrics
duration: 25min
completed: 2026-04-08
---

# Phase 04 Plan 04: Frontend Build and Test Data Summary

**React SPA built with production domain embedded (matchcota.tech, no localhost), nginx serving dist, and pilot tenant seeded with 4 sample animals in RDS**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-08T15:15:00Z
- **Completed:** 2026-04-08T15:40:00Z
- **Tasks:** 3
- **Files modified:** 2 (artifact files created locally)

## Accomplishments

- Frontend built on EC2 with `VITE_API_URL=https://matchcota.tech` embedded — production domain confirmed in built JS, zero localhost references
- nginx reloaded and serving React SPA at both `https://matchcota.tech/` and `https://protectora-pilot.matchcota.tech/`
- Seeded RDS with tenant `protectora-pilot`, admin user, and 4 sample animals (Luna, Max, Coco, Misha) with full matching score vectors

## Production Build Verification

As requested by user, the built JS files were inspected:

| Check | Result |
|-------|--------|
| `grep 'matchcota.tech' dist/assets/*.js` | FOUND — domain embedded correctly |
| `grep 'localhost' dist/assets/*.js` | NOT FOUND — no dev URLs |
| No debug markers | Build was standard `vite build` (no `--mode development`) |
| `VITE_ENVIRONMENT=production` | Passed to build via `sudo -u matchcota HOME=/home/matchcota VITE_ENVIRONMENT=production npm run build` |

## Task Commits

Each task was committed atomically:

1. **Task 1+2: Build Frontend and Reload nginx** - `4bc0ed5` (feat)
2. **Task 3: Seed Test Tenant and Sample Data** - `b9e72ce` (feat)

**Plan metadata:** (final commit follows)

## Files Created/Modified

- `/opt/matchcota/frontend/dist/index.html` — React SPA entry point
- `/opt/matchcota/frontend/dist/assets/index-Bxr5ku-i.js` — 374KB bundled JS (107KB gzip), VITE_API_URL embedded
- `/opt/matchcota/frontend/dist/assets/index-DRTNAacq.css` — 46KB Tailwind styles
- `.planning/phases/04-compute-deployment/artifacts/frontend-verification.txt` — `curl https://matchcota.tech/` output showing `<div id="root">`
- `.planning/phases/04-compute-deployment/artifacts/test-data-created.txt` — psql verification: 1 tenant, 1 user, 4 animals

## Decisions Made

- **npm reinstall required:** The EC2 had a partial node_modules from a prior attempt (only 3 packages). Rollup's optional native deps (rollup-linux-x64-gnu) weren't installed due to npm optional deps bug. Fixed by deleting node_modules + package-lock.json and running fresh `npm install`.
- **Frontend built on EC2, not locally:** Ensures correct Linux x64 native modules (rollup requires platform-native binary). Building on macOS and shipping dist would work but requires extra rsync step.
- **Tenant API URL correction:** Plan verification step used `/api/v1/tenant/current` but actual route is `/api/v1/tenants/current` (matches `app.include_router(tenants.router, prefix="/api/v1/tenants")`). Verified working at correct URL.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed non-existent `status` column from animal INSERT SQL**
- **Found during:** Task 3 (Seed Test Tenant and Sample Data)
- **Issue:** Plan's seed SQL included `status` column in animals INSERT and value `'available'`. Actual Alembic schema has no `status` column — would have caused SQL error.
- **Fix:** Removed `status` from column list and removed `'available'` from value list
- **Files modified:** SQL executed directly on RDS (no local files)
- **Verification:** INSERT 0 4 rows executed successfully
- **Committed in:** b9e72ce (Task 3 commit)

**2. [Rule 1 - Bug] Added `maintenance_level` column (missing from plan SQL)**
- **Found during:** Task 3 (Seed Test Tenant and Sample Data)
- **Issue:** Plan SQL had 7 matching decimal values but only 7 columns in the INSERT list. The second Alembic migration `fafb12bebcd4` added `maintenance_level` as the 8th matching column. Plan omitted it.
- **Fix:** Added `maintenance_level` to column list with appropriate values (4.0, 5.0, 3.0, 3.0 for the 4 animals)
- **Files modified:** SQL executed directly on RDS
- **Verification:** All 4 animals inserted, maintenance_level populated
- **Committed in:** b9e72ce (Task 3 commit)

**3. [Rule 1 - Bug] Fixed date type error in UNION ALL seed SQL**
- **Found during:** Task 3 (Seed Test Tenant and Sample Data)
- **Issue:** UNION ALL approach with `SELECT ... FROM tenants` caused type inference error: `birth_date` is type `date` but the string literal `'2021-03-15'` was inferred as `text` in the UNION context.
- **Fix:** Rewrote as separate INSERT statements with explicit `'2021-03-15'::date` casts
- **Files modified:** SQL executed directly on RDS
- **Verification:** All 4 animal INSERT 0 1 statements succeeded
- **Committed in:** b9e72ce (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (3 Rule 1 bugs in plan SQL)
**Impact on plan:** All fixes required for SQL to execute. No scope creep. Data correctly seeded.

## Issues Encountered

- **Rollup native module missing:** EC2 had stale partial node_modules. Resolved by full reinstall (delete + npm install). Added ~2 min.
- **matchcota user home missing:** `/home/matchcota` didn't exist, causing npm log write failure. Created with `sudo mkdir -p /home/matchcota && sudo chown matchcota:matchcota /home/matchcota`.

## Production API Verification

| Endpoint | Result |
|----------|--------|
| `GET https://matchcota.tech/` | 200 HTML with `<div id="root">` |
| `GET https://protectora-pilot.matchcota.tech/` | 200 HTML (same SPA) |
| `GET /api/v1/tenants/current` (via subdomain) | 200 `{"name":"Protectora Pilot (Test)","slug":"protectora-pilot",...}` |
| `GET /api/v1/animals` (via subdomain) | 200 array of 4 animals |
| `POST /api/v1/auth/login` (form-encoded) | 200 JWT access_token returned |

## Known Stubs

None — all data is live in RDS and served from production API.

## Next Phase Readiness

- Phase 04-05 (E2E verification + boto3 Route 53) can proceed
- Frontend is live and serving React SPA with production API URL
- Pilot tenant fully configured with sample animals for testing matching flow
- Admin login works — ready for admin dashboard access testing

---
*Phase: 04-compute-deployment*
*Completed: 2026-04-08*
