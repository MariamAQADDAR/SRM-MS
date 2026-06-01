import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, RefreshControl, Alert } from 'react-native';
import { apiFetch, parseJsonOrThrow } from '../api';
import { canAdminDelete, canStaffMutate, isAdherentRole } from '../authUtils';
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

const STATUTS = ['En attente', 'En cours', 'Validé'];

function agentLabel(a) {
  return `${a.prenom || ''} ${a.nom || ''}`.trim();
}

export default function MaladiesScreen({ user, addToast }) {
  const canMutate = canStaffMutate(user);
  const canDelete = canAdminDelete(user);
  const adherent = isAdherentRole(user);
  const maladieTypes = DEFAULT_TYPE_CONFIG.maladieTypes || ['ALD', 'Chronique', 'Aiguë'];
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
      const diseases = await parseJsonOrThrow(await apiFetch('/api/special-diseases'));
      setRows(diseases);
      if (!adherent && canMutate) {
        setAgents(await parseJsonOrThrow(await apiFetch('/api/agents')));
      }
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast, adherent, canMutate]);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    return rows.filter((d) => matchesSearch(search, d.numero, d.typeMaladie, d.beneficiaire, d.statut));
  }, [rows, search]);

  const agentOptions = useMemo(
    () => agents.map((a) => ({ label: agentLabel(a), value: String(a.id) })),
    [agents],
  );

  const openCreate = () => {
    setForm({
      agentId: agentOptions[0]?.value || '',
      typeMaladie: maladieTypes[0],
      dateDeclaration: new Date().toISOString().slice(0, 10),
      statut: 'En attente',
    });
    setModal({ mode: 'create' });
  };

  const openEdit = (item) => {
    const ag = agents.find((a) => a.id === item.agentId);
    setForm({
      agentId: item.agentId != null ? String(item.agentId) : '',
      typeMaladie: item.typeMaladie || maladieTypes[0],
      dateDeclaration: item.dateDeclaration || '',
      statut: item.statut || 'En attente',
      beneficiaire: item.beneficiaire || (ag ? agentLabel(ag) : ''),
    });
    setModal({ mode: 'edit', item });
  };

  const save = async () => {
    const agent = agents.find((a) => String(a.id) === String(form.agentId));
    if (!agent) {
      addToast('error', 'Bénéficiaire invalide');
      return;
    }
    const body = {
      typeMaladie: form.typeMaladie,
      dateDeclaration: form.dateDeclaration,
      agentId: agent.id,
      beneficiaire: agentLabel(agent),
      statut: form.statut || 'En attente',
    };
    if (modal?.mode === 'edit') body.numero = modal.item.numero;

    setSaving(true);
    try {
      const isEdit = modal?.mode === 'edit';
      const url = isEdit ? `/api/special-diseases/${modal.item.id}` : '/api/special-diseases';
      await parseJsonOrThrow(await apiFetch(url, { method: isEdit ? 'PUT' : 'POST', body }));
      addToast('success', isEdit ? 'Dossier mis à jour' : 'Dossier créé');
      setModal(null);
      reload();
    } catch (e) {
      addToast('error', e.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const remove = (item) => {
    Alert.alert('Supprimer', `Supprimer le dossier ${item.numero} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await parseJsonOrThrow(await apiFetch(`/api/special-diseases/${item.id}`, { method: 'DELETE' }));
            addToast('success', 'Dossier supprimé');
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
      <ScreenToolbar>
        <SearchBar value={search} onChangeText={setSearch} placeholder="N°, type, bénéficiaire…" />
        {canMutate ? <PrimaryButton title="+ Maladie spéciale" onPress={openCreate} style={{ marginTop: 8 }} /> : null}
      </ScreenToolbar>
      {filtered.length === 0 ? (
        <EmptyState text="Aucun dossier ALD" />
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
                subtitle={`${item.typeMaladie} · ${item.beneficiaire || '—'}`}
                badge={item.statut}
                onPress={() => (canMutate ? openEdit(item) : setModal({ mode: 'view', item }))}
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
            ? `Dossier ${modal.item?.numero}`
            : modal?.mode === 'edit'
              ? 'Modifier dossier ALD'
              : 'Nouveau dossier ALD'
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
            <DetailItem label="Type">{modal.item.typeMaladie}</DetailItem>
            <DetailItem label="Bénéficiaire">{modal.item.beneficiaire}</DetailItem>
            <DetailItem label="Date">{formatDate(modal.item.dateDeclaration)}</DetailItem>
            <DetailItem label="Statut">{modal.item.statut}</DetailItem>
          </>
        ) : (
          <>
            <SelectField label="Bénéficiaire (agent)" required value={form.agentId} options={agentOptions} onChange={(v) => setForm((f) => ({ ...f, agentId: v }))} />
            <SelectField label="Type maladie" value={form.typeMaladie} options={maladieTypes.map((t) => ({ label: t, value: t }))} onChange={(v) => setForm((f) => ({ ...f, typeMaladie: v }))} />
            <FormField label="Date déclaration" required>
              <TextField value={form.dateDeclaration} onChangeText={(v) => setForm((f) => ({ ...f, dateDeclaration: v }))} placeholder="AAAA-MM-JJ" />
            </FormField>
            {modal?.mode === 'edit' ? (
              <SelectField label="Statut" value={form.statut} options={STATUTS.map((s) => ({ label: s, value: s }))} onChange={(v) => setForm((f) => ({ ...f, statut: v }))} />
            ) : null}
          </>
        )}
      </AppModal>
    </View>
  );
}
