import React, { useEffect, useState } from 'react';
import { isAdherentRole, isStaffWriterRole } from '../authUtils';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import TablePageShell from '../components/TablePageShell';
import DetailItem from '../components/DetailItem';
import DetailView from '../components/DetailView';
import DetailModalFooter from '../components/DetailModalFooter';
import WorkflowSteps from '../components/WorkflowSteps';
import { resolveDevisWorkflow } from '../utils/workflowSteps';
import { apiFetch, apiFetchBlob, parseJsonOrThrow } from '../api/client';
import { getTypeOptions } from '../config/typeConfig';

function statusBadge(statut) {
  const map = {
    Approuvé: 'badge-success',
    'En attente': 'badge-warning',
    Rejeté: 'badge-danger',
    Soumis: 'badge-primary',
    Brouillon: 'badge-neutral',
  };
  return <span className={`badge ${map[statut] || 'badge-info'}`}>{statut}</span>;
}

function formatDate(d) {
  if (!d) return '—';
  const s = typeof d === 'string' ? d : '';
  if (!s) return '—';
  const [y, m, day] = s.split('-');
  return `${day}/${m}/${y}`;
}

function mapQuoteRow(q, agentById) {
  const agent = agentById[q.agentId];
  const pec =
    q.montantPrisEnCharge != null
      ? Number(q.montantPrisEnCharge)
      : Math.round((Number(q.montant) * q.taux) / 100);
  return {
    ...q,
    matricule: agent?.matricule || '—',
    nomPrenomAgent: agent ? `${agent.nom} ${agent.prenom}` : q.beneficiaire,
    dentiste: q.dentistName || '—',
    prestataire: q.dentistName || '—',
    typeLabel: q.type || '—',
    dateDevis: q.date,
    dateDepot: q.depositDate || q.date,
    dateEnvoi: q.sentDate || null,
    dateReponse: q.responseDate || null,
    montantPrisEnCharge: pec,
    scanDevisDent: q.hasPdf ? q.pdfOriginalName || 'PDF joint' : '—',
    observation: q.observation || '—',
  };
}

function BeneficiaryField({ agents, readOnly }) {
  if (readOnly && agents[0]) {
    return (
      <div className="form-group">
        <label>Porteur</label>
        <input className="form-control" readOnly value={`${agents[0].prenom} ${agents[0].nom}`} />
      </div>
    );
  }
  return (
    <div className="form-group">
      <label>Bénéficiaire</label>
      <select name="beneficiaire" className="form-control" required>
        {agents.map((a) => (
          <option key={a.id} value={`${a.prenom} ${a.nom}`}>
            {a.prenom} {a.nom}
          </option>
        ))}
      </select>
    </div>
  );
}

