# Stack Research

**Domain:** Leads management + UI palette normalization for multi-tenant FastAPI/React SaaS on AWS
**Milestone:** v1.2 — Leads Management + UX Unification
**Researched:** 2026-04-15
**Confidence:** HIGH — all findings from direct codebase inspection

---

## Key Finding: No new libraries required

All three features (leads management, lead capture form, palette normalization) are covered by the existing installed stack. The work is purely implementation: new files, one Alembic migration, and one config change.

---

## Existing Stack (validated, do not re-research)

**Backend**

| Package | Version | Role |
|---------|---------|------|
| `fastapi` | 0.109.0 | New leads endpoints |
| `sqlalchemy` | 2.0.25 | Lead CRUD queries |
| `alembic` | 1.13.1 | Migration: add `status` + `notes` to `leads` |
| `pydantic` | 2.5.3 | `LeadCreate`, `LeadRead`, `LeadUpdate` schemas |
| `python-jose` | 3.3.0 | Auth on protected admin endpoints |

**Frontend**

| Package | Version | Role |
|---------|---------|------|
| `react-hook-form` | 7.71.2 | Lead capture form (already installed) |
| `zod` | 4.3.6 | Form validation (already installed) |
| `@hookform/resolvers` | 5.2.2 | Zod-RHF bridge (already installed) |
| `tailwindcss` | 3.4.1 | `tailwind.config.js` color token update only |

---

## Current State Findings (from codebase inspection)

### Leads: nothing exists yet beyond the DB table

- The `leads` table was created in the initial migration (`53b90f4a258a_primera_revisio.py`) with: `id`, `tenant_id`, `nom`, `email`, `tel`, `respostes`, `millors_match`, `puntuacions`.
- **No `status` column. No `notes` column.** These must be added via Alembic migration.
- No `app/schemas/lead.py`, no `app/crud/leads.py`, no `app/api/v1/leads.py` — everything must be created.
- No frontend files for leads at all.

### Color tokens: `primary` is dead, indigo is the real brand

- `tailwind.config.js` defines `primary` as teal `#4A90A4` — but nothing in the codebase references `bg-primary` or `text-primary`.
- The app has converged on `indigo-600` as the actual brand color (Landing, AdminLayout, MatchTest, MatchResults all use it).
- Outliers are only in `PublicLayout.jsx`: apex header uses `blue-600`, tenant header and error state use `teal-700`/`teal-800`.
- Fix: remap `primary` in `tailwind.config.js` to the indigo family + fix 3-4 outlier classes in `PublicLayout.jsx`.

---

## Files to Create (backend)

| File | Purpose |
|------|---------|
| `app/schemas/lead.py` | `LeadCreate`, `LeadResponse`, `LeadListItem`, `LeadDetail`, `LeadStatusUpdate` |
| `app/crud/leads.py` | `create_lead`, `get_leads_by_tenant`, `get_lead_by_tenant`, `update_lead` |
| `app/api/v1/leads.py` | Public `POST /leads` + admin `GET /admin/leads`, `GET /admin/leads/{id}`, `PATCH /admin/leads/{id}` |
| `alembic/versions/XXXX_add_lead_status_notes.py` | Adds `status String(20) default='new'` and `notes Text nullable` |

## Files to Create (frontend)

| File | Purpose |
|------|---------|
| `src/api/leads.js` | `createLead`, `fetchLeads`, `fetchLead`, `patchLead` |
| `src/pages/admin/Leads.jsx` | Admin leads list view |
| `src/pages/admin/LeadDetail.jsx` | Admin lead detail + status/notes editor |
| `src/components/matching/LeadCaptureForm.jsx` | Post-match adopter contact form |

## Files to Modify

**Backend:**
- `app/models/lead.py` — add `status`, `notes` fields
- `app/main.py` — register leads router

**Frontend:**
- `tailwind.config.js` — remap `primary` to indigo family
- `src/pages/public/MatchResults.jsx` — embed `LeadCaptureForm` after results
- `src/pages/public/MatchTest.jsx` — pass `responses` in navigate state
- `src/App.jsx` — add `/admin/leads` and `/admin/leads/:id` routes
- `src/layouts/AdminLayout.jsx` — add "Sol·licituds" nav item
- `src/layouts/PublicLayout.jsx` — replace `blue-600`/`teal-700` with `indigo-600`/`indigo-700`

---

## Tailwind Config Change

```js
// tailwind.config.js — replace existing primary block
colors: {
  primary: {
    50:      '#eef2ff',
    100:     '#e0e7ff',
    DEFAULT: '#4f46e5',   // indigo-600 — main brand/CTA
    dark:    '#4338ca',   // indigo-700 — hover
    light:   '#6366f1',   // indigo-500 — lighter accents
  },
}
```

Existing `indigo-600` / `indigo-700` classes keep working. New components in this milestone use `bg-primary` / `hover:bg-primary-dark`. No bulk search-replace needed.

---

## Alternatives Rejected

| Category | Rejected | Why |
|----------|----------|-----|
| DB status type | PostgreSQL native ENUM | `ALTER TYPE ADD VALUE` non-transactional in PG; `String(20)` + Pydantic validation is equivalent and migration-safe |
| State management | React Query / SWR | Overkill for a single PATCH on a detail page |
| Color approach | CSS custom properties | Adds indirection; Tailwind config is the established pattern in this project |
| Component library | shadcn/ui | Would partially replace existing `src/components/ui/`; inconsistency risk |
| Tailwind upgrade | v4 | Breaking config changes; separate migration concern |

---

## Lead Capture Form API Pattern

The public lead capture endpoint must NOT use `useApi` (requires auth). It follows the raw `fetch` pattern established in `src/api/matching.js`:

```js
export async function createLead(tenantSlug, leadData) {
  const response = await fetch(`${API_URL}/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Slug': tenantSlug,
    },
    body: JSON.stringify(leadData),
  });
  if (!response.ok) throw new Error('Lead creation failed');
  return response.json();
}
```

Admin leads functions use `useApi()` hook (same pattern as AnimalsManager).

---

## Validation: Pydantic `model_validator` for contact requirement

```python
from pydantic import model_validator

class LeadCreate(BaseModel):
    nom: str
    email: Optional[str] = None
    tel: Optional[str] = None
    respostes: dict
    millors_match: list
    puntuacions: dict

    @model_validator(mode='after')
    def require_contact_medium(self):
        if not self.email and not self.tel:
            raise ValueError('At least one of email or tel is required')
        return self
```
