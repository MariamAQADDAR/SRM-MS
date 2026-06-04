import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, RefreshControl, Text } from 'react-native';
import { apiFetch, parseJsonOrThrow } from '../api';
import { isAdherentRole, isStaffWriterRole } from '../authUtils';
import { getTypeOptionsAsync } from '../typeConfig';
import { matchesSearch } from '../utils/filterSearch';
import { formatDate, formatMoney } from '../utils/format';
import { PEC_WORKFLOW_STEPS, pecWorkflowSummary, resolvePecWorkflow } from '../utils/workflowSteps';
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

export default function PrisesEnChargeScreen({ user, addToast, personalMode = false }) {
  const isAdherent = personalMode || isAdherentRole(user);
  const canMutate = isStaffWriterRole(user);
  const canCreate = isAdherent || canMutate;
  const myAgent = isAdherent && user?.agentId != null ? Number(user.agentId) : null;

  const [rows, setRows] = useState([]);
  const [agents, setAgents] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [careTypes, setCareTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [pdfFile, setPdfFile] = useState(null);
  const [form, setForm] = useState({
    beneficiaire: '',
    typePrestation: '',
    etablissement: '',
    montantDemande: '',
    dateDebut: new Date().toISOString().split('T')[0],
    dateFin: '',
    observation: '',
  });
  const [reviewMontant, setReviewMontant] = useState('');
  const [reviewObs, setReviewObs] = useState('');

  const reload = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const types = await getTypeOptionsAsync('careTypes');
      setCareTypes(types);
      const reqs = [apiFetch('/api/care-episodes'), apiFetch('/api/agents'), apiFetch('/api/medical-facilities')];
      if (myAgent) reqs.push(apiFetch(`/api/beneficiaries?agentId=${myAgent}`));
      const out = await Promise.all(reqs.map((p) => p.then((r) => parseJsonOrThrow(r))));
      setRows(out[0]);
      setAgents(out[1]);
      setFacilities(out[2]);
      if (myAgent && out[3]) setBeneficiaries(out[3]);
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast, myAgent]);

  useEffect(() => {
    reload();
  }, [reload]);

  const agentById = useMemo(() => Object.fromEntries(agents.map((a) => [a.id, a])), [agents]);

  const beneficiaryOptions = useMemo(() => {
    const opts = [];
    if (isAdherent) {
      const agent = myAgent ? agents.find((a) => a.id === myAgent) : null;
      if (agent) opts.push({ label: `${agent.prenom} ${agent.nom} (Titulaire)`, value: `${agent.prenom} ${agent.nom}` });
      beneficiaries.forEach((b) => opts.push({ label: `${b.prenom} ${b.nom} (${b.linkType || b.type})`, value: `${b.prenom} ${b.nom}` }));
    } else {
      agents.forEach((a) => opts.push({ label: `${a.prenom} ${a.nom}`, value: `${a.prenom} ${a.nom}` }));
    }
    return opts;
  }, [agents, beneficiaries, myAgent, isAdherent]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (personalMode && myAgent != null && Number(r.agentId) !== myAgent) return false;
      const agent = agentById[r.agentId];
      return matchesSearch(
        search,
        r.numero,
        agent?.matricule,
        agent ? `${agent.nom} ${agent.prenom}` : '',
        r.beneficiaire,
        r.typePrestation,
        r.etablissement,
        r.statut,
      );
    });
  }, [rows, search, agentById, personalMode, myAgent]);

  const closeModal = () => {
    setModal(null);
    setWizardStep(1);
    setPdfFile(null);
  };

  const openCreate = () => {
    setForm({
      beneficiaire: beneficiaryOptions[0]?.value || '',
      typePrestation: careTypes[0] || '',
      etablissement: facilities[0]?.name || facilities[0]?.nom || '',
      montantDemande: '',
      dateDebut: new Date().toISOString().split('T')[0],
      dateFin: '',
      observation: '',
    });
    setWizardStep(1);
    setPdfFile(null);
    setModal({ mode: 'create' });
  };

  const submitWizard = async () => {
    if (!pdfFile) {
      addToast('error', 'Justificatif PDF obligatoire');
      return;
    }
    try {
      await uploadMultipart('/api/care-episodes/request', form, pdfFile);
      addToast('success', 'Demande PEC enregistrée — envoyez-la à la mutuelle (étape 2)');
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
    const defaultMontant =
      item.montantPrisEnCharge != null && Number(item.montantPrisEnCharge) > 0 ? item.montantPrisEnCharge : item.montantDemande;
    setReviewMontant(defaultMontant != null ? String(defaultMontant) : '');
    setReviewObs(item.observation || '');
    setModal({ mode: 'detail', item });
  };

  const wizardNext = () => {
    if (wizardStep === 1) {
      if (!form.beneficiaire) {
        addToast('error', 'Choisissez un bénéficiaire');
        return;
      }
      if (!form.typePrestation) {
        addToast('error', 'Choisissez un type de prestation');
        return;
      }
      if (!form.etablissement) {
        addToast('error', 'Choisissez un établissement');
        return;
      }
    }
    if (wizardStep === 2) {
      if (!form.montantDemande || Number(form.montantDemande) <= 0) {
        addToast('error', 'Indiquez un montant valide');
        return;
      }
      if (!pdfFile) {
        addToast('error', 'PDF obligatoire');
        return;
      }
    }
    setWizardStep((s) => s + 1);
  };

  return (
    <View style={{ flex: 1 }}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="N°, bénéficiaire, établissement…" />
      <ScreenToolbar>
        {canCreate ? <PrimaryButton title="+ Demande PEC" onPress={openCreate} /> : null}
        <OutlineButton
          title="Modèle PEC"
          onPress={() =>
            downloadAndShare('/api/document-templates/care-episode-request', 'modele-prise-en-charge.docx').catch((e) =>
              addToast('error', e.message),
            )
          }
        />
      </ScreenToolbar>

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
              subtitle={`${item.beneficiaire} · ${item.typePrestation} · ${pecWorkflowSummary(item)}`}
              badge={item.statut}
              onPress={() => openDetail(item)}
            />
          )}
          ListEmptyComponent={<EmptyState text="Aucune demande PEC. Créez une demande en 3 étapes avec justificatif PDF." />}
          contentContainerStyle={{ paddingBottom: TAB_BAR_EXTRA_BOTTOM + 16 }}
        />
      )}

      <AppModal
        visible={modal?.mode === 'create'}
        title="Demande de prise en charge — 3 étapes"
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
        <Stepper step={wizardStep} labels={['Informations', 'Montant & PDF', 'Confirmation']} />
        <WorkflowSteps steps={PEC_WORKFLOW_STEPS} activeStep={1} terminal={false} />
        {wizardStep === 1 && (
          <>
            <SelectField inline label="Bénéficiaire" value={form.beneficiaire} options={beneficiaryOptions} onChange={(v) => setForm((f) => ({ ...f, beneficiaire: v }))} />
            <SelectField inline label="Type prestation" value={form.typePrestation} options={careTypes.map((t) => ({ label: t, value: t }))} onChange={(v) => setForm((f) => ({ ...f, typePrestation: v }))} />
            <SelectField
              inline
              label="Établissement / corps médical"
              value={form.etablissement}
              options={facilities.map((f) => ({ label: f.name || f.nom, value: f.name || f.nom }))}
              onChange={(v) => setForm((f) => ({ ...f, etablissement: v }))}
            />
            <FormField label="Date début soins">
              <TextField value={form.dateDebut} onChangeText={(v) => setForm((f) => ({ ...f, dateDebut: v }))} placeholder="AAAA-MM-JJ" />
            </FormField>
            <FormField label="Date fin (optionnel)">
              <TextField value={form.dateFin} onChangeText={(v) => setForm((f) => ({ ...f, dateFin: v }))} placeholder="AAAA-MM-JJ" />
            </FormField>
          </>
        )}
        {wizardStep === 2 && (
          <>
            <FormField label="Montant demandé (DH) *">
              <TextField
                value={form.montantDemande}
                onChangeText={(v) => setForm((f) => ({ ...f, montantDemande: v.replace(',', '.') }))}
                keyboardType="decimal-pad"
                placeholder="Ex. 15000"
                selectTextOnFocus
              />
            </FormField>
            <OutlineButton title={pdfFile ? `PDF : ${pdfFile.name}` : 'Choisir PDF *'} onPress={async () => { const f = await pickPdfFile(); if (f) setPdfFile(f); }} style={{ marginTop: 8 }} />
            <FormField label="Observation">
              <TextField value={form.observation} onChangeText={(v) => setForm((f) => ({ ...f, observation: v }))} multiline />
            </FormField>
          </>
        )}
        {wizardStep === 3 && (
          <>
            <Text style={{ fontSize: 14, color: '#64748b', marginBottom: 12, lineHeight: 20 }}>
              Après enregistrement, utilisez « Envoyer à la mutuelle » pour lancer l&apos;instruction (étape 2).
            </Text>
            <DetailItem label="Bénéficiaire">{form.beneficiaire}</DetailItem>
            <DetailItem label="Type">{form.typePrestation}</DetailItem>
            <DetailItem label="Établissement">{form.etablissement}</DetailItem>
            <DetailItem label="Montant">{formatMoney(form.montantDemande)}</DetailItem>
            <DetailItem label="PDF">{pdfFile ? pdfFile.name : '—'}</DetailItem>
          </>
        )}
      </AppModal>

      <AppModal
        visible={modal?.mode === 'detail'}
        title={modal?.item ? `PEC ${modal.item.numero}` : ''}
        onClose={closeModal}
        footer={
          <>
            {isAdherent && modal?.item?.statut === 'En attente' ? (
              <PrimaryButton
                title="Envoyer à la mutuelle"
                onPress={() => doAction(`/api/care-episodes/${modal.item.id}/submit`, 'Demande transmise à la mutuelle')}
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
            <WorkflowSteps {...resolvePecWorkflow(modal.item.statut)} />
            <DetailSection title="Informations" icon="info-circle">
              <DetailItem label="Bénéficiaire">{modal.item.beneficiaire}</DetailItem>
              <DetailItem label="Type">{modal.item.typePrestation}</DetailItem>
              <DetailItem label="Établissement">{modal.item.etablissement}</DetailItem>
              <DetailItem label="Statut">{modal.item.statut}</DetailItem>
              <DetailItem label="Début">{formatDate(modal.item.dateDebut)}</DetailItem>
              <DetailItem label="Fin">{formatDate(modal.item.dateFin)}</DetailItem>
              <DetailItem label="Date dépôt">{formatDate(modal.item.depositDate || modal.item.dateDebut)}</DetailItem>
              <DetailItem label="Date envoi">{formatDate(modal.item.sentDate)}</DetailItem>
            </DetailSection>
            <DetailSection title="Détails financiers" icon="coins">
              <DetailItem label="Montant demandé">{formatMoney(modal.item.montantDemande)}</DetailItem>
              <DetailItem label="Montant PEC">{formatMoney(modal.item.montantPrisEnCharge)}</DetailItem>
              <DetailItem label="Observation">{modal.item.observation || '—'}</DetailItem>
            </DetailSection>
            {modal.item.hasPdf ? (
              <OutlineButton
                title="Voir PDF"
                onPress={() =>
                  downloadAndShare(`/api/care-episodes/${modal.item.id}/document`, `pec-${modal.item.numero}.pdf`).catch((e) =>
                    addToast('error', e.message),
                  )
                }
              />
            ) : null}
            {canMutate && (modal.item.statut === 'En cours' || modal.item.statut === 'En attente') && (
              <View style={{ marginTop: 12, gap: 8 }}>
                <Text style={{ fontWeight: '700', marginBottom: 4 }}>Validation mutuelle (étape 3)</Text>
                <FormField label="Montant PEC">
                  <TextField value={reviewMontant} onChangeText={setReviewMontant} keyboardType="decimal-pad" />
                </FormField>
                <FormField label="Observation">
                  <TextField value={reviewObs} onChangeText={setReviewObs} multiline />
                </FormField>
                <PrimaryButton
                  title="Approuver"
                  onPress={() =>
                    doAction(`/api/care-episodes/${modal.item.id}/validate`, 'PEC approuvée', {
                      montantPrisEnCharge: reviewMontant ? Number(reviewMontant) : null,
                      observation: reviewObs || null,
                    })
                  }
                />
                <OutlineButton
                  title="Rejeter"
                  danger
                  onPress={() => doAction(`/api/care-episodes/${modal.item.id}/reject`, 'PEC rejetée', { observation: reviewObs || null })}
                />
              </View>
            )}
          </>
        )}
      </AppModal>
    </View>
  );
}
