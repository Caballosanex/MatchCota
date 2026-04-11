# Requirements: MatchCota AWS Production Deployment

**Milestone:** v1.1 Reliability + UX Hardening
**Defined:** 2026-04-10
**Coverage:** 2 / 10 validated (8 pending)
**Core Value:** A new shelter can register at `matchcota.tech`, instantly get `{slug}.matchcota.tech`, and log in with the password they created, fully over HTTPS.

## v1.1 Requirements

### UX Hardening

- [x] **UX-01**: Visitor sees tenant name and tenant-themed public shell only after server-injected tenant context is available, with no visible flash of incorrect tenant/default branding.
- [x] **UX-02**: Registrant lands on `https://{slug}.matchcota.tech/` after successful signup with a deterministic fallback path when tenant context preboot fails.

### Infrastructure Reproducibility and Recovery

- [x] **INFRA-13**: Operator can provision frontend EC2, Elastic IP association, and nginx runtime configuration entirely from Terraform without manual host bootstrapping.
- [x] **INFRA-14**: Operator can initialize and use Terraform remote state backend with locking so interrupted applies can be resumed safely after AWS Academy credential expiry.
- [x] **INFRA-15**: Operator can rebuild frontend delivery infrastructure from a clean account state using documented, repeatable Terraform sequence and produce equivalent routing outcomes.

### Secrets and Security Baseline

- [x] **SECU-06**: Operator can migrate runtime secrets from local/env-file coupling to AWS SSM Parameter Store references with least-privilege use of `LabRole` and `LabInstanceProfile` only.
- [x] **SECU-07**: Deployment preserves AWS Academy and budget constraints by avoiding CloudFront, CloudWatch, SES assumptions, NAT Gateway, and Multi-AZ RDS while keeping wildcard DNS onboarding intact.

### Carry-Forward Reliability and Onboarding Debt

- [ ] **ONBD-07**: Tenant onboarding flow remains atomic from registration through first admin login and produces actionable diagnostics when onboarding preconditions are not met.
- [ ] **ONBD-08**: Tenant isolation controls remain enforced across onboarding and auth paths, including denial of cross-tenant access attempts (`SECU-05` carry-forward intent).
- [ ] **INFRA-16**: API and frontend edge routing contracts remain aligned (`api.matchcota.tech`, `matchcota.tech`, `*.matchcota.tech`) after DR-focused infrastructure codification.

## Future Requirements (Deferred)

- **ONB2-01**: Operator can view onboarding readiness SLA metrics.
- **ONB2-02**: Operator can toggle moderated onboarding mode.
- **ONB2-03**: Operator can run one-command automated verification suite artifact export.
- **PLAT-01**: Team can introduce full CI/CD automation with rollback.
- **PLAT-02**: Team can adopt expanded observability stack when account restrictions lift.

## Out of Scope (This Milestone)

- Frontend visual redesign unrelated to tenant-context preboot stability.
- Feature expansion outside deployment reliability and onboarding hardening.
- Custom IAM role strategy (blocked by AWS Academy policy).
- Any architecture that replaces wildcard DNS onboarding model.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UX-01 | Phase 11 | Complete |
| UX-02 | Phase 11 | Complete |
| INFRA-13 | Phase 8 | Complete |
| INFRA-15 | Phase 8 | Complete |
| INFRA-14 | Phase 12 | Complete |
| SECU-06 | Phase 12 | Complete |
| SECU-07 | Phase 12 | Complete |
| ONBD-07 | Phase 13 | Pending |
| ONBD-08 | Phase 13 | Pending |
| INFRA-16 | Phase 13 | Pending |
