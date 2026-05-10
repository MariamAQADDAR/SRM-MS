/** Doit rester aligné avec SERVER_PORT du backend (.env : souvent 8082 si 8081 est pris par Expo/Metro). */
const defaultBase = 'http://localhost:8082';

/**
 * URL du backend Spring.
 * - Si `VITE_API_BASE_URL` est défini dans `.env`, il est utilisé.
 * - En dev Vite sans variable : chaîne vide → mêmes origine que le front, proxy `/api` (voir vite.config.js).
 * - Build prod sans variable : `defaultBase`.
 */
export function getApiBaseUrl() {
  const v = import.meta.env.VITE_API_BASE_URL;
  if (v != null && String(v).trim() !== '') {
    return String(v).replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return '';
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
  const url = `${getApiBaseUrl()}${path}`;
  let res;
  try {
    res = await fetch(url, options);
  } catch (e) {
    const hint =
      e?.name === 'TypeError' && String(e?.message || '').toLowerCase().includes('fetch')
        ? `Impossible de joindre l’API (${url || path}). Vérifiez que le backend est démarré et que le port dans srm-mutuelle-web/.env (VITE_API_BASE_URL) correspond à SERVER_PORT du backend (ex. http://localhost:8081).`
        : e?.message || 'Erreur réseau';
    throw new Error(hint);
  }
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

/** Texte API trop vague (ex. seul mot « message » / « error »). */
function isUninformativeErrorText(s) {
  if (s == null || typeof s !== 'string') return true;
  const t = s.trim().toLowerCase();
  if (!t) return true;
  return t === 'message' || t === 'messages' || t === 'error' || t === 'erreur' || t === 'status';
}

function errorMessageFromBody(data, res, rawText) {
  const parts = [];
  if (data && typeof data === 'object' && !data._unparsed) {
    for (const k of ['detail', 'message', 'title', 'error']) {
      const v = data[k];
      if (typeof v === 'string' && v.trim()) parts.push(v.trim());
    }
    if (Array.isArray(data.errors)) {
      for (const x of data.errors) {
        const s = typeof x === 'string' ? x : x?.defaultMessage || x?.message;
        if (s) parts.push(String(s).trim());
      }
    }
  }
  if (rawText && typeof rawText === 'string') {
    const trimmed = rawText.trim();
    if (trimmed && trimmed.length < 400 && !trimmed.startsWith('<')) parts.push(trimmed);
  }
  const st = (res.statusText && String(res.statusText).trim()) || '';
  if (st) parts.push(st);
  for (const p of parts) {
    if (!isUninformativeErrorText(p)) return p;
  }
  return `Erreur HTTP ${res.status}. Réessayez ou contactez l’administrateur.`;
}

export async function parseJsonOrThrow(res) {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { _unparsed: true };
  }
  if (!res.ok) {
    const msg = errorMessageFromBody(data, res, data._unparsed ? text : '');
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
