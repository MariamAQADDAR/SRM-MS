import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiFetch, parseJsonOrThrow } from '../api';
import { canStaffMutate } from '../authUtils';
import { matchesSearch } from '../utils/filterSearch';
import { orgEntityPath } from '../utils/orgEntity';
import {
  SearchBar,
  ListCard,
  AppModal,
  DetailItem,
  LoadingCenter,
  EmptyState,
  PrimaryButton,
  OutlineButton,
  FormField,
  TextField,
  SelectField,
  TAB_BAR_EXTRA_BOTTOM,
} from '../components/ui';
import { COLORS } from '../theme';
import { DEFAULT_TYPE_CONFIG } from '../typeConfig';

const TYPE_ORDER = ['Direction générale', 'Direction', 'Département', 'Division', 'Service'];
const PARENT_TYPE_FOR = {
  'Direction générale': null,
  Direction: 'Direction générale',
  Département: 'Direction',
  Division: 'Département',
  Service: 'Division',
};

function buildTree(rows) {
  const byId = Object.fromEntries(rows.map((r) => [r.id, { ...r, children: [] }]));
  const roots = [];
  rows.forEach((r) => {
    const node = byId[r.id];
    if (r.parentId != null && byId[r.parentId]) byId[r.parentId].children.push(node);
    else roots.push(node);
  });
  const sortNodes = (list) => {
    list.sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'));
    list.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}

function TreeRow({ node, depth, expanded, onToggle, onPress }) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  return (
    <>
      <TouchableOpacity
        style={[styles.treeRow, { paddingLeft: 12 + depth * 14 }]}
        onPress={() => onPress(node)}
        activeOpacity={0.7}
      >
        <TouchableOpacity
          style={styles.toggle}
          onPress={() => hasChildren && onToggle(node.id)}
          hitSlop={8}
        >
          {hasChildren ? (
            <FontAwesome5 name={isOpen ? 'chevron-down' : 'chevron-right'} size={11} color={COLORS.textLight} />
          ) : (
            <View style={{ width: 11 }} />
          )}
        </TouchableOpacity>
        <Text style={styles.code}>{node.code}</Text>
        <Text style={styles.name} numberOfLines={2}>{node.nom}</Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{node.type}</Text>
        </View>
      </TouchableOpacity>
      {hasChildren && isOpen
        ? node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onPress={onPress}
            />
          ))
        : null}
    </>
  );
}

