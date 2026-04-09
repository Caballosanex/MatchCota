import { describe, expect, it } from 'vitest';
import {
  tenantSchema,
  buildTenantPayload,
  buildTenantRootUrl,
  buildRedirectFallback,
  buildRedirectMessage,
} from './RegisterTenant';

describe('RegisterTenant validation contract', () => {
  it('blocks submit when admin_password has fewer than 8 characters', () => {
    const result = tenantSchema.safeParse({
      name: 'Shelter Name',
      slug: 'shelter-name',
      email: 'admin@shelter.org',
      admin_password: 'short',
      confirm_password: 'short',
    });

    expect(result.success).toBe(false);
  });

  it('blocks submit when confirm password differs', () => {
    const result = tenantSchema.safeParse({
      name: 'Shelter Name',
      slug: 'shelter-name',
      email: 'admin@shelter.org',
      admin_password: 'password-123',
      confirm_password: 'password-124',
    });

    expect(result.success).toBe(false);
  });

  it('builds tenant payload with admin_password contract key', () => {
    const payload = buildTenantPayload({
      name: 'Shelter Name',
      slug: 'shelter-name',
      email: 'admin@shelter.org',
      cif: '',
      phone: '',
      city: '',
      website: '',
      admin_password: 'password-123',
      confirm_password: 'password-123',
    });

    expect(payload).toHaveProperty('admin_password', 'password-123');
  });

  it('builds root redirect URL for successful registration (never /login)', () => {
    const url = buildTenantRootUrl('my-shelter');

    expect(url).toBe('https://my-shelter.matchcota.tech/');
    expect(url).not.toContain('/login');
  });

  it('builds fallback state with root URL and uses same URL for retry/open-link contract', () => {
    const fallback = buildRedirectFallback('new-shelter', 'admin@new-shelter.org');

    expect(fallback).toEqual({
      destinationUrl: 'https://new-shelter.matchcota.tech/',
      registrationEmail: 'admin@new-shelter.org',
    });
    expect(fallback.destinationUrl).not.toContain('/login');
  });

  it('returns public-first handoff messaging referencing tenant root destination', () => {
    const copy = buildRedirectMessage({
      destinationUrl: 'https://new-shelter.matchcota.tech/',
      registrationEmail: 'admin@new-shelter.org',
    });

    expect(copy).toContain('tenant root');
    expect(copy).toContain('https://new-shelter.matchcota.tech/');
    expect(copy).not.toContain('login');
  });
});
