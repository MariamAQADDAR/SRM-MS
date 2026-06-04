import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from './theme';
import { isAdminRole } from './authUtils';
import { canAccessTab, resolveTabRoute } from './navigationAccess';
import AccessDeniedScreen from './components/AccessDeniedScreen';
import BeneficiairesScreen from './screens/BeneficiairesScreen';
import PrisesEnChargeScreen from './screens/PrisesEnChargeScreen';
import RemboursementsScreen from './screens/RemboursementsScreen';
import DevisScreen from './screens/DevisScreen';
import MedicamentsScreen from './screens/MedicamentsScreen';
import CartesMutuellesScreen from './screens/CartesMutuellesScreen';
import HistoriqueScreen from './screens/HistoriqueScreen';
import ParametrageScreen from './screens/ParametrageScreen';
import EntitesScreen from './screens/EntitesScreen';
import ArchivesScreen from './screens/ArchivesScreen';
import UtilisateursScreen from './screens/UtilisateursScreen';
import EtablissementsScreen from './screens/EtablissementsScreen';
import MaladiesScreen from './screens/MaladiesScreen';
import OrdonnancesScreen from './screens/OrdonnancesScreen';
import NotificationsScreen from './screens/NotificationsScreen';

export const FEATURE_SCREEN_IDS = new Set([
  'agents',
  'beneficiaires',
  'ordonnances',
  'devis',
  'remboursements',
  'prises-en-charge',
  'maladies',
  'etablissements',
  'entites',
  'medicaments',
  'cartes-mutuelles',
  'historique',
  'utilisateurs',
  'parametrage',
  'archives',
  'mes-devis',
  'mes-cartes',
  'mes-remboursements',
  'mes-prises-en-charge',
  'mon-historique',
  'notifications',
]);

function deniedMessage(tab, user) {
  if (tab === 'agents' || tab === 'archives') return 'Réservé aux administrateurs.';
  if (tab === 'utilisateurs' || tab === 'parametrage') return 'Réservé aux administrateurs et opérateurs.';
  if (user && tab !== 'notifications') return 'Cette section est réservée aux équipes SRM-MS.';
  return undefined;
}

export default function FeatureRouter({ tab, user, addToast, onNavigate, onUnreadChanged }) {
  const props = { user, addToast };

  if (!canAccessTab(user, tab)) {
    return <AccessDeniedScreen message={deniedMessage(tab, user)} />;
  }

  const { screen, personalMode } = resolveTabRoute(tab);
  const pm = { personalMode };

  switch (screen) {
    case 'agents':
      if (!isAdminRole(user)) return <AccessDeniedScreen message="Réservé aux administrateurs." />;
      return <BeneficiairesScreen {...props} forcedTab="agents" />;
    case 'beneficiaires':
      return <BeneficiairesScreen {...props} />;
    case 'prises-en-charge':
      return <PrisesEnChargeScreen {...props} {...pm} />;
    case 'remboursements':
      return <RemboursementsScreen {...props} {...pm} />;
    case 'devis':
      return <DevisScreen {...props} {...pm} />;
    case 'medicaments':
      return <MedicamentsScreen {...props} />;
    case 'cartes-mutuelles':
      return <CartesMutuellesScreen {...props} {...pm} />;
    case 'historique':
      return <HistoriqueScreen {...props} {...pm} />;
    case 'parametrage':
      return <ParametrageScreen addToast={addToast} />;
    case 'entites':
      return <EntitesScreen {...props} />;
    case 'archives':
      return <ArchivesScreen {...props} />;
    case 'utilisateurs':
      return <UtilisateursScreen {...props} />;
    case 'etablissements':
      return <EtablissementsScreen {...props} />;
    case 'maladies':
      return <MaladiesScreen {...props} />;
    case 'ordonnances':
      return <OrdonnancesScreen {...props} />;
    case 'notifications':
      return (
        <NotificationsScreen
          {...props}
          onNavigate={onNavigate}
          onUnreadChanged={onUnreadChanged}
        />
      );
    default:
      return <View style={styles.fallback} />;
  }
}

const styles = StyleSheet.create({
  fallback: { flex: 1, backgroundColor: COLORS.background },
});
