import { describe, expect, it } from 'vitest';
import { normalizeTenantCreateResponse } from './tenants';
import { buildRegistrationOutcomeState } from '../pages/public/RegisterTenant';

describe('tenant onboarding contract parsing', () => {
  it('keeps onboarding handoff/support fields in normalized create response', () => {
    const normalized = normalizeTenantCreateResponse({
      id: 'tenant-1',
      slug: 'new-shelter',
      handoff_status: 'partial',
      support_code: 'CONTEXT-001',
      user_message_key: 'ONBOARDING_HANDOFF_UNRESOLVED',
      fallback_actions: ['retry_checks', 'copy_url'],
      checks: {
        preboot: 'ready',
        current: 'unresolved',
        login: 'ready',
      },
    });

    expect(normalized).toMatchObject({
      handoffStatus: 'partial',
      supportCode: 'CONTEXT-001',
      userMessageKey: 'ONBOARDING_HANDOFF_UNRESOLVED',
      fallbackActions: ['retry_checks', 'copy_url'],
      checks: {
        preboot: 'ready',
        current: 'unresolved',
        login: 'ready',
      },
    });
  });

  it('produces deterministic fallback object for legacy tenant-only payload', () => {
    const normalized = normalizeTenantCreateResponse({
      id: 'tenant-2',
      slug: 'legacy-shelter',
    });

    expect(normalized).toMatchObject({
      handoffStatus: 'ready',
      supportCode: 'CREATE-READY',
      userMessageKey: 'ONBOARDING_READY',
      fallbackActions: ['retry_checks', 'open_tenant_root', 'copy_url'],
      checks: {
        preboot: 'ready',
        current: 'ready',
        login: 'ready',
      },
    });
  });

  it('provides support-code-capable object for register tenant UI', () => {
    const uiState = buildRegistrationOutcomeState({
      handoffStatus: 'unresolved',
      supportCode: 'LOGIN-UNRESOLVED',
      userMessageKey: 'ONBOARDING_HANDOFF_UNRESOLVED',
      fallbackActions: ['retry_checks', 'open_tenant_root', 'copy_url'],
      destinationUrl: 'https://new-shelter.matchcota.tech/',
      registrationEmail: 'admin@new-shelter.org',
    });

    expect(uiState).toMatchObject({
      handoffStatus: 'unresolved',
      supportCode: 'LOGIN-UNRESOLVED',
      fallbackActions: ['retry_checks', 'open_tenant_root', 'copy_url'],
      destinationUrl: 'https://new-shelter.matchcota.tech/',
    });
  });
});
