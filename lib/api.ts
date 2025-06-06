export const API_BASE = process.env.NODE_ENV === 'development' ? '' : 'http://backend:8000';

export function apiFetch(path: string, options?: RequestInit) {
  return fetch(`${API_BASE}${path}`, options);
}
