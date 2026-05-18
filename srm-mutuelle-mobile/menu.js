import { isAdminRole, isAdherentRole, isStaffWriterRole } from './authUtils';

/** Taille des pages « Charger plus » sur les listes. */
export const PAGE_SIZE = 15;

const THEME_PRIMARY = '#0f6fb8';

/** Aligné sur `AppShell.jsx` (topbar titre + fil d’Ariane). */
export const PAGE_TOPBAR = {
  dashboard: { title: 'Tableau de bord', breadcrumb: 'Accueil' },
  beneficiaires: { title: 'Bénéficiaires', breadcrumb: 'Gestion des bénéficiaires' },
  ordonnances: { title: 'Ordonnances', breadcrumb: 'Gestion des ordonnances' },
  devis: { title: 'Devis', breadcrumb: 'Gestion des devis' },
  remboursements: { title: 'Remboursements', breadcrumb: 'Gestion des remboursements' },
  'prises-en-charge': { title: 'Prises en charge', breadcrumb: 'Gestion des prises en charge' },
  maladies: { title: 'Maladies spéciales', breadcrumb: 'Gestion des maladies spéciales' },
  etablissements: { title: 'Établissements médicaux', breadcrumb: 'Référentiel' },
  entites: { title: 'Entités organisationnelles', breadcrumb: 'Référentiel' },
  utilisateurs: { title: 'Utilisateurs', breadcrumb: 'Administration' },
  notifications: { title: 'Notifications', breadcrumb: 'Messages' },
  profil: { title: 'Mon profil', breadcrumb: 'Compte' },
  parametrage: { title: 'Paramétrage', breadcrumb: 'Administration' },
};

/**
 * vis:
 * - everyone : tout utilisateur connecté
 * - staff : admin, opérateur, consultateur (pas adhérent)
 * - admin : administrateur uniquement
 * - writer : admin ou opérateur (pas consultateur)
 */
export const MENU_ROUTES = [
  { id: 'beneficiaires', title: 'Bénéficiaires', fa: 'users', color: '#3b82f6', endpoint: '/api/agents', vis: 'staff' },
  { id: 'ordonnances', title: 'Ordonnances', fa: 'clipboard-list', color: '#8b5cf6', endpoint: '/api/ordonnances', vis: 'staff' },
  { id: 'devis', title: 'Devis', fa: 'file-invoice', color: '#f59e0b', endpoint: '/api/quotes', vis: 'everyone' },
  { id: 'remboursements', title: 'Remboursements', fa: 'money-bill-wave', color: '#10b981', endpoint: '/api/reimbursements', vis: 'everyone' },
  { id: 'prises-en-charge', title: 'Prises en charge', fa: 'hospital', color: '#ec4899', endpoint: '/api/care-episodes', vis: 'staff' },
  { id: 'maladies', title: 'Maladies spéciales', fa: 'stethoscope', color: '#ef4444', endpoint: '/api/special-diseases', vis: 'everyone' },
  { id: 'etablissements', title: 'Établissements', fa: 'building', color: '#6366f1', endpoint: '/api/medical-facilities', vis: 'staff' },
  { id: 'entites', title: 'Entités org.', fa: 'landmark', color: '#1d8fd8', endpoint: '/api/organizational-entities', vis: 'staff' },
  { id: 'notifications', title: 'Notifications', fa: 'bell', color: '#0f6fb8', endpoint: '/api/notifications', vis: 'everyone', isNotifications: true },
  { id: 'parametrage', title: 'Paramétrage', fa: 'sliders', color: '#475569', endpoint: '/api/settings/type-config', vis: 'writer', responseKind: 'map' },
  { id: 'utilisateurs', title: 'Utilisateurs', fa: 'user-shield', color: '#0f6fb8', endpoint: '/api/admin/users', vis: 'writer' },
];

/** Même id que le web (`Layout.jsx` / `AppShell.jsx`) : page d’accueil métier. */
export const DASHBOARD_PAGE_ID = 'dashboard';

function badgeForItem(id, b) {
  const m = {
    beneficiaires: b.agents,
    ordonnances: b.ordonnances,
    devis: b.devis,
    remboursements: b.rembPending,
    'prises-en-charge': b.pec,
    maladies: b.maladies,
    etablissements: b.facilities,
    entites: b.entites,
    utilisateurs: b.users,
  };
  const v = m[id];
  return v != null && v > 0 ? v : null;
}

/**
 * Même contenu que la sidebar web (`Layout.jsx`) : pas d’entrée « Notifications » dans la liste (accès par la cloche comme sur le web).
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
        section: 'Principal',
        items: [{ id: DASHBOARD_PAGE_ID, fa: 'chart-line', label: 'Tableau de bord', color: THEME_PRIMARY }],
      },
      {
        section: 'Espace adhérent',
        items: [meta('devis'), meta('remboursements'), { ...meta('maladies'), label: 'Maladies & médicaments' }].filter(Boolean),
      },
    ];
  }

  const writer = isStaffWriterRole(user);

  const gestionIds = ['beneficiaires', 'ordonnances', 'devis', 'remboursements', 'prises-en-charge', 'maladies'];
  const refIds = ['etablissements', 'entites'];

  const sections = [
    {
      section: 'Principal',
      items: [{ id: DASHBOARD_PAGE_ID, fa: 'chart-line', label: 'Tableau de bord', color: THEME_PRIMARY }],
    },
    {
      section: 'Gestion',
      items: gestionIds.map((id) => meta(id)).filter(Boolean),
    },
  ];

  sections.push({
    section: 'Référentiel',
    items: refIds.map((id) => meta(id)).filter(Boolean),
  });

  const adminItems = [];
  if (writer) {
    const u = meta('utilisateurs');
    if (u) adminItems.push({ ...u, label: 'Utilisateurs' });
    const p = meta('parametrage');
    if (p) adminItems.push(p);
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
      { id: DASHBOARD_PAGE_ID, label: 'Accueil', fa: 'home' },
      { id: 'devis', label: 'Devis', fa: 'file-invoice' },
      { id: 'remboursements', label: 'Remboursements', fa: 'money-bill-wave' },
      { id: 'profil', label: 'Profil', fa: 'user' },
    ];
  }
  return [
    { id: DASHBOARD_PAGE_ID, label: 'Accueil', fa: 'home' },
    { id: 'beneficiaires', label: 'Bénéficiaires', fa: 'users' },
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
      default:
        return false;
    }
  });
}

export function routeById(id) {
  return MENU_ROUTES.find((r) => r.id === id) || null;
}
