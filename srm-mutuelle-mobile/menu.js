import { isAdminRole, isAdherentRole, isStaffWriterRole } from './authUtils';
import { PERSONAL_SPACE_ROUTES } from './navigationAccess';

/** Taille des pages « Charger plus » sur les listes. */
export const PAGE_SIZE = 15;

const THEME_PRIMARY = '#0f6fb8';

/** Aligné sur `AppShell.jsx` (topbar titre + fil d’Ariane). */
export const PAGE_TOPBAR = {
  dashboard: { title: 'Tableau de bord', breadcrumb: 'Accueil' },
  agents: { title: 'Agents', breadcrumb: 'Gestion des agents' },
  beneficiaires: { title: 'Bénéficiaires', breadcrumb: 'Gestion des bénéficiaires' },
  ordonnances: { title: 'Ordonnances', breadcrumb: 'Gestion des ordonnances' },
  devis: { title: 'Devis', breadcrumb: 'Gestion des devis' },
  remboursements: { title: 'Remboursements', breadcrumb: 'Gestion des remboursements' },
  'cartes-mutuelles': { title: 'Cartes mutuelles', breadcrumb: 'Affiliation famille' },
  'prises-en-charge': { title: 'Prises en charge', breadcrumb: 'Gestion des prises en charge' },
  maladies: { title: 'Maladies spéciales', breadcrumb: 'Gestion des maladies spéciales' },
  etablissements: { title: 'Établissements médicaux', breadcrumb: 'Référentiel' },
  entites: { title: 'Entités organisationnelles', breadcrumb: 'Référentiel' },
  medicaments: { title: 'Médicaments', breadcrumb: 'Référentiel médicaments' },
  utilisateurs: { title: 'Utilisateurs', breadcrumb: 'Administration' },
  notifications: { title: 'Notifications', breadcrumb: 'Messages' },
  profil: { title: 'Mon profil', breadcrumb: 'Compte' },
  historique: { title: 'Historique personnel', breadcrumb: 'Mon historique d’activités' },
  parametrage: { title: 'Paramétrage', breadcrumb: 'Administration' },
  archives: { title: 'Archives', breadcrumb: 'Administration' },
  'mes-devis': { title: 'Mes devis', breadcrumb: 'Mon espace — Mes devis' },
  'mes-cartes': { title: 'Mes cartes mutuelles', breadcrumb: 'Mon espace — Cartes' },
  'mes-remboursements': { title: 'Mes remboursements', breadcrumb: 'Mon espace — Remboursements' },
  'mes-prises-en-charge': { title: 'Mes prises en charge', breadcrumb: 'Mon espace — PEC' },
  'mon-historique': { title: 'Mon historique', breadcrumb: 'Mon espace — Historique' },
};

/**
 * vis:
 * - everyone : tout utilisateur connecté
 * - staff : admin, opérateur, consultateur (pas adhérent)
 * - admin : administrateur uniquement
 * - writer : admin ou opérateur (pas consultateur)
 * - adherent : adhérent uniquement
 */
export const MENU_ROUTES = [
  { id: 'agents', title: 'Agents', fa: 'user-tie', color: '#0f6fb8', endpoint: '/api/agents', vis: 'admin', feature: true },
  { id: 'beneficiaires', title: 'Bénéficiaires', fa: 'users', color: '#3b82f6', endpoint: '/api/agents', vis: 'staff', feature: true },
  { id: 'cartes-mutuelles', title: 'Cartes mutuelles', fa: 'id-card', color: '#14b8a6', endpoint: '/api/mutual-cards', vis: 'everyone', feature: true },
  { id: 'ordonnances', title: 'Ordonnances', fa: 'clipboard-list', color: '#8b5cf6', endpoint: '/api/ordonnances', vis: 'staff', feature: true },
  { id: 'devis', title: 'Devis', fa: 'file-invoice', color: '#f59e0b', endpoint: '/api/quotes', vis: 'everyone', feature: true },
  { id: 'remboursements', title: 'Remboursements', fa: 'money-bill-wave', color: '#10b981', endpoint: '/api/reimbursements', vis: 'everyone', feature: true },
  { id: 'prises-en-charge', title: 'Prises en charge', fa: 'hospital', color: '#ec4899', endpoint: '/api/care-episodes', vis: 'everyone', feature: true },
  { id: 'maladies', title: 'Maladies spéciales', fa: 'stethoscope', color: '#ef4444', endpoint: '/api/special-diseases', vis: 'everyone', feature: true },
  { id: 'medicaments', title: 'Médicaments', fa: 'pills', color: '#8b5cf6', endpoint: '/api/medicines', vis: 'everyone', feature: true },
  { id: 'historique', title: 'Mon historique', fa: 'history', color: '#6366f1', endpoint: null, vis: 'adherent', feature: true },
  { id: 'etablissements', title: 'Établissements', fa: 'building', color: '#6366f1', endpoint: '/api/medical-facilities', vis: 'staff', feature: true },
  { id: 'entites', title: 'Entités org.', fa: 'landmark', color: '#1d8fd8', endpoint: '/api/organizational-entities', vis: 'staff', feature: true },
  { id: 'notifications', title: 'Notifications', fa: 'bell', color: '#0f6fb8', endpoint: '/api/notifications', vis: 'everyone', isNotifications: true },
  { id: 'parametrage', title: 'Paramétrage', fa: 'sliders', color: '#475569', endpoint: '/api/settings/type-config', vis: 'writer', feature: true },
  { id: 'utilisateurs', title: 'Utilisateurs', fa: 'user-shield', color: '#0f6fb8', endpoint: '/api/admin/users', vis: 'writer', feature: true },
  { id: 'archives', title: 'Archives', fa: 'box-archive', color: '#64748b', endpoint: null, vis: 'admin', feature: true },
];

