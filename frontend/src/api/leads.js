export const LEAD_STATUS_FILTERS = ['all', 'new', 'contacted', 'adopted', 'rejected'];

const ALLOWED_STATUSES = new Set(LEAD_STATUS_FILTERS);

export function buildLeadsListEndpoint(status = 'all') {
  if (!ALLOWED_STATUSES.has(status)) {
    throw new Error(`Invalid lead status: ${status}`);
  }

  if (status === 'all') {
    return '/admin/leads';
  }

  return `/admin/leads?status=${status}`;
}

export function getAdminLeads(api, { status = 'all' } = {}) {
  return api.get(buildLeadsListEndpoint(status));
}

export function getAdminLeadById(api, leadId) {
  return api.get(`/admin/leads/${leadId}`);
}
