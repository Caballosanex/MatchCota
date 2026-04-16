# Requirements: MatchCota v1.2

**Defined:** 2026-04-15
**Core Value:** A new shelter can register at `matchcota.tech`, instantly get `{slug}.matchcota.tech`, and log in with the password they created, fully over HTTPS.

---

## v1.2 Requirements

### Leads — Backend

- [x] **LEAD-01**: Adopter can submit name + one contact medium (email or phone) with match scores and questionnaire responses via an unauthenticated POST endpoint
- [x] **LEAD-02**: Admin can retrieve paginated leads list for their tenant with summary fields (name, contact info, date, status), filterable by status
- [x] **LEAD-03**: Admin can retrieve full lead detail (contact info, questionnaire answers, match scores) for a specific lead

### Leads — Admin UI

- [x] **ADMU-01**: Admin can view leads list with name, contact info, date, and status badge, filterable by status
- [x] **ADMU-02**: Admin can view full lead detail with human-readable questionnaire answers and compatibility scores

### Adopter Flow

- [ ] **ADOP-01**: Adopter sees lead capture form inline below match results (never before results) with name + one contact medium required and all other fields optional
- [ ] **ADOP-02**: Adopter receives a confirmation screen after submitting contact info
- [ ] **ADOP-03**: Questionnaire responses are included in the stored lead record (not an orphaned contact-only entry)

### UI Palette

- [x] **PAL-01**: All React apps use a consistent primary colour token (indigo-600 family); no teal or blue outliers remain in any public-facing or admin layout

---

## v2 Requirements (deferred)

### Leads — Status Workflow

- **LEAD-04**: Admin can update a lead's status (New / Contacted / Adopted / Rejected) with a note
- **LEAD-05**: Lead status change history is preserved with timestamp and author (audit trail)

### Leads — Admin UX

- **ADMU-03**: Admin sidebar nav item links to leads section
- **ADMU-04**: Admin can filter leads by animal matched or date range
- **ADMU-05**: Admin can search leads by name or email

### Adopter UX

- **ADOP-04**: Match result cards show colour-coded score badges (green ≥75, amber 50–74, orange <50)
- **ADOP-05**: Match results show natural-language score explanations as a distinct visual section
- **ADOP-06**: Each animal match card has an "M'interessa" CTA that scrolls to the capture form

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Email notifications (new lead, welcome email) | SES unavailable in AWS Academy |
| Lead export (CSV, PDF) | v2+ scope |
| Analytics / admin dashboard metrics | v2+ scope |
| Admin-configurable questionnaire weights | High complexity, not requested |
| Machine learning / advanced matching | Explicitly excluded in project spec |
| Mobile app | v2+ scope |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LEAD-01 | Phase 14 | Complete |
| LEAD-02 | Phase 14 | Complete |
| LEAD-03 | Phase 14 | Complete |
| ADMU-01 | Phase 15 | Complete |
| ADMU-02 | Phase 15 | Complete |
| ADOP-01 | Phase 16 | Pending |
| ADOP-02 | Phase 16 | Pending |
| ADOP-03 | Phase 16 | Pending |
| PAL-01 | Phase 17 | Complete |

**Coverage:**
- v1.2 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0 ✓

---

*Requirements defined: 2026-04-15*
*Last updated: 2026-04-15 — traceability confirmed after roadmap creation*
