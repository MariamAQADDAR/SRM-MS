import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, RefreshControl, ScrollView, TouchableOpacity, Text, Alert, StyleSheet } from 'react-native';
import { apiFetch, parseJsonOrThrow } from '../api';
import { canAdminDelete, canStaffMutate, isConsultateurRole } from '../authUtils';
import { matchesSearch } from '../utils/filterSearch';
import { formatDate } from '../utils/format';
import {
  SearchBar,
  ListCard,
  PrimaryButton,
  OutlineButton,
  AppModal,
  FormField,
  TextField,
  SelectField,
  DetailItem,
  ScreenToolbar,
  EmptyState,
  LoadingCenter,
  TAB_BAR_EXTRA_BOTTOM,
} from '../components/ui';
import { DEFAULT_TYPE_CONFIG } from '../typeConfig';
import { COLORS } from '../theme';

const VIEWS = [
  { id: 'analyse', label: 'Analyses' },
  { id: 'ordonnance', label: 'Médicaments' },
  { id: 'radio', label: 'Radiologie' },
];

function agentLabel(a) {
  return `${a.prenom || ''} ${a.nom || ''}`.trim();
}

function kindFromType(typePrestation) {
  if (/analyse/i.test(String(typePrestation || ''))) return 'analyse';
  if (/radio/i.test(String(typePrestation || ''))) return 'radio';
  return 'ordonnance';
}

function typeForView(view, ordonnanceTypes) {
  if (view === 'analyse') return ordonnanceTypes.find((t) => /analyse/i.test(t)) || 'Analyse';
  if (view === 'radio') return ordonnanceTypes.find((t) => /radio/i.test(t)) || 'Radiologie';
  return ordonnanceTypes.find((t) => /m[ée]dicament/i.test(t)) || 'Médicament';
}

