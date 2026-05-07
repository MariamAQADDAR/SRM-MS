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

function sanitizeList(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((v) => String(v || '').trim()).filter(Boolean))];
}

function sanitizeConfig(raw) {
  const out = {};
  Object.keys(DEFAULT_TYPE_CONFIG).forEach((k) => {
    out[k] = sanitizeList(raw?.[k]);
  });
  return out;
}

export function readTypeConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TYPE_CONFIG };
    const parsed = JSON.parse(raw);
    const clean = sanitizeConfig(parsed);
    return Object.fromEntries(
      Object.keys(DEFAULT_TYPE_CONFIG).map((k) => [k, clean[k].length > 0 ? clean[k] : DEFAULT_TYPE_CONFIG[k]])
    );
  } catch {
    return { ...DEFAULT_TYPE_CONFIG };
  }
}

export function writeTypeConfig(config) {
  const clean = sanitizeConfig(config);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  return clean;
}

export function resetTypeConfig() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TYPE_CONFIG));
  return { ...DEFAULT_TYPE_CONFIG };
}

export function getTypeOptions(key) {
  const cfg = readTypeConfig();
  return cfg[key] && cfg[key].length > 0 ? cfg[key] : DEFAULT_TYPE_CONFIG[key] || [];
}
