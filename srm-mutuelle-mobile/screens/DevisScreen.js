import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
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
  ScreenToolbar,
  EmptyState,
  LoadingCenter,
  TAB_BAR_EXTRA_BOTTOM,
} from '../components/ui';

export default function DevisScreen({ user, addToast }) {
  const isAdherent = isAdherentRole(user);
  const canMutate = isStaffWriterRole(user);
  const canCreate = isAdherent || canMutate;

  const [rows, setRows] = useState([]);
  const [agents, setAgents] = useState([]);
  const [dentistes, setDentistes] = useState([]);
  const [quoteTypes, setQuoteTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [pdfFile, setPdfFile] = useState(null);
  const [form, setForm] = useState({ beneficiaire: '', type: '', dentisteId: '', dentisteLibre: '', montant: '', taux: '60', observation: '' });
  const [reviewPec, setReviewPec] = useState('');
  const [reviewObs, setReviewObs] = useState('');

  const reload = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const types = await getTypeOptionsAsync('quoteTypes');
      setQuoteTypes(types);
      const [q, a, d] = await Promise.all([
        parseJsonOrThrow(await apiFetch('/api/quotes')),
        parseJsonOrThrow(await apiFetch('/api/agents')),
        parseJsonOrThrow(await apiFetch('/api/contracted-doctors')),
      ]);
      setRows(q);
      setAgents(a);
      setDentistes(d);
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

  const agentOptions = useMemo(
    () => agents.map((a) => ({ label: `${a.prenom} ${a.nom}`, value: `${a.prenom} ${a.nom}` })),
    [agents],
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => matchesSearch(search, r.numero, r.beneficiaire, r.type, r.dentistName, r.etat));
  }, [rows, search]);

  const closeModal = () => {
    setModal(null);
    setWizardStep(1);
    setPdfFile(null);
  };

  const openCreate = () => {
    setForm({ beneficiaire: agentOptions[0]?.value || '', type: quoteTypes[0] || '', dentisteId: '', dentisteLibre: '', montant: '', taux: '60', observation: '' });
    setWizardStep(1);
    setModal({ mode: 'create' });
  };

  const submitWizard = async () => {
    if (!pdfFile) {
      addToast('error', 'PDF devis obligatoire');
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
      taux: form.taux || '60',
      beneficiaire: form.beneficiaire,
      dateDevis: today,
      dateDepot: today,
      observation: form.observation || '',
    };
    if (providerName) fields.providerName = providerName;
    if (!isAdherent && agent) fields.agentId = String(agent.id);
    try {
      await uploadMultipart('/api/quotes/with-document', fields, pdfFile);
      addToast('success', 'Devis enregistré');
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
            <ListCard title={item.numero} subtitle={`${item.beneficiaire} · ${formatMoney(item.montant)}`} badge={item.etat} onPress={() => { setReviewPec(item.montantPrisEnCharge != null ? String(item.montantPrisEnCharge) : ''); setReviewObs(item.observation || ''); setModal({ mode: 'detail', item }); }} />
          )}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={{ paddingBottom: TAB_BAR_EXTRA_BOTTOM + 16 }}
        />
      )}

      <AppModal visible={modal?.mode === 'create'} title="Nouveau devis" onClose={closeModal} footer={<><OutlineButton title={wizardStep > 1 ? 'Précédent' : 'Annuler'} onPress={() => (wizardStep > 1 ? setWizardStep((s) => s - 1) : closeModal())} style={{ flex: 1 }} />{wizardStep < 3 ? <PrimaryButton title="Suivant" onPress={() => setWizardStep((s) => s + 1)} style={{ flex: 1 }} /> : <PrimaryButton title="Envoyer" onPress={submitWizard} style={{ flex: 1 }} />}</>}>
        <Stepper step={wizardStep} labels={['Informations', 'PDF', 'Confirmation']} />
        {wizardStep === 1 && (
          <>
            <SelectField label="Bénéficiaire" value={form.beneficiaire} options={agentOptions} onChange={(v) => setForm((f) => ({ ...f, beneficiaire: v }))} />
            <SelectField label="Type" value={form.type} options={quoteTypes.map((t) => ({ label: t, value: t }))} onChange={(v) => setForm((f) => ({ ...f, type: v }))} />
            <SelectField label="Dentiste" value={form.dentisteId} options={[{ label: '— Choisir —', value: '' }, ...dentistes.map((d) => ({ label: d.fullName, value: String(d.id) }))]} onChange={(v) => setForm((f) => ({ ...f, dentisteId: v }))} />
            <FormField label="Ou nom libre"><TextField value={form.dentisteLibre} onChangeText={(v) => setForm((f) => ({ ...f, dentisteLibre: v }))} /></FormField>
            <FormField label="Montant (DH)"><TextField value={form.montant} onChangeText={(v) => setForm((f) => ({ ...f, montant: v }))} keyboardType="decimal-pad" /></FormField>
            <FormField label="Taux (%)"><TextField value={form.taux} onChangeText={(v) => setForm((f) => ({ ...f, taux: v }))} keyboardType="number-pad" /></FormField>
          </>
        )}
        {wizardStep === 2 && (
          <>
            <FormField label="Observation"><TextField value={form.observation} onChangeText={(v) => setForm((f) => ({ ...f, observation: v }))} multiline /></FormField>
            <OutlineButton title={pdfFile ? pdfFile.name : 'Choisir PDF *'} onPress={async () => { const f = await pickPdfFile(); if (f) setPdfFile(f); }} />
          </>
        )}
        {wizardStep === 3 && (
          <>
            <DetailItem label="Bénéficiaire">{form.beneficiaire}</DetailItem>
            <DetailItem label="Type">{form.type}</DetailItem>
            <DetailItem label="Montant">{formatMoney(form.montant)}</DetailItem>
          </>
        )}
      </AppModal>

      <AppModal visible={modal?.mode === 'detail'} title={modal?.item ? `Devis ${modal.item.numero}` : ''} onClose={closeModal} footer={<OutlineButton title="Fermer" onPress={closeModal} style={{ flex: 1 }} />}>
        {modal?.item && (
          <>
            <DetailItem label="Bénéficiaire">{modal.item.beneficiaire}</DetailItem>
            <DetailItem label="Type">{modal.item.type}</DetailItem>
            <DetailItem label="Prestataire">{modal.item.dentistName || '—'}</DetailItem>
            <DetailItem label="Montant">{formatMoney(modal.item.montant)}</DetailItem>
            <DetailItem label="État">{modal.item.etat}</DetailItem>
            {modal.item.hasPdf ? <OutlineButton title="PDF devis" onPress={() => downloadAndShare(`/api/quotes/${modal.item.id}/document`, `devis-${modal.item.numero}.pdf`).catch((e) => addToast('error', e.message))} /> : null}
            {canMutate && (
              <>
                <FormField label="Montant PEC"><TextField value={reviewPec} onChangeText={setReviewPec} keyboardType="decimal-pad" /></FormField>
                <FormField label="Observation"><TextField value={reviewObs} onChangeText={setReviewObs} multiline /></FormField>
                <OutlineButton title="Marquer instructé" onPress={() => doAction(`/api/quotes/${modal.item.id}/scan`, 'Devis instructé')} />
                {modal.item.scanned ? (
                  <>
                    <OutlineButton title="Approuver" onPress={() => doAction(`/api/quotes/${modal.item.id}/approve`, 'Devis approuvé', { montantPrisEnCharge: reviewPec ? Number(reviewPec) : null, observation: reviewObs || null })} />
                    <OutlineButton title="Refuser" danger onPress={() => doAction(`/api/quotes/${modal.item.id}/reject`, 'Devis refusé', { observation: reviewObs || null })} />
                  </>
                ) : null}
              </>
            )}
          </>
        )}
      </AppModal>
    </View>
  );
}
