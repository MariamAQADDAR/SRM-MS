import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, RefreshControl, Alert, Switch, Text } from 'react-native';
import { apiFetch, parseJsonOrThrow } from '../api';
import { isAdminRole, isStaffWriterRole } from '../authUtils';
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

const ROLE_LABEL = {
  ADMINISTRATEUR: 'Administrateur',
  OPERATEUR: 'Opérateur',
  CONSULTATEUR: 'Consultateur',
  ADHERENT: 'Adhérent',
};

const ROLES = [
  { value: 'ADMINISTRATEUR', label: 'Administrateur' },
  { value: 'OPERATEUR', label: 'Opérateur' },
  { value: 'CONSULTATEUR', label: 'Consultateur' },
  { value: 'ADHERENT', label: 'Adhérent' },
];

function agentFullName(agent) {
  if (!agent) return '';
  return `${agent.prenom || ''} ${agent.nom || ''}`.trim();
}

function formatAgentOption(a) {
  const n = agentFullName(a);
  return n ? `${a.matricule || '—'} — ${n}` : a.matricule || '—';
}

export default function UtilisateursScreen({ user, addToast }) {
  const allowAdminRole = isAdminRole(user);
  const canAccess = isStaffWriterRole(user);
  const [rows, setRows] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [showPwd, setShowPwd] = useState(false);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [users, ag] = await Promise.all([
        parseJsonOrThrow(await apiFetch('/api/admin/users')),
        parseJsonOrThrow(await apiFetch('/api/agents')),
      ]);
      setRows(users);
      setAgents(ag);
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (canAccess) reload();
  }, [canAccess, reload]);

  const agentAdherentByAgentId = useMemo(() => {
    const map = new Map();
    rows.forEach((u) => {
      if (u.role === 'ADHERENT' && u.agentId != null) map.set(u.agentId, u.email);
    });
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    return rows.filter((u) =>
      matchesSearch(search, u.fullName, u.email, ROLE_LABEL[u.role] || u.role, u.active ? 'actif' : 'inactif'),
    );
  }, [rows, search]);

  const roleOptions = useMemo(
    () => (allowAdminRole ? ROLES : ROLES.filter((r) => r.value !== 'ADMINISTRATEUR')),
    [allowAdminRole],
  );

  const openCreate = () => {
    setShowPwd(false);
    setForm({ role: 'OPERATEUR', fullName: '', email: '', password: '', agentId: '' });
    setModal({ mode: 'create' });
  };

  const openEdit = (urow) => {
    if (!allowAdminRole && urow.role === 'ADMINISTRATEUR') {
      addToast('warning', 'Seul un administrateur peut modifier ce compte');
      return;
    }
    setShowPwd(false);
    setForm({
      role: urow.role || 'OPERATEUR',
      fullName: urow.fullName || '',
      email: urow.email || '',
      password: '',
      agentId: urow.agentId != null ? String(urow.agentId) : '',
    });
    setModal({ mode: 'edit', urow });
  };

  const freeAgents = useMemo(() => {
    if (modal?.mode !== 'create') return agents;
    return agents.filter((a) => !agentAdherentByAgentId.has(a.id));
  }, [agents, agentAdherentByAgentId, modal]);

  const availableAgents = useMemo(() => {
    if (modal?.mode !== 'edit') return freeAgents;
    return agents.filter((a) => !agentAdherentByAgentId.has(a.id) || a.id === modal.urow?.agentId);
  }, [agents, agentAdherentByAgentId, modal, freeAgents]);

  const agentOptions = useMemo(
    () => availableAgents.map((a) => ({ label: formatAgentOption(a), value: String(a.id) })),
    [availableAgents],
  );

  const onAgentPick = (agentId) => {
    const a = agents.find((x) => String(x.id) === String(agentId));
    setForm((f) => ({
      ...f,
      agentId,
      fullName: a ? agentFullName(a) : f.fullName,
    }));
  };

  const saveUser = async () => {
    const isEdit = modal?.mode === 'edit';
    const roleVal = form.role;
    const resolvedAgentId = form.agentId ? Number(form.agentId) : null;
    const needsAgent = roleVal === 'ADHERENT' || roleVal === 'ADMINISTRATEUR';

    if (!form.email?.trim()) {
      addToast('error', 'E-mail requis');
      return;
    }
    if (!isEdit && !form.password?.trim()) {
      addToast('error', 'Mot de passe requis');
      return;
    }
    if (roleVal === 'ADHERENT' && !resolvedAgentId) {
      addToast('warning', 'Choisissez le porteur mutuelle');
      return;
    }
    if (roleVal === 'ADHERENT') {
      const taken = agentAdherentByAgentId.get(resolvedAgentId);
      if (taken && (!isEdit || modal.urow?.agentId !== resolvedAgentId)) {
        addToast('warning', `Porteur déjà lié à ${taken}`);
        return;
      }
    }

    const body = {
      fullName: form.fullName?.trim() || agentFullName(agents.find((a) => a.id === resolvedAgentId)),
      role: roleVal,
      agentId: needsAgent && resolvedAgentId ? resolvedAgentId : null,
    };
    if (!isEdit) {
      body.email = form.email.trim();
      body.password = form.password;
    } else if (form.password?.trim()) {
      body.password = form.password.trim();
    }

    setSaving(true);
    try {
      const url = isEdit ? `/api/admin/users/${modal.urow.id}` : '/api/admin/users';
      await parseJsonOrThrow(await apiFetch(url, { method: isEdit ? 'PUT' : 'POST', body }));
      addToast('success', isEdit ? 'Utilisateur mis à jour' : 'Utilisateur créé');
      setModal(null);
      reload(true);
    } catch (e) {
      addToast('error', e.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (urow) => {
    const isSelf = user?.id === urow.id || user?.email === urow.email;
    if (isSelf && urow.active) {
      addToast('warning', 'Vous ne pouvez pas désactiver votre propre compte');
      return;
    }
    if (!allowAdminRole && urow.role === 'ADMINISTRATEUR') return;
    setTogglingId(urow.id);
    try {
      await parseJsonOrThrow(
        await apiFetch(`/api/admin/users/${urow.id}/active`, {
          method: 'PATCH',
          body: { active: !urow.active },
        }),
      );
      addToast('success', urow.active ? 'Compte désactivé' : 'Compte activé');
      reload(true);
    } catch (e) {
      addToast('error', e.message || 'Erreur');
    } finally {
      setTogglingId(null);
    }
  };

  const removeUser = (urow) => {
    if (user?.id === urow.id) {
      addToast('warning', 'Impossible de supprimer votre propre compte');
      return;
    }
    Alert.alert('Supprimer', `Supprimer « ${urow.fullName || urow.email} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await parseJsonOrThrow(await apiFetch(`/api/admin/users/${urow.id}`, { method: 'DELETE' }));
            addToast('success', 'Utilisateur supprimé');
            reload(true);
          } catch (e) {
            addToast('error', e.message || 'Erreur');
          }
        },
      },
    ]);
  };

  if (!canAccess) {
    return <EmptyState text="Accès réservé aux opérateurs et administrateurs" />;
  }
  if (loading && !rows.length) return <LoadingCenter />;

  return (
    <View style={{ flex: 1 }}>
      <ScreenToolbar>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Nom, e-mail, rôle…" />
        <PrimaryButton title="+ Utilisateur" onPress={openCreate} style={{ marginTop: 8 }} />
      </ScreenToolbar>
      {filtered.length === 0 ? (
        <EmptyState text="Aucun utilisateur" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); reload(true); }} />}
          contentContainerStyle={{ padding: 16, paddingBottom: TAB_BAR_EXTRA_BOTTOM + 24 }}
          renderItem={({ item: u }) => {
            const isSelf = user?.id === u.id;
            const canEdit = allowAdminRole || u.role !== 'ADMINISTRATEUR';
            return (
              <View style={{ marginBottom: 10 }}>
                <ListCard
                  title={u.fullName || u.email}
                  subtitle={`${u.email} · ${ROLE_LABEL[u.role] || u.role}`}
                  badge={u.active ? 'Actif' : 'Inactif'}
                  onPress={canEdit ? () => openEdit(u) : undefined}
                  rightIcon={canEdit ? 'pen' : 'chevron-right'}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 4 }}>
                  <Text style={{ fontSize: 12, color: '#64748b', flex: 1 }}>
                    Dernier accès : {u.lastLoginAt ? formatDate(u.lastLoginAt) : '—'}
                  </Text>
                  <Switch
                    value={!!u.active}
                    onValueChange={() => toggleActive(u)}
                    disabled={togglingId === u.id || (isSelf && u.active) || (!allowAdminRole && u.role === 'ADMINISTRATEUR')}
                  />
                </View>
                {allowAdminRole && !isSelf ? (
                  <OutlineButton title="Supprimer" danger onPress={() => removeUser(u)} style={{ marginTop: 6 }} />
                ) : null}
              </View>
            );
          }}
        />
      )}

      <AppModal
        visible={!!modal}
        title={modal?.mode === 'edit' ? 'Modifier utilisateur' : 'Nouvel utilisateur'}
        onClose={() => setModal(null)}
        footer={
          <>
            <OutlineButton title="Annuler" onPress={() => setModal(null)} style={{ flex: 1 }} />
            <PrimaryButton title="Enregistrer" onPress={saveUser} loading={saving} style={{ flex: 1 }} />
          </>
        }
      >
        {modal?.mode === 'create' ? (
          <FormField label="E-mail" required>
            <TextField value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} keyboardType="email-address" autoCapitalize="none" />
          </FormField>
        ) : (
          <DetailItem label="E-mail">{modal?.urow?.email}</DetailItem>
        )}
        <SelectField label="Rôle" required value={form.role} options={roleOptions} onChange={(v) => setForm((f) => ({ ...f, role: v, agentId: '' }))} />
        {form.role === 'ADHERENT' ? (
          <SelectField
            label="Porteur mutuelle"
            required
            value={form.agentId}
            options={agentOptions}
            onChange={onAgentPick}
          />
        ) : (
          <FormField label="Nom complet" required>
            <TextField value={form.fullName} onChangeText={(v) => setForm((f) => ({ ...f, fullName: v }))} />
          </FormField>
        )}
        {form.role === 'ADMINISTRATEUR' ? (
          <SelectField
            label="Porteur lié (optionnel)"
            value={form.agentId}
            options={[{ label: '— Aucun —', value: '' }, ...agents.map((a) => ({ label: formatAgentOption(a), value: String(a.id) }))]}
            onChange={onAgentPick}
          />
        ) : null}
        <FormField label={modal?.mode === 'edit' ? 'Nouveau mot de passe' : 'Mot de passe'} required={modal?.mode === 'create'}>
          <TextField
            value={form.password}
            onChangeText={(v) => setForm((f) => ({ ...f, password: v }))}
            secureTextEntry={!showPwd}
            placeholder={modal?.mode === 'edit' ? 'Laisser vide pour ne pas changer' : ''}
          />
        </FormField>
        <OutlineButton title={showPwd ? 'Masquer mot de passe' : 'Afficher mot de passe'} onPress={() => setShowPwd((v) => !v)} />
      </AppModal>
    </View>
  );
}
