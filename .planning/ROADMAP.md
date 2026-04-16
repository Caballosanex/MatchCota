# Roadmap: MatchCota AWS Production Deployment

## Milestones

- [x] **v1.0 MVP** - 7 phases, 25 plans, 59 tasks shipped on 2026-04-09. Archive: `.planning/milestones/v1.0-ROADMAP.md`
- [x] **v1.1 Reliability + UX Hardening** - 7 phases (07-13), 18 plans, 36 tasks shipped on 2026-04-12. Archive: `.planning/milestones/v1.1-ROADMAP.md`
- [ ] **v1.2 Product Features + UX Unification** - 4 phases (14-17), in progress.

---

## v1.2: Product Features + UX Unification

### Phases

- [x] **Phase 14: Leads Backend** - Schema migration + 4 API endpoints (public POST + admin GET/GET/PATCH) with cross-tenant isolation (completed 2026-04-15)
- [x] **Phase 15: Admin Leads Panel** - Shelter admin UI to list, filter, and inspect leads with human-readable questionnaire answers (completed 2026-04-16)
- [x] **Phase 16: Adopter Lead Capture** - Post-match contact capture form embedded below results with questionnaire context stored in lead record (completed 2026-04-16)
- [ ] **Phase 17: UI Palette Normalization** - Align all React apps to indigo-600 primary token; eliminate teal and blue outliers

### Phase Details

#### Phase 14: Leads Backend
**Goal**: Shelter admins and adopters can exchange lead data through a working API with complete tenant isolation
**Depends on**: Nothing (pure backend, no frontend dependency)
**Requirements**: LEAD-01, LEAD-02, LEAD-03
**Success Criteria** (what must be TRUE):
  1. A curl POST to `/api/v1/leads` with name + email (no auth token) creates a lead record in RDS and returns 201 with a lead ID
  2. A curl GET to `/api/v1/admin/leads` with a valid JWT returns only leads belonging to the authenticated tenant — leads from other tenants are never present in the response
  3. A curl GET to `/api/v1/admin/leads/{id}` returns full contact info, questionnaire JSON, and match scores for a lead belonging to the requester's tenant; returns 404 for a lead belonging to a different tenant
  4. The lead list endpoint returns summary fields only (name, contact, date, status) — questionnaire JSON and scores are absent from the list response, preventing Lambda 6 MB limit breach
  5. An isolation test (cross-tenant query) is written and passing in the test suite before Phase 15 begins
**Plans**: 3 plans

Plans:
- [x] 14-01-PLAN.md — Build leads data foundation (status migration + schemas + tenant-safe CRUD/service)
- [x] 14-02-PLAN.md — Implement and wire public/admin leads API endpoints
- [x] 14-03-PLAN.md — TDD verification for lead API contracts and cross-tenant isolation

#### Phase 15: Admin Leads Panel
**Goal**: Shelter admins can see who has shown interest in their animals and review full adopter profiles
**Depends on**: Phase 14
**Requirements**: ADMU-01, ADMU-02
**Success Criteria** (what must be TRUE):
  1. Logged-in admin navigates to the leads section and sees a table with name, contact info, date, and a status badge (New / Contacted / Adopted / Rejected) for each lead
  2. Admin filters the list by status and the table updates to show only matching leads without a full page reload
  3. Admin clicks a lead row and arrives at a detail page showing full contact info, all questionnaire answers with human-readable labels (not raw JSON keys), and compatibility scores for each matched animal
  4. The admin panel deploys as an EC2 static push and is accessible at `{slug}.matchcota.tech/admin/leads` in production
**Plans**: 2 plans
**UI hint**: yes

Plans:
- [x] 15-01-PLAN.md — Define leads data contracts (API helper + questionnaire label/group utility)
- [x] 15-02-PLAN.md — Implement admin leads list/detail UI, route/nav wiring, and production verification checkpoint

#### Phase 16: Adopter Lead Capture
**Goal**: Adopters who see their match results can leave contact info that is stored together with their questionnaire and scores
**Depends on**: Phase 14
**Requirements**: ADOP-01, ADOP-02, ADOP-03
**Success Criteria** (what must be TRUE):
  1. An adopter who completes the questionnaire always sees their match results first — the contact capture form is never shown before results render, and results are never gated on form submission
  2. The capture form appears inline below the results, requires name plus at least one of email or phone, and allows all other fields to be left blank
  3. After submitting the form the adopter sees a distinct confirmation screen acknowledging their interest
  4. The lead record stored in RDS contains the adopter's questionnaire responses and match scores — it is not a contact-only record missing match context
  5. `MatchTest.jsx` passes questionnaire responses in React navigate state so `MatchResults.jsx` can include them in the POST body
**Plans**: TBD
**UI hint**: yes

#### Phase 17: UI Palette Normalization
**Goal**: Every page of the platform — public and admin — uses a single consistent primary colour with no teal or blue outliers
**Depends on**: Nothing (isolated cosmetic change, no cross-phase dependency)
**Requirements**: PAL-01
**Success Criteria** (what must be TRUE):
  1. `tailwind.config.js` defines `primary` as the indigo family (`#4F46E5` DEFAULT, `#4338CA` dark, `#6366F1` light) and no other primary-like tokens remain
  2. A manual visual check of all public pages (`/`, `/animals`, `/test`, `/test/results`) and all admin pages (`/admin`, `/admin/animals`, `/admin/leads`, `/admin/settings`) shows no teal or blue-600 elements — all interactive elements and CTAs use the indigo token
  3. The palette change ships as an isolated PR from feature work; no leads or questionnaire functionality is affected by the diff
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [x] 17-01-PLAN.md — Remap Tailwind primary token to indigo and normalize shared UI primitive states
- [ ] 17-02-PLAN.md — Migrate public/auth/layout palette outliers with behavior-safe visual checkpoint
- [x] 17-03-PLAN.md — Sweep admin/animal component outliers and run full frontend palette regression gate

### Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 14. Leads Backend | 4/4 | Complete    | 2026-04-15 |
| 15. Admin Leads Panel | 2/2 | Complete    | 2026-04-16 |
| 16. Adopter Lead Capture | 2/2 | Complete    | 2026-04-16 |
| 17. UI Palette Normalization | 2/3 | In Progress|  |

---

## Coverage

**v1.2 requirements mapped:** 9/9

| Requirement | Phase |
|-------------|-------|
| LEAD-01 | Phase 14 |
| LEAD-02 | Phase 14 |
| LEAD-03 | Phase 14 |
| ADMU-01 | Phase 15 |
| ADMU-02 | Phase 15 |
| ADOP-01 | Phase 16 |
| ADOP-02 | Phase 16 |
| ADOP-03 | Phase 16 |
| PAL-01 | Phase 17 |
