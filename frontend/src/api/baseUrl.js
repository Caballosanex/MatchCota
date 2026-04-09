const API_V1_PATH = '/api/v1';

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

export function getApiBaseUrl() {
  const rawValue = (import.meta.env.VITE_API_URL || API_V1_PATH).trim();
  const sanitized = trimTrailingSlash(rawValue);

  if (!sanitized) {
    return API_V1_PATH;
  }

  if (sanitized === '/api' || sanitized.endsWith('/api')) {
    return `${sanitized}/v1`;
  }

  if (sanitized.endsWith(API_V1_PATH)) {
    return sanitized;
  }

  return `${sanitized}${API_V1_PATH}`;
}
