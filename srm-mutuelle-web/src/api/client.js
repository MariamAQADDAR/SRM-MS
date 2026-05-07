const defaultBase = 'http://localhost:8080';

export function getApiBaseUrl() {
  const v = import.meta.env.VITE_API_BASE_URL;
  if (v != null && String(v).trim() !== '') {
    return String(v).replace(/\/$/, '');
  }
  return defaultBase;
}

function getStoredAuth() {
  const raw = sessionStorage.getItem('mutuelle_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Appel API authentifié. Sur 401 avec session existante, déconnexion et redirection login.
 */
export async function apiFetch(path, options = {}) {
  const auth = getStoredAuth();
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }
  const body = options.body;
  if (body != null && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
    headers['Content-Type'] = 'application/json';
    options = { ...options, body: JSON.stringify(body), headers };
  } else {
    options = { ...options, headers };
  }
  const res = await fetch(`${getApiBaseUrl()}${path}`, options);
  if (res.status === 401) {
    const hadSession = !!auth?.token;
    const isLoginPost = path === '/api/auth/login' && (options.method || 'GET').toUpperCase() === 'POST';
    if (hadSession && !isLoginPost) {
      sessionStorage.removeItem('mutuelle_user');
      window.location.href = '/';
    }
    if (isLoginPost && !hadSession) {
      return res;
    }
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  return res;
}

export async function parseJsonOrThrow(res) {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    const msg = data.message || data.error || res.statusText || 'Erreur';
    const e = new Error(msg);
    e.status = res.status;
    throw e;
  }
  return data;
}

export async function apiLogin(email, password) {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: { email: email.trim(), password },
  });
  return parseJsonOrThrow(res);
}

export async function apiMe() {
  const res = await apiFetch('/api/auth/me');
  return parseJsonOrThrow(res);
}

export async function apiChangePassword(currentPassword, newPassword) {
  const res = await apiFetch('/api/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });
  if (res.ok) return null;
  return parseJsonOrThrow(res);
}
