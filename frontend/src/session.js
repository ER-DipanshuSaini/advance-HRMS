const keys = { user: 'hireflow_user', token: 'hireflow_token', auth: 'hireflow_auth' };

export function readUser() {
  try {
    return JSON.parse(localStorage.getItem(keys.user)) || null;
  } catch {
    return null;
  }
}

export const getToken = () => localStorage.getItem(keys.token);
export const hasPermission = (user, code) => Boolean(
  user && (!code || user.is_superuser || user.permissions?.includes(code))
);
export const displayName = user =>
  [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Guest';

export function saveSession({ user, access_token: token }) {
  localStorage.setItem(keys.user, JSON.stringify(user));
  localStorage.setItem(keys.token, token);
  localStorage.setItem(keys.auth, 'true');
}

export function clearSession() {
  Object.values(keys).forEach(key => localStorage.removeItem(key));
}
