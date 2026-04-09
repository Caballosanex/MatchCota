import { afterEach, describe, expect, it } from 'vitest';
import {
  resolveHostContext,
  isApexTenantPathBlocked,
  isTenantRegistrationBlocked,
} from './hostRouting';

const ORIGINAL_ENV = {
  VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
  VITE_BASE_DOMAIN: import.meta.env.VITE_BASE_DOMAIN,
};

function withRuntime({ hostname, search = '', environment = 'production', baseDomain = 'matchcota.tech' }) {
  Object.defineProperty(globalThis, 'window', {
    value: {
      location: {
        hostname,
        search,
      },
    },
    configurable: true,
  });

  import.meta.env.VITE_ENVIRONMENT = environment;
  import.meta.env.VITE_BASE_DOMAIN = baseDomain;
}

afterEach(() => {
  import.meta.env.VITE_ENVIRONMENT = ORIGINAL_ENV.VITE_ENVIRONMENT;
  import.meta.env.VITE_BASE_DOMAIN = ORIGINAL_ENV.VITE_BASE_DOMAIN;
});

describe('hostRouting production host classification contract (D-01, D-02, D-06)', () => {
  it('D-01/D-02: classifies apex and tenant hosts for matchcota.tech runtime', () => {
    withRuntime({ hostname: 'matchcota.tech' });
    expect(resolveHostContext()).toMatchObject({
      isProduction: true,
      isApexHost: true,
      isTenantHost: false,
      tenantSlug: '',
      invalidHost: false,
    });

    withRuntime({ hostname: 'shelter1.matchcota.tech' });
    expect(resolveHostContext()).toMatchObject({
      isProduction: true,
      isApexHost: false,
      isTenantHost: true,
      tenantSlug: 'shelter1',
      invalidHost: false,
    });
  });

  it('D-06: invalid production hosts never classify as apex fallback for tenant paths', () => {
    withRuntime({ hostname: 'example.org' });

    expect(resolveHostContext()).toMatchObject({
      isApexHost: false,
      isTenantHost: false,
      invalidHost: true,
    });
  });

  it('D-06: unresolved tenant slug still classifies as tenant host (no silent apex fallback)', () => {
    withRuntime({ hostname: 'unknown-shelter.matchcota.tech' });

    expect(resolveHostContext()).toMatchObject({
      isApexHost: false,
      isTenantHost: true,
      tenantSlug: 'unknown-shelter',
      invalidHost: false,
    });
  });
});

describe('hostRouting route guards contract (D-04, D-05)', () => {
  it('D-05: apex blocklist protects tenant-only public paths', () => {
    const blockedCases = ['/home', '/animals', '/animals/123', '/test', '/test/results'];

    blockedCases.forEach((pathname) => {
      expect(isApexTenantPathBlocked(pathname)).toBe(true);
    });

    expect(isApexTenantPathBlocked('/')).toBe(false);
    expect(isApexTenantPathBlocked('/register-tenant')).toBe(false);
  });

  it('D-04: tenant host blocks register-tenant path only', () => {
    expect(isTenantRegistrationBlocked('/register-tenant')).toBe(true);
    expect(isTenantRegistrationBlocked('/register-tenant/')).toBe(true);

    expect(isTenantRegistrationBlocked('/')).toBe(false);
    expect(isTenantRegistrationBlocked('/home')).toBe(false);
    expect(isTenantRegistrationBlocked('/animals/123')).toBe(false);
  });
});
