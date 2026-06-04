import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';

const SESSION_KEY = 'mutuelle_user';

let onAuthLost = () => {};

export function setAuthLostHandler(fn) {
  onAuthLost = typeof fn === 'function' ? fn : () => {};
}

export async function getSession() {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveSession(obj) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(obj));
}

export async function clearSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}

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

export async function apiFetch(path, options = {}) {
  const auth = await getSession();
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }
  let body = options.body;
  if (body != null && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const url = `${API_BASE_URL.replace(/\/$/, '')}${path}`;
  let res;
  try {
    res = await fetch(url, { ...options, headers, body });
  } catch (e) {
    const hint =
      e?.name === 'TypeError' && String(e?.message || '').toLowerCase().includes('fetch')
        ? `Impossible de joindre l’API (${url}). Vérifiez le réseau, l’IP dans config.js et que le backend tourne.`
        : e?.message || 'Erreur réseau';
    throw new Error(hint);
  }
  if (res.status === 401) {
    const hadSession = !!auth?.token;
    const isLoginPost = path === '/api/auth/login' && (options.method || 'GET').toUpperCase() === 'POST';
    if (hadSession && !isLoginPost) {
      await clearSession();
      onAuthLost();
    }
    if (isLoginPost && !hadSession) {
      return res;
    }
    if (!isLoginPost) {
      const err = new Error('Unauthorized');
      err.status = 401;
      throw err;
    }
  }
  return res;
}

export function sessionUserFromLoginResponse(data) {
  const u = data.user || {};
  return {
    token: data.accessToken,
    id: u.id ?? null,
    email: u.email,
    name: u.fullName,
    role: u.roleLabel || u.role,
    roleCode: u.role,
    agentId: u.agentId ?? null,
    forcePasswordChange: !!(data.forcePasswordChange || u.forcePasswordChange),
  };
}

export async function apiChangePassword(currentPassword, newPassword) {
  const res = await apiFetch('/api/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });
  if (res.ok) return null;
  return parseJsonOrThrow(res);
}

export async function apiForgotPassword(email) {
  const res = await apiFetch('/api/auth/forgot-password', {
    method: 'POST',
    body: { email: email.trim() },
  });
  if (res.status === 204 || res.status === 200) {
    const text = await res.text();
    if (!text) return {};
    return JSON.parse(text);
  }
  return parseJsonOrThrow(res);
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

export async function apiUnreadCount() {
  const res = await apiFetch('/api/notifications/unread-count');
  return parseJsonOrThrow(res);
}

export async function apiMarkNotificationRead(id) {
  const res = await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
  if (!res.ok) return parseJsonOrThrow(res);
  return null;
}

export async function apiFetchBlob(path) {
  const res = await apiFetch(path, { headers: { Accept: 'application/pdf, */*' } });
  if (!res.ok) {
    await parseJsonOrThrow(res);
  }
  return res;
}
