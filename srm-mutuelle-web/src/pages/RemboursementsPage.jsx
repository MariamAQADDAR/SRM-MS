import React, { useEffect, useMemo, useState } from 'react';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/TablePagination';
import { canAdminDelete, isAdherentRole, isStaffWriterRole } from '../authUtils';
import WorkflowSteps from '../components/WorkflowSteps';
import { REMBOURSEMENT_WORKFLOW_STEPS, resolveRemboursementWorkflow } from '../utils/workflowSteps';
import DetailView from '../components/DetailView';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import TablePageShell from '../components/TablePageShell';
import ListPageToolbar from '../components/ListPageToolbar';
import { matchesSearch } from '../utils/filterSearch';
import AdminDeleteButton from '../components/AdminDeleteButton';
import DetailModalFooter from '../components/DetailModalFooter';
import DetailItem from '../components/DetailItem';
import MedicineSearchField from '../components/MedicineSearchField';
import { apiFetch, apiFetchBlob, parseJsonOrThrow } from '../api/client';
import { getTypeOptions } from '../config/typeConfig';
import { adminDeleteRecord } from '../utils/adminDelete';

const EXPORT_COLS = [
  { key: 'numero', label: 'N°' },
  { key: 'matricule', label: 'Matricule' },
  { key: 'nomPrenomAgent', label: 'Agent' },
  { key: 'beneficiaire', label: 'Bénéficiaire' },
  { key: 'etablissementMed', label: 'Établissement' },
  { key: 'typeSoin', label: 'Type soin' },
  { key: 'dateDepot', label: 'Date dépôt' },
  { key: 'etatReponse', label: 'État' },
  { key: 'montantDemande', label: 'Montant demandé' },
  { key: 'montantValide', label: 'Montant remboursé' },
  { key: 'tauxDisplay', label: 'Taux %' },
];