export default function OrdonnancesScreen({ user, addToast }) {
  const canMutate = canStaffMutate(user);
  const canDelete = canAdminDelete(user);
  const isConsult = isConsultateurRole(user);
  const ordonnanceTypes = DEFAULT_TYPE_CONFIG.ordonnanceTypes || ['Médicament', 'Analyse', 'Radiologie'];
  const statuts = ['En attente', 'Validé', 'Rejeté'];
  const [viewType, setViewType] = useState('analyse');
  const [rows, setRows] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [o, a] = await Promise.all([
        parseJsonOrThrow(await apiFetch('/api/ordonnances')),
        parseJsonOrThrow(await apiFetch('/api/agents')),
      ]);
      setRows(o);
      setAgents(a);
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const wanted = typeForView(viewType, ordonnanceTypes);
    let list = rows.filter((r) => kindFromType(r.typePrestation) === viewType || r.typePrestation === wanted);
    if (search.trim()) {
      list = list.filter((r) =>
        matchesSearch(search, r.numero, r.beneficiaire, r.typePrestation, r.statut, String(r.montant)),
      );
    }
    return list;
  }, [rows, viewType, search, ordonnanceTypes]);

  const agentOptions = useMemo(
    () => agents.map((a) => ({ label: agentLabel(a), value: String(a.id) })),
    [agents],
  );

  const openCreate = () => {
    setForm({
      agentId: agentOptions[0]?.value || '',
      date: new Date().toISOString().slice(0, 10),
      montant: '',
      taux: '80',
      statut: 'En attente',
    });
    setModal({ mode: 'create' });
  };

  const openEdit = (item) => {
    setForm({
      agentId: item.agentId != null ? String(item.agentId) : '',
      date: item.date || '',
      montant: item.montant != null ? String(item.montant) : '',
      taux: item.taux != null ? String(item.taux) : '80',
      statut: item.statut || 'En attente',
    });
    setModal({ mode: 'edit', item });
  };

  const save = async () => {
    const agent = agents.find((a) => String(a.id) === String(form.agentId));
    if (!agent) {
      addToast('error', 'Bénéficiaire invalide');
      return;
    }
    const montant = Number(form.montant);
    const taux = Number(form.taux || 80);
    if (!montant || Number.isNaN(montant)) {
      addToast('error', 'Montant invalide');
      return;
    }
    const typePrestation = modal?.mode === 'edit'
      ? modal.item.typePrestation
      : typeForView(viewType, ordonnanceTypes);
    const body = {
      date: form.date,
      agentId: agent.id,
      beneficiaire: agentLabel(agent),
      typePrestation,
      montant,
      montantRemboursable: (montant * taux) / 100,
      taux,
      statut: form.statut || 'En attente',
    };

    setSaving(true);
    try {
      const isEdit = modal?.mode === 'edit';
      const url = isEdit ? `/api/ordonnances/${modal.item.id}` : '/api/ordonnances';
      await parseJsonOrThrow(await apiFetch(url, { method: isEdit ? 'PUT' : 'POST', body }));
      addToast('success', isEdit ? 'Ordonnance mise à jour' : 'Ordonnance enregistrée');
      setModal(null);
      reload();
    } catch (e) {
      addToast('error', e.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const remove = (item) => {
    Alert.alert('Supprimer', `Supprimer l'ordonnance ${item.numero} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await parseJsonOrThrow(await apiFetch(`/api/ordonnances/${item.id}`, { method: 'DELETE' }));
            addToast('success', 'Ordonnance supprimée');
            reload();
          } catch (e) {
            addToast('error', e.message || 'Erreur');
          }
        },
      },
    ]);
  };

  if (loading && !rows.length) return <LoadingCenter />;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>
        {VIEWS.map((v) => (
          <TouchableOpacity
            key={v.id}
            style={[styles.tab, viewType === v.id && styles.tabActive]}
            onPress={() => setViewType(v.id)}
          >
            <Text style={[styles.tabText, viewType === v.id && styles.tabTextActive]}>{v.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScreenToolbar>
        <SearchBar value={search} onChangeText={setSearch} placeholder="N°, bénéficiaire, montant…" />
        {canMutate && !isConsult ? (
          <PrimaryButton title="+ Ordonnance" onPress={openCreate} style={{ marginTop: 8 }} />
        ) : null}
      </ScreenToolbar>
      {filtered.length === 0 ? (
        <EmptyState text="Aucune ordonnance" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); reload(); }} />}
          contentContainerStyle={{ padding: 16, paddingBottom: TAB_BAR_EXTRA_BOTTOM + 24 }}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 8 }}>
              <ListCard
                title={item.numero || `#${item.id}`}
                subtitle={`${item.beneficiaire || '—'} · ${item.montant != null ? `${item.montant} DH` : '—'}`}
                badge={item.statut}
                onPress={() => (canMutate && !isConsult ? openEdit(item) : setModal({ mode: 'view', item }))}
              />
              {canDelete ? (
                <OutlineButton title="Supprimer" danger onPress={() => remove(item)} style={{ marginTop: 4 }} />
              ) : null}
            </View>
          )}
        />
      )}
      <AppModal
        visible={!!modal}
        title={
          modal?.mode === 'view'
            ? `Ordonnance ${modal.item?.numero}`
            : modal?.mode === 'edit'
              ? 'Modifier ordonnance'
              : 'Nouvelle ordonnance'
        }
        onClose={() => setModal(null)}
        footer={
          modal?.mode === 'view' ? null : (
            <>
              <OutlineButton title="Annuler" onPress={() => setModal(null)} style={{ flex: 1 }} />
              {canMutate ? <PrimaryButton title="Enregistrer" onPress={save} loading={saving} style={{ flex: 1 }} /> : null}
            </>
          )
        }
      >
        {modal?.mode === 'view' && modal.item ? (
          <>
            <DetailItem label="N°">{modal.item.numero}</DetailItem>
            <DetailItem label="Date">{formatDate(modal.item.date)}</DetailItem>
            <DetailItem label="Bénéficiaire">{modal.item.beneficiaire}</DetailItem>
            <DetailItem label="Type">{modal.item.typePrestation}</DetailItem>
            <DetailItem label="Montant">{modal.item.montant} DH</DetailItem>
            <DetailItem label="Remboursable">{modal.item.montantRemboursable} DH ({modal.item.taux}%)</DetailItem>
            <DetailItem label="Statut">{modal.item.statut}</DetailItem>
          </>
        ) : (
          <>
            <SelectField label="Bénéficiaire" required value={form.agentId} options={agentOptions} onChange={(v) => setForm((f) => ({ ...f, agentId: v }))} />
            <FormField label="Date" required>
              <TextField value={form.date} onChangeText={(v) => setForm((f) => ({ ...f, date: v }))} placeholder="AAAA-MM-JJ" />
            </FormField>
            <FormField label="Montant (DH)" required>
              <TextField value={form.montant} onChangeText={(v) => setForm((f) => ({ ...f, montant: v }))} keyboardType="decimal-pad" />
            </FormField>
            <FormField label="Taux remboursement (%)">
              <TextField value={form.taux} onChangeText={(v) => setForm((f) => ({ ...f, taux: v }))} keyboardType="number-pad" />
            </FormField>
            {modal?.mode === 'edit' ? (
              <SelectField label="Statut" value={form.statut} options={statuts.map((s) => ({ label: s, value: s }))} onChange={(v) => setForm((f) => ({ ...f, statut: v }))} />
            ) : null}
          </>
        )}
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { maxHeight: 48 },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.text },
  tabTextActive: { color: '#fff', fontWeight: '600' },
});
