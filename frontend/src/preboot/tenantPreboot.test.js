import { afterEach, describe, expect, it } from 'vitest';
import { readTenantPrebootContext } from './tenantPreboot';

const ORIGINAL_ENV = {
  VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
  VITE_BASE_DOMAIN: import.meta.env.VITE_BASE_DOMAIN,
};

function withRuntime({ hostname, search = '', environment = 'production', baseDomain = 'matchcota.tech', preboot = null }) {
  const windowValue = {
    location: {
      hostname,
      search,
    },
  };

  if (preboot) {
    windowValue.__MATCHCOTA_TENANT_PREBOOT__ = preboot;
  }

  Object.defineProperty(globalThis, 'window', {
    value: windowValue,
    configurable: true,
  });

  import.meta.env.VITE_ENVIRONMENT = environment;
  import.meta.env.VITE_BASE_DOMAIN = baseDomain;
}

afterEach(() => {
  import.meta.env.VITE_ENVIRONMENT = ORIGINAL_ENV.VITE_ENVIRONMENT;
  import.meta.env.VITE_BASE_DOMAIN = ORIGINAL_ENV.VITE_BASE_DOMAIN;
});

describe('tenant preboot contract', () => {
  it('returns normalized tenant context from edge payload', () => {
    withRuntime({
      hostname: 'demo.matchcota.tech',
      preboot: {
        host: 'demo.matchcota.tech',
        baseDomain: 'matchcota.tech',
        tenantSlug: 'Demo-Shelter',
        tenantName: 'Demo Shelter',
        status: 'resolved',
      },
    });

    expect(readTenantPrebootContext()).toMatchObject({
      source: 'edge',
      status: 'tenant-resolved',
      tenantHint: {
        slug: 'demo-shelter',
        name: 'Demo Shelter',
      },
      hostContext: {
        isTenantHost: true,
        tenantSlug: 'demo',
      },
    });
  });

  it('falls back deterministically for invalid hosts when payload is missing', () => {
    withRuntime({
      hostname: 'example.org',
      preboot: null,
    });

    expect(readTenantPrebootContext()).toMatchObject({
      source: 'fallback',
      status: 'invalid-host',
      tenantHint: null,
      hostContext: {
        invalidHost: true,
        isApexHost: false,
      },
    });
  });

  it('marks unresolved tenant hosts without coercing to apex', () => {
    withRuntime({
      hostname: 'unknown-shelter.matchcota.tech',
      preboot: {
        host: 'unknown-shelter.matchcota.tech',
        baseDomain: 'matchcota.tech',
        tenantSlug: 'unknown-shelter',
        status: 'unresolved',
      },
    });

    expect(readTenantPrebootContext()).toMatchObject({
      source: 'edge',
      status: 'tenant-unresolved',
      hostContext: {
        isApexHost: false,
        isTenantHost: true,
        tenantSlug: 'unknown-shelter',
      },
      tenantHint: {
        slug: 'unknown-shelter',
      },
    });
  });
});