function statusBadge(statut) {
  const map = {
    Traité: 'badge-success',
    'En cours': 'badge-primary',
    'En attente': 'badge-warning',
    Clôturé: 'badge-info',
    Rejeté: 'badge-danger',
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

function mapRow(r, agentById) {
  const agent = agentById[r.agentId];
  return {
    ...r,
    matricule: agent?.matricule || '—',
    nomPrenomAgent: agent ? `${agent.nom} ${agent.prenom}` : r.beneficiaire,
    etablissementMed: r.establishmentName || '—',
    typeSoin: r.careType || '—',
    dateDepot: r.depositDate || r.date,
    dateEnvoi: r.sentDate || null,
    dateReponse: r.responseDate || null,
    etatReponse: r.statut,
    observation: r.observation || '—',
    tauxDisplay: r.taux != null ? `${r.taux} %` : '—',
  };
}

function WizardSteps({ step }) {
  const labels = ['1. Informations', '2. Justificatif', '3. Confirmation'];
  return (
    <div className="reimb-wizard-steps">
      {labels.map((label, i) => {
        const n = i + 1;
        let cls = 'reimb-wizard-step';
        if (n === step) cls += ' reimb-wizard-step--active';
        else if (n < step) cls += ' reimb-wizard-step--done';
        return (
          <div key={label} className={cls}>
            {label}
          </div>
        );
      })}
    </div>
  );
}

export default function RemboursementsPage({ setPageTitle, addToast, user, personalMode = false }) {
  const effectiveAdherent = personalMode || isAdherentRole(user);
  setPageTitle(
    personalMode ? 'Mes remboursements' : 'Remboursements',
    personalMode ? 'Mon espace — Remboursements' : 'Demandes de remboursement',
  );
  const canMutate = isStaffWriterRole(user);
  const canDelete = canAdminDelete(user);
  const isAdherent = effectiveAdherent;
  const canCreate = isAdherent || canMutate;

  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [rows, setRows] = useState([]);
  const [agents, setAgents] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfFile, setPdfFile] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardDraft, setWizardDraft] = useState({
    agentId: '',
    beneficiaire: '',
    careType: '',
    establishmentName: '',
    depositDate: new Date().toISOString().split('T')[0],
    montantDemande: '',
    observation: '',
  });
  const [medicineName, setMedicineName] = useState('');
  const [reviewMontant, setReviewMontant] = useState('');
  const [reviewTaux, setReviewTaux] = useState('');
  const [reviewObs, setReviewObs] = useState('');
  const careTypes = getTypeOptions('careTypes');

  const myAgent = isAdherent && user?.agentId != null ? Number(user.agentId) : null;

  const reload = async () => {
    setLoading(true);
    try {
      const reqs = [apiFetch('/api/reimbursements'), apiFetch('/api/agents')];
      if (myAgent) reqs.push(apiFetch(`/api/beneficiaries?agentId=${myAgent}`));
      const out = await Promise.all(reqs.map((p) => p.then((r) => parseJsonOrThrow(r))));
      setRows(out[0]);
      setAgents(out[1]);
      if (myAgent && out[2]) setBeneficiaries(out[2]);
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
  const rowsView = rows.map((r) => mapRow(r, agentById));

  // In personal / adherent mode: restrict to the user's own records
  const visibleRows = isAdherent
    ? (user?.agentId != null ? rowsView.filter((r) => String(r.agentId) === String(user.agentId)) : [])
    : rowsView;

  const beneficiaryOptions = useMemo(() => {
    const opts = [];
    if (isAdherent) {
      const agent = myAgent ? agents.find((a) => a.id === myAgent) : null;
      if (agent) {
        opts.push({ label: `${agent.prenom} ${agent.nom} (Titulaire)`, value: `${agent.prenom} ${agent.nom}` });
      }
      beneficiaries.forEach((b) => {
        opts.push({ label: `${b.prenom} ${b.nom} (${b.linkType})`, value: `${b.prenom} ${b.nom}` });
      });
    } else {
      agents.forEach((a) => {
        opts.push({ label: `${a.prenom} ${a.nom} (porteur)`, value: `${a.prenom} ${a.nom}` });
      });
    }
    return opts;
  }, [agents, beneficiaries, myAgent, isAdherent]);

  const data = useMemo(() => {
    let list = [...visibleRows];
    if (searchQuery.trim()) {
      list = list.filter((r) =>
        matchesSearch(
          searchQuery,
          r.numero,
          r.matricule,
          r.nomPrenomAgent,
          r.beneficiaire,
          r.etablissementMed,
          r.typeSoin,
          r.medicineName,
          r.statut,
          r.tauxDisplay,
          r.montantDemande,
          r.montantValide,
          r.observation,
        ),
      );
    }
    return list;
  }, [rowsView, searchQuery]);

  const { pageData, page, setPage, totalPages } = usePagination(data, searchQuery);
  const resetWizard = () => {
    setWizardStep(1);
    setPdfFile(null);
    setMedicineName('');
    setWizardDraft({
      agentId: agents[0] ? String(agents[0].id) : '',
      beneficiaire: beneficiaryOptions[0]?.value || '',
      careType: careTypes[0] || '',
      establishmentName: '',
      depositDate: new Date().toISOString().split('T')[0],
      montantDemande: '',
      observation: '',
    });
  };

  const closeModal = () => {
    setModal(null);
    resetWizard();
  };

  const wizardGoNext = () => {
    if (wizardStep === 1) {
      if (!wizardDraft.beneficiaire) {
        addToast('error', 'Choisissez un bénéficiaire');
        return;
      }
      if (!wizardDraft.careType) {
        addToast('error', 'Choisissez un type de soin');
        return;
      }
    }
    if (wizardStep === 2) {
      if (!wizardDraft.montantDemande || Number(wizardDraft.montantDemande) <= 0) {
        addToast('error', 'Indiquez un montant valide');
        return;
      }
      if (!pdfFile) {
        addToast('error', 'Le justificatif PDF est obligatoire');
        return;
      }
    }
    setWizardStep((s) => s + 1);
  };

  const openPdf = async (id) => {
    try {
      const blob = await apiFetchBlob(`/api/reimbursements/${id}/document`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      addToast('error', e.message || 'PDF introuvable');
    }
  };

  const downloadReimbursementTemplate = async () => {
    try {
      const blob = await apiFetchBlob('/api/document-templates/reimbursement-request');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulletin-adhesion-remboursement.docx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      addToast('error', e.message || 'Modèle remboursement indisponible');
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

  const buildWizardForm = () => {
    const isMed = (type) => type && (type.includes('Médicament') || type.includes('Medicament'));
    const patchDraft = (key, value) => setWizardDraft((d) => ({ ...d, [key]: value }));

    const submitWizard = async (e) => {
      e.preventDefault();
      if (!pdfFile) {
        addToast('error', 'Le justificatif PDF est obligatoire');
        return;
      }
      if (!wizardDraft.montantDemande || Number(wizardDraft.montantDemande) <= 0) {
        addToast('error', 'Indiquez un montant valide');
        return;
      }
      const body = new FormData();
      body.append('file', pdfFile);
      body.append('beneficiaire', wizardDraft.beneficiaire);
      body.append('montantDemande', wizardDraft.montantDemande);
      if (wizardDraft.establishmentName) body.append('establishmentName', wizardDraft.establishmentName);
      if (wizardDraft.careType) body.append('careType', wizardDraft.careType);
      if (wizardDraft.depositDate) body.append('depositDate', wizardDraft.depositDate);
      if (medicineName) body.append('medicineName', medicineName);
      if (wizardDraft.observation) body.append('observation', wizardDraft.observation);
      if (!isAdherent && wizardDraft.agentId) {
        body.append('agentId', wizardDraft.agentId);
      } else if (isAdherent && user?.agentId != null) {
        body.append('agentId', String(user.agentId));
      }

      try {
        await parseJsonOrThrow(await apiFetch('/api/reimbursements/request', { method: 'POST', body }));
        addToast('success', 'Demande enregistrée — envoyez-la à la mutuelle (étape 2)');
        closeModal();
        reload();
      } catch (err) {
        addToast('error', err.message || 'Erreur');
      }
    };

    return (
      <form onSubmit={submitWizard}>
        <WizardSteps step={wizardStep} />
        <WorkflowSteps steps={REMBOURSEMENT_WORKFLOW_STEPS} activeStep={1} terminal={false} />

        {wizardStep === 1 && (
          <div className="form-grid">
            {!isAdherent && (
              <div className="form-group">
                <label>Porteur</label>
                <select
                  className="form-control"
                  required
                  value={wizardDraft.agentId}
                  onChange={(e) => patchDraft('agentId', e.target.value)}
                >
                  {agents.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.matricule} — {a.prenom} {a.nom}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Bénéficiaire</label>
              <select
                className="form-control"
                required
                value={wizardDraft.beneficiaire}
                onChange={(e) => patchDraft('beneficiaire', e.target.value)}
              >
                {beneficiaryOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Type de soin</label>
              <select
                className="form-control"
                required
                value={wizardDraft.careType}
                onChange={(e) => patchDraft('careType', e.target.value)}
              >
                <option value="">— Choisir —</option>
                {careTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Établissement / pharmacie</label>
              <input
                className="form-control"
                placeholder="Nom de l'établissement"
                value={wizardDraft.establishmentName}
                onChange={(e) => patchDraft('establishmentName', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Date de dépôt</label>
              <input
                type="date"
                className="form-control"
                value={wizardDraft.depositDate}
                onChange={(e) => patchDraft('depositDate', e.target.value)}
                required
              />
            </div>
          </div>
        )}

        {wizardStep === 2 && (
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Montant demandé (DH)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                required
                value={wizardDraft.montantDemande}
                onChange={(e) => patchDraft('montantDemande', e.target.value)}
              />
            </div>
            {isMed(wizardDraft.careType) && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }} id="medicineBlock">
                <MedicineSearchField value={medicineName} onChange={setMedicineName} required={false} />
              </div>
            )}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Justificatif PDF (facture, ordonnance…)</label>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="form-control"
                onChange={(ev) => setPdfFile(ev.target.files?.[0] || null)}
                required
              />
              {pdfFile && <p className="pdf-upload-hint">{pdfFile.name}</p>}
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Observation</label>
              <textarea
                className="form-control"
                rows={2}
                value={wizardDraft.observation}
                onChange={(e) => patchDraft('observation', e.target.value)}
              />
            </div>
          </div>
        )}

        {wizardStep === 3 && (
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--gray-700)', marginBottom: 12 }}>
              Après enregistrement, votre demande sera à l&apos;<strong>étape 1 — Dépôt</strong>. Utilisez{' '}
              <strong>Envoyer à la mutuelle</strong> pour passer à l&apos;<strong>étape 2 — Instruction</strong>.
            </p>
            <DetailItem label="Bénéficiaire">{wizardDraft.beneficiaire}</DetailItem>
            <DetailItem label="Type">{wizardDraft.careType}</DetailItem>
            <DetailItem label="Montant">{Number(wizardDraft.montantDemande || 0).toLocaleString('fr-FR')} DH</DetailItem>
            {medicineName ? <DetailItem label="Médicament">{medicineName}</DetailItem> : null}
            <DetailItem label="PDF">{pdfFile?.name || '—'}</DetailItem>
          </div>
        )}

        <div className="modal-footer" style={{ padding: '16px 0 0' }}>
          <button type="button" className="btn btn-outline" onClick={closeModal}>
            Annuler
          </button>
          {wizardStep > 1 && (
            <button type="button" className="btn btn-outline" onClick={() => setWizardStep((s) => s - 1)}>
              Précédent
            </button>
          )}
          {wizardStep < 3 ? (
            <button type="button" className="btn btn-primary" onClick={wizardGoNext}>
              Suivant
            </button>
          ) : (
            <button type="submit" className="btn btn-primary">
              <FaIcon name="floppy-disk" className="fa-inline-icon" /> Enregistrer la demande
            </button>
          )}
        </div>
      </form>
    );
  };

  const staffReviewPanel = (d) => {
    const canValidate = d.etatReponse === 'En cours' || d.etatReponse === 'En attente';
    return (
      <div className="staff-review-panel">
        <h4 className="staff-review-title">Validation mutuelle</h4>
        <div className="form-grid">
          <div className="form-group">
            <label>Montant remboursé (DH)</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              value={reviewMontant}
              onChange={(e) => setReviewMontant(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Taux de remboursement (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              className="form-control"
              value={reviewTaux}
              onChange={(e) => setReviewTaux(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Observation</label>
            <textarea className="form-control" rows={2} value={reviewObs} onChange={(e) => setReviewObs(e.target.value)} />
          </div>
        </div>
        <div className="workflow-actions-bar">
          {canValidate && (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  doAction(`/api/reimbursements/${d.id}/validate`, 'Remboursement validé', {
                    montantValide: Number(reviewMontant),
                    taux: reviewTaux ? Number(reviewTaux) : null,
                    observation: reviewObs || null,
                  })
                }
              >
                <FaIcon name="check" className="fa-inline-icon" /> Valider (étape 3)
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                onClick={() =>
                  doAction(`/api/reimbursements/${d.id}/reject`, 'Demande refusée', { observation: reviewObs || null })
                }
              >
                <FaIcon name="xmark" className="fa-inline-icon" /> Refuser
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const viewRemboursement = (d) => {
    const wf = resolveRemboursementWorkflow(d.etatReponse);
    const defaultMontant = Number(d.montantValide) > 0 ? d.montantValide : d.montantDemande;
    setReviewMontant(String(defaultMontant));
    setReviewTaux(d.taux != null ? String(d.taux) : '80');
    setReviewObs(d.observation !== '—' ? d.observation : '');
    setModal({
      title: `Remboursement ${d.numero}`,
      variant: 'detail',
      content: (
        <>
          <WorkflowSteps {...wf} />
          {d.hasPdf && (
            <div className="workflow-actions-bar" style={{ marginBottom: 12 }}>
              <button type="button" className="btn btn-outline" onClick={() => openPdf(d.id)}>
                <FaIcon name="file-pdf" className="fa-inline-icon" /> Voir le justificatif PDF
              </button>
            </div>
          )}
          <DetailView footer={<DetailModalFooter onClose={closeModal} canEdit={false} />}>
            <DetailItem label="N° demande">{d.numero}</DetailItem>
            <DetailItem label="Bénéficiaire">{d.beneficiaire}</DetailItem>
            <DetailItem label="Type soin">{d.typeSoin}</DetailItem>
            <DetailItem label="Médicament">{d.medicineName || '—'}</DetailItem>
            <DetailItem label="Établissement">{d.etablissementMed}</DetailItem>
            <DetailItem label="Date dépôt">{formatDate(d.dateDepot)}</DetailItem>
            <DetailItem label="Date envoi">{formatDate(d.dateEnvoi)}</DetailItem>
            <DetailItem label="Date réponse">{formatDate(d.dateReponse)}</DetailItem>
            <DetailItem label="État">{statusBadge(d.etatReponse)}</DetailItem>
            <DetailItem label="Montant demandé">{Number(d.montantDemande).toLocaleString('fr-FR')} DH</DetailItem>
            <DetailItem label="Montant remboursé">
              {Number(d.montantValide) > 0 ? `${Number(d.montantValide).toLocaleString('fr-FR')} DH` : '—'}
            </DetailItem>
            <DetailItem label="Taux">{d.tauxDisplay}</DetailItem>
            <DetailItem label="Observation">{d.observation}</DetailItem>
          </DetailView>
          {canMutate && staffReviewPanel(d)}
          {isAdherent && d.etatReponse === 'En attente' && (
            <div className="workflow-actions-bar">
              <p className="workflow-actions-hint">Étape 1/3 — Envoyez votre dossier pour lancer l&apos;instruction.</p>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!d.hasPdf}
                onClick={() => doAction(`/api/reimbursements/${d.id}/submit`, 'Demande transmise à la mutuelle')}
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
    const wf = resolveRemboursementWorkflow(d.etatReponse);
    if (wf.terminal) {
      const extra =
        d.etatReponse === 'Traité' && Number(d.montantValide) > 0
          ? ` — ${Number(d.montantValide).toLocaleString('fr-FR')} DH`
          : '';
      return `${wf.terminalLabel}${extra}`;
    }
    return `Étape ${wf.activeStep}/3 — ${wf.steps[wf.activeStep - 1].label}`;
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">Chargement…</div>
      </div>
    );
  }

  const myAgentObj = isAdherent && user?.agentId != null ? agents.find((a) => a.id === Number(user.agentId)) : null;

  if (isAdherent && (!user?.agentId || !myAgentObj)) {
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
          {modal.mode === 'wizard' ? buildWizardForm() : modal.content}
        </Modal>
      )}
      {!isAdherent && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-info">
              <h4>En attente</h4>
              <div className="stat-value">{rows.filter((r) => r.statut === 'En attente').length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h4>En cours</h4>
              <div className="stat-value">{rows.filter((r) => r.statut === 'En cours').length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h4>Traités</h4>
              <div className="stat-value">{rows.filter((r) => r.statut === 'Traité').length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h4>Refusés</h4>
              <div className="stat-value">{rows.filter((r) => r.statut === 'Rejeté').length}</div>
            </div>
          </div>
        </div>
      )}
      <TablePageShell
        title={isAdherent ? 'Mes demandes de remboursement' : 'Liste des remboursements'}
        icon="receipt"
        toolbar={
          <ListPageToolbar
            searchValue={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            searchPlaceholder="Rechercher (n°, bénéficiaire, établissement, médicament, statut…)"
            exportColumns={EXPORT_COLS}
            exportRows={data}
            exportFilename="remboursements"
            showNew={canCreate}
            newLabel={isAdherent ? 'Nouvelle demande (3 étapes)' : 'Nouvelle demande'}
            trailing={
              <button type="button" className="btn btn-outline" onClick={downloadReimbursementTemplate}>
                <FaIcon name="file-word" className="fa-inline-icon" /> Bulletin adhésion
              </button>
            }
            onNew={() => {
              resetWizard();
              setModal({ title: 'Demande de remboursement — 3 étapes', mode: 'wizard' });
            }}
          />
        }
      >
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>N°</th>
                {!isAdherent && <th>Mat.</th>}
                <th>Bénéficiaire</th>
                <th>Type</th>
                <th>Montant demandé</th>
                <th>Remboursé</th>
                <th>Taux</th>
                <th>État</th>
                {isAdherent ? <th>Suivi</th> : null}
                <th>PDF</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={isAdherent ? 9 : 10} style={{ textAlign: 'center', padding: 24 }}>
                    {isAdherent
                      ? 'Aucune demande. Créez une demande en 3 étapes avec justificatif PDF.'
                      : 'Aucun remboursement.'}
                  </td>
                </tr>
              )}
              {pageData.map((d) => (
                <tr key={d.id}>
                  <td>{d.numero}</td>
                  {!isAdherent && <td>{d.matricule}</td>}
                  <td>{d.beneficiaire}</td>
                  <td>{d.typeSoin}</td>
                  <td>{Number(d.montantDemande).toLocaleString('fr-FR')} DH</td>
                  <td>{Number(d.montantValide) > 0 ? `${Number(d.montantValide).toLocaleString('fr-FR')} DH` : '—'}</td>
                  <td>{d.tauxDisplay}</td>
                  <td>{statusBadge(d.etatReponse)}</td>
                  {isAdherent ? (
                    <td style={{ fontSize: 12, fontWeight: 600 }}>{workflowSummary(d)}</td>
                  ) : null}
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
                    <button className="btn btn-icon btn-view" type="button" onClick={() => viewRemboursement(d)}>
                      <FaIcon name="eye" />
                    </button>
                    {d.etatReponse === 'En attente' && (isAdherent || canMutate) && (
                      <button
                        className="btn btn-icon btn-edit"
                        type="button"
                        title="Envoyer"
                        disabled={!d.hasPdf}
                        onClick={() => doAction(`/api/reimbursements/${d.id}/submit`, 'Demande envoyée')}
                      >
                        <FaIcon name="paper-plane" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </TablePageShell>
    </>
  );
}
