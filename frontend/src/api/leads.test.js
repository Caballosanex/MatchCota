import { describe, expect, it } from 'vitest';
import {
  LEAD_STATUS_FILTERS,
  buildLeadsListEndpoint,
  getAdminLeads,
  getAdminLeadById,
} from './leads';

describe('leads API helpers', () => {
  it('exposes locked status filter values', () => {
    expect(LEAD_STATUS_FILTERS).toEqual(['all', 'new', 'contacted', 'adopted', 'rejected']);
  });

  it('returns base endpoint for all status', () => {
    expect(buildLeadsListEndpoint('all')).toBe('/admin/leads');
  });

  it('returns filtered endpoint for accepted statuses', () => {
    expect(buildLeadsListEndpoint('new')).toBe('/admin/leads?status=new');
    expect(buildLeadsListEndpoint('contacted')).toBe('/admin/leads?status=contacted');
    expect(buildLeadsListEndpoint('adopted')).toBe('/admin/leads?status=adopted');
    expect(buildLeadsListEndpoint('rejected')).toBe('/admin/leads?status=rejected');
  });

  it('throws when status is invalid', () => {
    expect(() => buildLeadsListEndpoint('pending')).toThrow('Invalid lead status');
  });

  it('uses injected api instance for lead list', async () => {
    const api = {
      get: async (endpoint) => ({ endpoint }),
    };

    await expect(getAdminLeads(api, { status: 'all' })).resolves.toEqual({ endpoint: '/admin/leads' });
    await expect(getAdminLeads(api, { status: 'new' })).resolves.toEqual({ endpoint: '/admin/leads?status=new' });
  });

  it('uses injected api instance for lead detail', async () => {
    const api = {
      get: async (endpoint) => ({ endpoint }),
    };

    await expect(getAdminLeadById(api, 'abc-123')).resolves.toEqual({ endpoint: '/admin/leads/abc-123' });
  });
});
