import { resolveHostContext } from '../routing/hostRouting';

const PREBOOT_GLOBAL_KEY = '__MATCHCOTA_TENANT_PREBOOT__';
const ALLOWED_SLUG_PATTERN = /^[a-z0-9-]+$/;

function normalizeString(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizeSlug(value) {
  const slug = normalizeString(value).toLowerCase();
  if (!slug || !ALLOWED_SLUG_PATTERN.test(slug)) {
    return '';
  }

  return slug;
}

function toTenantHint(slug, name) {
  if (!slug) {
    return null;
  }

  return {
    slug,
    name: normalizeString(name),
  };
}

export function buildTenantContextFallback(hostContext) {
  if (hostContext.invalidHost) {
    return {
      source: 'fallback',
      status: 'invalid-host',
      hostContext,
      tenantHint: null,
    };
  }

  if (hostContext.isApexHost) {
    return {
      source: 'fallback',
      status: 'apex-host',
      hostContext,
      tenantHint: null,
    };
  }

  if (hostContext.isTenantHost) {
    return {
      source: 'fallback',
      status: 'tenant-unresolved',
      hostContext,
      tenantHint: toTenantHint(hostContext.tenantSlug, ''),
    };
  }

  return {
    source: 'fallback',
    status: 'tenant-unresolved',
    hostContext,
    tenantHint: null,
  };
}

export function readTenantPrebootContext() {
  const hostContext = resolveHostContext();
  const fallback = buildTenantContextFallback(hostContext);
  const payload = window?.[PREBOOT_GLOBAL_KEY];

  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const payloadHost = normalizeString(payload.host).toLowerCase();
  const payloadBaseDomain = normalizeString(payload.baseDomain).toLowerCase();

  if (payloadHost && payloadHost !== hostContext.hostname) {
    return fallback;
  }

  if (payloadBaseDomain && payloadBaseDomain !== hostContext.baseDomain) {
    return fallback;
  }

  const payloadSlug = normalizeSlug(payload.tenantSlug);
  const payloadStatus = normalizeString(payload.status).toLowerCase();

  if (payloadStatus === 'invalid') {
    return {
      source: 'edge',
      status: 'invalid-host',
      hostContext,
      tenantHint: null,
    };
  }

  if (payloadStatus === 'apex') {
    return {
      source: 'edge',
      status: 'apex-host',
      hostContext,
      tenantHint: null,
    };
  }

  if (payloadStatus === 'resolved') {
    if (!payloadSlug) {
      return fallback;
    }

    return {
      source: 'edge',
      status: 'tenant-resolved',
      hostContext,
      tenantHint: toTenantHint(payloadSlug, payload.tenantName),
    };
  }

  if (payloadStatus === 'unresolved') {
    return {
      source: 'edge',
      status: 'tenant-unresolved',
      hostContext,
      tenantHint: toTenantHint(payloadSlug || hostContext.tenantSlug, payload.tenantName),
    };
  }

  return fallback;
}
