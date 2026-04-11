const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient = async (endpoint, options = {}) => {
  const token = localStorage.getItem('hireflow_token');
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
    localStorage.removeItem('hireflow_auth');
    localStorage.removeItem('hireflow_token');
    localStorage.removeItem('hireflow_user');
    window.location.href = '/login';
    return null;
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

  // Return Data
  return await response.json();
};
