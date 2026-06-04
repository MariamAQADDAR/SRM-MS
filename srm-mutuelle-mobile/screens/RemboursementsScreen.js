import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, RefreshControl, Text } from 'react-native';
import { apiFetch, parseJsonOrThrow } from '../api';
import { isAdherentRole, isStaffWriterRole } from '../authUtils';
import { getTypeOptionsAsync } from '../typeConfig';
import { matchesSearch } from '../utils/filterSearch';
import { formatDate, formatMoney } from '../utils/format';
import {
  REMBOURSEMENT_WORKFLOW_STEPS,
  remboursementWorkflowSummary,
  resolveRemboursementWorkflow,
} from '../utils/workflowSteps';
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

export default function RemboursementsScreen({ user, addToast, personalMode = false }) {
  const isAdherent = personalMode || isAdherentRole(user);
  const canMutate = isStaffWriterRole(user);
  const canCreate = isAdherent || canMutate;
  const myAgent = isAdherent && user?.agentId != null ? Number(user.agentId) : null;

  const [rows, setRows] = useState([]);
  const [agents, setAgents] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [careTypes, setCareTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [pdfFile, setPdfFile] = useState(null);
  const [medicineQuery, setMedicineQuery] = useState('');
  const [form, setForm] = useState({
    agentId: '',
    beneficiaire: '',
    montantDemande: '',
    establishmentName: '',
    careType: '',
    depositDate: new Date().toISOString().split('T')[0],
    medicineName: '',
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
      const reqs = [apiFetch('/api/reimbursements'), apiFetch('/api/agents'), apiFetch('/api/medicines')];
      if (myAgent) reqs.push(apiFetch(`/api/beneficiaries?agentId=${myAgent}`));
      const out = await Promise.all(reqs.map((p) => p.then((r) => parseJsonOrThrow(r))));
      setRows(out[0]);
      setAgents(out[1]);
      setMedicines(out[2]);
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

  const medicineSuggestions = useMemo(() => {
    if (!medicineQuery.trim()) return [];
    const q = medicineQuery.toLowerCase();
    return medicines.filter((m) => m.name?.toLowerCase().includes(q) || m.ean13?.includes(q)).slice(0, 8);
  }, [medicines, medicineQuery]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (personalMode && myAgent != null && Number(r.agentId) !== myAgent) return false;
      const agent = agentById[r.agentId];
      return matchesSearch(search, r.numero, agent?.matricule, r.beneficiaire, r.careType, r.medicineName, r.statut);
    });
  }, [rows, search, agentById, personalMode, myAgent]);

  const isMedType = (type) => type && (type.includes('Médicament') || type.includes('Medicament'));

  const closeModal = () => {
    setModal(null);
    setWizardStep(1);
    setPdfFile(null);
    setMedicineQuery('');
  };

  const openCreate = () => {
    setForm({
      agentId: agents[0] ? String(agents[0].id) : '',
      beneficiaire: beneficiaryOptions[0]?.value || '',
      montantDemande: '',
      establishmentName: '',
      careType: careTypes.find((t) => isMedType(t)) || careTypes[0] || '',
      depositDate: new Date().toISOString().split('T')[0],
      medicineName: '',
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
    const fields = { ...form };
    if (isAdherent) delete fields.agentId;
    try {
      await uploadMultipart('/api/reimbursements/request', fields, pdfFile);
      addToast('success', 'Demande enregistrée — envoyez-la à la mutuelle (étape 2)');
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
    const defaultMontant = Number(item.montantValide) > 0 ? item.montantValide : item.montantDemande;
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
      if (!form.careType) {
        addToast('error', 'Choisissez un type de soin');
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
      <SearchBar value={search} onChangeText={setSearch} placeholder="N°, bénéficiaire, médicament…" />
      <ScreenToolbar>
        {canCreate ? <PrimaryButton title="+ Remboursement" onPress={openCreate} /> : null}
        <OutlineButton
          title="Bulletin adhésion"
          onPress={() =>
            downloadAndShare('/api/document-templates/reimbursement-request', 'bulletin-adhesion-remboursement.docx').catch(
              (e) => addToast('error', e.message),
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
              subtitle={`${item.beneficiaire} · ${formatMoney(item.montantDemande)} · ${remboursementWorkflowSummary(item)}`}
              badge={item.statut}
              onPress={() => openDetail(item)}
            />
          )}
          ListEmptyComponent={<EmptyState text="Aucune demande. Créez une demande en 3 étapes avec justificatif PDF." />}
          contentContainerStyle={{ paddingBottom: TAB_BAR_EXTRA_BOTTOM + 16 }}
        />
      )}

      <AppModal
        visible={modal?.mode === 'create'}
        title="Demande de remboursement — 3 étapes"
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
        <WorkflowSteps steps={REMBOURSEMENT_WORKFLOW_STEPS} activeStep={1} terminal={false} />
        {wizardStep === 1 && (
          <>
            {!isAdherent && (
              <SelectField inline label="Porteur" value={form.agentId} options={agents.map((a) => ({ label: `${a.matricule} — ${a.prenom} ${a.nom}`, value: String(a.id) }))} onChange={(v) => setForm((f) => ({ ...f, agentId: v }))} />
            )}
            <SelectField inline label="Bénéficiaire" value={form.beneficiaire} options={beneficiaryOptions} onChange={(v) => setForm((f) => ({ ...f, beneficiaire: v }))} />
            <SelectField inline label="Type de soin" value={form.careType} options={careTypes.map((t) => ({ label: t, value: t }))} onChange={(v) => setForm((f) => ({ ...f, careType: v }))} />
            <FormField label="Établissement / pharmacie">
              <TextField value={form.establishmentName} onChangeText={(v) => setForm((f) => ({ ...f, establishmentName: v }))} placeholder="Nom de l'établissement" />
            </FormField>
            <FormField label="Date de dépôt">
              <TextField value={form.depositDate} onChangeText={(v) => setForm((f) => ({ ...f, depositDate: v }))} placeholder="AAAA-MM-JJ" />
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
                placeholder="Ex. 450"
                selectTextOnFocus
              />
            </FormField>
            {isMedType(form.careType) && (
              <>
                <FormField label="Recherche médicament">
                  <TextField value={medicineQuery} onChangeText={setMedicineQuery} placeholder="Nom ou EAN13" />
                </FormField>
                {medicineSuggestions.map((m) => (
                  <OutlineButton
                    key={m.id}
                    title={m.name}
                    onPress={() => {
                      setForm((f) => ({ ...f, medicineName: m.name }));
                      setMedicineQuery(m.name);
                    }}
                    style={{ marginBottom: 6 }}
                  />
                ))}
                <FormField label="Médicament">
                  <TextField value={form.medicineName} onChangeText={(v) => setForm((f) => ({ ...f, medicineName: v }))} />
                </FormField>
              </>
            )}
            <OutlineButton title={pdfFile ? `PDF : ${pdfFile.name}` : 'Choisir PDF *'} onPress={async () => { const f = await pickPdfFile(); if (f) setPdfFile(f); }} style={{ marginTop: 8 }} />
            <FormField label="Observation">
              <TextField value={form.observation} onChangeText={(v) => setForm((f) => ({ ...f, observation: v }))} multiline />
            </FormField>
          </>
        )}
        {wizardStep === 3 && (
          <>
            <Text style={{ fontSize: 14, color: '#64748b', marginBottom: 12, lineHeight: 20 }}>
              Après enregistrement, votre demande sera à l&apos;étape 1 — Dépôt. Utilisez « Envoyer à la mutuelle » pour passer à l&apos;étape 2 — Instruction.
            </Text>
            <DetailItem label="Bénéficiaire">{form.beneficiaire}</DetailItem>
            <DetailItem label="Type">{form.careType}</DetailItem>
            <DetailItem label="Montant">{formatMoney(form.montantDemande)}</DetailItem>
            <DetailItem label="Médicament">{form.medicineName || '—'}</DetailItem>
            <DetailItem label="PDF">{pdfFile ? pdfFile.name : '—'}</DetailItem>
          </>
        )}
      </AppModal>

      <AppModal
        visible={modal?.mode === 'detail'}
        title={modal?.item ? `Remb. ${modal.item.numero}` : ''}
        onClose={closeModal}
        footer={
          <>
            {isAdherent && modal?.item?.statut === 'En attente' ? (
              <PrimaryButton
                title="Envoyer à la mutuelle"
                onPress={() => doAction(`/api/reimbursements/${modal.item.id}/submit`, 'Demande transmise à la mutuelle')}
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
            <WorkflowSteps {...resolveRemboursementWorkflow(modal.item.statut)} />
            <DetailSection title="Informations" icon="info-circle">
              <DetailItem label="Bénéficiaire">{modal.item.beneficiaire}</DetailItem>
              <DetailItem label="Type soin">{modal.item.careType || '—'}</DetailItem>
              <DetailItem label="Médicament">{modal.item.medicineName || '—'}</DetailItem>
              <DetailItem label="Établissement">{modal.item.establishmentName || '—'}</DetailItem>
              <DetailItem label="Date dépôt">{formatDate(modal.item.depositDate || modal.item.date)}</DetailItem>
              <DetailItem label="Date envoi">{formatDate(modal.item.sentDate)}</DetailItem>
              <DetailItem label="Date réponse">{formatDate(modal.item.responseDate)}</DetailItem>
              <DetailItem label="Statut">{modal.item.statut}</DetailItem>
            </DetailSection>
            <DetailSection title="Montants" icon="coins">
              <DetailItem label="Demandé">{formatMoney(modal.item.montantDemande)}</DetailItem>
              <DetailItem label="Remboursé">{formatMoney(modal.item.montantValide)}</DetailItem>
              <DetailItem label="Observation">{modal.item.observation || '—'}</DetailItem>
            </DetailSection>
            {modal.item.hasPdf ? (
              <OutlineButton
                title="Voir PDF"
                onPress={() =>
                  downloadAndShare(`/api/reimbursements/${modal.item.id}/document`, `remb-${modal.item.numero}.pdf`).catch((e) =>
                    addToast('error', e.message),
                  )
                }
              />
            ) : null}
            {canMutate && (modal.item.statut === 'En cours' || modal.item.statut === 'En attente') && (
              <View style={{ marginTop: 12, gap: 8 }}>
                <Text style={{ fontWeight: '700', marginBottom: 4 }}>Validation mutuelle (étape 3)</Text>
                <FormField label="Montant remboursé">
                  <TextField value={reviewMontant} onChangeText={setReviewMontant} keyboardType="decimal-pad" />
                </FormField>
                <FormField label="Observation">
                  <TextField value={reviewObs} onChangeText={setReviewObs} multiline />
                </FormField>
                <PrimaryButton
                  title="Valider"
                  onPress={() =>
                    doAction(`/api/reimbursements/${modal.item.id}/validate`, 'Remboursement validé', {
                      montantValide: reviewMontant ? Number(reviewMontant) : null,
                      observation: reviewObs || null,
                    })
                  }
                />
                <OutlineButton
                  title="Refuser"
                  danger
                  onPress={() =>
                    doAction(`/api/reimbursements/${modal.item.id}/reject`, 'Demande refusée', { observation: reviewObs || null })
                  }
                />
              </View>
            )}
          </>
        )}
      </AppModal>
    </View>
  );
}
