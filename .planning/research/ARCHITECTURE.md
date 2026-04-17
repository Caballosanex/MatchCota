# Architecture Research

**Domain:** Leads management + UX normalization integration into existing MatchCota architecture
**Milestone:** v1.2 — Leads Management + UX Unification
**Researched:** 2026-04-15
**Confidence:** HIGH — all findings from direct codebase inspection

---

## Question 1: Backend changes for lead capture (post-match form)

**Use a separate `POST /api/v1/leads` endpoint. Do not extend `/matching/calculate`.**

The calculate endpoint is currently stateless and correct. It computes and returns matches without writing to the DB. Keep it that way.

Reasons to keep them separate:
- Calculate is called on every submission including retests. Saving a lead there creates duplicate rows and pollutes the admin panel.
- Lead capture is opt-in — the user sees results first, then decides whether to submit contact info. These are two distinct user actions separated in time.
- Stateless calculate is simpler to test and reason about.

**New public endpoint:**
```
POST /api/v1/leads
Headers: X-Tenant-Slug (no JWT — public)
Body: { nom, email?, tel?, respostes, millors_match, puntuacions }
Response 201: { id, created_at }
```

Validation: at least one of `email` or `tel` must be present. Enforce with a Pydantic `model_validator` on `LeadCreate`.

**Required MatchTest.jsx change:** The current navigate call only passes `results`. It must also pass `responses`:
```js
navigate('/test/results', { state: { results, responses } });
```
MatchResults already reads `location.state` — extend it to also read `responses` so the capture form can snapshot them into the lead record.

---

## Question 2: Backend changes for admin leads panel

**The `leads` table has no `status` or `notes` columns.** A new Alembic migration is required.

**Migration adds:**
- `status`: `String(20)`, `server_default="new"`, NOT NULL. Valid values: `new | contacted | adopted | rejected`
- `notes`: `Text`, nullable

Do NOT use a PostgreSQL native ENUM for status — `ALTER TYPE ... ADD VALUE` cannot run inside a transaction block (a known Alembic footgun). `String(20)` + Pydantic validation at the API boundary is equivalent and migration-safe.

**Admin endpoints (all require JWT — same auth pattern as existing admin animals routes):**
```
GET   /api/v1/admin/leads           ?skip=0&limit=20&status=...  →  { items: [...], total: int }
GET   /api/v1/admin/leads/{id}                                   →  LeadDetail (full fields)
PATCH /api/v1/admin/leads/{id}      { status?, notes? }          →  LeadDetail
```

**CRUD pattern** — follows `crud/animals.py` exactly, all queries filter `tenant_id`:
```python
def get_leads_by_tenant(db, tenant_id, skip, limit, status=None):
    query = db.query(Lead).filter(Lead.tenant_id == tenant_id)
    if status:
        query = query.filter(Lead.status == status)
    total = query.count()
    items = query.order_by(Lead.data_creacio.desc()).offset(skip).limit(limit).all()
    return items, total
```

List endpoint returns summary fields only (tenant isolation + Lambda payload size):
- `id`, `nom`, `email`, `tel`, `status`, `data_creacio`, top 3 `millors_match` names + scores
- Full `respostes` and `puntuacions` returned only on detail endpoint

Hard server-side pagination cap: 50 leads per page regardless of client request.

---

## Question 3: Tailwind palette normalization approach

**Update `tailwind.config.js` + fix 3-4 outlier classes in `PublicLayout.jsx`.**

Current state (from inspection):
- `tailwind.config.js` defines `primary` as `#4A90A4` (teal) — nothing in the codebase uses it
- App has already converged on `indigo-600` as the actual brand color
- Outliers only in `PublicLayout.jsx`: apex header uses `blue-600`, tenant header/error uses `teal-700`/`teal-800`

**Config change:**
```js
colors: {
  primary: {
    DEFAULT: '#4F46E5',  // indigo-600
    dark: '#4338CA',     // indigo-700
    light: '#6366F1',    // indigo-500
    50: '#EEF2FF',
    100: '#E0E7FF',
  }
}
```

**PublicLayout.jsx changes:**
- `text-blue-600` → `text-indigo-600`
- `text-teal-700` → `text-indigo-700`
- `bg-teal-700` → `bg-indigo-600`
- `hover:bg-teal-800` → `hover:bg-indigo-700`

Do NOT use CSS custom properties — adds indirection for a static brand color alignment. The `extend.colors` static approach is correct here. Runtime per-tenant theming is out of scope for v1.2.

Do NOT mass-replace existing `indigo-600` classes — they are already correct. Fix only the 3-4 outlier locations in PublicLayout.

---

## Question 4: Deployment sequence

**Mandatory order: Schema → Backend (Lambda) → Frontend (EC2/nginx)**

