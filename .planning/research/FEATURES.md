# Feature Research

**Domain:** Leads management + adopter UX for multi-tenant animal shelter SaaS
**Milestone:** v1.2 — Leads Management + UX Unification
**Researched:** 2026-04-15
**Confidence:** HIGH (codebase inspection); MEDIUM (UX conversion patterns from multiple practitioner sources)

---

## Table Stakes — Leads Admin Panel

| Feature | Complexity | Key Dependency |
|---------|------------|----------------|
| Paginated lead list (name, contact, date, status badge) | LOW | New: `status` field + admin API endpoints |
| Status workflow: New / Contacted / Adopted / Rejected | LOW | New: `status` column + `PATCH` endpoint |
| Free-text notes per lead | LOW | New: `notes` column + `PATCH` endpoint |
| Lead detail: questionnaire answers + scores + matches | MEDIUM | Data in DB JSON fields; new: human-readable label mapping |
| Filter by status | LOW | Query param on admin list endpoint |
| Sort by date desc (default) | LOW | `ORDER BY data_creacio DESC` |
| All queries filter by `tenant_id` | LOW | Follow existing animals CRUD pattern exactly |

**Not table stakes (defer):**
- Bulk actions (export, delete) — v2
- Full-text search on leads — v2
- Email notifications to admin — SES blocked in AWS Academy

---

## Table Stakes — Post-Match Lead Capture

| Feature | Complexity | Key Dependency |
|---------|------------|----------------|
| Show results first, capture form at bottom of page | LOW | Ordering/layout change in `MatchResults.jsx` |
| Name required + email OR phone required, rest optional | LOW | New `POST /api/v1/leads` endpoint + frontend form |
| Confirmation screen after submission | LOW | New success state in `LeadCaptureForm` component |
| Store questionnaire responses + top matches with lead | LOW | Pass pre-computed data from frontend to POST body |
| Frame CTA as interest, not data collection | LOW | Copy: "Vols que et contactem sobre aquests animals?" |

**Conversion research findings:**
- Results-first then soft CTA converts at ~40% opt-in
- Gating results behind email wall before showing results drops conversion to ~5%
- Each additional required field loses ~4% conversion — keep required fields to minimum

**Anti-features (explicitly exclude):**
- Email-before-results gate — kills conversion
- Multi-step lead capture wizard — unnecessary complexity
- Redirecting away from results to submit form — breaks the "reward then ask" pattern

---

## Table Stakes — Match Results UX

| Feature | Complexity | Key Dependency |
|---------|------------|----------------|
| Large colour-coded score badge (green ≥75, amber 50–74, orange <50) | LOW | Visual change to existing `getScoreColor()` helper |
| Explanations as distinct visual section (not buried in small text) | LOW | `match.explanations` array already generated |
| Stronger #1 match hero/featured treatment | LOW | Visual layout change |
| "M'interessa" CTA per card → scrolls to capture form | LOW | New button + scroll anchor to capture form |

---

## Table Stakes — UI Palette Normalization

| Feature | Complexity | Key Dependency |
|---------|------------|----------------|
| Update `tailwind.config.js` `primary` token to indigo family | LOW | Config change only |
| Fix 3-4 outlier classes in `PublicLayout.jsx` (blue-600, teal-700/800) | LOW | 3-4 line changes |

**Current state:** App has converged on `indigo-600` as the actual brand color (Landing, AdminLayout, MatchTest, MatchResults all use it). The `primary` token in `tailwind.config.js` defines an unused teal `#4A90A4`. No component uses `bg-primary` today. Fix: remap `primary` to the indigo family so future components can use `bg-primary`.

**Strategy:** Additive — add correct `primary` tokens, fix the 3-4 teal/blue outliers in PublicLayout. Do NOT mass-replace existing `indigo-*` classes (they are already correct and working).

---

## Differentiators (Phase 2, after table stakes ship)

- Top-matched animal name inline in lead list row — LOW complexity, data already stored in `millors_match` JSON
- Human-readable questionnaire answers in detail view — MEDIUM complexity, needs question ID→label mapping utility

---

## Out of Scope for v1.2

| Feature | Reason |
|---------|--------|
| Email notifications (new lead, welcome email) | SES unavailable in AWS Academy |
| Admin-configurable questionnaire weights | High complexity, not requested |
| Lead export (CSV, PDF) | v2 scope |
| Analytics / metrics dashboard | v2 scope |
| Mobile app | v2 scope |
| Multi-language | v2 scope |

---

## Roadmap Implications

Suggested phase order — each phase is independently deployable (migration → Lambda → static):

1. **Backend: Lead schema + API** — migration, CRUD layer, 4 endpoints. Pure backend. Unblocks all other phases.
2. **Frontend: Match results UX + lead capture** — improve results presentation, add capture form, wire to `POST /leads`. Depends on Phase 1.
3. **Frontend: Admin leads panel** — list + detail + status/notes editor. Depends on Phase 1.
4. **Frontend: UI palette normalization** — isolated, no dependency on leads phases. Can run before or after.

Phase 4 (palette) is recommended as a separate deploy to allow clean rollback if visual regressions appear.
