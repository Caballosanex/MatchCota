import { getApiBaseUrl } from './baseUrl';

const API_URL = getApiBaseUrl();

export async function submitPublicLead(tenantSlug, payload) {
  const headers = { 'Content-Type': 'application/json' };

  if (tenantSlug) {
    headers['X-Tenant-Slug'] = tenantSlug;
  }

  const response = await fetch(`${API_URL}/leads`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Error en enviar l'interes");
  }

  return response.json();
}