export default function EntitesScreen({ user, addToast }) {
  const canMutate = canStaffMutate(user);
  const entityTypes = DEFAULT_TYPE_CONFIG.entityTypes || TYPE_ORDER;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [expanded, setExpanded] = useState(new Set());
  const [detail, setDetail] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState({ code: '', nom: '', type: entityTypes[0], parentId: '' });
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = await parseJsonOrThrow(await apiFetch('/api/organizational-entities'));
      setRows(data);
      const dg = data.find((x) => x.type === 'Direction générale');
      setExpanded(new Set(dg ? [dg.id] : data.filter((x) => !x.parentId).map((x) => x.id)));
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

  const parentName = (parentId) => {
    if (parentId == null) return '—';
    const p = rows.find((x) => x.id === parentId);
    return p ? p.nom : '—';
  };

  const filteredRows = useMemo(() => {
    let list = rows;
    if (typeFilter) list = list.filter((e) => e.type === typeFilter);
    if (search.trim()) {
      list = list.filter((e) => matchesSearch(search, e.code, e.nom, e.type, parentName(e.parentId)));
    }
    return list;
  }, [rows, search, typeFilter]);

  const treeRoots = useMemo(() => buildTree(filteredRows), [filteredRows]);

  const typeStats = useMemo(() => {
    const counts = {};
    rows.forEach((r) => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return TYPE_ORDER.filter((t) => counts[t]).map((t) => ({ type: t, count: counts[t] }));
  }, [rows]);

  const toggleExpanded = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreate = () => {
    setForm({ code: '', nom: '', type: entityTypes[0], parentId: '' });
    setEditModal({ mode: 'create' });
  };

  const openEdit = (entity) => {
    setForm({
      code: entity.code || '',
      nom: entity.nom || '',
      type: entity.type || entityTypes[0],
      parentId: entity.parentId != null ? String(entity.parentId) : '',
    });
    setEditModal({ mode: 'edit', entity });
    setDetail(null);
  };

  const parentOptions = useMemo(() => {
    const requiredParentType = PARENT_TYPE_FOR[form.type];
    if (!requiredParentType) return [];
    return rows
      .filter((e) => e.type === requiredParentType && e.id !== editModal?.entity?.id)
      .map((e) => ({ label: `${e.code} — ${e.nom}`, value: String(e.id) }));
  }, [rows, form.type, editModal]);

  const saveEntity = async () => {
    if (!form.nom.trim()) {
      addToast('error', 'Le nom est requis');
      return;
    }
    setSaving(true);
    try {
      const body = {
        code: form.code,
        nom: form.nom,
        type: form.type,
        parentId: form.parentId ? Number(form.parentId) : null,
      };
      const isEdit = editModal?.mode === 'edit';
      const url = isEdit
        ? `/api/organizational-entities/${editModal.entity.id}`
        : '/api/organizational-entities';
      await parseJsonOrThrow(await apiFetch(url, { method: isEdit ? 'PUT' : 'POST', body }));
      addToast('success', isEdit ? 'Entité mise à jour' : 'Entité enregistrée');
      setEditModal(null);
      reload();
    } catch (e) {
      addToast('error', e.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingCenter />;

  return (
    <View style={styles.screen}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Code, nom, type…" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chipsContent}>
        <TouchableOpacity
          style={[styles.chip, !typeFilter && styles.chipActive]}
          onPress={() => setTypeFilter('')}
        >
          <Text style={[styles.chipText, !typeFilter && styles.chipTextActive]}>Tous ({rows.length})</Text>
        </TouchableOpacity>
        {typeStats.map(({ type, count }) => (
          <TouchableOpacity
            key={type}
            style={[styles.chip, typeFilter === type && styles.chipActive]}
            onPress={() => setTypeFilter(typeFilter === type ? '' : type)}
          >
            <Text style={[styles.chipText, typeFilter === type && styles.chipTextActive]}>
              {type} ({count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.toolbar}>
        <OutlineButton title="Tout déplier" onPress={() => setExpanded(new Set(filteredRows.map((r) => r.id)))} />
        <OutlineButton title="Replier" onPress={() => {
          const dg = filteredRows.find((x) => x.type === 'Direction générale');
          setExpanded(new Set(dg ? [dg.id] : []));
        }} />
        {canMutate ? <PrimaryButton title="+ Entité" onPress={openCreate} style={{ flex: 1 }} /> : null}
      </View>
      {treeRoots.length === 0 ? (
        <EmptyState text="Aucune entité trouvée" />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); reload(); }} />}
          contentContainerStyle={{ paddingBottom: TAB_BAR_EXTRA_BOTTOM + 24 }}
        >
          {treeRoots.map((node) => (
            <TreeRow
              key={node.id}
              node={node}
              depth={0}
              expanded={expanded}
              onToggle={toggleExpanded}
              onPress={setDetail}
            />
          ))}
        </ScrollView>
      )}

      <AppModal visible={!!detail} title="Détail entité" onClose={() => setDetail(null)}>
        {detail ? (
          <>
            <DetailItem label="Code">{detail.code}</DetailItem>
            <DetailItem label="Nom">{detail.nom}</DetailItem>
            <DetailItem label="Type">{detail.type}</DetailItem>
            <DetailItem label="Entité parente">{parentName(detail.parentId)}</DetailItem>
            <DetailItem label="Chemin">{orgEntityPath(rows, detail.id)}</DetailItem>
            {canMutate ? (
              <PrimaryButton title="Modifier" onPress={() => openEdit(detail)} style={{ marginTop: 16 }} />
            ) : null}
          </>
        ) : null}
      </AppModal>

      <AppModal
        visible={!!editModal}
        title={editModal?.mode === 'edit' ? 'Modifier entité' : 'Nouvelle entité'}
        onClose={() => setEditModal(null)}
        footer={
          <>
            <OutlineButton title="Annuler" onPress={() => setEditModal(null)} style={{ flex: 1 }} />
            <PrimaryButton title="Enregistrer" onPress={saveEntity} loading={saving} style={{ flex: 1 }} />
          </>
        }
      >
        <FormField label="Code">
          <TextField value={form.code} onChangeText={(v) => setForm((f) => ({ ...f, code: v }))} />
        </FormField>
        <FormField label="Nom" required>
          <TextField value={form.nom} onChangeText={(v) => setForm((f) => ({ ...f, nom: v }))} />
        </FormField>
        <SelectField
          label="Type"
          value={form.type}
          options={entityTypes.map((t) => ({ label: t, value: t }))}
          onChange={(v) => setForm((f) => ({ ...f, type: v, parentId: '' }))}
          required
        />
        {parentOptions.length > 0 ? (
          <SelectField
            label="Entité parente"
            value={form.parentId}
            options={[{ label: '— Aucune —', value: '' }, ...parentOptions]}
            onChange={(v) => setForm((f) => ({ ...f, parentId: v }))}
          />
        ) : null}
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  chipsRow: { maxHeight: 44, marginBottom: 8 },
  chipsContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.text },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  toolbar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8, flexWrap: 'wrap' },
  treeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  toggle: { width: 24, alignItems: 'center', marginRight: 4 },
  code: { fontSize: 11, color: COLORS.textLight, width: 72, fontFamily: 'monospace' },
  name: { flex: 1, fontSize: 13, color: COLORS.text, marginRight: 8 },
  typeBadge: {
    backgroundColor: `${COLORS.primary}18`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: 100,
  },
  typeBadgeText: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
});
