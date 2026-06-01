import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, RefreshControl, Text } from 'react-native';
import { apiFetch, parseJsonOrThrow } from '../api';
import { canStaffMutate } from '../authUtils';
import { matchesSearch } from '../utils/filterSearch';
import { formatDate } from '../utils/format';
import { defaultServiceEntityId, orgEntityPath, serviceEntityOptions } from '../utils/orgEntity';
import { COLORS } from '../theme';
import {
  SearchBar,
  ListCard,
  PrimaryButton,
  OutlineButton,
  AppModal,
  Stepper,
  FormField,
  TextField,
  SelectField,
  DetailItem,
  ScreenToolbar,
  EmptyState,
  LoadingCenter,
  TAB_BAR_EXTRA_BOTTOM,
} from '../components/ui';

const SITUATIONS = ['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf(ve)'];
const STATUTS = ['Actif', 'Inactif', 'Suspendu'];
const PROCHE_TYPES = ['Conjoint', 'Enfant'];

function AgentWorkflowModal({ visible, agent, orgEntities, beneficiaries, onClose, addToast, reload }) {
  const [step, setStep] = useState(1);
  const [agentData, setAgentData] = useState({});
  const [errors, setErrors] = useState({});
  const [benefs, setBenefs] = useState([]);
  const [newBenef, setNewBenef] = useState({ nom: '', prenom: '', type: 'Enfant', dateNaissance: '', cin: '' });
  const [saving, setSaving] = useState(false);

  const serviceOptions = useMemo(() => serviceEntityOptions(orgEntities), [orgEntities]);

  useEffect(() => {
    if (!visible) return;
    setStep(1);
    setErrors({});
    setAgentData({
      matricule: agent?.matricule || '',
      cin: agent?.cin || '',
      nom: agent?.nom || '',
      prenom: agent?.prenom || '',
      dateNaissance: agent?.dateNaissance || '',
      situation: agent?.situation || 'Célibataire',
      entiteId: defaultServiceEntityId(orgEntities, agent),
      telephone: agent?.telephone || '',
      email: agent?.email || '',
      dateRecrutement: agent?.dateRecrutement || '',
      statut: agent?.statut || 'Actif',
    });
    setBenefs(agent ? beneficiaries.filter((b) => b.agentId === agent.id) : []);
  }, [visible, agent, orgEntities, beneficiaries]);

  const setField = (k, v) => setAgentData((d) => ({ ...d, [k]: v }));

  const validateStep1 = () => {
    const errs = {};
    if (!agentData.matricule?.trim()) errs.matricule = 'Matricule requis';
    if (!agentData.nom?.trim()) errs.nom = 'Nom requis';
    if (!agentData.prenom?.trim()) errs.prenom = 'Prénom requis';
    if (!agentData.entiteId) errs.entiteId = 'Service de rattachement requis';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const addBeneficiary = () => {
    if (!newBenef.nom.trim() || !newBenef.prenom.trim()) {
      addToast('error', 'Nom et prénom du proche requis');
      return;
    }
    setBenefs((b) => [...b, { ...newBenef, id: null }]);
    setNewBenef({ nom: '', prenom: '', type: 'Enfant', dateNaissance: '', cin: '' });
    addToast('success', 'Proche ajouté');
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const isEdit = !!agent;
      const url = isEdit ? `/api/agents/${agent.id}` : '/api/agents';
      const method = isEdit ? 'PUT' : 'POST';
      const { entiteId, ...rest } = agentData;
      await parseJsonOrThrow(
        await apiFetch(url, {
          method,
          body: {
            ...rest,
            entiteId: Number(entiteId),
            beneficiaries: benefs.map((b) => ({
              id: b.id,
              nom: b.nom,
              prenom: b.prenom,
              type: b.type,
              cin: b.cin || '',
              dateNaissance: b.dateNaissance || null,
            })),
          },
        }),
      );
      addToast('success', isEdit ? 'Agent mis à jour' : 'Agent enregistré');
      onClose();
      reload();
    } catch (e) {
      addToast('error', e.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const entiteOptions = serviceOptions;

  const servicePath = orgEntityPath(orgEntities, agentData.entiteId);

  const footer = (
    <>
      {step > 1 ? <OutlineButton title="Précédent" onPress={() => setStep((s) => s - 1)} style={{ flex: 1 }} /> : null}
      {step < 3 ? (
        <PrimaryButton
          title="Suivant"
          style={{ flex: 1 }}
          onPress={() => {
            if (step === 1 && !validateStep1()) return;
            setStep((s) => s + 1);
          }}
        />
      ) : (
        <PrimaryButton title="Enregistrer" onPress={handleSubmit} loading={saving} style={{ flex: 1 }} />
      )}
    </>
  );

  return (
    <AppModal visible={visible} title={agent ? 'Modifier agent' : 'Nouvel agent'} onClose={onClose} footer={footer}>
      <Stepper step={step} labels={['Informations', 'Bénéficiaires', 'Récapitulatif']} />
      {step === 1 && (
        <>
          <FormField label="Matricule" required error={errors.matricule}>
            <TextField value={agentData.matricule} onChangeText={(v) => setField('matricule', v)} placeholder="AGT-XXX" />
          </FormField>
          <FormField label="CIN">
            <TextField value={agentData.cin} onChangeText={(v) => setField('cin', v)} />
          </FormField>
          <FormField label="Nom" required error={errors.nom}>
            <TextField value={agentData.nom} onChangeText={(v) => setField('nom', v)} />
          </FormField>
          <FormField label="Prénom" required error={errors.prenom}>
            <TextField value={agentData.prenom} onChangeText={(v) => setField('prenom', v)} />
          </FormField>
          <FormField label="Date naissance">
            <TextField value={agentData.dateNaissance} onChangeText={(v) => setField('dateNaissance', v)} placeholder="AAAA-MM-JJ" />
          </FormField>
          <SelectField label="Situation" value={agentData.situation} options={SITUATIONS.map((s) => ({ label: s, value: s }))} onChange={(v) => setField('situation', v)} />
          <SelectField label="Service de rattachement" required value={agentData.entiteId} options={entiteOptions} onChange={(v) => setField('entiteId', v)} />
          {errors.entiteId ? <Text style={{ color: COLORS.danger, fontSize: 12, marginBottom: 8 }}>{errors.entiteId}</Text> : null}
          <FormField label="Téléphone">
            <TextField value={agentData.telephone} onChangeText={(v) => setField('telephone', v)} keyboardType="phone-pad" />
          </FormField>
          <FormField label="E-mail">
            <TextField value={agentData.email} onChangeText={(v) => setField('email', v)} keyboardType="email-address" />
          </FormField>
          <FormField label="Date recrutement">
            <TextField value={agentData.dateRecrutement} onChangeText={(v) => setField('dateRecrutement', v)} placeholder="AAAA-MM-JJ" />
          </FormField>
          <SelectField label="Statut" value={agentData.statut} options={STATUTS.map((s) => ({ label: s, value: s }))} onChange={(v) => setField('statut', v)} />
        </>
      )}
      {step === 2 && (
        <>
          <FormField label="Nom proche">
            <TextField value={newBenef.nom} onChangeText={(v) => setNewBenef((b) => ({ ...b, nom: v }))} />
          </FormField>
          <FormField label="Prénom proche">
            <TextField value={newBenef.prenom} onChangeText={(v) => setNewBenef((b) => ({ ...b, prenom: v }))} />
          </FormField>
          <SelectField label="Type" value={newBenef.type} options={PROCHE_TYPES.map((t) => ({ label: t, value: t }))} onChange={(v) => setNewBenef((b) => ({ ...b, type: v }))} />
          <OutlineButton title="Ajouter le proche" onPress={addBeneficiary} style={{ marginBottom: 16 }} />
          {benefs.map((b, idx) => (
            <ListCard
              key={`${b.id ?? 'new'}-${idx}`}
              title={`${b.prenom} ${b.nom}`}
              subtitle={`${b.type}${b.dateNaissance ? ` · ${formatDate(b.dateNaissance)}` : ''}`}
              onPress={() => setBenefs((list) => list.filter((_, i) => i !== idx))}
              rightIcon="trash"
            />
          ))}
        </>
      )}
      {step === 3 && (
        <>
          <DetailItem label="Matricule">{agentData.matricule}</DetailItem>
          <DetailItem label="Agent">{agentData.prenom} {agentData.nom}</DetailItem>
          <DetailItem label="Service">{servicePath}</DetailItem>
          <DetailItem label="Statut">{agentData.statut}</DetailItem>
          <DetailItem label="Proches">{benefs.length} enregistré(s)</DetailItem>
        </>
      )}
    </AppModal>
  );
}

export default function BeneficiairesScreen({ user, addToast, forcedTab = null }) {
  const canMutate = canStaffMutate(user);
  const [tab, setTab] = useState(forcedTab || 'agents');
  const [search, setSearch] = useState('');
  const [agents, setAgents] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [orgEntities, setOrgEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workflowAgent, setWorkflowAgent] = useState(undefined);
  const [detail, setDetail] = useState(null);

  const reload = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [aRes, bRes, eRes] = await Promise.all([
        apiFetch('/api/agents'),
        apiFetch('/api/beneficiaries'),
        apiFetch('/api/organizational-entities'),
      ]);
      setAgents(await parseJsonOrThrow(aRes));
      setBeneficiaries(await parseJsonOrThrow(bRes));
      setOrgEntities(await parseJsonOrThrow(eRes));
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

  const agentById = useMemo(() => Object.fromEntries(agents.map((a) => [a.id, a])), [agents]);

  const agentsFiltered = useMemo(() => {
    return agents.filter((a) =>
      matchesSearch(search, a.matricule, a.nom, a.prenom, a.entite, a.situation, a.statut, a.email),
    );
  }, [agents, search]);

  const prochesFiltered = useMemo(() => {
    return beneficiaries
      .map((b) => ({
        ...b,
        agentLabel: agentById[b.agentId] ? `${agentById[b.agentId].prenom} ${agentById[b.agentId].nom}` : '—',
      }))
      .filter((b) => matchesSearch(search, b.nom, b.prenom, b.type, b.agentLabel, b.cin));
  }, [beneficiaries, agentById, search]);

  const showAgentsOnly = forcedTab === 'agents';
  const activeTab = showAgentsOnly ? 'agents' : tab;

  return (
    <View style={{ flex: 1 }}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher matricule, nom, entité…" />
      <ScreenToolbar>
        {!showAgentsOnly && (
          <>
            <OutlineButton title="Agents" onPress={() => setTab('agents')} style={activeTab === 'agents' ? { backgroundColor: '#e0f2fe' } : null} />
            <OutlineButton title="Proches" onPress={() => setTab('proches')} style={activeTab === 'proches' ? { backgroundColor: '#e0f2fe' } : null} />
          </>
        )}
        {canMutate && activeTab === 'agents' ? (
          <PrimaryButton title="+ Agent" onPress={() => setWorkflowAgent(null)} />
        ) : null}
      </ScreenToolbar>

      {loading ? (
        <LoadingCenter />
      ) : (
        <FlatList
          data={activeTab === 'agents' ? agentsFiltered : prochesFiltered}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload(true)} />}
          renderItem={({ item }) =>
            activeTab === 'agents' ? (
              <ListCard
                title={`${item.prenom} ${item.nom}`}
                subtitle={`${item.matricule} · ${item.entite || '—'}`}
                badge={item.statut || item.situation}
                onPress={() => setDetail(item)}
              />
            ) : (
              <ListCard
                title={`${item.prenom} ${item.nom}`}
                subtitle={`${item.type} · ${item.agentLabel}`}
                onPress={() => setDetail(item)}
              />
            )
          }
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={{ paddingBottom: TAB_BAR_EXTRA_BOTTOM + 16 }}
        />
      )}

      <AppModal
        visible={!!detail}
        title={detail?.matricule ? 'Fiche agent' : 'Fiche proche'}
        onClose={() => setDetail(null)}
        footer={
          <>
            {canMutate && detail?.matricule ? (
              <PrimaryButton title="Modifier" style={{ flex: 1 }} onPress={() => { setWorkflowAgent(detail); setDetail(null); }} />
            ) : null}
            <OutlineButton title="Fermer" onPress={() => setDetail(null)} style={{ flex: 1 }} />
          </>
        }
      >
        {detail?.matricule ? (
          <>
            <DetailItem label="Matricule">{detail.matricule}</DetailItem>
            <DetailItem label="Nom">{detail.nom} {detail.prenom}</DetailItem>
            <DetailItem label="CIN">{detail.cin || '—'}</DetailItem>
            <DetailItem label="Entité">{detail.entite || '—'}</DetailItem>
            <DetailItem label="Situation">{detail.situation || '—'}</DetailItem>
            <DetailItem label="Statut">{detail.statut || '—'}</DetailItem>
            <DetailItem label="Recrutement">{formatDate(detail.dateRecrutement)}</DetailItem>
            <DetailItem label="Téléphone">{detail.telephone || '—'}</DetailItem>
            <DetailItem label="E-mail">{detail.email || '—'}</DetailItem>
          </>
        ) : detail ? (
          <>
            <DetailItem label="Nom">{detail.prenom} {detail.nom}</DetailItem>
            <DetailItem label="Type">{detail.type}</DetailItem>
            <DetailItem label="Agent">{detail.agentLabel || '—'}</DetailItem>
            <DetailItem label="CIN">{detail.cin || '—'}</DetailItem>
            <DetailItem label="Naissance">{formatDate(detail.dateNaissance)}</DetailItem>
          </>
        ) : null}
      </AppModal>

      <AgentWorkflowModal
        visible={workflowAgent !== undefined}
        agent={workflowAgent}
        orgEntities={orgEntities}
        beneficiaries={beneficiaries}
        onClose={() => setWorkflowAgent(undefined)}
        addToast={addToast}
        reload={() => reload()}
      />
    </View>
  );
}