/** Même id que le web (`Layout.jsx` / `AppShell.jsx`) : page d’accueil métier. */
export const DASHBOARD_PAGE_ID = 'dashboard';

function badgeForItem(id, b) {
  const m = {
    agents: b.agents,
    beneficiaires: b.agents,
    ordonnances: b.ordonnances,
    devis: b.devis,
    'mes-devis': b['mes-devis'] ?? b.devis,
    remboursements: b.rembPending,
    'mes-remboursements': b['mes-rembPending'] ?? b.rembPending,
    'prises-en-charge': b.pec,
    'mes-prises-en-charge': b['mes-pec'] ?? b.pec,
    maladies: b.maladies,
    medicaments: b.medicaments,
    etablissements: b.facilities,
    entites: b.entites,
    utilisateurs: b.users,
  };
  const v = m[id];
  return v != null && v > 0 ? v : null;
}

function monEspaceItems(b) {
  return PERSONAL_SPACE_ROUTES.map((r) => ({
    id: r.id,
    fa: r.fa,
    label: r.label,
    color: '#0f6fb8',
    badge: r.badgeKey ? badgeForItem(r.badgeKey, b) ?? badgeForItem(r.screen, b) : badgeForItem(r.id, b),
  }));
}

/**
 * Même contenu que la sidebar web (`Layout.jsx`).
 */
export function verticalNavSections(user, navBadges = {}) {
  const b = navBadges || {};
  const meta = (id) => {
    const route = MENU_ROUTES.find((x) => x.id === id);
    if (!route) return null;
    return {
      id: route.id,
      fa: route.fa,
      label: route.title,
      color: route.color,
      badge: badgeForItem(id, b),
    };
  };

  if (!user) return [];

  if (isAdherentRole(user)) {
    return [
      {
        section: 'Mon espace',
        items: monEspaceItems(b),
      },
    ];
  }

  const writer = isStaffWriterRole(user);
  const admin = isAdminRole(user);

  const sections = [
    {
      section: 'Mon espace',
      items: monEspaceItems(b),
    },
    {
      section: 'Principal',
      items: [{ id: DASHBOARD_PAGE_ID, fa: 'chart-line', label: 'Tableau de bord', color: THEME_PRIMARY }],
    },
    {
      section: 'Gestion',
      items: [
        ...(admin ? [meta('agents')] : []),
        meta('beneficiaires'),
        meta('cartes-mutuelles'),
        meta('ordonnances'),
        meta('devis'),
        meta('remboursements'),
        meta('prises-en-charge'),
        meta('maladies'),
      ].filter(Boolean),
    },
    {
      section: 'Référentiel',
      items: [meta('etablissements'), meta('entites'), meta('medicaments')].filter(Boolean),
    },
  ];

  const adminItems = [];
  if (writer) {
    const u = meta('utilisateurs');
    if (u) adminItems.push({ ...u, label: 'Utilisateurs' });
    const p = meta('parametrage');
    if (p) adminItems.push(p);
  }
  if (admin) {
    const ar = meta('archives');
    if (ar) adminItems.push(ar);
  }
  if (adminItems.length > 0) {
    sections.push({ section: 'Administration', items: adminItems });
  }

  return sections;
}

/**
 * Onglets du bas : accès rapides uniquement (le reste reste dans le tiroir ☰).
 */
export function bottomNavEssentials(user) {
  if (!user) return [];
  if (isAdherentRole(user)) {
    return [
      { id: 'mes-devis', label: 'Devis', fa: 'file-invoice' },
      { id: 'mes-prises-en-charge', label: 'PEC', fa: 'hospital' },
      { id: 'mes-cartes', label: 'Cartes', fa: 'id-card' },
      { id: 'notifications', label: 'Notifs', fa: 'bell' },
      { id: 'profil', label: 'Profil', fa: 'user' },
    ];
  }
  return [
    { id: DASHBOARD_PAGE_ID, label: 'Accueil', fa: 'home' },
    ...(isAdminRole(user)
      ? [{ id: 'agents', label: 'Agents', fa: 'user-tie' }]
      : [{ id: 'beneficiaires', label: 'Bénéficiaires', fa: 'users' }]),
    { id: 'remboursements', label: 'Remboursements', fa: 'money-bill-wave' },
    { id: 'profil', label: 'Profil', fa: 'user' },
  ];
}

export function menuForUser(user) {
  if (!user) return [];
  const adherent = isAdherentRole(user);
  const admin = isAdminRole(user);
  const writer = isStaffWriterRole(user);

  return MENU_ROUTES.filter((r) => {
    switch (r.vis) {
      case 'everyone':
        return true;
      case 'staff':
        return !adherent;
      case 'admin':
        return !adherent && admin;
      case 'writer':
        return !adherent && writer;
      case 'adherent':
        return adherent;
      default:
        return false;
    }
  });
}

export function routeById(id) {
  return MENU_ROUTES.find((r) => r.id === id) || null;
}

export function isFeatureScreen(id) {
  const r = routeById(id);
  return !!(r && r.feature);
}
