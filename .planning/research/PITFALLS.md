# Domain Pitfalls

**Domain:** Leads management + UI palette normalization for multi-tenant FastAPI/React SaaS on AWS
**Milestone:** v1.2 — Leads Management + UX Unification
**Researched:** 2026-04-15
**Confidence:** HIGH (architecture pitfalls from official sources + verified patterns); MEDIUM (UX conversion pitfalls from multiple practitioner sources)

---

## Critical Pitfalls

### Pitfall 1: Admin sees leads belonging to other tenants (cross-tenant lead leak)

**What goes wrong:**
The leads list or detail endpoint returns rows without filtering by the requesting admin's `tenant_id`. Because leads are created by unauthenticated adopters (POST to public endpoint), the `tenant_id` is stamped at creation time from the resolved host. If the admin query forgets that stamp, all tenants' leads are visible to any admin.

**Why it happens:**
- Public endpoint stores `tenant_id` from middleware; admin endpoint written later assumes "only own data exists."
- Dev environment uses a single tenant with seed data so the bug is invisible locally.
- FastAPI dependency injection makes it easy to inject `db` without injecting `current_tenant`; the missing argument silently omits the WHERE clause.

**Consequences:**
- GDPR-level data breach: contact info (email, phone, name) of adopters from shelter A visible to shelter B admin.
- Loss of all tenant trust, potentially terminal for the product.

**Prevention:**
- Enforce at the dependency layer. The `get_current_tenant` dependency must be required (not optional) on every admin route.
- Every `db.query(Lead)` must include `.filter(Lead.tenant_id == current_tenant.id)` without exception.
- Add a test that creates two tenants with leads and asserts that tenant A's admin cannot retrieve tenant B's leads.

**Phase to address:** Phase that implements leads list and lead detail API endpoints (before any UI work).

---

### Pitfall 2: Unauthenticated lead capture endpoint becomes a spam/injection vector

**What goes wrong:**
The public lead capture POST accepts adopter data with no rate limiting or abuse controls. A bot floods the DB with fake leads.

**Prevention:**
- Add server-side rate limiting per IP per tenant slug at API Gateway or FastAPI middleware.
- Validate the tenant resolved from host exists and is active before accepting lead data.
- Enforce `Content-Type: application/json`; reject form-encoded payloads.

**Phase to address:** Phase that adds lead capture POST endpoint, before production deploy.

---

### Pitfall 3: Lead status changes have no history — overwrites destroy audit trail

**What goes wrong:**
`PATCH /admin/leads/{id}` updates `status` in-place. After three changes, there is no record of when transitions happened or who made them.

**Prevention:**
- At minimum, add `status_updated_at` and `status_updated_by` columns from day one.
- Notes field should be stored per-event, not as a mutable field on the lead row.
- Preferred: `lead_events` table `(lead_id, tenant_id, from_status, to_status, changed_by_user_id, changed_at, note)`.

**Phase to address:** Phase that designs the Lead model schema. This is a schema decision — retroactive changes require data migration.

---

### Pitfall 4: Post-match lead capture form loses the adopter before they submit

**What goes wrong:**
The lead capture form appears as a blocking modal before results are shown. Adopter dismisses it and the lead is never captured. Conversion collapses.

**Prevention:**
- Show results first, unconditionally.
- Trigger the lead capture CTA inline below results after they render.
- Require only name + one contact method (email or phone) as mandatory.
- Do not gate the results page on form submission.

**Phase to address:** Phase that implements MatchResults page and lead capture UX.

---

### Pitfall 5: Tailwind palette normalization causes silent visual regressions in untouched components

**What goes wrong:**
Renaming or replacing a color token in `tailwind.config.js` breaks every component that referenced it, including components from earlier sprints not in scope. No staging environment means regressions go straight to production.

**Prevention:**
- Audit all token usages first: `grep -r "bg-primary\|text-primary\|border-primary" src/ --include="*.jsx"`
- Additive strategy: add new tokens alongside old, migrate all components, then remove old tokens — never rename in-place.
- Also scan for arbitrary hex values: `grep -r "\[#" src/ --include="*.jsx"`
- Palette changes must be an isolated PR — never bundled with feature work.
- Manual visual checklist after build: all public pages + all admin pages.

**Phase to address:** Isolated palette normalization phase, separate from leads feature phases.

---

## Moderate Pitfalls

### Pitfall 6: Backend/frontend deploy ordering causes 422/500 errors in production