function DentistFields({ dentistes, defaultValueDentistId, defaultValueDentisteLibre }) {
  return (
    <>
      <div className="form-group">
        <label>Dentiste conventionné</label>
        <select name="dentisteId" className="form-control" defaultValue={defaultValueDentistId}>
          <option value="">— Choisir —</option>
          {dentistes.map((doc) => (
            <option key={doc.id} value={String(doc.id)}>
              {doc.fullName}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Ou nom du dentiste</label>
        <input name="dentisteLibre" className="form-control" defaultValue={defaultValueDentisteLibre} placeholder="Si hors liste" />
      </div>
    </>
  );
}

function MontantFields() {
  return (
    <>
      <div className="form-group">
        <label>Montant devis (DH)</label>
        <input name="montant" type="number" step="0.01" min="0" className="form-control" required />
      </div>
      <div className="form-group">
        <label>Taux (%)</label>
        <input name="taux" type="number" min="0" max="100" className="form-control" defaultValue="60" required />
      </div>
    </>
  );
}

function StaffReviewPanel({ d, reviewPec, setReviewPec, reviewObs, setReviewObs, canScan, canDecide, doAction }) {
  const reviewBody = () => ({
    montantPrisEnCharge: reviewPec ? Number(reviewPec) : null,
    observation: reviewObs || null,
  });

  return (
    <div className="staff-review-panel">
      <h4 className="staff-review-title">Validation mutuelle</h4>
      <div className="form-grid" style={{ marginBottom: 12 }}>
        <div className="form-group">
          <label>Montant prise en charge (DH)</label>
          <input
            type="number"
            step="0.01"
            className="form-control"
            value={reviewPec}
            onChange={(e) => setReviewPec(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Observation / motif</label>
          <textarea className="form-control" rows={2} value={reviewObs} onChange={(e) => setReviewObs(e.target.value)} />
        </div>
      </div>
      <div className="workflow-actions-bar">
        {canScan && (
          <button type="button" className="btn btn-outline" onClick={() => doAction(`/api/quotes/${d.id}/scan`, 'Devis en instruction')}>
            <FaIcon name="clipboard-check" className="fa-inline-icon" /> Marquer instructé
          </button>
        )}
        {canDecide && d.scanned && (
          <>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => doAction(`/api/quotes/${d.id}/approve`, 'Devis approuvé', reviewBody())}
            >
              <FaIcon name="check" className="fa-inline-icon" /> Approuver
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
              onClick={() => doAction(`/api/quotes/${d.id}/reject`, 'Devis refusé', reviewBody())}
            >
              <FaIcon name="xmark" className="fa-inline-icon" /> Refuser
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function DevisPage({ setPageTitle, addToast, user, personalMode = false }) {
  const effectiveAdherent = personalMode || isAdherentRole(user);
  setPageTitle(
    personalMode ? 'Mes devis' : 'Devis',
    personalMode ? 'Mon espace — Mes devis' : 'Gestion des devis',
  );
  const isAdherent = effectiveAdherent;
  const canStaffActions = isStaffWriterRole(user);
  const canCreate = isAdherent || canStaffActions;

  const [filterMatricule, setFilterMatricule] = useState('');
  const [filterNom, setFilterNom] = useState('');
  const [filterDateRef, setFilterDateRef] = useState('dateDepot');
  const [filterDateRefValue, setFilterDateRefValue] = useState('');
  const [filterDateDebut, setFilterDateDebut] = useState('');
  const [filterDateFin, setFilterDateFin] = useState('');
  const [filterEtat, setFilterEtat] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPrestataire, setFilterPrestataire] = useState('');
  const quoteTypes = getTypeOptions('quoteTypes');

  const [modal, setModal] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [agents, setAgents] = useState([]);
  const [dentistes, setDentistes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfFile, setPdfFile] = useState(null);
  const [reviewPec, setReviewPec] = useState('');
  const [reviewObs, setReviewObs] = useState('');

  const reload = async () => {
    setLoading(true);
    try {
      const [qRes, aRes, dRes] = await Promise.all([
        apiFetch('/api/quotes'),
        apiFetch('/api/agents'),
        apiFetch('/api/contracted-doctors'),
      ]);
      setQuotes(await parseJsonOrThrow(qRes));
      setAgents(await parseJsonOrThrow(aRes));
      setDentistes(await parseJsonOrThrow(dRes));
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const agentById = Object.fromEntries((agents || []).map((a) => [a.id, a]));
  const quoteRows = quotes.map((q) => mapQuoteRow(q, agentById));

  const myAgent =
    isAdherent && user?.agentId != null ? agents.find((a) => a.id === Number(user.agentId)) : null;
  const agentsForForm = isAdherent && myAgent ? [myAgent] : agents;

  let data = [...quoteRows];
  // In personal mode (or adherent role): restrict list to the user's own agent
  if (isAdherent) {
    if (user?.agentId != null) {
      data = data.filter((d) => String(d.agentId) === String(user.agentId));
    } else {
      data = [];
    }
  }
  if (filterType) data = data.filter((d) => d.typeLabel === filterType);
  if (filterMatricule) data = data.filter((d) => d.matricule.toLowerCase().includes(filterMatricule.toLowerCase()));
  if (filterNom) data = data.filter((d) => d.nomPrenomAgent.toLowerCase().includes(filterNom.toLowerCase()));
  if (filterDateRefValue) data = data.filter((d) => String(d[filterDateRef] || '') === filterDateRefValue);
  if (filterDateDebut) data = data.filter((d) => String(d.dateDepot || '') >= filterDateDebut);
  if (filterDateFin) data = data.filter((d) => String(d.dateDepot || '') <= filterDateFin);
  if (filterEtat) data = data.filter((d) => d.etat === filterEtat);
  if (filterPrestataire) data = data.filter((d) => d.prestataire.toLowerCase().includes(filterPrestataire.toLowerCase()));

  const openPdf = async (id) => {
    try {
      const blob = await apiFetchBlob(`/api/quotes/${id}/document`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      addToast('error', e.message || 'Impossible d’ouvrir le PDF');
    }
  };

  const handleCreateQuote = async (e) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const fileFromInput = formEl.querySelector('input[name="pdfDocument"]')?.files?.[0];
    const file = fileFromInput || pdfFile;
    if (!file) {
      addToast('error', 'Le fichier PDF du devis est obligatoire');
      return;
    }
    const fd = new FormData(formEl);
    const agentLabel = isAdherent && myAgent ? `${myAgent.prenom} ${myAgent.nom}` : fd.get('beneficiaire');
    const agent = agentsForForm.find((a) => `${a.prenom} ${a.nom}` === agentLabel);
    if (!agent) {
      addToast(
        'error',
        isAdherent
          ? 'Compte adhérent sans porteur associé. Reconnectez-vous ou contactez l’administrateur.'
          : 'Porteur invalide',
      );
      return;
    }
    const quoteType = String(fd.get('quoteType') || quoteTypes[0] || 'Dentaire');
    const dentistSelect = fd.get('dentisteId');
    const dentistCustom = String(fd.get('dentisteLibre') || '').trim();
    const providerFree = String(fd.get('providerName') || '').trim();
    const dentistRow = dentistSelect ? dentistes.find((d) => String(d.id) === String(dentistSelect)) : null;
    const providerName = dentistRow?.fullName || dentistCustom || providerFree || '';

    const body = new FormData();
    const montant = fd.get('montant');
    if (!montant || Number(montant) <= 0) {
      addToast('error', 'Indiquez un montant de devis valide');
      return;
    }
    body.append('file', file, file.name || 'devis.pdf');
    body.append('quoteType', quoteType);
    body.append('montant', String(montant));
    body.append('taux', String(fd.get('taux') || '60'));
    if (!isAdherent || user.roleCode !== 'ADHERENT') body.append('agentId', String(agent.id));
    body.append('beneficiaire', agentLabel);
    if (providerName) body.append('providerName', providerName);
    const today = new Date().toISOString().split('T')[0];
    const dateDevis = fd.get('dateDevis') || today;
    const dateDepot = fd.get('dateDepot') || today;
    body.append('dateDevis', String(dateDevis));
    body.append('dateDepot', String(dateDepot));
    const obs = fd.get('observation');
    if (obs) body.append('observation', obs);

    try {
      await parseJsonOrThrow(await apiFetch('/api/quotes/with-document', { method: 'POST', body }));
      setPdfFile(null);
      setModal(null);
      addToast('success', 'Devis enregistré avec PDF. Envoyez-le à la mutuelle quand vous êtes prêt.');
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur');
    }
  };

  const handleEditQuote = async (e) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const fileFromInput = formEl.querySelector('input[name="pdfDocument"]')?.files?.[0];
    const file = fileFromInput || pdfFile;
    const fd = new FormData(formEl);
    const quoteId = modal?.quote?.id;
    if (!quoteId) {
      addToast('error', 'Identifiant du devis introuvable');
      return;
    }

    const agentLabel = isAdherent && myAgent ? `${myAgent.prenom} ${myAgent.nom}` : fd.get('beneficiaire');
    const agent = agentsForForm.find((a) => `${a.prenom} ${a.nom}` === agentLabel);
    if (!agent) {
      addToast(
        'error',
        isAdherent
          ? 'Compte adhérent sans porteur associé. Reconnectez-vous ou contactez l’administrateur.'
          : 'Porteur invalide',
      );
      return;
    }
    const quoteType = String(fd.get('quoteType') || 'Dentaire');
    const dentistSelect = fd.get('dentisteId');
    const dentistCustom = String(fd.get('dentisteLibre') || '').trim();
    const providerFree = String(fd.get('providerName') || '').trim();
    const dentistRow = dentistSelect ? dentistes.find((d) => String(d.id) === String(dentistSelect)) : null;
    const providerName = dentistRow?.fullName || dentistCustom || providerFree || '';

    const body = new FormData();
    const montant = fd.get('montant');
    if (!montant || Number(montant) <= 0) {
      addToast('error', 'Indiquez un montant de devis valide');
      return;
    }

    if (file) {
      body.append('file', file, file.name || 'devis.pdf');
    }
    body.append('quoteType', quoteType);
    body.append('montant', String(montant));
    body.append('taux', String(fd.get('taux') || '60'));
    if (!isAdherent || user.roleCode !== 'ADHERENT') body.append('agentId', String(agent.id));
    body.append('beneficiaire', agentLabel);
    if (providerName) body.append('providerName', providerName);

    const dateDevis = fd.get('dateDevis');
    const dateDepot = fd.get('dateDepot');
    if (dateDevis) body.append('dateDevis', String(dateDevis));
    if (dateDepot) body.append('dateDepot', String(dateDepot));
    
    const obs = fd.get('observation');
    if (obs !== null) body.append('observation', obs);

    try {
      await parseJsonOrThrow(await apiFetch(`/api/quotes/${quoteId}/update`, { method: 'POST', body }));
      setPdfFile(null);
      setModal(null);
      addToast('success', 'Devis modifié avec succès.');
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur lors de la modification');
    }
  };

  const renderQuoteForm = (mode, q = null) => {
    const isEdit = mode === 'edit';
    const docMatch = q ? dentistes.find((doc) => doc.fullName === q.dentistName) : null;
    const defaultDentistId = docMatch ? String(docMatch.id) : '';
    const defaultDentisteLibre = !docMatch && q ? q.dentistName : '';

    return (
      <form onSubmit={isEdit ? handleEditQuote : handleCreateQuote}>
        <div className="form-grid">
          <div className="form-group">
            <label>Type de devis</label>
            <select name="quoteType" className="form-control" defaultValue={q ? q.type : (quoteTypes[0] || 'Dentaire')} required>
              {quoteTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {isAdherent && myAgent && (
            <>
              <input type="hidden" name="beneficiaire" value={`${myAgent.prenom} ${myAgent.nom}`} />
              <BeneficiaryField agents={agentsForForm} readOnly />
            </>
          )}
          {!isAdherent && (
            <div className="form-group">
              <label>Bénéficiaire</label>
              <select name="beneficiaire" className="form-control" defaultValue={q ? q.beneficiaire : ''} required>
                {agentsForForm.map((a) => (
                  <option key={a.id} value={`${a.prenom} ${a.nom}`}>
                    {a.prenom} {a.nom}
                  </option>
                ))}
              </select>
            </div>
          )}
          <DentistFields
            dentistes={dentistes}
            defaultValueDentistId={defaultDentistId}
            defaultValueDentisteLibre={defaultDentisteLibre}
          />
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Autre prestataire (optique, auditif, hospi…)</label>
            <input
              name="providerName"
              className="form-control"
              defaultValue={q && !docMatch ? q.dentistName : ''}
              placeholder="Nom du professionnel ou établissement"
            />
          </div>
          <div className="form-group">
            <label>Date devis</label>
            <input
              name="dateDevis"
              type="date"
              className="form-control"
              defaultValue={q ? q.date : new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          <div className="form-group">
            <label>Date dépôt</label>
            <input
              name="dateDepot"
              type="date"
              className="form-control"
              defaultValue={q ? q.depositDate : new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          <div className="form-group">
            <label>Montant devis (DH)</label>
            <input
              name="montant"
              type="text"
              inputMode="decimal"
              className="form-control"
              defaultValue={q ? q.montant : ''}
              placeholder="Ex. 3500"
              required
            />
          </div>
          <div className="form-group">
            <label>Taux (%)</label>
            <input
              name="taux"
              type="number"
              min="0"
              max="100"
              className="form-control"
              defaultValue={q ? q.taux : '60'}
              required
            />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>PDF du devis {isEdit ? '(Optionnel, laissez vide pour conserver l’actuel)' : '(Obligatoire)'}</label>
            <div className="pdf-upload-zone">
              <input
                type="file"
                name="pdfDocument"
                accept="application/pdf,.pdf"
                className="form-control"
                onChange={(ev) => setPdfFile(ev.target.files?.[0] || null)}
                required={!isEdit}
              />
              {pdfFile ? (
                <p className="pdf-upload-hint">
                  <FaIcon name="file-pdf" className="fa-inline-icon" /> {pdfFile.name} ({Math.round(pdfFile.size / 1024)} Ko)
                </p>
              ) : q?.hasPdf ? (
                <p className="pdf-upload-hint" style={{ color: 'var(--primary-600)' }}>
                  <FaIcon name="file-pdf" className="fa-inline-icon" /> PDF actuel : {q.pdfOriginalName || 'devis.pdf'}
                </p>
              ) : (
                <p className="pdf-upload-hint">Format PDF uniquement, 15 Mo max.</p>
              )}
            </div>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Observation (optionnel)</label>
            <textarea
              name="observation"
              className="form-control"
              rows={2}
              defaultValue={q && q.observation !== '—' ? q.observation : ''}
              placeholder="Précisions pour la mutuelle…"
            />
          </div>
        </div>
        <div className="modal-footer" style={{ padding: '16px 0 0' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setPdfFile(null);
              setModal(null);
            }}
          >
            Annuler
          </button>
          <button type="submit" className="btn btn-primary">
            <FaIcon name="floppy-disk" className="fa-inline-icon" /> Enregistrer les modifications
          </button>
        </div>
      </form>
    );
  };

  const doAction = async (path, label, body) => {
    try {
      await parseJsonOrThrow(await apiFetch(path, { method: 'POST', body: body || undefined }));
      addToast('success', label);
      setModal(null);
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur');
    }
  };

  const staffReviewActions = (d) => {
    const canDecide = d.etat === 'Soumis' || d.scanned;
    const canScan = d.etat === 'Soumis' && !d.scanned;
    return (
      <StaffReviewPanel
        d={d}
        reviewPec={reviewPec}
        setReviewPec={setReviewPec}
        reviewObs={reviewObs}
        setReviewObs={setReviewObs}
        canScan={canScan}
        canDecide={canDecide}
        doAction={doAction}
      />
    );
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">Chargement…</div>
      </div>
    );
  }

  const etats = [...new Set(quoteRows.map((x) => x.etat))].filter(Boolean);
  const closeModal = () => setModal(null);

  const viewDevis = (d) => {
    const wf = resolveDevisWorkflow(d.etat, !!d.scanned);
    const defaultPec = d.montantPrisEnCharge ?? Math.round((Number(d.montant) * d.taux) / 100);
    setReviewPec(String(defaultPec));
    setReviewObs(d.observation && d.observation !== '—' ? d.observation : '');
    setModal({
      title: `Devis ${d.numero}`,
      variant: 'detail',
      content: (
        <>
          <WorkflowSteps {...wf} />
          {d.hasPdf && (
            <div className="workflow-actions-bar" style={{ marginBottom: 12 }}>
              <button type="button" className="btn btn-outline" onClick={() => openPdf(d.id)}>
                <FaIcon name="file-pdf" className="fa-inline-icon" /> Voir le PDF
              </button>
            </div>
          )}
          <DetailView footer={<DetailModalFooter onClose={closeModal} canEdit={false} />}>
            <DetailItem label="Matricule">{d.matricule}</DetailItem>
            <DetailItem label="Agent">{d.nomPrenomAgent}</DetailItem>
            <DetailItem label="Bénéficiaire">{d.beneficiaire}</DetailItem>
            <DetailItem label="Dentiste">{d.dentiste}</DetailItem>
            <DetailItem label="N° devis">{d.numero}</DetailItem>
            <DetailItem label="Date devis">{formatDate(d.dateDevis)}</DetailItem>
            <DetailItem label="Date dépôt">{formatDate(d.dateDepot)}</DetailItem>
            <DetailItem label="Date envoi">{formatDate(d.dateEnvoi)}</DetailItem>
            <DetailItem label="Date réponse">{formatDate(d.dateReponse)}</DetailItem>
            <DetailItem label="État">{statusBadge(d.etat)}</DetailItem>
            <DetailItem label="Montant devis">{Number(d.montant).toLocaleString('fr-FR')} DH</DetailItem>
            <DetailItem label="Montant PEC">{Number(d.montantPrisEnCharge || 0).toLocaleString('fr-FR')} DH</DetailItem>
            <DetailItem label="Document">{d.hasPdf ? d.pdfOriginalName || 'PDF' : 'Non joint'}</DetailItem>
            <DetailItem label="Observation">{d.observation}</DetailItem>
          </DetailView>
          {canStaffActions && staffReviewActions(d)}
          {isAdherent && (d.etat === 'En attente' || d.etat === 'Brouillon') && (
            <div className="workflow-actions-bar">
              <p className="workflow-actions-hint">
                Étape 1/3 — Votre devis est enregistré. Envoyez-le à la mutuelle pour lancer l’instruction.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!d.hasPdf}
                onClick={() => doAction(`/api/quotes/${d.id}/submit`, 'Devis transmis à la mutuelle')}
              >
                <FaIcon name="paper-plane" className="fa-inline-icon" /> Envoyer à la mutuelle
              </button>
            </div>
          )}
        </>
      ),
    });
  };

  const workflowSummary = (d) => {
    const wf = resolveDevisWorkflow(d.etat, !!d.scanned);
    if (wf.terminal) return wf.terminalLabel;
    return `Étape ${wf.activeStep}/3 — ${wf.steps[wf.activeStep - 1].label}`;
  };

  if (isAdherent && (!user?.agentId || !myAgent)) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', color: 'var(--warning-500)', marginBottom: '16px' }}>
            <FaIcon name="triangle-exclamation" />
          </div>
          <h4>Compte non associé à un porteur</h4>
          <p style={{ color: 'var(--gray-500)', maxWidth: '480px', margin: '8px auto 0' }}>
            Votre compte utilisateur n'est pas associé à une fiche agent (porteur). 
            Veuillez contacter un administrateur pour lier votre compte dans la gestion des utilisateurs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {modal && (
        <Modal title={modal.title} onClose={closeModal} variant={modal.variant}>
          {modal.mode === 'create' || modal.mode === 'edit'
            ? renderQuoteForm(modal.mode, modal.quote)
            : modal.content}
        </Modal>
      )}
      <TablePageShell
        title={isAdherent ? 'Mes devis' : 'Liste des devis'}
        icon="file-lines"
        toolbar={
          <>
            {!isAdherent && (
              <div className="table-page-toolbar-filters">
                <div className="filter-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                  <input className="form-control" placeholder="Matricule" value={filterMatricule} onChange={(e) => setFilterMatricule(e.target.value)} />
                  <input className="form-control" placeholder="Nom Agent" value={filterNom} onChange={(e) => setFilterNom(e.target.value)} />
                  <select className="form-control" value={filterDateRef} onChange={(e) => setFilterDateRef(e.target.value)}>
                    <option value="dateDepot">Date dépôt</option>
                    <option value="dateDevis">Date devis</option>
                  </select>
                  <input className="form-control" type="date" value={filterDateRefValue} onChange={(e) => setFilterDateRefValue(e.target.value)} />
                  <input className="form-control" type="date" value={filterDateDebut} onChange={(e) => setFilterDateDebut(e.target.value)} />
                  <input className="form-control" type="date" value={filterDateFin} onChange={(e) => setFilterDateFin(e.target.value)} />
                  <select className="form-control" value={filterEtat} onChange={(e) => setFilterEtat(e.target.value)}>
                    <option value="">État réponse</option>
                    {etats.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <select className="form-control" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="">Type devis</option>
                    {quoteTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <input
                    className="form-control"
                    placeholder="Prestataire"
                    value={filterPrestataire}
                    onChange={(e) => setFilterPrestataire(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="table-page-toolbar-row">
              <span className="toolbar-spacer" />
              {canCreate && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setPdfFile(null);
                    setModal({ title: 'Nouveau devis', mode: 'create' });
                  }}
                >
                  <FaIcon name="plus" className="fa-inline-icon" /> {isAdherent ? 'Déposer un devis' : 'Créer'}
                </button>
              )}
            </div>
          </>
        }
      >
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                {!isAdherent && <th>Matricule</th>}
                <th>{isAdherent ? 'Porteur' : 'Nom et Prénom Agent'}</th>
                <th>Type</th>
                <th>Prestataire</th>
                <th>Numéro</th>
                <th>Date dépôt</th>
                <th>État</th>
                {isAdherent ? <th>Suivi</th> : null}
                <th>Montant (DH)</th>
                <th>PDF</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={isAdherent ? 9 : 10} style={{ textAlign: 'center', padding: 24, color: 'var(--gray-500)' }}>
                    {isAdherent
                      ? 'Aucun devis. Cliquez sur « Déposer un devis » pour joindre votre PDF.'
                      : 'Aucun devis.'}
                  </td>
                </tr>
              )}
              {data.map((d) => (
                <tr key={d.id}>
                  {!isAdherent && <td>{d.matricule}</td>}
                  <td>{d.nomPrenomAgent}</td>
                  <td>
                    <span className="badge badge-primary">{d.typeLabel}</span>
                  </td>
                  <td>{d.prestataire}</td>
                  <td>{d.numero}</td>
                  <td>{formatDate(d.dateDepot)}</td>
                  <td>{statusBadge(d.etat)}</td>
                  {isAdherent ? (
                    <td style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)' }}>{workflowSummary(d)}</td>
                  ) : null}
                  <td>{Number(d.montant).toLocaleString('fr-FR')}</td>
                  <td>
                    {d.hasPdf ? (
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => openPdf(d.id)}>
                        PDF
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="actions-cell">
                    <button className="btn btn-icon btn-view" type="button" title="Voir" onClick={() => viewDevis(d)}>
                      <FaIcon name="eye" />
                    </button>
                    {(d.etat === 'En attente' || d.etat === 'Brouillon') && (isAdherent || canStaffActions) && (
                      <>
                        <button
                          className="btn btn-icon btn-outline"
                          type="button"
                          title="Modifier"
                          style={{ color: 'var(--primary-600)', borderColor: 'var(--primary-200)', marginRight: '4px' }}
                          onClick={() => {
                            setPdfFile(null);
                            setModal({ title: `Modifier le devis ${d.numero}`, mode: 'edit', quote: d });
                          }}
                        >
                          <FaIcon name="pen" />
                        </button>
                        <button
                          className="btn btn-icon btn-edit"
                          type="button"
                          title="Envoyer à la mutuelle"
                          disabled={!d.hasPdf}
                          onClick={() => doAction(`/api/quotes/${d.id}/submit`, 'Devis envoyé à la mutuelle')}
                        >
                          <FaIcon name="paper-plane" />
                        </button>
                      </>
                    )}
                    {canStaffActions && d.etat === 'Soumis' && !d.scanned && (
                      <button
                        className="btn btn-icon btn-edit"
                        type="button"
                        title="Marquer instructé"
                        onClick={() => doAction(`/api/quotes/${d.id}/scan`, 'Devis en instruction')}
                      >
                        <FaIcon name="clipboard-check" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TablePageShell>
    </>
  );
}
