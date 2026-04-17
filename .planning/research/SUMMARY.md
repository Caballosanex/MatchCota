# Project Research Summary

**Project:** MatchCota
**Domain:** Leads Management + UX Unification (multi-tenant FastAPI + React SaaS on AWS)
**Milestone:** v1.2
**Researched:** 2026-04-15
**Confidence:** HIGH — all findings from direct codebase inspection

---

## Executive Summary

v1.2 is a pure implementation milestone with no new dependencies and no architecture changes. The entire feature set — leads admin panel, post-match lead capture, match results UX improvements, and palette normalization — is covered by the existing installed stack. The only schema change is additive: two columns (`status`, `notes`) added to an existing `leads` table that already has all other required fields.

The recommended approach is a strict four-phase build in dependency order: backend schema + API first (unblocks everything), then admin leads UI, then public lead capture UX, then palette normalization as an isolated PR. Deployment within each phase follows the mandatory sequence: Alembic migration → Lambda zip → EC2 static push. Reversing this order at any stage risks visible errors to shelter admins or adopters.

The dominant risk is not technical complexity — it is a cross-tenant data leak if admin leads endpoints are written without the mandatory `tenant_id` filter. This is a GDPR-level breach. Everything else (spam on the public endpoint, stale frontend cache, Lambda response size) is moderate and has clear mechanical mitigations. Ship the backend with cross-tenant isolation tests before any UI work touches leads.

---

## Key Findings

### Recommended Stack — No new libraries required

All three feature areas are covered by packages already installed and locked:

| Layer | Package | Version | Role in v1.2 |
|-------|---------|---------|--------------|
| Backend | `fastapi` | 0.109.0 | New leads endpoints |
| Backend | `sqlalchemy` | 2.0.25 | Lead CRUD queries |
| Backend | `alembic` | 1.13.1 | Add `status` + `notes` columns |
| Backend | `pydantic` | 2.5.3 | `LeadCreate` / `LeadResponse` schemas with `model_validator` |
| Backend | `python-jose` | 3.3.0 | JWT auth on admin endpoints |
| Frontend | `react-hook-form` | 7.71.2 | Lead capture form |
| Frontend | `zod` | 4.3.6 | Form validation |
| Frontend | `@hookform/resolvers` | 5.2.2 | Zod-RHF bridge |
| Frontend | `tailwindcss` | 3.4.1 | Config color token update only |

**Rejected alternatives:** PostgreSQL native ENUM for status (non-transactional DDL in PG); React Query/SWR (overkill for a single PATCH); shadcn/ui (would partially replace existing UI components); Tailwind v4 (breaking config changes, separate concern).

**Key pattern established:** The public `POST /leads` endpoint must NOT use the `useApi` hook (requires auth). It follows the raw fetch pattern from `src/api/matching.js` with `X-Tenant-Slug` header only. Admin leads functions use `useApi()` exactly like `AnimalsManager`.

---

### Expected Features — What must ship

**Leads admin panel (table stakes):**
- Paginated lead list: name, contact, date, status badge — filterable by status, sorted by date desc
- Status workflow: `new | contacted | adopted | rejected` — PATCH endpoint, mutable per admin
- Free-text notes per lead
- Lead detail: full questionnaire answers (human-readable labels, not raw JSON keys) + scores + top matches

**Post-match lead capture (table stakes):**
- Results shown first, unconditionally — capture form appears below after results render
- Required fields: name + one of email OR phone — nothing else mandatory
- Confirmation state after successful submission
- Match context (responses + matches + scores) stored atomically with the lead record

**Match results UX improvements (table stakes):**
- Large colour-coded score badge: green ≥75, amber 50–74, orange <50
- Explanations as a distinct visual section (not buried in small text)
- Stronger hero treatment for the #1 match
- "M'interessa" CTA per card that scrolls to the capture form

**Palette normalization (table stakes):**
- `tailwind.config.js` `primary` token remapped to indigo family (`#4F46E5` as DEFAULT, `#4338CA` dark, `#6366F1` light)
- 3–4 outlier classes fixed in `PublicLayout.jsx` only (blue-600, teal-700, teal-800)
- Strategy: additive — do NOT mass-replace working `indigo-*` classes

**Conversion research finding:** Results-first → soft CTA converts at ~40% opt-in. Email gate before results drops conversion to ~5%. Each additional required field loses ~4%.