**Prevention:**
- Deploy backend first (Lambda). New endpoints exist before frontend calls them.
- Never remove or rename an existing API field in the same deploy as the frontend change.
- Smoke-check new endpoints with `curl` before pushing frontend build.
- Keep previous `dist/` backup on EC2 for sub-2-minute rollback.

**Phase to address:** All phases that touch both backend and frontend.

---

### Pitfall 7: EC2 nginx serves stale cached frontend after deploy

**Prevention:**
```nginx
location = /index.html {
    add_header Cache-Control "no-store, no-cache, must-revalidate";
    expires 0;
}
```
- All hashed assets get `Cache-Control: public, max-age=31536000, immutable`.
- Post-deploy smoke check: open incognito, verify new features appear.

**Phase to address:** First phase that modifies EC2 nginx. One-time infra fix.

---

### Pitfall 8: Lead list API returns unbounded payload — Lambda 6 MB response limit hit

**What goes wrong:**
Full `respostes` and `puntuacions` JSON columns included in list response. 500+ leads → payload exceeds Lambda's 6 MB synchronous response limit via API Gateway → hard 413/502 error.

**Prevention:**
- Leads list endpoint returns summary fields only: `id`, `nom`, `email`, `tel`, `status`, `data_creacio`, top 3 `millors_match` names + scores.
- Full JSON returned only on detail endpoint.
- Hard server-side pagination cap of 50 leads per page.

**Phase to address:** Phase that implements the leads list API schema.

---

### Pitfall 9: Adopter submits lead capture form with no match context — orphaned lead

**What goes wrong:**
The lead capture POST has no match context. If the user reloads between seeing results and submitting, React state is gone and the shelter receives a lead with null `millors_match` and `puntuacions`.

**Prevention:**
- Frontend must pass `responses` + `top_matches` + `scores` in the lead capture POST body (serialized from React state passed via navigate).
- MatchTest.jsx must pass `responses` in navigate state alongside `results`.
- Backend stores all three atomically in a single DB write.

**Phase to address:** Phase that designs the lead capture API contract.

---

## Minor Pitfalls

### Pitfall 10: Arbitrary Tailwind color values survive palette normalization

**Prevention:** `grep -r "\[#" src/ --include="*.jsx"` — replace every hit with the new token.

### Pitfall 11: Lead notes field overwrites previous notes

**Prevention:** Append-only with timestamps, or per-event storage (see Pitfall 3).

### Pitfall 12: Admin lead detail page renders raw JSON questionnaire keys

**Prevention:** Frontend must map `{ housing_type: "apartment_small" }` → human-readable labels using the questionnaire definition. Never render raw JSON keys to users.

---

## Phase-Specific Warning Table

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Lead model schema | Missing audit trail (#3) | Add `status_updated_at`, `status_updated_by` from day one |
| Leads list API | Cross-tenant data leak (#1) | Require `current_tenant` dependency; add cross-tenant isolation test |
| Lead capture POST | Orphaned lead (#9) | Pass responses+matches+scores in body; atomic DB write |
| Public capture endpoint | Spam/abuse (#2) | Rate limiting before production deploy |
| Lead list response | Lambda 6 MB limit (#8) | Summary projection only; hard cap of 50 |
| MatchResults + capture UX | Form before results kills conversion (#4) | Results first, CTA after |
| Tailwind palette work | Visual regressions (#5) | Audit tokens; additive approach; isolated PR |
| EC2 nginx frontend | Stale index.html cache (#7) | Cache-Control: no-store on index.html |
| Combined backend+frontend deploy | API mismatch (#6) | Backend first; curl validation before frontend push |
| Lead detail UI | Raw JSON rendered (#12) | Label mapping before any demo |

---

## Deploy Sequence Checklist

1. **Schema migrations first** (Alembic) — additive-only. Verify with `alembic current`.
2. **Backend deploy second** (Lambda) — smoke-check new endpoints with `curl`.
3. **Frontend deploy last** (EC2 static) — only after backend smoke checks pass. Keep previous `dist/` backup.
4. **Post-deploy validation** (incognito browser) — full flow: questionnaire → results → capture → admin login → leads list → lead detail.
5. **Palette normalization** is a separate deployment cycle from leads feature work.

---

## Open Questions

- Redis availability in production? CLAUDE.md says "optional for MVP." If not running, the `match_token` approach needs a fallback DB temp row with TTL — or simpler: pass scores from React state in the POST body.
- Second shelter admin user model planned? If yes, `status_updated_by` becomes immediately meaningful.
- Existing leads schema has no `status` field — confirm whether intentional deferral before schema migration.
