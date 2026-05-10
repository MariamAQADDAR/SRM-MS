import { apiFetch, parseJsonOrThrow } from '../api/client';

const STORAGE_KEY = 'mutuelle_type_config_v1';

export const DEFAULT_TYPE_CONFIG = {
  quoteTypes: ['Optique', 'Dentaire'],
  ordonnanceTypes: ['Médicament', 'Analyse', 'Radiologie'],
  radioTypes: ['Radio standard', 'IRM', 'Scanner', 'Échographie'],
  careTypes: ['Hospitalisation', 'Chirurgie', 'Maternité', 'Autre'],
  facilityTypes: ['Hôpital', 'Clinique', 'Opticien', 'Laboratoire'],
  entityTypes: ['Direction', 'Département', 'Service', 'Division'],
  maladieTypes: ['Diabète', 'Hypertension', 'Cardiologie', 'Autre'],
};

let apiCache = null;

function sanitizeList(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((v) => String(v || '').trim()).filter(Boolean))];
}

/** Fusionne la réponse API : clés présentes gardent la liste (même vide), clés absentes → défauts. */
export function mergeWithDefaultsForState(raw) {
  const out = {};
  Object.keys(DEFAULT_TYPE_CONFIG).forEach((k) => {
    if (raw && Array.isArray(raw[k])) {
      out[k] = sanitizeList(raw[k]);
    } else {
      out[k] = [...DEFAULT_TYPE_CONFIG[k]];
    }
  });
  return out;
}

/** Charge les types depuis l’API (base de données) et met en cache. */
export async function prefetchTypeConfig() {
  const res = await apiFetch('/api/settings/type-config');
  const data = await parseJsonOrThrow(res);
  apiCache = mergeWithDefaultsForState(data);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apiCache));
  } catch {
    /* ignore */
  }
  return apiCache;
}

/** Lit le cache mémoire ou le dernier snapshot localStorage (hors ligne). */
export function readTypeConfig() {
  if (apiCache) return { ...apiCache };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return mergeWithDefaultsForState({});
    return mergeWithDefaultsForState(JSON.parse(raw));
  } catch {
    return mergeWithDefaultsForState({});
  }
}

export function getTypeOptions(key) {
  const cfg = readTypeConfig();
  return cfg[key] && cfg[key].length > 0 ? cfg[key] : DEFAULT_TYPE_CONFIG[key] || [];
}

/** Met à jour une clé côté API et rafraîchit le cache local. */
export async function saveTypeConfigKey(key, values) {
  const res = await apiFetch(`/api/settings/type-config/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: { values: sanitizeList(values) },
  });
  const data = await parseJsonOrThrow(res);
  apiCache = mergeWithDefaultsForState(data);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apiCache));
  } catch {
    /* ignore */
  }
  return apiCache;
}
