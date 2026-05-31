import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, RefreshControl, Text } from 'react-native';
import { apiFetch, parseJsonOrThrow } from '../api';
import { isAdherentRole, isStaffWriterRole } from '../authUtils';
import { getTypeOptionsAsync } from '../typeConfig';
import { matchesSearch } from '../utils/filterSearch';
import { formatDate, formatMoney } from '../utils/format';
import { downloadAndShare, pickPdfFile, uploadMultipart } from '../fileHelpers';
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

export default function RemboursementsScreen({ user, addToast }) {
  const isAdherent = isAdherentRole(user);
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
    depositDate: '',
    medicineName: '',
    observation: '',
  });
  const [reviewMontant, setReviewMontant] = useState('');
  const [reviewTaux, setReviewTaux] = useState('');
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
      const agent = agentById[r.agentId];
      return matchesSearch(search, r.numero, agent?.matricule, r.beneficiaire, r.careType, r.medicineName, r.statut);
    });
  }, [rows, search, agentById]);

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
      careType: careTypes[0] || '',
      depositDate: '',
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
      addToast('success', 'Demande de remboursement enregistrée');
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
    setReviewMontant(item.montantValide != null ? String(item.montantValide) : '');
    setReviewTaux(item.taux != null ? String(item.taux) : '');
    setReviewObs(item.observation || '');
    setModal({ mode: 'detail', item });
  };

  const isMedType = form.careType && (form.careType.includes('Médicament') || form.careType.includes('Medicament'));

  return (
    <View style={{ flex: 1 }}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="N°, bénéficiaire, médicament…" />
      <ScreenToolbar>{canCreate ? <PrimaryButton title="+ Remboursement" onPress={openCreate} /> : null}</ScreenToolbar>

      {loading ? (
        <LoadingCenter />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload(true)} />}
          renderItem={({ item }) => (
            <ListCard title={item.numero} subtitle={`${item.beneficiaire} · ${formatMoney(item.montantDemande)}`} badge={item.statut} onPress={() => openDetail(item)} />
          )}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={{ paddingBottom: TAB_BAR_EXTRA_BOTTOM + 16 }}
        />
      )}

      <AppModal
        visible={modal?.mode === 'create'}
        title="Nouveau remboursement"
        onClose={closeModal}
        footer={
          <>
            {wizardStep > 1 ? <OutlineButton title="Précédent" onPress={() => setWizardStep((s) => s - 1)} style={{ flex: 1 }} /> : null}
            {wizardStep < 3 ? (
              <PrimaryButton title="Suivant" onPress={() => setWizardStep((s) => s + 1)} style={{ flex: 1 }} />
            ) : (
              <PrimaryButton title="Envoyer" onPress={submitWizard} style={{ flex: 1 }} />
            )}
          </>
        }
      >
        <Stepper step={wizardStep} labels={['Informations', 'Justificatif', 'Confirmation']} />
        {wizardStep === 1 && (
          <>
            {!isAdherent && (
              <SelectField label="Porteur" value={form.agentId} options={agents.map((a) => ({ label: `${a.matricule} — ${a.prenom} ${a.nom}`, value: String(a.id) }))} onChange={(v) => setForm((f) => ({ ...f, agentId: v }))} />
            )}
            <SelectField label="Bénéficiaire" value={form.beneficiaire} options={beneficiaryOptions} onChange={(v) => setForm((f) => ({ ...f, beneficiaire: v }))} />
            <SelectField label="Type soin" value={form.careType} options={careTypes.map((t) => ({ label: t, value: t }))} onChange={(v) => setForm((f) => ({ ...f, careType: v }))} />
            <FormField label="Établissement"><TextField value={form.establishmentName} onChangeText={(v) => setForm((f) => ({ ...f, establishmentName: v }))} /></FormField>
            <FormField label="Montant demandé (DH)"><TextField value={form.montantDemande} onChangeText={(v) => setForm((f) => ({ ...f, montantDemande: v }))} keyboardType="decimal-pad" /></FormField>
            <FormField label="Date dépôt"><TextField value={form.depositDate} onChangeText={(v) => setForm((f) => ({ ...f, depositDate: v }))} placeholder="AAAA-MM-JJ" /></FormField>
            {(isMedType || form.careType === 'Médicament') && (
              <>
                <FormField label="Recherche médicament"><TextField value={medicineQuery} onChangeText={setMedicineQuery} placeholder="Nom ou EAN13" /></FormField>
                {medicineSuggestions.map((m) => (
                  <OutlineButton key={m.id} title={m.name} onPress={() => { setForm((f) => ({ ...f, medicineName: m.name })); setMedicineQuery(m.name); }} style={{ marginBottom: 6 }} />
                ))}
                <FormField label="Médicament sélectionné"><TextField value={form.medicineName} onChangeText={(v) => setForm((f) => ({ ...f, medicineName: v }))} /></FormField>
              </>
            )}
          </>
        )}
        {wizardStep === 2 && (
          <>
            <FormField label="Observation"><TextField value={form.observation} onChangeText={(v) => setForm((f) => ({ ...f, observation: v }))} multiline /></FormField>
            <OutlineButton title={pdfFile ? `PDF : ${pdfFile.name}` : 'Choisir PDF *'} onPress={async () => { const f = await pickPdfFile(); if (f) setPdfFile(f); }} />
          </>
        )}
        {wizardStep === 3 && (
          <>
            <DetailItem label="Bénéficiaire">{form.beneficiaire}</DetailItem>
            <DetailItem label="Type">{form.careType}</DetailItem>
            <DetailItem label="Montant">{formatMoney(form.montantDemande)}</DetailItem>
            <DetailItem label="Médicament">{form.medicineName || '—'}</DetailItem>
            <DetailItem label="PDF">{pdfFile ? pdfFile.name : '—'}</DetailItem>
          </>
        )}
      </AppModal>

      <AppModal visible={modal?.mode === 'detail'} title={modal?.item ? `Remb. ${modal.item.numero}` : ''} onClose={closeModal} footer={<OutlineButton title="Fermer" onPress={closeModal} style={{ flex: 1 }} />}>
        {modal?.item && (
          <>
            <DetailSection title="Informations" icon="info-circle">
              <DetailItem label="Bénéficiaire">{modal.item.beneficiaire}</DetailItem>
              <DetailItem label="Type soin">{modal.item.careType || '—'}</DetailItem>
              <DetailItem label="Médicament">{modal.item.medicineName || '—'}</DetailItem>
              <DetailItem label="Statut">{modal.item.statut}</DetailItem>
            </DetailSection>
            <DetailSection title="Montants" icon="coins">
              <DetailItem label="Demandé">{formatMoney(modal.item.montantDemande)}</DetailItem>
              <DetailItem label="Remboursé">{formatMoney(modal.item.montantValide)}</DetailItem>
            </DetailSection>
            {modal.item.hasPdf ? (
              <OutlineButton title="Voir PDF" onPress={() => downloadAndShare(`/api/reimbursements/${modal.item.id}/document`, `remb-${modal.item.numero}.pdf`).catch((e) => addToast('error', e.message))} />
            ) : null}
            {canMutate && (
              <View style={{ marginTop: 12, gap: 8 }}>
                <FormField label="Montant remboursé"><TextField value={reviewMontant} onChangeText={setReviewMontant} keyboardType="decimal-pad" /></FormField>
                <FormField label="Taux"><TextField value={reviewTaux} onChangeText={setReviewTaux} keyboardType="number-pad" /></FormField>
                <FormField label="Observation"><TextField value={reviewObs} onChangeText={setReviewObs} multiline /></FormField>
                <OutlineButton title="Traiter" onPress={() => doAction(`/api/reimbursements/${modal.item.id}/validate`, 'Remboursement validé', { montantValide: reviewMontant ? Number(reviewMontant) : null, taux: reviewTaux ? Number(reviewTaux) : null, observation: reviewObs || null })} />
                <OutlineButton title="Rejeter" danger onPress={() => doAction(`/api/reimbursements/${modal.item.id}/reject`, 'Remboursement rejeté', { observation: reviewObs || null })} />
              </View>
            )}
          </>
        )}
      </AppModal>
    </View>
  );
}