**Step 1 — DB migration first (safest)**

Run `alembic upgrade head` against production RDS. The new `status` (server_default="new") and `notes` (nullable) columns are purely additive — the current Lambda code ignores them. No downtime risk.

**Step 2 — Backend (Lambda zip)**

1. Build new zip (updated model, new schemas/crud/api, updated main.py)
2. Upload to S3, update Lambda function code
3. Smoke test all four new endpoints via API Gateway custom domain before touching frontend

**Step 3 — Frontend (EC2/nginx static)**

1. `npm run build`
2. Rsync dist/ to EC2
3. Smoke test: lead capture form submits → 201, `/admin/leads` renders, palette consistency visible

**Why this order is mandatory:**
- Migration before Lambda: additive DDL is safe at any point; avoids any window where new code is live but columns are missing
- Lambda before frontend: if reversed, the `/admin/leads` page immediately 404s on API calls, visible to shelter admins
- Frontend last: file copy is fast and trivially reversible

---

## Complete File Change Map

### Backend

| File | Action |
|------|--------|
| `app/models/lead.py` | Modify — add `status`, `notes` fields |
| `app/schemas/lead.py` | Create — `LeadCreate`, `LeadResponse`, `LeadListItem`, `LeadDetail`, `LeadStatusUpdate` |
| `app/crud/leads.py` | Create — `create_lead`, `get_leads_by_tenant`, `get_lead_by_tenant`, `update_lead` |
| `app/api/v1/leads.py` | Create — public POST + admin GET list/detail/PATCH |
| `app/main.py` | Modify — register leads router |
| `alembic/versions/XXXX_add_lead_status_notes.py` | Create migration |

### Frontend

| File | Action |
|------|--------|
| `src/api/leads.js` | Create — `createLead`, `fetchLeads`, `fetchLead`, `patchLead` |
| `src/pages/public/MatchResults.jsx` | Modify — add LeadCaptureForm below results |
| `src/pages/public/MatchTest.jsx` | Modify — pass `responses` in navigate state |
| `src/pages/admin/Leads.jsx` | Create — list view with status filter + pagination |
| `src/pages/admin/LeadDetail.jsx` | Create — detail + status/notes editor + questionnaire label mapping |
| `src/App.jsx` | Modify — add `/admin/leads` and `/admin/leads/:id` routes |
| `src/layouts/AdminLayout.jsx` | Modify — add "Sol·licituds" nav item |
| `src/layouts/PublicLayout.jsx` | Modify — replace teal-700/blue-600 with indigo-600/700 |
| `tailwind.config.js` | Modify — update primary token to #4F46E5 |

---

## API Integration Map

| Frontend call | Backend endpoint | Auth |
|---------------|-----------------|------|
| `LeadCaptureForm` submit | `POST /api/v1/leads` | None (X-Tenant-Slug only) |
| `Leads.jsx` load | `GET /api/v1/admin/leads?skip=0&limit=20` | JWT Bearer |
| `LeadDetail.jsx` load | `GET /api/v1/admin/leads/{id}` | JWT Bearer |
| `LeadDetail` save | `PATCH /api/v1/admin/leads/{id}` | JWT Bearer |
| `Dashboard` lead count | `GET /api/v1/admin/leads?limit=1` → use `total` | JWT Bearer |

`api/leads.js` public functions: direct fetch with `X-Tenant-Slug` header (same pattern as `api/matching.js`).
Admin functions: `useApi()` hook (same pattern as `AnimalsManager`).

---

## Lead Detail: Questionnaire Label Mapping

The `respostes` column stores raw JSON keys (`{"housing_type": "apartment_small", ...}`). The detail page must render human-readable labels.

**Approach:** Call `GET /api/v1/matching/questionnaire` once on page load to get the questionnaire definition with option labels. Map by `question_id` and `option_value`. This reuses the existing endpoint — no new backend work.

```js
// LeadDetail.jsx
const { data: questionnaire } = useApi('/matching/questionnaire');

function renderAnswer(questionId, value) {
  const question = questionnaire?.find(q => q.id === questionId);
  const option = question?.options?.find(o => o.value === value);
  return option?.label ?? value; // fallback to raw value if not found
}
```

---

## Suggested Phase Build Order

1. **Backend schema + API** (migration + new endpoints + CRUD) — no frontend dependency
2. **Admin leads UI** (Leads.jsx + LeadDetail.jsx) — depends on backend
3. **Lead capture UX** (MatchResults.jsx + LeadCaptureForm + MatchTest.jsx fix) — depends on backend POST endpoint
4. **Palette normalization** — isolated, no dependency on leads; can run in parallel or separate PR

Each phase deploys: migration → Lambda zip → static build push.
