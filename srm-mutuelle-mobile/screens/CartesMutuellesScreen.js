import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, RefreshControl, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiFetch, parseJsonOrThrow } from '../api';
import { isAdherentRole, isStaffWriterRole, canAdminDelete } from '../authUtils';
import { formatDate } from '../utils/format';
import { downloadAndShare } from '../fileHelpers';
import { matchesSearch } from '../utils/filterSearch';
import { COLORS } from '../theme';
import {
  SelectField,
  PrimaryButton,
  OutlineButton,
  ScreenToolbar,
  EmptyState,
  LoadingCenter,
  StatusBadge,
  TAB_BAR_EXTRA_BOTTOM,
  AppModal,
  FormField,
  TextField,
  SearchBar,
  ListCard,
  DetailItem,
  DetailSection,
} from '../components/ui';

const REQUEST_TYPES = ['Adhésion (Première carte)', 'Duplicata', 'Changement'];
const REQUEST_STATUSES = ['En attente', 'Accordée', 'Refusée'];

function emptyForm(isAdherent, userAgentId) {
  return {
    agentId: isAdherent && userAgentId != null ? String(userAgentId) : '',
    beneficiaryId: '',
    typeDemande: REQUEST_TYPES[0],
    statut: 'En attente',
    raison: '',
  };
}

