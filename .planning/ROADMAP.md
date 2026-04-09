# Roadmap: MatchCota AWS Production Deployment

## Milestones

- [x] **v1.0 MVP** - 7 phases, 25 plans, 59 tasks shipped on 2026-04-09. Archive: `.planning/milestones/v1.0-ROADMAP.md`

## Next Step

Run `/gsd-new-milestone` to define next-milestone requirements and a new active roadmap.

### Phase 1: Fix tenant subdomain frontend routing after registration

**Goal:** Ensure apex and tenant subdomain hosts route to the correct public experience, with post-registration handoff landing on tenant root over HTTPS.
**Requirements**: TBD
**Depends on:** Phase 0
**Plans:** 6 plans

Plans:
- [x] 01-01-PLAN.md — Add host-aware route guards and tenant-specific public shell behavior
- [x] 01-02-PLAN.md — Update registration success handoff to tenant root with tested fallback
- [x] 01-03-PLAN.md — Wire host routing into TenantContext and PublicLayout
- [x] 01-04-PLAN.md — Add deploy/readiness frontend contract assertions
- [x] 01-05-PLAN.md — Align UAT artifacts to tenant-root handoff contract
- [ ] 01-06-PLAN.md — Gap closure: rebuild and redeploy frontend to close 3 UAT failures
