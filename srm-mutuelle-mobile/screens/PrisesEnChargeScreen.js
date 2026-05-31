import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, RefreshControl, Text } from 'react-native';
import { apiFetch, parseJsonOrThrow } from '../api';
import { isAdherentRole, isStaffWriterRole, canAdminDelete } from '../authUtils';
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

export default function PrisesEnChargeScreen({ user, addToast }) {
  const isAdherent = isAdherentRole(user);
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
    taux: '0',
    dateDebut: '',
    dateFin: '',
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
  }, [rows, search, agentById]);

  const closeModal = () => {
    setModal(null);
    setWizardStep(1);
    setPdfFile(null);
  };

  const openCreate = () => {
    setForm({
      beneficiaire: beneficiaryOptions[0]?.value || '',
      typePrestation: careTypes[0] || '',
      etablissement: facilities[0]?.name || '',
      montantDemande: '',
      taux: '0',
      dateDebut: '',
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
      addToast('success', 'Demande PEC enregistrée');
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
    setReviewMontant(item.montantPrisEnCharge != null ? String(item.montantPrisEnCharge) : '');
    setReviewTaux(item.taux != null ? String(item.taux) : '');
    setReviewObs(item.observation || '');
    setModal({ mode: 'detail', item });
  };

  return (
    <View style={{ flex: 1 }}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="N°, bénéficiaire, établissement…" />
      <ScreenToolbar>
        {canCreate ? <PrimaryButton title="+ Demande PEC" onPress={openCreate} /> : null}
        <OutlineButton title="Modèle PEC" onPress={() => downloadAndShare('/api/document-templates/care-episode-request', 'modele-prise-en-charge.docx').catch((e) => addToast('error', e.message))} />
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
              subtitle={`${item.beneficiaire} · ${item.typePrestation}`}
              badge={item.statut}
              onPress={() => openDetail(item)}
            />
          )}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={{ paddingBottom: TAB_BAR_EXTRA_BOTTOM + 16 }}
        />
      )}

      <AppModal
        visible={modal?.mode === 'create'}
        title="Nouvelle prise en charge"
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
        <Stepper step={wizardStep} labels={['Informations', 'Montant & PDF', 'Confirmation']} />
        {wizardStep === 1 && (
          <>
            <SelectField label="Bénéficiaire" value={form.beneficiaire} options={beneficiaryOptions} onChange={(v) => setForm((f) => ({ ...f, beneficiaire: v }))} required />
            <SelectField label="Type prestation" value={form.typePrestation} options={careTypes.map((t) => ({ label: t, value: t }))} onChange={(v) => setForm((f) => ({ ...f, typePrestation: v }))} />
            <SelectField label="Établissement" value={form.etablissement} options={facilities.map((f) => ({ label: f.name, value: f.name }))} onChange={(v) => setForm((f) => ({ ...f, etablissement: v }))} />
            <FormField label="Date début"><TextField value={form.dateDebut} onChangeText={(v) => setForm((f) => ({ ...f, dateDebut: v }))} placeholder="AAAA-MM-JJ" /></FormField>
            <FormField label="Date fin"><TextField value={form.dateFin} onChangeText={(v) => setForm((f) => ({ ...f, dateFin: v }))} placeholder="AAAA-MM-JJ" /></FormField>
          </>
        )}
        {wizardStep === 2 && (
          <>
            <FormField label="Montant demandé (DH)"><TextField value={form.montantDemande} onChangeText={(v) => setForm((f) => ({ ...f, montantDemande: v }))} keyboardType="decimal-pad" /></FormField>
            <FormField label="Taux (%)"><TextField value={form.taux} onChangeText={(v) => setForm((f) => ({ ...f, taux: v }))} keyboardType="number-pad" /></FormField>
            <FormField label="Observation"><TextField value={form.observation} onChangeText={(v) => setForm((f) => ({ ...f, observation: v }))} multiline /></FormField>
            <OutlineButton title={pdfFile ? `PDF : ${pdfFile.name}` : 'Choisir PDF *'} onPress={async () => { const f = await pickPdfFile(); if (f) setPdfFile(f); }} style={{ marginTop: 8 }} />
          </>
        )}
        {wizardStep === 3 && (
          <>
            <DetailItem label="Bénéficiaire">{form.beneficiaire}</DetailItem>
            <DetailItem label="Type">{form.typePrestation}</DetailItem>
            <DetailItem label="Montant">{formatMoney(form.montantDemande)}</DetailItem>
            <DetailItem label="PDF">{pdfFile ? pdfFile.name : '—'}</DetailItem>
          </>
        )}
      </AppModal>

      <AppModal
        visible={modal?.mode === 'detail'}
        title={modal?.item ? `PEC ${modal.item.numero}` : ''}
        onClose={closeModal}
        footer={<OutlineButton title="Fermer" onPress={closeModal} style={{ flex: 1 }} />}
      >
        {modal?.item && (
          <>
            <DetailSection title="Informations" icon="info-circle">
              <DetailItem label="Bénéficiaire">{modal.item.beneficiaire}</DetailItem>
              <DetailItem label="Type">{modal.item.typePrestation}</DetailItem>
              <DetailItem label="Établissement">{modal.item.etablissement}</DetailItem>
              <DetailItem label="Statut">{modal.item.statut}</DetailItem>
              <DetailItem label="Début">{formatDate(modal.item.dateDebut)}</DetailItem>
              <DetailItem label="Fin">{formatDate(modal.item.dateFin)}</DetailItem>
            </DetailSection>
            <DetailSection title="Détails financiers" icon="coins">
              <DetailItem label="Montant demandé">{formatMoney(modal.item.montantDemande)}</DetailItem>
              <DetailItem label="Montant PEC">{formatMoney(modal.item.montantPrisEnCharge)}</DetailItem>
              <DetailItem label="Taux">{modal.item.taux != null ? `${modal.item.taux} %` : '—'}</DetailItem>
            </DetailSection>
            <DetailSection title="Document & observation" icon="file-alt">
              <DetailItem label="Observation">{modal.item.observation || '—'}</DetailItem>
              {modal.item.hasPdf ? (
                <OutlineButton title="Voir PDF" onPress={() => downloadAndShare(`/api/care-episodes/${modal.item.id}/document`, `pec-${modal.item.numero}.pdf`).catch((e) => addToast('error', e.message))} />
              ) : null}
            </DetailSection>
            {canMutate && (
              <View style={{ marginTop: 12, gap: 8 }}>
                <Text style={{ fontWeight: '700', marginBottom: 4 }}>Validation mutuelle</Text>
                <FormField label="Montant PEC"><TextField value={reviewMontant} onChangeText={setReviewMontant} keyboardType="decimal-pad" /></FormField>
                <FormField label="Taux"><TextField value={reviewTaux} onChangeText={setReviewTaux} keyboardType="number-pad" /></FormField>
                <FormField label="Observation"><TextField value={reviewObs} onChangeText={setReviewObs} multiline /></FormField>
                <OutlineButton title="Approuver" onPress={() => doAction(`/api/care-episodes/${modal.item.id}/validate`, 'PEC approuvée', { montantPrisEnCharge: reviewMontant ? Number(reviewMontant) : null, taux: reviewTaux ? Number(reviewTaux) : null, observation: reviewObs || null })} />
                <OutlineButton title="Rejeter" danger onPress={() => doAction(`/api/care-episodes/${modal.item.id}/reject`, 'PEC rejetée', { observation: reviewObs || null })} />
              </View>
            )}
          </>
        )}
      </AppModal>
    </View>
  );
}