**Explicitly deferred to v2+:** Email notifications (SES unavailable in AWS Academy), lead export (CSV/PDF), full-text search on leads, bulk actions, analytics dashboard.

---

### Architecture Approach — Key integration points

v1.2 adds one new domain (leads) as a clean vertical slice mirroring the existing animals domain. No existing endpoints are modified.

**New backend files:**
- `app/schemas/lead.py` — `LeadCreate`, `LeadResponse`, `LeadListItem`, `LeadDetail`, `LeadStatusUpdate`
- `app/crud/leads.py` — `create_lead`, `get_leads_by_tenant`, `get_lead_by_tenant`, `update_lead`
- `app/api/v1/leads.py` — public `POST /api/v1/leads` (no JWT) + admin `GET /admin/leads`, `GET /admin/leads/{id}`, `PATCH /admin/leads/{id}` (JWT required)
- `alembic/versions/XXXX_add_lead_status_notes.py`

**Modified files (backend):** `app/models/lead.py` (add columns), `app/main.py` (register router)

**New frontend files:** `src/api/leads.js`, `src/pages/admin/Leads.jsx`, `src/pages/admin/LeadDetail.jsx`, `src/components/matching/LeadCaptureForm.jsx`

**Modified files (frontend):** `tailwind.config.js`, `src/pages/public/MatchResults.jsx`, `src/pages/public/MatchTest.jsx` (pass `responses` in navigate state — currently missing), `src/App.jsx`, `src/layouts/AdminLayout.jsx`, `src/layouts/PublicLayout.jsx`

**Critical integration point — questionnaire label mapping:** `LeadDetail.jsx` reuses `GET /api/v1/matching/questionnaire` to map raw JSON keys to human-readable labels. No new backend endpoint required.

**Critical bug to fix in Phase 3:** `MatchTest.jsx` currently only passes `results` in navigate state. Must also pass `responses` so `MatchResults.jsx` can include them in the lead capture POST body.

**Deployment sequence (mandatory within each phase):**
1. Alembic migration — additive DDL, safe while old Lambda is live
2. Lambda zip upload — smoke-test new endpoints with curl before touching frontend
3. EC2 static push — only after backend smoke checks pass; keep previous `dist/` backup

---

### Critical Pitfalls

1. **Cross-tenant lead leak (GDPR-level)** — Admin endpoints written without `tenant_id` filter expose adopter contact info across shelters. Invisible in dev (single tenant). Prevention: `get_current_tenant` dependency required on every admin route; every `db.query(Lead)` must filter by `tenant_id`; add cross-tenant isolation test in Phase 1 before any UI exists.

2. **Results gate kills conversion** — Lead capture form shown before results causes adopters to dismiss and never return. Results-first + inline CTA is non-negotiable. Never gate the results page on form submission.

3. **Unauthenticated capture endpoint as spam vector** — Public `POST /leads` has no auth. Prevention: server-side rate limiting per IP per tenant slug at API Gateway or middleware; validate tenant is active before writing; reject non-JSON payloads. Must be addressed before production deploy.

4. **Lambda 6 MB response limit on leads list** — Including full `respostes` + `puntuacions` JSON columns in list response hits the API Gateway 6 MB synchronous limit at scale. Prevention: list endpoint returns summary fields only; full JSON on detail endpoint only; hard server-side cap of 50 leads per page.

5. **Palette normalization visual regressions** — Audit all token usages before touching config (`grep -r "bg-primary\|text-primary" src/`); additive strategy only; deploy as isolated PR; manual visual checklist of all pages post-build.

---

## Implications for Roadmap

### Phase 1: Backend — Leads Schema + API
**Rationale:** Pure backend work, no frontend dependency. Unblocks all other phases. The cross-tenant isolation test must live here.
**Delivers:** Alembic migration (status + notes columns), `app/schemas/lead.py`, `app/crud/leads.py`, `app/api/v1/leads.py` (4 endpoints), model + main.py updates.
**Addresses:** Leads admin panel and lead capture table stakes (API layer).
**Avoids:** Cross-tenant data leak — isolation test written and passing before Phase 2 begins.
**Deploy:** Migration → Lambda zip only.

