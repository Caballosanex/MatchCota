import { describe, expect, it } from 'vitest';
import {
  tenantSchema,
  buildTenantPayload,
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
});
