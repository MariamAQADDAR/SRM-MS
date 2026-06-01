import { isAdminRole, isAdherentRole, isStaffWriterRole } from './authUtils';

/** Pages autorisées pour un compte adhérent (aligné `AppShell.jsx` ADHERENT_PAGES). */
export const ADHERENT_PAGE_IDS = new Set([
  'mes-devis',
  'mes-cartes',
  'mes-remboursements',
  'mes-prises-en-charge',
  'medicaments',
  'mon-historique',
  'notifications',
  'profil',
  'dashboard',
  // alias mobile historiques
  'devis',
  'cartes-mutuelles',
  'remboursements',
  'prises-en-charge',
  'historique',
]);

/** Routes « Mon espace » → écran + mode personnel (comme `personalMode` sur le web). */
export const PERSONAL_SPACE_ROUTES = [
  { id: 'mes-devis', screen: 'devis', label: 'Mes devis', fa: 'file-invoice', badgeKey: 'mes-devis' },
  { id: 'mes-cartes', screen: 'cartes-mutuelles', label: 'Mes cartes mutuelles', fa: 'id-card' },
  { id: 'mes-remboursements', screen: 'remboursements', label: 'Mes remboursements', fa: 'money-bill-wave', badgeKey: 'mes-rembPending' },
  { id: 'mes-prises-en-charge', screen: 'prises-en-charge', label: 'Mes prises en charge', fa: 'hospital', badgeKey: 'mes-pec' },
  { id: 'medicaments', screen: 'medicaments', label: 'Médicaments', fa: 'pills', badgeKey: 'medicaments' },
  { id: 'mon-historique', screen: 'historique', label: 'Mon historique', fa: 'clock-rotate-left' },
];

const STAFF_ONLY_SCREENS = new Set([
  'beneficiaires',
  'ordonnances',
  'maladies',
  'etablissements',
  'entites',
  'agents',
]);

const WRITER_ONLY_SCREENS = new Set(['utilisateurs', 'parametrage']);
const ADMIN_ONLY_SCREENS = new Set(['archives', 'agents']);

export function isPersonalSpaceTab(tab) {
  return PERSONAL_SPACE_ROUTES.some((r) => r.id === tab);
}

/** Résout un id menu (ex. mes-devis) vers l'écran FeatureRouter + personalMode. */
export function resolveTabRoute(tab) {
  const personal = PERSONAL_SPACE_ROUTES.find((r) => r.id === tab);
  if (personal) {
    return { screen: personal.screen, personalMode: true, pageId: tab };
  }
  if (tab === 'historique') {
    return { screen: 'historique', personalMode: false, pageId: tab };
  }
  return { screen: tab, personalMode: false, pageId: tab };
}

export function canAccessTab(user, tab) {
  if (!user) return false;
  const { screen, personalMode } = resolveTabRoute(tab);
  const adherent = isAdherentRole(user);

  if (adherent) {
    return ADHERENT_PAGE_IDS.has(tab) || (personalMode && ADHERENT_PAGE_IDS.has(screen));
  }

  if (ADMIN_ONLY_SCREENS.has(screen) || ADMIN_ONLY_SCREENS.has(tab)) {
    return isAdminRole(user);
  }

  if (WRITER_ONLY_SCREENS.has(screen)) {
    return isStaffWriterRole(user);
  }

  if (STAFF_ONLY_SCREENS.has(screen) && adherent) {
    return false;
  }

  return true;
}

export function defaultHomeTab(user) {
  if (isAdherentRole(user)) return 'mes-devis';
  return 'dashboard';
}

export function notificationNavigateTarget(notifType, user) {
  const type = String(notifType || '').toUpperCase();
  const adherent = isAdherentRole(user);
  if (type.includes('DEVIS')) return adherent ? 'mes-devis' : 'devis';
  if (type.includes('REMBOURSEMENT')) return adherent ? 'mes-remboursements' : 'remboursements';
  if (type.includes('PEC')) return adherent ? 'mes-prises-en-charge' : 'prises-en-charge';
  return 'notifications';
}
