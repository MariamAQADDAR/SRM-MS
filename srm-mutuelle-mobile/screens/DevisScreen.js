import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, RefreshControl, Text } from 'react-native';
import { apiFetch, parseJsonOrThrow } from '../api';
import { isAdherentRole, isStaffWriterRole } from '../authUtils';
import { getTypeOptionsAsync } from '../typeConfig';
import { matchesSearch } from '../utils/filterSearch';
import { formatDate, formatMoney } from '../utils/format';
import { DEVIS_WORKFLOW_STEPS, devisWorkflowSummary, resolveDevisWorkflow } from '../utils/workflowSteps';
import { downloadAndShare, pickPdfFile, uploadMultipart } from '../fileHelpers';
import WorkflowSteps from '../components/WorkflowSteps';
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
  DetailSection,
  ScreenToolbar,
  EmptyState,
  LoadingCenter,
  TAB_BAR_EXTRA_BOTTOM,
} from '../components/ui';

export default function DevisScreen({ user, addToast, personalMode = false }) {
  const isAdherent = personalMode || isAdherentRole(user);
  const canMutate = isStaffWriterRole(user);
  const canCreate = isAdherent || canMutate;
  const myAgentId = user?.agentId != null ? Number(user.agentId) : null;

  const [rows, setRows] = useState([]);
  const [agents, setAgents] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [dentistes, setDentistes] = useState([]);
  const [quoteTypes, setQuoteTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [pdfFile, setPdfFile] = useState(null);
  const [form, setForm] = useState({
    beneficiaire: '',
    type: '',
    dentisteId: '',
    dentisteLibre: '',
    montant: '',
    observation: '',
  });
  const [reviewPec, setReviewPec] = useState('');
  const [reviewObs, setReviewObs] = useState('');

  const reload = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const types = await getTypeOptionsAsync('quoteTypes');
      setQuoteTypes(types);
      const reqs = [apiFetch('/api/quotes'), apiFetch('/api/agents'), apiFetch('/api/contracted-doctors')];
      if (myAgentId) reqs.push(apiFetch(`/api/beneficiaries?agentId=${myAgentId}`));
      const out = await Promise.all(reqs.map((p) => p.then((r) => parseJsonOrThrow(r))));
      setRows(out[0]);
      setAgents(out[1]);
      setDentistes(out[2]);
      if (myAgentId && out[3]) setBeneficiaries(out[3]);
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast, myAgentId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const beneficiaryOptions = useMemo(() => {
    const opts = [];
    if (isAdherent) {
      const agent = myAgentId ? agents.find((a) => a.id === myAgentId) : null;
      if (agent) opts.push({ label: `${agent.prenom} ${agent.nom} (Titulaire)`, value: `${agent.prenom} ${agent.nom}` });
      beneficiaries.forEach((b) => opts.push({ label: `${b.prenom} ${b.nom} (${b.linkType || b.type})`, value: `${b.prenom} ${b.nom}` }));
    } else {
      agents.forEach((a) => opts.push({ label: `${a.prenom} ${a.nom}`, value: `${a.prenom} ${a.nom}` }));
    }
    return opts;
  }, [agents, beneficiaries, myAgentId, isAdherent]);

  const filtered = useMemo(() => {
    let list = rows.filter((r) => matchesSearch(search, r.numero, r.beneficiaire, r.type, r.dentistName, r.etat));
    if (personalMode && myAgentId != null) list = list.filter((r) => Number(r.agentId) === myAgentId);
    return list;
  }, [rows, search, personalMode, myAgentId]);

  const closeModal = () => {
    setModal(null);
    setWizardStep(1);
    setPdfFile(null);
  };

  const openCreate = () => {
    setForm({
      beneficiaire: beneficiaryOptions[0]?.value || '',
      type: quoteTypes[0] || '',
      dentisteId: '',
      dentisteLibre: '',
      montant: '',
      observation: '',
    });
    setWizardStep(1);
    setPdfFile(null);
    setModal({ mode: 'create' });
  };

  const wizardNext = () => {
    if (wizardStep === 1) {
      if (!form.beneficiaire) {
        addToast('error', 'Choisissez un bénéficiaire');
        return;
      }
      if (!form.type) {
        addToast('error', 'Choisissez un type de devis');
        return;
      }
      if (!form.montant || Number(form.montant) <= 0) {
        addToast('error', 'Indiquez le montant du devis (DH)');
        return;
      }
    }
    if (wizardStep === 2 && !pdfFile) {
      addToast('error', 'PDF devis obligatoire');
      return;
    }
    setWizardStep((s) => s + 1);
  };

  const submitWizard = async () => {
    if (!pdfFile) {
      addToast('error', 'PDF devis obligatoire');
      return;
    }
    if (!form.montant || Number(form.montant) <= 0) {
      addToast('error', 'Indiquez un montant valide');
      return;
    }
    const agent = agents.find((a) => `${a.prenom} ${a.nom}` === form.beneficiaire);
    if (!agent && !isAdherent) {
      addToast('error', 'Porteur invalide');
      return;
    }
    const dentistRow = form.dentisteId ? dentistes.find((d) => String(d.id) === String(form.dentisteId)) : null;
    const providerName = dentistRow?.fullName || form.dentisteLibre || '';
    const today = new Date().toISOString().split('T')[0];
    const fields = {
      quoteType: form.type,
      montant: form.montant,
      taux: '60',
      beneficiaire: form.beneficiaire,
      dateDevis: today,
      dateDepot: today,
      observation: form.observation || '',
    };
    if (providerName) fields.providerName = providerName;
    if (!isAdherent && agent) fields.agentId = String(agent.id);
    try {
      await uploadMultipart('/api/quotes/with-document', fields, pdfFile);
      addToast('success', 'Devis enregistré — envoyez-le à la mutuelle quand vous êtes prêt');
      closeModal();
      reload();
    } catch (e) {
      addToast('error', e.message || 'Erreur');
    }
  };

  const doAction = async (path, label, body) => {
    try {
      await parseJsonOrThrow(await apiFetch(path, { method: 'POST', body: body || undefined }));
      addToast('success', label);
      closeModal();
      reload();
    } catch (e) {
      addToast('error', e.message || 'Erreur');
    }
  };

  const openDetail = (item) => {
    const defaultPec =
      item.montantPrisEnCharge != null ? item.montantPrisEnCharge : Math.round((Number(item.montant) * Number(item.taux || 60)) / 100);
    setReviewPec(defaultPec != null ? String(defaultPec) : '');
    setReviewObs(item.observation || '');
    setModal({ mode: 'detail', item });
  };

  return (
    <View style={{ flex: 1 }}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="N°, bénéficiaire, type…" />
      <ScreenToolbar>{canCreate ? <PrimaryButton title="+ Devis" onPress={openCreate} /> : null}</ScreenToolbar>
      {loading ? (
        <LoadingCenter />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload(true)} />}
          renderItem={({ item }) => (
            <ListCard
              title={item.numero}
              subtitle={`${item.beneficiaire} · ${formatMoney(item.montant)} · ${devisWorkflowSummary(item)}`}
              badge={item.etat}
              onPress={() => openDetail(item)}
            />
          )}
          ListEmptyComponent={<EmptyState text="Aucun devis. Déposez un devis en 3 étapes avec montant et PDF." />}
          contentContainerStyle={{ paddingBottom: TAB_BAR_EXTRA_BOTTOM + 16 }}
        />
      )}

      <AppModal
        visible={modal?.mode === 'create'}
        title="Nouveau devis — 3 étapes"
        onClose={closeModal}
        footer={
          <>
            {wizardStep > 1 ? <OutlineButton title="Précédent" onPress={() => setWizardStep((s) => s - 1)} style={{ flex: 1 }} /> : null}
            {wizardStep < 3 ? (
              <PrimaryButton title="Suivant" onPress={wizardNext} style={{ flex: 1 }} />
            ) : (
              <PrimaryButton title="Enregistrer" onPress={submitWizard} style={{ flex: 1 }} />
            )}
          </>
        }
      >
        <Stepper step={wizardStep} labels={['Informations & montant', 'PDF', 'Confirmation']} />
        <WorkflowSteps steps={DEVIS_WORKFLOW_STEPS} activeStep={1} terminal={false} />
        {wizardStep === 1 && (
          <>
            <SelectField inline label="Bénéficiaire" value={form.beneficiaire} options={beneficiaryOptions} onChange={(v) => setForm((f) => ({ ...f, beneficiaire: v }))} />
            <SelectField inline label="Type" value={form.type} options={quoteTypes.map((t) => ({ label: t, value: t }))} onChange={(v) => setForm((f) => ({ ...f, type: v }))} />
            <SelectField
              inline
              label="Dentiste / prestataire"
              value={form.dentisteId}
              options={[{ label: '— Choisir —', value: '' }, ...dentistes.map((d) => ({ label: d.fullName, value: String(d.id) }))]}
              onChange={(v) => setForm((f) => ({ ...f, dentisteId: v }))}
            />
            <FormField label="Ou nom libre">
              <TextField value={form.dentisteLibre} onChangeText={(v) => setForm((f) => ({ ...f, dentisteLibre: v }))} placeholder="Professionnel ou établissement" />
            </FormField>
            <FormField label="Montant devis (DH) *">
              <TextField
                value={form.montant}
                onChangeText={(v) => setForm((f) => ({ ...f, montant: v.replace(',', '.') }))}
                keyboardType="decimal-pad"
                placeholder="Ex. 3500"
                selectTextOnFocus
              />
            </FormField>
          </>
        )}
        {wizardStep === 2 && (
          <>
            <FormField label="Observation">
              <TextField value={form.observation} onChangeText={(v) => setForm((f) => ({ ...f, observation: v }))} multiline />
            </FormField>
            <OutlineButton title={pdfFile ? `PDF : ${pdfFile.name}` : 'Choisir PDF du devis *'} onPress={async () => { const f = await pickPdfFile(); if (f) setPdfFile(f); }} />
          </>
        )}
        {wizardStep === 3 && (
          <>
            <DetailItem label="Bénéficiaire">{form.beneficiaire}</DetailItem>
            <DetailItem label="Type">{form.type}</DetailItem>
            <DetailItem label="Montant">{formatMoney(form.montant)}</DetailItem>
            <DetailItem label="PDF">{pdfFile ? pdfFile.name : '—'}</DetailItem>
          </>
        )}
      </AppModal>

      <AppModal
        visible={modal?.mode === 'detail'}
        title={modal?.item ? `Devis ${modal.item.numero}` : ''}
        onClose={closeModal}
        footer={
          <>
            {isAdherent && modal?.item?.etat === 'En attente' ? (
              <PrimaryButton
                title="Envoyer à la mutuelle"
                onPress={() => doAction(`/api/quotes/${modal.item.id}/submit`, 'Devis transmis')}
                disabled={!modal?.item?.hasPdf}
                style={{ flex: 1 }}
              />
            ) : null}
            <OutlineButton title="Fermer" onPress={closeModal} style={{ flex: 1 }} />
          </>
        }
      >
        {modal?.item && (
          <>
            <WorkflowSteps {...resolveDevisWorkflow(modal.item.etat, !!modal.item.scanned)} />
            <DetailSection title="Informations" icon="info-circle">
              <DetailItem label="Bénéficiaire">{modal.item.beneficiaire}</DetailItem>
              <DetailItem label="Type">{modal.item.type}</DetailItem>
              <DetailItem label="Prestataire">{modal.item.dentistName || '—'}</DetailItem>
              <DetailItem label="Montant devis">{formatMoney(modal.item.montant)}</DetailItem>
              <DetailItem label="Montant PEC">{formatMoney(modal.item.montantPrisEnCharge)}</DetailItem>
              <DetailItem label="État">{modal.item.etat}</DetailItem>
              <DetailItem label="Date">{formatDate(modal.item.date)}</DetailItem>
            </DetailSection>
            {modal.item.hasPdf ? (
              <OutlineButton title="PDF devis" onPress={() => downloadAndShare(`/api/quotes/${modal.item.id}/document`, `devis-${modal.item.numero}.pdf`).catch((e) => addToast('error', e.message))} />
            ) : null}
            {canMutate && (
              <View style={{ marginTop: 12, gap: 8 }}>
                <Text style={{ fontWeight: '700' }}>Validation mutuelle</Text>
                <FormField label="Montant prise en charge (DH)">
                  <TextField value={reviewPec} onChangeText={setReviewPec} keyboardType="decimal-pad" selectTextOnFocus placeholder="Montant accordé" />
                </FormField>
                <FormField label="Observation">
                  <TextField value={reviewObs} onChangeText={setReviewObs} multiline />
                </FormField>
                <OutlineButton title="Marquer instructé" onPress={() => doAction(`/api/quotes/${modal.item.id}/scan`, 'Devis en instruction')} />
                {modal.item.scanned ? (
                  <>
                    <PrimaryButton title="Approuver" onPress={() => doAction(`/api/quotes/${modal.item.id}/approve`, 'Devis approuvé', { montantPrisEnCharge: reviewPec ? Number(reviewPec) : null, observation: reviewObs || null })} />
                    <OutlineButton title="Refuser" danger onPress={() => doAction(`/api/quotes/${modal.item.id}/reject`, 'Devis refusé', { observation: reviewObs || null })} />
                  </>
                ) : null}
              </View>
            )}
          </>
        )}
      </AppModal>
    </View>
  );
}