export default function CartesMutuellesScreen({ user, addToast, personalMode = false }) {
  const isAdherent = personalMode || isAdherentRole(user);
  const canMutate = isStaffWriterRole(user);
  const canDelete = canAdminDelete(user);
  const canCreate = isAdherent || canMutate;
  const canGenerate = isAdherent || canMutate;

  const [activeTab, setActiveTab] = useState('demandes');
  const [requests, setRequests] = useState([]);
  const [agents, setAgents] = useState([]);
  const [modalBeneficiaries, setModalBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm(isAdherent, user?.agentId));

  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [family, setFamily] = useState([]);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const effectiveAgentId = isAdherent && user?.agentId != null ? String(user.agentId) : selectedAgentId;

  const reload = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [reqRes, agentRes] = await Promise.all([apiFetch('/api/mutual-card-requests'), apiFetch('/api/agents')]);
      setRequests(await parseJsonOrThrow(reqRes));
      setAgents(await parseJsonOrThrow(agentRes));
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  const loadBeneficiariesForAgent = useCallback(async (agentId) => {
    if (!agentId) {
      setModalBeneficiaries([]);
      return;
    }
    try {
      setModalBeneficiaries(await parseJsonOrThrow(await apiFetch(`/api/beneficiaries?agentId=${agentId}`)));
    } catch {
      setModalBeneficiaries([]);
    }
  }, []);

  const loadFamily = useCallback(async () => {
    if (!effectiveAgentId) {
      setFamily([]);
      return;
    }
    setFamilyLoading(true);
    try {
      setFamily(await parseJsonOrThrow(await apiFetch(`/api/mutual-cards/family/${effectiveAgentId}`)));
    } catch (e) {
      addToast('error', e.message || 'Chargement cartes impossible');
      setFamily([]);
    } finally {
      setFamilyLoading(false);
    }
  }, [effectiveAgentId, addToast]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (agents.length && !selectedAgentId && !isAdherent) setSelectedAgentId(String(agents[0].id));
  }, [agents, selectedAgentId, isAdherent]);

  useEffect(() => {
    if (isAdherent && user?.agentId) loadBeneficiariesForAgent(user.agentId);
  }, [isAdherent, user?.agentId, loadBeneficiariesForAgent]);

  useEffect(() => {
    if (activeTab === 'emission') loadFamily();
  }, [activeTab, loadFamily]);

  const beneficiaryOptions = useMemo(() => {
    const agent = agents.find((a) => String(a.id) === String(form.agentId));
    const opts = [];
    if (agent) {
      opts.push({ id: '', label: `${agent.prenom} ${agent.nom} (Titulaire)`, name: `${agent.prenom} ${agent.nom}` });
    }
    modalBeneficiaries.forEach((b) => {
      opts.push({
        id: String(b.id),
        label: `${b.prenom} ${b.nom} (${b.type || b.linkType || 'Ayant droit'})`,
        name: `${b.prenom} ${b.nom}`,
      });
    });
    return opts;
  }, [agents, form.agentId, modalBeneficiaries]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) =>
      matchesSearch(search, r.matricule, r.beneficiaire, r.typeDemande, r.dateDemande, r.statut, r.raison),
    );
  }, [requests, search]);

  const closeModal = () => setModal(null);

  const openCreate = () => {
    const f = emptyForm(isAdherent, user?.agentId);
    if (!isAdherent && agents.length) f.agentId = String(agents[0].id);
    setForm(f);
    loadBeneficiariesForAgent(f.agentId);
    setModal({ mode: 'create' });
  };

  const openEdit = (row) => {
    setForm({
      agentId: String(row.agentId),
      beneficiaryId: row.beneficiaryId != null ? String(row.beneficiaryId) : '',
      typeDemande: row.typeDemande,
      statut: row.statut,
      raison: row.raison || '',
    });
    loadBeneficiariesForAgent(row.agentId);
    setModal({ mode: 'edit', row });
  };

  const buildPayload = () => {
    const agent = agents.find((a) => String(a.id) === String(form.agentId));
    const opt = beneficiaryOptions.find((o) => String(o.id) === String(form.beneficiaryId));
    return {
      agentId: Number(form.agentId),
      beneficiaryId: form.beneficiaryId ? Number(form.beneficiaryId) : null,
      beneficiaire: opt?.name || (agent ? `${agent.prenom} ${agent.nom}` : ''),
      typeDemande: form.typeDemande,
      dateDemande: modal?.row?.dateDemande || null,
      statut: isAdherent ? 'En attente' : form.statut,
      raison: form.raison || null,
    };
  };

  const saveRequest = async () => {
    if (!form.agentId) {
      addToast('error', 'Sélectionnez un agent');
      return;
    }
    const needsReason = /duplicata|changement/i.test(form.typeDemande);
    if (needsReason && !String(form.raison || '').trim()) {
      addToast('error', 'Indiquez la raison pour un duplicata ou changement');
      return;
    }
    try {
      const body = buildPayload();
      if (modal?.mode === 'edit') {
        await parseJsonOrThrow(await apiFetch(`/api/mutual-card-requests/${modal.row.id}`, { method: 'PUT', body }));
        addToast('success', 'Demande mise à jour');
      } else {
        await parseJsonOrThrow(await apiFetch('/api/mutual-card-requests', { method: 'POST', body }));
        addToast('success', 'Demande enregistrée');
      }
      closeModal();
      reload();
    } catch (e) {
      addToast('error', e.message || 'Enregistrement impossible');
    }
  };

  const deleteRequest = (row) => {
    Alert.alert('Supprimer', `Supprimer la demande pour ${row.beneficiaire} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await parseJsonOrThrow(await apiFetch(`/api/mutual-card-requests/${row.id}`, { method: 'DELETE' }));
            addToast('success', 'Demande supprimée');
            reload();
          } catch (e) {
            addToast('error', e.message || 'Suppression impossible');
          }
        },
      },
    ]);
  };

  const generateCard = async (member) => {
    if (!effectiveAgentId) return;
    const key = member.beneficiaryId ?? 'titulaire';
    setBusyId(key);
    try {
      await parseJsonOrThrow(
        await apiFetch('/api/mutual-cards', {
          method: 'POST',
          body: { agentId: Number(effectiveAgentId), beneficiaryId: member.beneficiaryId },
        }),
      );
      addToast('success', `Carte générée pour ${member.fullName}`);
      loadFamily();
    } catch (e) {
      addToast('error', e.message || 'Génération impossible');
    } finally {
      setBusyId(null);
    }
  };

  const downloadCard = async (member) => {
    if (!member.cardId) {
      addToast('warning', 'Générez d’abord la carte');
      return;
    }
    try {
      await downloadAndShare(`/api/mutual-cards/${member.cardId}/download`, `carte-${member.fullName.replace(/\s+/g, '-')}.pdf`);
    } catch (e) {
      addToast('error', e.message || 'Téléchargement impossible');
    }
  };

  const renderRequest = ({ item: r }) => (
    <View style={styles.requestCard}>
      <ListCard
        title={r.beneficiaire}
        subtitle={`${!isAdherent ? `${r.matricule} · ` : ''}${r.typeDemande} · ${formatDate(r.dateDemande)}`}
        badge={r.statut}
        onPress={() => setModal({ mode: 'view', row: r })}
      />
      {(canMutate || canDelete) && (
        <View style={styles.requestActions}>
          {canMutate ? (
            <TouchableOpacity onPress={() => openEdit(r)} style={styles.iconBtn}>
              <FontAwesome5 name="pen" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          ) : null}
          {canDelete ? (
            <TouchableOpacity onPress={() => deleteRequest(r)} style={styles.iconBtn}>
              <FontAwesome5 name="trash" size={14} color={COLORS.danger} />
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );

  const renderMember = ({ item: m }) => {
    const busy = busyId === (m.beneficiaryId ?? 'titulaire');
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.name}>{m.fullName}</Text>
          <StatusBadge value={m.cardLabel} />
        </View>
        <Text style={styles.meta}>CIN : {m.cin || '—'}</Text>
        <Text style={styles.meta}>Naissance : {formatDate(m.dateNaissance)}</Text>
        <Text style={styles.meta}>Statut : {m.hasPdf ? 'Carte émise' : 'Non générée'}</Text>
        <View style={styles.actions}>
          {canGenerate && !m.hasPdf ? (
            <PrimaryButton title={busy ? '…' : 'Générer PDF'} onPress={() => generateCard(m)} disabled={busy} style={{ flex: 1 }} />
          ) : null}
          {m.hasPdf ? <OutlineButton title="Télécharger" onPress={() => downloadCard(m)} style={{ flex: 1 }} /> : null}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenToolbar>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'demandes' && styles.tabActive]}
            onPress={() => setActiveTab('demandes')}
          >
            <Text style={[styles.tabText, activeTab === 'demandes' && styles.tabTextActive]}>Demandes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'emission' && styles.tabActive]}
            onPress={() => setActiveTab('emission')}
          >
            <Text style={[styles.tabText, activeTab === 'emission' && styles.tabTextActive]}>Émission PDF</Text>
          </TouchableOpacity>
        </View>
        {activeTab === 'demandes' && canCreate ? (
          <PrimaryButton title="Nouvelle demande" onPress={openCreate} />
        ) : null}
        {activeTab === 'emission' && !isAdherent && agents.length > 0 ? (
          <SelectField
            label="Porteur"
            value={selectedAgentId}
            options={agents.map((a) => ({ label: `${a.matricule} — ${a.prenom} ${a.nom}`, value: String(a.id) }))}
            onChange={setSelectedAgentId}
          />
        ) : null}
        {activeTab === 'emission' ? (
          <OutlineButton
            title="Bulletin adhésion"
            onPress={() =>
              downloadAndShare('/api/document-templates/mutual-card-membership', 'bulletin-adhesion-carte-mutuelle.docx').catch(
                (e) => addToast('error', e.message),
              )
            }
          />
        ) : null}
      </ScreenToolbar>

      {activeTab === 'demandes' ? (
        <>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher une demande…" />
          {loading ? (
            <LoadingCenter />
          ) : (
            <FlatList
              data={filteredRequests}
              keyExtractor={(r) => String(r.id)}
              renderItem={renderRequest}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload(true)} />}
              ListEmptyComponent={<EmptyState text="Aucune demande de carte." />}
              contentContainerStyle={{ paddingBottom: TAB_BAR_EXTRA_BOTTOM + 16 }}
            />
          )}
        </>
      ) : familyLoading ? (
        <LoadingCenter />
      ) : (
        <FlatList
          data={family}
          keyExtractor={(m) => String(m.beneficiaryId ?? 'titulaire')}
          renderItem={renderMember}
          ListEmptyComponent={<EmptyState text="Aucun membre du foyer." />}
          contentContainerStyle={{ paddingBottom: TAB_BAR_EXTRA_BOTTOM + 16, paddingTop: 8 }}
        />
      )}

      <AppModal
        visible={modal?.mode === 'create' || modal?.mode === 'edit'}
        title={modal?.mode === 'create' ? 'Nouvelle Demande de Carte' : 'Modifier la demande'}
        onClose={closeModal}
        footer={
          <>
            <OutlineButton title="Annuler" onPress={closeModal} style={{ flex: 1 }} />
            <PrimaryButton title="Enregistrer" onPress={saveRequest} style={{ flex: 1 }} />
          </>
        }
      >
        {!isAdherent ? (
          <SelectField
            label="Agent (Matricule)"
            value={form.agentId}
            options={[{ label: 'Choisir un agent…', value: '' }, ...agents.map((a) => ({ label: `${a.matricule} — ${a.prenom} ${a.nom}`, value: String(a.id) }))]}
            onChange={(v) => {
              setForm((p) => ({ ...p, agentId: v, beneficiaryId: '' }));
              loadBeneficiariesForAgent(v);
            }}
          />
        ) : null}
        <SelectField
          label="Bénéficiaire"
          value={form.beneficiaryId}
          disabled={!form.agentId}
          options={
            !form.agentId
              ? [{ label: 'Sélectionnez d’abord un agent', value: '' }]
              : beneficiaryOptions.map((o) => ({ label: o.label, value: o.id }))
          }
          onChange={(v) => setForm((p) => ({ ...p, beneficiaryId: v }))}
        />
        <SelectField
          label="Type de Demande"
          value={form.typeDemande}
          options={REQUEST_TYPES.map((t) => ({ label: t, value: t }))}
          onChange={(v) => setForm((p) => ({ ...p, typeDemande: v }))}
        />
        {canMutate ? (
          <SelectField
            label="Statut"
            value={form.statut}
            options={REQUEST_STATUSES.map((s) => ({ label: s, value: s }))}
            onChange={(v) => setForm((p) => ({ ...p, statut: v }))}
          />
        ) : null}
        <FormField label="Raison (si duplicata/changement)">
          <TextField
            value={form.raison}
            onChangeText={(v) => setForm((p) => ({ ...p, raison: v }))}
            multiline
            numberOfLines={3}
          />
        </FormField>
      </AppModal>

      <AppModal
        visible={modal?.mode === 'view'}
        title="Détail de la demande"
        onClose={closeModal}
        footer={<OutlineButton title="Fermer" onPress={closeModal} style={{ flex: 1 }} />}
      >
        <DetailSection>
          <DetailItem label="Matricule" value={modal?.row?.matricule} />
          <DetailItem label="Bénéficiaire" value={modal?.row?.beneficiaire} />
          <DetailItem label="Type" value={modal?.row?.typeDemande} />
          <DetailItem label="Date" value={formatDate(modal?.row?.dateDemande)} />
          <DetailItem label="Statut" value={modal?.row?.statut} />
          <DetailItem label="Raison" value={modal?.row?.raison || '—'} />
        </DetailSection>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 8, flex: 1 },
  tab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontWeight: '600', color: COLORS.text },
  tabTextActive: { color: '#fff' },
  card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  name: { fontSize: 17, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 8 },
  meta: { fontSize: 13, color: COLORS.textLight, marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  iconBtn: { padding: 8 },
  requestCard: { marginBottom: 4 },
  requestActions: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 8, paddingBottom: 8 },
});
