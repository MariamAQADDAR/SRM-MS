import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, RefreshControl, Alert } from 'react-native';
import { apiFetch, parseJsonOrThrow } from '../api';
import { canAdminDelete, canStaffMutate } from '../authUtils';
import { matchesSearch } from '../utils/filterSearch';
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

export default function EtablissementsScreen({ user, addToast }) {
  const canMutate = canStaffMutate(user);
  const canDelete = canAdminDelete(user);
  const facilityTypes = DEFAULT_TYPE_CONFIG.facilityTypes || ['Hôpital', 'Clinique', 'Laboratoire', 'Opticien'];
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      setRows(await parseJsonOrThrow(await apiFetch('/api/medical-facilities')));
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
    if (!search.trim()) return rows;
    return rows.filter((e) =>
      matchesSearch(search, e.nom, e.type, e.adresse, e.telephone, e.ville, e.city, ...(e.medecins || [])),
    );
  }, [rows, search]);

  const openForm = (item = null) => {
    setForm({
      nom: item?.nom || item?.name || '',
      type: item?.type || facilityTypes[0],
      adresse: item?.adresse || item?.address || '',
      telephone: item?.telephone || item?.phone || '',
    });
    setModal(item ? { mode: 'edit', item } : { mode: 'create' });
  };

  const save = async () => {
    if (!form.nom?.trim()) {
      addToast('error', 'Nom requis');
      return;
    }
    setSaving(true);
    try {
      const body = {
        nom: form.nom.trim(),
        type: form.type,
        adresse: form.adresse || '',
        telephone: form.telephone || '',
      };
      const isEdit = modal?.mode === 'edit';
      const url = isEdit ? `/api/medical-facilities/${modal.item.id}` : '/api/medical-facilities';
      await parseJsonOrThrow(await apiFetch(url, { method: isEdit ? 'PUT' : 'POST', body }));
      addToast('success', isEdit ? 'Établissement mis à jour' : 'Établissement ajouté');
      setModal(null);
      reload();
    } catch (e) {
      addToast('error', e.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const remove = (item) => {
    Alert.alert('Supprimer', `Supprimer « ${item.nom || item.name} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await parseJsonOrThrow(await apiFetch(`/api/medical-facilities/${item.id}`, { method: 'DELETE' }));
            addToast('success', 'Établissement supprimé');
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
        <SearchBar value={search} onChangeText={setSearch} placeholder="Nom, type, adresse…" />
        {canMutate ? <PrimaryButton title="+ Établissement" onPress={() => openForm()} style={{ marginTop: 8 }} /> : null}
      </ScreenToolbar>
      {filtered.length === 0 ? (
        <EmptyState text="Aucun établissement" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); reload(); }} />}
          contentContainerStyle={{ padding: 16, paddingBottom: TAB_BAR_EXTRA_BOTTOM + 24 }}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 8 }}>
              <ListCard
                title={item.nom || item.name}
                subtitle={`${item.type || '—'} · ${item.adresse || item.ville || '—'}`}
                badge={item.telephone || item.phone}
                onPress={() => openForm(item)}
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
        title={modal?.mode === 'edit' ? 'Modifier établissement' : 'Nouvel établissement'}
        onClose={() => setModal(null)}
        footer={
          <>
            <OutlineButton title="Annuler" onPress={() => setModal(null)} style={{ flex: 1 }} />
            {canMutate ? <PrimaryButton title="Enregistrer" onPress={save} loading={saving} style={{ flex: 1 }} /> : null}
          </>
        }
      >
        <FormField label="Nom" required>
          <TextField value={form.nom} onChangeText={(v) => setForm((f) => ({ ...f, nom: v }))} editable={canMutate} />
        </FormField>
        <SelectField
          label="Type"
          value={form.type}
          options={facilityTypes.map((t) => ({ label: t, value: t }))}
          onChange={(v) => setForm((f) => ({ ...f, type: v }))}
        />
        <FormField label="Adresse">
          <TextField value={form.adresse} onChangeText={(v) => setForm((f) => ({ ...f, adresse: v }))} multiline editable={canMutate} />
        </FormField>
        <FormField label="Téléphone">
          <TextField value={form.telephone} onChangeText={(v) => setForm((f) => ({ ...f, telephone: v }))} keyboardType="phone-pad" editable={canMutate} />
        </FormField>
      </AppModal>
    </View>
  );
}
