import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiFetch, parseJsonOrThrow } from '../api';
import { isAdminRole } from '../authUtils';
import { matchesSearch } from '../utils/filterSearch';
import { SearchBar, ListCard, LoadingCenter, EmptyState, OutlineButton, TAB_BAR_EXTRA_BOTTOM } from '../components/ui';
import { COLORS } from '../theme';

const ENDPOINTS = {
  agents: '/api/agents/archived',
  proches: '/api/beneficiaries/archived',
  users: '/api/admin/users/archived',
  quotes: '/api/quotes/archived',
  reimbursements: '/api/reimbursements/archived',
  ordonnances: '/api/ordonnances/archived',
  careEpisodes: '/api/care-episodes/archived',
  medicines: '/api/medicines/archived',
  medicalFacilities: '/api/medical-facilities/archived',
  contractedDoctors: '/api/contracted-doctors/archived',
  orgEntities: '/api/organizational-entities/archived',
  specialDiseases: '/api/special-diseases/archived',
  cardRequests: '/api/mutual-card-requests/archived',
};

const RESTORE_PATHS = {
  agents: (id) => `/api/agents/${id}/restore`,
  proches: (id) => `/api/beneficiaries/${id}/restore`,
  users: (id) => `/api/admin/users/${id}/restore`,
  quotes: (id) => `/api/quotes/${id}/restore`,
  reimbursements: (id) => `/api/reimbursements/${id}/restore`,
  ordonnances: (id) => `/api/ordonnances/${id}/restore`,
  careEpisodes: (id) => `/api/care-episodes/${id}/restore`,
  medicines: (id) => `/api/medicines/${id}/restore`,
  medicalFacilities: (id) => `/api/medical-facilities/${id}/restore`,
  contractedDoctors: (id) => `/api/contracted-doctors/${id}/restore`,
  orgEntities: (id) => `/api/organizational-entities/${id}/restore`,
  specialDiseases: (id) => `/api/special-diseases/${id}/restore`,
  cardRequests: (id) => `/api/mutual-card-requests/${id}/restore`,
};

const TABS = [
  { id: 'agents', label: 'Agents', icon: 'user-tie' },
  { id: 'proches', label: 'Bénéficiaires', icon: 'users' },
  { id: 'users', label: 'Utilisateurs', icon: 'user-shield' },
  { id: 'quotes', label: 'Devis', icon: 'file-invoice' },
  { id: 'reimbursements', label: 'Remboursements', icon: 'money-bill-wave' },
  { id: 'ordonnances', label: 'Ordonnances', icon: 'clipboard-list' },
  { id: 'careEpisodes', label: 'PEC', icon: 'hospital' },
  { id: 'medicines', label: 'Médicaments', icon: 'pills' },
  { id: 'medicalFacilities', label: 'Établissements', icon: 'building' },
  { id: 'contractedDoctors', label: 'Médecins', icon: 'user-md' },
  { id: 'orgEntities', label: 'Entités', icon: 'sitemap' },
  { id: 'specialDiseases', label: 'ALD', icon: 'heartbeat' },
  { id: 'cardRequests', label: 'Cartes', icon: 'id-card' },
];

function itemLabel(tab, item) {
  switch (tab) {
    case 'agents':
      return `${item.prenom || ''} ${item.nom || ''}`.trim() || item.matricule;
    case 'proches':
      return `${item.prenom || ''} ${item.nom || ''}`.trim();
    case 'users':
      return item.fullName || item.email;
    case 'quotes':
    case 'reimbursements':
    case 'ordonnances':
    case 'careEpisodes':
      return item.numero || `#${item.id}`;
    case 'medicines':
      return item.nom || item.code;
    case 'medicalFacilities':
      return item.name || item.nom;
    case 'contractedDoctors':
      return `${item.prenom || ''} ${item.nom || ''}`.trim();
    case 'orgEntities':
      return item.nom || item.code;
    case 'specialDiseases':
      return item.nom || item.diseaseCode || `#${item.id}`;
    case 'cardRequests':
      return `${item.beneficiaire || ''} (${item.matricule || ''})`.trim();
    default:
      return item.numero || item.name || item.fullName || `#${item.id}`;
  }
}

