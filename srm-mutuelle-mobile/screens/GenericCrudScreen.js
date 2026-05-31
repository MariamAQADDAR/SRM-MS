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
  ScreenToolbar,
  EmptyState,
  LoadingCenter,
  TAB_BAR_EXTRA_BOTTOM,
} from '../components/ui';

/**
 * Écran CRUD générique pour les référentiels (entités, établissements, maladies, ordonnances…).
 */
export default function GenericCrudScreen({ config, user, addToast }) {
  const canMutate = config.canMutate ? config.canMutate(user) : canStaffMutate(user);
  const canDelete = config.canDelete ? config.canDelete(user) : canAdminDelete(user);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [extraData, setExtraData] = useState({});

  const reload = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const reqs = [apiFetch(config.endpoint)];
      if (config.extraLoads) {
        config.extraLoads.forEach((l) => reqs.push(apiFetch(l.path)));
      }
      const out = await Promise.all(reqs.map((p) => p.then((r) => parseJsonOrThrow(r))));
      setRows(out[0]);
      if (config.extraLoads) {
        const extra = {};
        config.extraLoads.forEach((l, i) => {
          extra[l.key] = out[i + 1];
        });
        setExtraData(extra);
      }
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [config, addToast]);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    return rows.filter((r) => matchesSearch(search, ...config.searchFields.map((f) => (typeof f === 'function' ? f(r) : r[f]))));
  }, [rows, search, config.searchFields]);

  const emptyForm = () => {
    const f = {};
    config.fields.forEach((field) => {
      f[field.key] = field.defaultValue ?? '';
    });
    return f;
  };

  const openForm = (item = null) => {
    if (item) {
      const f = {};
      config.fields.forEach((field) => {
        f[field.key] = item[field.key] != null ? String(item[field.key]) : '';
      });
      setForm(f);
      setModal({ mode: 'edit', item });
    } else {
      setForm(emptyForm());
      setModal({ mode: 'create' });
    }
  };

  const save = async () => {
    for (const field of config.fields) {
      if (field.required && !String(form[field.key] || '').trim()) {
        addToast('error', `${field.label} requis`);
        return;
      }
    }
    setSaving(true);
    try {
      const body = config.buildBody ? config.buildBody(form, extraData) : { ...form };
      const isEdit = modal?.mode === 'edit';
      const url = isEdit ? `${config.endpoint}/${modal.item.id}` : config.endpoint;
      await parseJsonOrThrow(await apiFetch(url, { method: isEdit ? 'PUT' : 'POST', body }));
      addToast('success', isEdit ? 'Enregistrement mis à jour' : 'Enregistrement créé');
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
      await parseJsonOrThrow(await apiFetch(`${config.endpoint}/${item.id}`, { method: 'DELETE' }));
      addToast('success', 'Supprimé');
      setModal(null);
      reload();
    } catch (e) {
      addToast('error', e.message || 'Suppression impossible');
    }
  };

  const titleOf = (item) => (config.titleField ? item[config.titleField] : item.id);
  const subtitleOf = (item) => (config.subtitleField ? item[config.subtitleField] : '');

  return (
    <View style={{ flex: 1 }}>
      <SearchBar value={search} onChangeText={setSearch} placeholder={config.searchPlaceholder || 'Rechercher…'} />
      <ScreenToolbar>{canMutate ? <PrimaryButton title={config.createLabel || '+ Ajouter'} onPress={() => openForm(null)} /> : null}</ScreenToolbar>
      {loading ? (
        <LoadingCenter />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload(true)} />}
          renderItem={({ item }) => (
            <ListCard title={String(titleOf(item))} subtitle={String(subtitleOf(item) || '')} badge={config.badgeField ? item[config.badgeField] : null} onPress={() => setModal({ mode: 'detail', item })} />
          )}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={{ paddingBottom: TAB_BAR_EXTRA_BOTTOM + 16 }}
        />
      )}

      <AppModal visible={modal?.mode === 'detail'} title={config.detailTitle || 'Détail'} onClose={() => setModal(null)} footer={<><OutlineButton title="Fermer" onPress={() => setModal(null)} style={{ flex: 1 }} />{canMutate ? <PrimaryButton title="Modifier" onPress={() => openForm(modal.item)} style={{ flex: 1 }} /> : null}</>}>
        {modal?.item && config.fields.map((f) => <DetailItem key={f.key} label={f.label}>{String(modal.item[f.key] ?? '—')}</DetailItem>)}
        {canDelete ? <OutlineButton title="Supprimer" danger onPress={() => remove(modal.item)} style={{ marginTop: 12 }} /> : null}
      </AppModal>

      <AppModal visible={modal?.mode === 'create' || modal?.mode === 'edit'} title={modal?.mode === 'edit' ? 'Modifier' : 'Nouveau'} onClose={() => setModal(null)} footer={<PrimaryButton title="Enregistrer" onPress={save} loading={saving} style={{ flex: 1 }} />}>
        {config.fields.map((field) => {
          if (field.type === 'select') {
            const opts = typeof field.options === 'function' ? field.options(extraData) : field.options;
            return (
              <SelectField key={field.key} label={field.label} required={field.required} value={form[field.key]} options={opts} onChange={(v) => setForm((f) => ({ ...f, [field.key]: v }))} />
            );
          }
          return (
            <FormField key={field.key} label={field.label} required={field.required}>
              <TextField value={form[field.key]} onChangeText={(v) => setForm((f) => ({ ...f, [field.key]: v }))} keyboardType={field.keyboardType} multiline={field.multiline} />
            </FormField>
          );
        })}
      </AppModal>
    </View>
  );
}
