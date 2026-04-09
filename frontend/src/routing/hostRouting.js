const DEFAULT_ENVIRONMENT = 'development';
const DEFAULT_BASE_DOMAIN = 'matchcota.tech';
const ALLOWED_SUBDOMAIN_PATTERN = /^[a-z0-9-]+$/;

export const TENANT_PUBLIC_PATHS = [
  '/home',
  '/animals',
  '/animals/',
  '/test',
  '/test/results',
];

export function normalizeHostname(hostname) {
  return (hostname || '').toLowerCase().trim();
}

export function normalizePath(pathname) {
  if (!pathname) return '/';
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function getRuntimeEnvironment() {
  return (import.meta.env.VITE_ENVIRONMENT || DEFAULT_ENVIRONMENT).toLowerCase();
}

export function getBaseDomain() {
  return normalizeHostname(import.meta.env.VITE_BASE_DOMAIN || DEFAULT_BASE_DOMAIN);
}

function getTenantSlugFromProductionHost(hostname, baseDomain) {
  if (!hostname || !baseDomain) {
    return { tenantSlug: '', invalidHost: true };
  }

  if (hostname === baseDomain) {
    return { tenantSlug: '', invalidHost: false };
  }

  const suffix = `.${baseDomain}`;
  if (!hostname.endsWith(suffix)) {
    return { tenantSlug: '', invalidHost: true };
  }

  const tenantSlug = hostname.slice(0, -suffix.length);
  if (!tenantSlug || tenantSlug.includes('.') || !ALLOWED_SUBDOMAIN_PATTERN.test(tenantSlug)) {
    return { tenantSlug: '', invalidHost: true };
  }

  return { tenantSlug, invalidHost: false };
}

function getTenantSlugFromNonProductionHost(hostname, search) {
  const searchParams = new URLSearchParams(search || '');
  const tenantParam = normalizeHostname(searchParams.get('tenant') || '');

  if (tenantParam && ALLOWED_SUBDOMAIN_PATTERN.test(tenantParam)) {
    return tenantParam;
  }

  const hostParts = normalizeHostname(hostname).split('.').filter(Boolean);
  const candidate = hostParts.length > 2 ? hostParts[0] : '';

  if (candidate && ALLOWED_SUBDOMAIN_PATTERN.test(candidate)) {
    return candidate;
  }

  return '';
}

export function resolveHostContext() {
  const hostname = normalizeHostname(window.location.hostname);
  const search = window.location.search;
  const environment = getRuntimeEnvironment();
  const isProduction = environment === 'production';

  if (isProduction) {
    const baseDomain = getBaseDomain();
    const { tenantSlug, invalidHost } = getTenantSlugFromProductionHost(hostname, baseDomain);

    return {
      hostname,
      baseDomain,
      isProduction,
      isApexHost: hostname === baseDomain,
      isTenantHost: Boolean(tenantSlug),
      tenantSlug,
      invalidHost,
    };
  }

  const tenantSlug = getTenantSlugFromNonProductionHost(hostname, search);

  return {
    hostname,
    baseDomain: getBaseDomain(),
    isProduction,
    isApexHost: false,
    isTenantHost: Boolean(tenantSlug),
    tenantSlug,
    invalidHost: false,
  };
}

export function isApexTenantPathBlocked(pathname) {
  const normalizedPath = normalizePath(pathname);

  return TENANT_PUBLIC_PATHS.some((path) => {
    if (path.endsWith('/')) {
      return normalizedPath.startsWith(path.slice(0, -1));
    }

    return normalizedPath === path;
  });
}

export function isTenantRegistrationBlocked(pathname) {
  return normalizePath(pathname) === '/register-tenant';
}