function itemSubtitle(tab, item) {
  switch (tab) {
    case 'agents':
      return `${item.matricule || '—'} · ${item.entite || '—'}`;
    case 'proches':
      return `${item.type || '—'}${item.cin ? ` · ${item.cin}` : ''}`;
    case 'users':
      return `${item.email || '—'} · ${item.roleLabel || item.role || '—'}`;
    case 'quotes':
      return `${item.type || '—'} · ${item.montant != null ? `${item.montant} DH` : '—'}`;
    case 'reimbursements':
      return `${item.montant != null ? `${item.montant} DH` : '—'} · ${item.etat || '—'}`;
    case 'ordonnances':
      return item.beneficiaire || item.datePrescription || '—';
    case 'careEpisodes':
      return `${item.type || '—'} · ${item.etat || '—'}`;
    case 'medicines':
      return `${item.code || '—'} · ${item.prixReference != null ? `${item.prixReference} DH` : '—'}`;
    case 'medicalFacilities':
      return `${item.type || '—'} · ${item.city || item.ville || '—'}`;
    case 'contractedDoctors':
      return `${item.specialite || '—'} · ${item.ville || '—'}`;
    case 'orgEntities':
      return `${item.code || '—'} · ${item.type || '—'}`;
    case 'specialDiseases':
      return item.statut || item.status || '—';
    default:
      return '';
  }
}

export default function ArchivesScreen({ user, addToast }) {
  const isAdmin = isAdminRole(user);
  const [archives, setArchives] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('agents');
  const [search, setSearch] = useState('');

  const loadArchives = useCallback(async () => {
    setLoading(true);
    try {
      const keys = Object.keys(ENDPOINTS);
      const responses = await Promise.all(
        keys.map((k) => apiFetch(ENDPOINTS[k]).catch(() => null)),
      );
      const next = {};
      for (let i = 0; i < keys.length; i++) {
        const res = responses[i];
        if (res?.ok) next[keys[i]] = await parseJsonOrThrow(res);
        else next[keys[i]] = [];
      }
      setArchives(next);
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (isAdmin) loadArchives();
  }, [isAdmin, loadArchives]);

  const filtered = useMemo(() => {
    const list = archives[activeTab] || [];
    if (!search.trim()) return list;
    return list.filter((item) =>
      matchesSearch(
        search,
        item.nom,
        item.prenom,
        item.matricule,
        item.cin,
        item.email,
        item.numero,
        item.name,
        item.fullName,
        item.code,
        item.entite,
      ),
    );
  }, [archives, activeTab, search]);

  const handleRestore = (id) => {
    Alert.alert('Restaurer', 'Voulez-vous vraiment restaurer cet élément ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Restaurer',
        onPress: async () => {
          try {
            await apiFetch(RESTORE_PATHS[activeTab](id), { method: 'POST' });
            addToast('success', 'Élément restauré');
            loadArchives();
          } catch (e) {
            addToast('error', e.message || 'Erreur');
          }
        },
      },
    ]);
  };

  if (!isAdmin) {
    return (
      <View style={styles.denied}>
        <FontAwesome5 name="lock" size={32} color={COLORS.textLight} />
        <Text style={styles.deniedText}>Accès réservé aux administrateurs</Text>
      </View>
    );
  }

  if (loading && !Object.keys(archives).length) return <LoadingCenter />;

  const activeLabel = TABS.find((t) => t.id === activeTab)?.label || 'Archives';

  return (
    <View style={styles.screen}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>
        {TABS.map((tab) => {
          const count = (archives[tab.id] || []).length;
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => { setActiveTab(tab.id); setSearch(''); }}
            >
              <FontAwesome5 name={tab.icon} size={12} color={active ? '#fff' : COLORS.textLight} solid />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              {count > 0 ? (
                <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, active && { color: COLORS.primary }]}>{count}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <SearchBar value={search} onChangeText={setSearch} placeholder={`Rechercher dans ${activeLabel}…`} />
      {filtered.length === 0 ? (
        <EmptyState text={`Aucun élément archivé (${activeLabel})`} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: TAB_BAR_EXTRA_BOTTOM + 24 }}
          renderItem={({ item }) => (
            <ListCard
              title={itemLabel(activeTab, item)}
              subtitle={itemSubtitle(activeTab, item)}
              badge="Archivé"
              onPress={() => handleRestore(item.id)}
              rightIcon="undo"
            />
          )}
          ListFooterComponent={
            <OutlineButton title="Actualiser" onPress={loadArchives} style={{ marginTop: 8 }} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: COLORS.background },
  deniedText: { color: COLORS.textLight, fontSize: 15 },
  tabs: { maxHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: 'center' },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 12, color: COLORS.text },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive: { backgroundColor: '#fff' },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.textLight },
});
