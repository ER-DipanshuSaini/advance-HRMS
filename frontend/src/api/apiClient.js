import { clearSession, getToken } from '../session';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api/v1' : 'http://localhost:8000/api/v1');

export const apiClient = async (endpoint, { responseType, ...options } = {}) => {
  const token = getToken();
  const isLoginEndpoint = endpoint.includes('/auth/login/');
  
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...(token && !isLoginEndpoint && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle Token Expiry (but skip for login attempts themselves)
  if (response.status === 401 && !isLoginEndpoint) {
    clearSession();
    window.location.assign('/login');
    throw new Error('Your session expired. Sign in again.');
  }

  // Handle Errors
  if (!response.ok) {
    let errorMessage = 'An unexpected error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.error || Object.values(errorData)[0];
      if (Array.isArray(errorMessage)) errorMessage = errorMessage[0];
    } catch (e) {
      errorMessage = `Server Error (Status: ${response.status})`;
    }
    throw new Error(errorMessage);
  }

  // Handle No Content
  if (response.status === 204) return null;

  if (responseType === 'blob') return response.blob();

  // Return Data
  return await response.json();
};

export function resolveMediaUrl(path) {
  if (!path) return '';
  try {
    const base = new URL(BASE_URL, window.location.origin);
    const url = new URL(path, base.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}