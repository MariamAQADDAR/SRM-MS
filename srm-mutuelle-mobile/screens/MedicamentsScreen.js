import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
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
  StatusBadge,
  ScreenToolbar,
  EmptyState,
  LoadingCenter,
  TAB_BAR_EXTRA_BOTTOM,
} from '../components/ui';

export default function MedicamentsScreen({ user, addToast }) {
  const canMutate = canStaffMutate(user);
  const canDelete = canAdminDelete(user);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', ean13: '', therapeuticClass: '', form: '', presentation: '', type: 'Princeps', reimbursed: 'true', note: '' });
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setRows(await parseJsonOrThrow(await apiFetch('/api/medicines')));
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
    return rows.filter((m) =>
      matchesSearch(search, m.ean13, m.name, m.therapeuticClass, m.form, m.presentation, m.type, m.reimbursed ? 'oui' : 'non', m.note),
    );
  }, [rows, search]);

  const openEdit = (item = null) => {
    setForm(
      item
        ? {
            name: item.name || '',
            ean13: item.ean13 || '',
            therapeuticClass: item.therapeuticClass || '',
            form: item.form || '',
            presentation: item.presentation || '',
            type: item.type || 'Princeps',
            reimbursed: item.reimbursed ? 'true' : 'false',
            note: item.note || '',
          }
        : { name: '', ean13: '', therapeuticClass: '', form: '', presentation: '', type: 'Princeps', reimbursed: 'true', note: '' },
    );
    setModal({ mode: item ? 'edit' : 'create', item });
  };

  const save = async () => {
    if (!form.name.trim()) {
      addToast('error', 'Nom requis');
      return;
    }
    setSaving(true);
    try {
      const body = { ...form, reimbursed: form.reimbursed === 'true' };
      const isEdit = modal?.mode === 'edit';
      const url = isEdit ? `/api/medicines/${modal.item.id}` : '/api/medicines';
      await parseJsonOrThrow(await apiFetch(url, { method: isEdit ? 'PUT' : 'POST', body }));
      addToast('success', isEdit ? 'Médicament mis à jour' : 'Médicament ajouté');
      setModal(null);
      reload();
    } catch (e) {
      addToast('error', e.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    try {
      await parseJsonOrThrow(await apiFetch(`/api/medicines/${item.id}`, { method: 'DELETE' }));
      addToast('success', 'Médicament supprimé');
      setModal(null);
      reload();
    } catch (e) {
      addToast('error', e.message || 'Suppression impossible');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="EAN13, spécialité, classe…" />
      <ScreenToolbar>{canMutate ? <PrimaryButton title="+ Médicament" onPress={() => openEdit(null)} /> : null}</ScreenToolbar>
      {loading ? (
        <LoadingCenter />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload(true)} />}
          renderItem={({ item }) => (
            <ListCard
              title={item.name}
              subtitle={`${item.ean13 || '—'} · ${item.therapeuticClass || '—'}`}
              badge={item.reimbursed ? 'Remboursable' : 'Non remb.'}
              onPress={() => setModal({ mode: 'detail', item })}
            />
          )}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={{ paddingBottom: TAB_BAR_EXTRA_BOTTOM + 16 }}
        />
      )}

      <AppModal
        visible={modal?.mode === 'detail'}
        title="Fiche médicament"
        onClose={() => setModal(null)}
        footer={
          <>
            {canMutate ? <PrimaryButton title="Modifier" style={{ flex: 1 }} onPress={() => openEdit(modal.item)} /> : null}
            {canDelete ? <OutlineButton title="Supprimer" danger style={{ flex: 1 }} onPress={() => remove(modal.item)} /> : null}
            <OutlineButton title="Fermer" style={{ flex: 1 }} onPress={() => setModal(null)} />
          </>
        }
      >
        {modal?.item && (
          <>
            <DetailItem label="Spécialité">{modal.item.name}</DetailItem>
            <DetailItem label="EAN13">{modal.item.ean13 || '—'}</DetailItem>
            <DetailItem label="Classe">{modal.item.therapeuticClass || '—'}</DetailItem>
            <DetailItem label="Forme">{modal.item.form || '—'}</DetailItem>
            <DetailItem label="Présentation">{modal.item.presentation || '—'}</DetailItem>
            <DetailItem label="Type">{modal.item.type || '—'}</DetailItem>
            <StatusBadge value={modal.item.reimbursed ? 'Remboursable Oui' : 'Remboursable Non'} />
            <DetailItem label="Note">{modal.item.note || '—'}</DetailItem>
          </>
        )}
      </AppModal>

      <AppModal
        visible={modal?.mode === 'create' || modal?.mode === 'edit'}
        title={modal?.mode === 'edit' ? 'Modifier médicament' : 'Nouveau médicament'}
        onClose={() => setModal(null)}
        footer={<PrimaryButton title="Enregistrer" onPress={save} loading={saving} style={{ flex: 1 }} />}
      >
        <FormField label="Nom spécialité" required><TextField value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} /></FormField>
        <FormField label="EAN13"><TextField value={form.ean13} onChangeText={(v) => setForm((f) => ({ ...f, ean13: v }))} /></FormField>
        <FormField label="Classe thérapeutique"><TextField value={form.therapeuticClass} onChangeText={(v) => setForm((f) => ({ ...f, therapeuticClass: v }))} /></FormField>
        <FormField label="Forme"><TextField value={form.form} onChangeText={(v) => setForm((f) => ({ ...f, form: v }))} /></FormField>
        <FormField label="Présentation"><TextField value={form.presentation} onChangeText={(v) => setForm((f) => ({ ...f, presentation: v }))} /></FormField>
        <SelectField label="Remboursable" value={form.reimbursed} options={[{ label: 'Oui', value: 'true' }, { label: 'Non', value: 'false' }]} onChange={(v) => setForm((f) => ({ ...f, reimbursed: v }))} />
        <FormField label="Note"><TextField value={form.note} onChangeText={(v) => setForm((f) => ({ ...f, note: v }))} multiline /></FormField>
      </AppModal>
    </View>
  );
}
