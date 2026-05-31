import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../theme';
import BeneficiairesScreen from './BeneficiairesScreen';
import PrisesEnChargeScreen from './PrisesEnChargeScreen';
import RemboursementsScreen from './RemboursementsScreen';
import DevisScreen from './DevisScreen';
import MedicamentsScreen from './MedicamentsScreen';
import CartesMutuellesScreen from './CartesMutuellesScreen';
import HistoriqueScreen from './HistoriqueScreen';
import GenericCrudScreen from './GenericCrudScreen';
import ParametrageScreen from './ParametrageScreen';
import { DEFAULT_TYPE_CONFIG } from '../typeConfig';

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
]);

const CRUD_CONFIGS = {
  entites: {
    endpoint: '/api/organizational-entities',
    titleField: 'nom',
    subtitleField: 'type',
    badgeField: 'type',
    searchFields: ['nom', 'type', 'code'],
    searchPlaceholder: 'Nom, type, code…',
    createLabel: '+ Entité',
    fields: [
      { key: 'nom', label: 'Nom', required: true },
      { key: 'code', label: 'Code' },
      { key: 'type', label: 'Type', type: 'select', required: true, options: () => (DEFAULT_TYPE_CONFIG.entityTypes || []).map((t) => ({ label: t, value: t })) },
      { key: 'parentNom', label: 'Entité parente' },
    ],
  },
  etablissements: {
    endpoint: '/api/medical-facilities',
    titleField: 'name',
    subtitleField: 'type',
    badgeField: 'type',
    searchFields: ['name', 'type', 'city', 'phone'],
    createLabel: '+ Établissement',
    fields: [
      { key: 'name', label: 'Nom', required: true },
      { key: 'type', label: 'Type', type: 'select', options: () => (DEFAULT_TYPE_CONFIG.facilityTypes || []).map((t) => ({ label: t, value: t })) },
      { key: 'city', label: 'Ville' },
      { key: 'phone', label: 'Téléphone', keyboardType: 'phone-pad' },
      { key: 'address', label: 'Adresse', multiline: true },
    ],
  },
  maladies: {
    endpoint: '/api/special-diseases',
    titleField: 'nom',
    subtitleField: 'type',
    badgeField: 'statut',
    searchFields: ['nom', 'type', 'agentLabel'],
    extraLoads: [{ path: '/api/agents', key: 'agents' }],
    createLabel: '+ Maladie',
    fields: [
      { key: 'nom', label: 'Maladie', required: true },
      { key: 'type', label: 'Type', type: 'select', options: () => (DEFAULT_TYPE_CONFIG.maladieTypes || []).map((t) => ({ label: t, value: t })) },
      { key: 'agentId', label: 'Agent (ID)', required: true, keyboardType: 'number-pad' },
      { key: 'dateDiagnostic', label: 'Date diagnostic', placeholder: 'AAAA-MM-JJ' },
      { key: 'observation', label: 'Observation', multiline: true },
    ],
    buildBody: (form) => ({
      nom: form.nom,
      type: form.type,
      agentId: Number(form.agentId),
      dateDiagnostic: form.dateDiagnostic || null,
      observation: form.observation || '',
    }),
  },
  ordonnances: {
    endpoint: '/api/ordonnances',
    titleField: 'numero',
    subtitleField: 'beneficiaire',
    badgeField: 'statut',
    searchFields: ['numero', 'beneficiaire', 'type'],
    createLabel: '+ Ordonnance',
    fields: [
      { key: 'beneficiaire', label: 'Bénéficiaire', required: true },
      { key: 'type', label: 'Type', type: 'select', options: () => (DEFAULT_TYPE_CONFIG.ordonnanceTypes || []).map((t) => ({ label: t, value: t })) },
      { key: 'date', label: 'Date', required: true },
      { key: 'medecin', label: 'Médecin' },
      { key: 'observation', label: 'Observation', multiline: true },
    ],
  },
  utilisateurs: {
    endpoint: '/api/admin/users',
    titleField: 'fullName',
    subtitleField: 'email',
    badgeField: 'roleLabel',
    searchFields: ['fullName', 'email', 'roleLabel'],
    createLabel: '+ Utilisateur',
    fields: [
      { key: 'fullName', label: 'Nom complet', required: true },
      { key: 'email', label: 'E-mail', required: true },
      { key: 'password', label: 'Mot de passe' },
      { key: 'role', label: 'Rôle (code)', required: true },
      { key: 'agentId', label: 'Agent ID (adhérent)', keyboardType: 'number-pad' },
    ],
    buildBody: (form) => ({
      fullName: form.fullName,
      email: form.email,
      password: form.password || undefined,
      role: form.role,
      agentId: form.agentId ? Number(form.agentId) : null,
    }),
  },
};

export default function FeatureRouter({ tab, user, addToast }) {
  const props = { user, addToast };

  switch (tab) {
    case 'agents':
      return <BeneficiairesScreen {...props} forcedTab="agents" />;
    case 'beneficiaires':
      return <BeneficiairesScreen {...props} />;
    case 'prises-en-charge':
      return <PrisesEnChargeScreen {...props} />;
    case 'remboursements':
      return <RemboursementsScreen {...props} />;
    case 'devis':
      return <DevisScreen {...props} />;
    case 'medicaments':
      return <MedicamentsScreen {...props} />;
    case 'cartes-mutuelles':
      return <CartesMutuellesScreen {...props} />;
    case 'historique':
      return <HistoriqueScreen {...props} />;
    case 'parametrage':
      return <ParametrageScreen addToast={addToast} />;
    case 'entites':
    case 'etablissements':
    case 'maladies':
    case 'ordonnances':
    case 'utilisateurs':
      return <GenericCrudScreen config={CRUD_CONFIGS[tab]} {...props} />;
    default:
      return <View style={styles.fallback} />;
  }
}

const styles = StyleSheet.create({
  fallback: { flex: 1, backgroundColor: COLORS.background },
});