### Phase 2: Admin Leads Panel
**Rationale:** Shelter admin visibility into leads is the core business value of v1.2. Can ship independently once Phase 1 backend is live.
**Delivers:** `Leads.jsx` (list + status filter + pagination), `LeadDetail.jsx` (detail + PATCH + questionnaire label mapping), `src/api/leads.js` (admin functions), `App.jsx` route additions, `AdminLayout.jsx` nav item.
**Addresses:** Full leads admin panel table stakes.
**Avoids:** Raw JSON rendered to admins — questionnaire label mapping required before merge.
**Deploy:** EC2 static push.

### Phase 3: Lead Capture + Match Results UX
**Rationale:** Completes the adopter-facing flow; improves conversion from test-taker to actionable lead. Can run in parallel with Phase 2 once Phase 1 is live.
**Delivers:** `LeadCaptureForm.jsx`, `MatchResults.jsx` embed + score badge improvements + "M'interessa" CTA, `MatchTest.jsx` navigate state fix, `src/api/leads.js` public `createLead`.
**Addresses:** Post-match lead capture + match results UX table stakes.
**Avoids:** Form-before-results (results unconditional); orphaned leads (responses passed in navigate state and POST body).
**Deploy:** EC2 static push.

### Phase 4: UI Palette Normalization
**Rationale:** Isolated cosmetic alignment — separate PR ensures visual regressions are self-contained and trivially reversible.
**Delivers:** `tailwind.config.js` primary token update to indigo family, `PublicLayout.jsx` 3–4 class fixes.
**Addresses:** UI palette normalization table stake.
**Avoids:** Regressions in untouched components — additive token strategy + manual visual checklist.
**Deploy:** EC2 static push only (no backend change).

### Phase Ordering Rationale

- Phase 1 is a hard prerequisite for Phases 2 and 3 — cannot call endpoints that don't exist.
- Phases 2 and 3 are independent of each other once Phase 1 is live — can be developed in parallel, deployed in either order.
- Phase 4 is fully independent and must be a separate PR to isolate visual regression risk from feature work.
- Within each phase: migration → Lambda → static is the mandatory deploy sequence; the inverse creates visible errors.

### Research Flags

**Needs deeper research during planning:** None. All implementation patterns are established in the existing codebase or are well-documented FastAPI/React/Tailwind patterns. No phase requires `/gsd-research-phase`.

**Standard patterns (skip research):**
- **Phase 1:** CRUD pattern follows `crud/animals.py` exactly; auth pattern follows existing admin animals routes.
- **Phase 2:** Admin list/detail pattern follows `AnimalsManager` with `useApi()` hook.
- **Phase 3:** Public fetch pattern follows `src/api/matching.js`; results page pattern established.
- **Phase 4:** Tailwind config change is mechanical once token audit is done.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages verified from `requirements.txt` and `package.json`; no assumptions |
| Features | HIGH | Table stakes from codebase inspection + directional UX conversion research |
| Architecture | HIGH | File-by-file change map from direct codebase inspection; no speculative components |
| Pitfalls | HIGH | Cross-tenant and Lambda limits are architectural facts; UX conversion patterns from multiple practitioner sources |

**Overall confidence: HIGH**

### Gaps to Address

- **Audit trail decision:** `PATCH /leads/{id}` in-place overwrites lose status change history. Recommend adding `status_updated_at` + `status_updated_by` columns in the same Phase 1 migration — retroactive schema changes require a data migration. Decision must be made before Phase 1 executes.
- **Rate limiting specifics:** Plan must specify concrete rate limits (requests/sec per IP, per tenant slug) before Phase 1 backend reaches production. This is a config decision, not an implementation blocker for development.
- **Redis availability:** Confirmed approach does not require Redis — match context is passed from React state in the POST body. Assumption: React state is not cleared between `MatchTest.jsx` navigate and `MatchResults.jsx` form submission (same session, no reload required).

---

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md` — direct codebase inspection (packages, file inventory, color audit)
- `.planning/research/FEATURES.md` — codebase inspection + UX conversion practitioner research
- `.planning/research/ARCHITECTURE.md` — direct codebase inspection (file-level change map, API integration map)
- `.planning/research/PITFALLS.md` — FastAPI/PostgreSQL official docs + UX conversion sources + AWS Lambda limits documentation

### Secondary (MEDIUM confidence)
- UX conversion rate estimates (results-first vs gate patterns) — multiple practitioner sources, directionally consistent

---

*Research completed: 2026-04-15*
*Milestone: v1.2 — Leads Management + UX Unification*
*Ready for roadmap: yes*
