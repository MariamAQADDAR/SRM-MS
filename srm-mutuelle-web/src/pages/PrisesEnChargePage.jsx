import { useEffect, useMemo, useState } from 'react';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/TablePagination';
import { canAdminDelete, isAdherentRole, isStaffWriterRole } from '../authUtils';
import WorkflowSteps from '../components/WorkflowSteps';
import { PEC_WORKFLOW_STEPS, resolvePecWorkflow } from '../utils/workflowSteps';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import TablePageShell from '../components/TablePageShell';
import ListPageToolbar from '../components/ListPageToolbar';
import { matchesSearch } from '../utils/filterSearch';
import AdminDeleteButton from '../components/AdminDeleteButton';
import DetailModalFooter from '../components/DetailModalFooter';
import DetailItem from '../components/DetailItem';
import { apiFetch, apiFetchBlob, parseJsonOrThrow } from '../api/client';
import { getTypeOptions } from '../config/typeConfig';
import { adminDeleteRecord } from '../utils/adminDelete';

const EXPORT_COLS = [
  { key: 'numero', label: 'N°' },
  { key: 'matricule', label: 'Matricule' },
  { key: 'nomPrenomAgent', label: 'Agent' },
  { key: 'typePrestation', label: 'Type' },
  { key: 'beneficiaire', label: 'Bénéficiaire' },
  { key: 'etablissement', label: 'Établissement' },
  { key: 'dateDebut', label: 'Début' },
  { key: 'dateFin', label: 'Fin' },
  { key: 'statut', label: 'Statut' },
  { key: 'montantDemande', label: 'Montant demandé' },
  { key: 'montantPec', label: 'Montant PEC' },
  { key: 'tauxDisplay', label: 'Taux %' },
];

function statusBadge(statut) {
  const map = {
    Approuvé: 'badge-success',
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

function DetailSection({ title, icon, children }) {
  return (
    <section className="pec-detail-section">
      <div className="pec-detail-section-title">
        <FaIcon name={icon} className="fa-inline-icon" />
        {title}
      </div>
      <div className="detail-grid detail-grid--modal">{children}</div>
    </section>
  );
}

function mapRow(r, agentById) {
  const agent = agentById[r.agentId];
  return {
    ...r,
    matricule: agent?.matricule || '—',
    nomPrenomAgent: agent ? `${agent.nom} ${agent.prenom}` : r.beneficiaire,
    montantPec: r.montantPrisEnCharge,
    tauxDisplay: r.taux != null ? `${r.taux} %` : '—',
    dateDepot: r.depositDate || r.dateDebut,
    dateEnvoi: r.sentDate || null,
    dateReponse: r.responseDate || null,
    observation: r.observation || '—',
  };
}

function WizardSteps({ step }) {
  const labels = ['1. Informations', '2. Montant & justificatif', '3. Confirmation'];
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

export default function PrisesEnChargePage({ setPageTitle, addToast, user, personalMode = false }) {
  const effectiveAdherent = personalMode || isAdherentRole(user);
  setPageTitle(
    personalMode ? 'Mes prises en charge' : 'Prises en charge',
    personalMode ? 'Mon espace — PEC' : 'Demandes de prise en charge',
  );
  const canMutate = isStaffWriterRole(user);
  const canDelete = canAdminDelete(user);
  const isAdherent = effectiveAdherent;
  const canCreate = isAdherent || canMutate;
  const careTypes = getTypeOptions('careTypes');

  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [rows, setRows] = useState([]);
  const [agents, setAgents] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfFile, setPdfFile] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [reviewMontant, setReviewMontant] = useState('');
  const [reviewTaux, setReviewTaux] = useState('');
  const [reviewObs, setReviewObs] = useState('');

  const myAgent = isAdherent && user?.agentId != null ? Number(user.agentId) : null;

  const reload = async () => {
    setLoading(true);
    try {
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
        opts.push({ label: `${b.prenom} ${b.nom} (${b.linkType || b.type})`, value: `${b.prenom} ${b.nom}` });
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
          r.typePrestation,
          r.beneficiaire,
          r.etablissement,
          r.statut,
          r.tauxDisplay,
          r.montantDemande,
          r.montantPec,
          r.observation,
        ),
      );
    }
    return list;
  }, [rowsView, searchQuery]);

  const { pageData, page, setPage, totalPages } = usePagination(data, searchQuery);

  const closeModal = () => {
    setModal(null);
    setWizardStep(1);
    setPdfFile(null);
  };

  const openPdf = async (id) => {
    try {
      const blob = await apiFetchBlob(`/api/care-episodes/${id}/document`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      addToast('error', e.message || 'PDF introuvable');
    }
  };

  const downloadCareTemplate = async () => {
    try {
      const blob = await apiFetchBlob('/api/document-templates/care-episode-request');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'modele-prise-en-charge.docx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      addToast('error', e.message || 'Modèle prise en charge indisponible');
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
    const submitWizard = async (e) => {
      e.preventDefault();
      if (!pdfFile) {
        addToast('error', 'Le justificatif PDF est obligatoire');
        return;
      }
      const fd = new FormData(e.target);
      const body = new FormData();
      body.append('file', pdfFile);
      body.append('beneficiaire', fd.get('beneficiaire'));
      body.append('typePrestation', fd.get('typePrestation'));
      body.append('etablissement', fd.get('etablissement'));
      body.append('montantDemande', fd.get('montantDemande'));
      body.append('taux', fd.get('taux') || '0');
      if (fd.get('dateDebut')) body.append('dateDebut', fd.get('dateDebut'));
      if (fd.get('dateFin')) body.append('dateFin', fd.get('dateFin'));
      if (fd.get('observation')) body.append('observation', fd.get('observation'));
      if (!isAdherent && fd.get('agentId')) {
        body.append('agentId', fd.get('agentId'));
      } else if (isAdherent && user?.agentId != null) {
        body.append('agentId', String(user.agentId));
      }

      try {
        await parseJsonOrThrow(await apiFetch('/api/care-episodes/request', { method: 'POST', body }));
        addToast('success', 'Demande PEC enregistrée — envoyez-la à la mutuelle (étape 2)');
        closeModal();
        reload();
      } catch (err) {
        addToast('error', err.message || 'Erreur');
      }
    };

    return (
      <form onSubmit={submitWizard}>
        <WizardSteps step={wizardStep} />
        <WorkflowSteps steps={PEC_WORKFLOW_STEPS} activeStep={1} terminal={false} />

        {wizardStep === 1 && (
          <div className="form-grid">
            {!isAdherent && (
              <div className="form-group">
                <label>Porteur</label>
                <select name="agentId" className="form-control" required>
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
              <select name="beneficiaire" className="form-control" required defaultValue={beneficiaryOptions[0]?.value}>
                {beneficiaryOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Type de prestation</label>
              <select name="typePrestation" className="form-control" required>
                <option value="">— Choisir —</option>
                {careTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Établissement</label>
              <select name="etablissement" className="form-control" required>
                <option value="">— Choisir —</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.nom}>
                    {f.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date début soins</label>
              <input
                name="dateDebut"
                type="date"
                className="form-control"
                defaultValue={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="form-group">
              <label>Date fin (optionnel)</label>
              <input name="dateFin" type="date" className="form-control" />
            </div>
          </div>
        )}

        {wizardStep === 2 && (
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Montant demandé (DH)</label>
              <input name="montantDemande" type="number" step="0.01" min="0" className="form-control" required />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Taux souhaité (%)</label>
              <input name="taux" type="number" min="0" max="100" className="form-control" defaultValue="70" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Justificatif PDF (devis, accord préalable…)</label>
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
              <textarea name="observation" className="form-control" rows={2} />
            </div>
          </div>
        )}

        {wizardStep === 3 && (
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--gray-700)' }}>
              Après enregistrement, votre demande sera à l&apos;<strong>étape 1 — Dépôt</strong>. Utilisez{' '}
              <strong>Envoyer à la mutuelle</strong> pour passer à l&apos;<strong>étape 2 — Instruction</strong>. La
              mutuelle fixera le <strong>montant de prise en charge</strong> et le <strong>taux</strong> à l&apos;étape 3.
            </p>
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
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (wizardStep === 2 && !pdfFile) {
                  addToast('error', 'PDF obligatoire');
                  return;
                }
                setWizardStep((s) => s + 1);
              }}
            >
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

  const staffReviewPanel = (p) => {
    const canValidate = p.statut === 'En cours' || p.statut === 'En attente';
    return (
      <div className="staff-review-panel">
        <h4 className="staff-review-title">Validation prise en charge</h4>
        <div className="form-grid">
          <div className="form-group">
            <label>Montant PEC (DH)</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              value={reviewMontant}
              onChange={(e) => setReviewMontant(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Taux (%)</label>
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
                  doAction(`/api/care-episodes/${p.id}/validate`, 'PEC approuvée', {
                    montantPrisEnCharge: Number(reviewMontant),
                    taux: reviewTaux ? Number(reviewTaux) : null,
                    observation: reviewObs || null,
                  })
                }
              >
                <FaIcon name="check" className="fa-inline-icon" /> Approuver (étape 3)
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                onClick={() =>
                  doAction(`/api/care-episodes/${p.id}/reject`, 'PEC refusée', { observation: reviewObs || null })
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

  const viewRecord = (p) => {
    const wf = resolvePecWorkflow(p.statut);
    const defaultMontant =
      p.montantPec != null && Number(p.montantPec) > 0 ? p.montantPec : p.montantDemande;
    setReviewMontant(String(defaultMontant ?? ''));
    setReviewTaux(p.taux != null ? String(p.taux) : '70');
    setReviewObs(p.observation !== '—' ? p.observation : '');
    setModal({
      title: `PEC ${p.numero}`,
      variant: 'detail',
      content: (
        <>
          <WorkflowSteps {...wf} />
          {p.hasPdf && (
            <div className="workflow-actions-bar" style={{ marginBottom: 12 }}>
              <button type="button" className="btn btn-outline" onClick={() => openPdf(p.id)}>
                <FaIcon name="file-pdf" className="fa-inline-icon" /> Voir le justificatif PDF
              </button>
            </div>
          )}
          <div className="pec-detail-layout">
            <DetailSection title="Informations" icon="circle-info">
              <DetailItem label="N° demande">{p.numero}</DetailItem>
              <DetailItem label="Bénéficiaire">{p.beneficiaire}</DetailItem>
              <DetailItem label="Agent">{p.nomPrenomAgent}</DetailItem>
              <DetailItem label="Matricule">{p.matricule}</DetailItem>
              <DetailItem label="Date demande">{formatDate(p.dateDepot)}</DetailItem>
              <DetailItem label="Statut">{statusBadge(p.statut)}</DetailItem>
            </DetailSection>

            <DetailSection title="Détails financiers" icon="coins">
              <DetailItem label="Montant estimé">
                {p.montantDemande != null ? `${Number(p.montantDemande).toLocaleString('fr-FR')} DH` : '—'}
              </DetailItem>
              <DetailItem label="Taux demandé">{p.tauxDisplay}</DetailItem>
              <DetailItem label="Montant accordé">
                {p.montantPec != null && Number(p.montantPec) > 0
                  ? `${Number(p.montantPec).toLocaleString('fr-FR')} DH`
                  : '—'}
              </DetailItem>
              <DetailItem label="Date réponse">{formatDate(p.dateReponse)}</DetailItem>
            </DetailSection>

            <DetailSection title="Document & observation" icon="file-medical">
              <DetailItem label="Type de soin">
                <span className="badge badge-primary">{p.typePrestation}</span>
              </DetailItem>
              <DetailItem label="Établissement">{p.etablissement}</DetailItem>
              <DetailItem label="Date début">{formatDate(p.dateDebut)}</DetailItem>
              <DetailItem label="Date fin">{formatDate(p.dateFin)}</DetailItem>
              <DetailItem label="Date envoi">{formatDate(p.dateEnvoi)}</DetailItem>
              <DetailItem label="Justificatif">{p.hasPdf ? 'Disponible' : '—'}</DetailItem>
              <DetailItem label="Observation" fullWidth>
                {p.observation}
              </DetailItem>
            </DetailSection>
            <DetailModalFooter onClose={closeModal} canEdit={false} />
          </div>
          {canMutate && staffReviewPanel(p)}
          {isAdherent && p.statut === 'En attente' && (
            <div className="workflow-actions-bar">
              <p className="workflow-actions-hint">Étape 1/3 — Envoyez votre dossier pour lancer l&apos;instruction.</p>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!p.hasPdf}
                onClick={() => doAction(`/api/care-episodes/${p.id}/submit`, 'Demande transmise à la mutuelle')}
              >
                <FaIcon name="paper-plane" className="fa-inline-icon" /> Envoyer à la mutuelle
              </button>
            </div>
          )}
        </>
      ),
    });
  };

  const workflowSummary = (p) => {
    const wf = resolvePecWorkflow(p.statut);
    if (wf.terminal) {
      const extra =
        p.statut === 'Approuvé' && p.montantPec != null && Number(p.montantPec) > 0
          ? ` — ${Number(p.montantPec).toLocaleString('fr-FR')} DH`
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
          {modal.content}
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
              <h4>Approuvées</h4>
              <div className="stat-value">{rows.filter((r) => r.statut === 'Approuvé').length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h4>Refusées</h4>
              <div className="stat-value">{rows.filter((r) => r.statut === 'Rejeté').length}</div>
            </div>
          </div>
        </div>
      )}
      <TablePageShell
        title={isAdherent ? 'Mes demandes de prise en charge' : 'Liste des prises en charge'}
        icon="hospital"
        toolbar={
          <ListPageToolbar
            searchValue={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            searchPlaceholder="Rechercher (n°, type, bénéficiaire, établissement, statut…)"
            exportColumns={EXPORT_COLS}
            exportRows={data.map((r) => ({
              ...r,
              dateDebut: formatDate(r.dateDebut),
              dateFin: formatDate(r.dateFin),
            }))}
            exportFilename="prises-en-charge"
            showNew={canCreate}
            newLabel={isAdherent ? 'Nouvelle demande PEC (3 étapes)' : 'Nouvelle demande PEC'}
            trailing={
              <button type="button" className="btn btn-outline" onClick={downloadCareTemplate}>
                <FaIcon name="file-word" className="fa-inline-icon" /> Modèle PEC
              </button>
            }
            onNew={() => {
              setWizardStep(1);
              setPdfFile(null);
              setModal({ title: 'Demande de prise en charge — 3 étapes', content: buildWizardForm() });
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
                <th>Type</th>
                <th>Bénéficiaire</th>
                <th>Établissement</th>
                <th>Début</th>
                <th>Montant demandé</th>
                <th>Montant PEC</th>
                <th>Taux</th>
                <th>Statut</th>
                {isAdherent ? <th>Suivi</th> : null}
                <th>PDF</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={isAdherent ? 12 : 13} style={{ textAlign: 'center', padding: 24 }}>
                    {isAdherent
                      ? 'Aucune demande. Créez une demande PEC en 3 étapes avec justificatif PDF.'
                      : 'Aucune prise en charge.'}
                  </td>
                </tr>
              )}
              {pageData.map((p) => (
                <tr key={p.id}>
                  <td>{p.numero}</td>
                  {!isAdherent && <td>{p.matricule}</td>}
                  <td>
                    <span className="badge badge-primary">{p.typePrestation}</span>
                  </td>
                  <td>{p.beneficiaire}</td>
                  <td>{p.etablissement}</td>
                  <td>{formatDate(p.dateDebut)}</td>
                  <td>
                    {p.montantDemande != null ? `${Number(p.montantDemande).toLocaleString('fr-FR')} DH` : '—'}
                  </td>
                  <td>
                    {p.montantPec != null && Number(p.montantPec) > 0
                      ? `${Number(p.montantPec).toLocaleString('fr-FR')} DH`
                      : '—'}
                  </td>
                  <td>{p.tauxDisplay}</td>
                  <td>{statusBadge(p.statut)}</td>
                  {isAdherent ? (
                    <td style={{ fontSize: 12, fontWeight: 600 }}>{workflowSummary(p)}</td>
                  ) : null}
                  <td>
                    {p.hasPdf ? (
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => openPdf(p.id)}>
                        PDF
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="actions-cell">
                    <button className="btn btn-icon btn-view" type="button" onClick={() => viewRecord(p)}>
                      <FaIcon name="eye" />
                    </button>
                    {p.statut === 'En attente' && (isAdherent || canMutate) && (
                      <button
                        className="btn btn-icon btn-edit"
                        type="button"
                        title="Envoyer"
                        disabled={!p.hasPdf}
                        onClick={() => doAction(`/api/care-episodes/${p.id}/submit`, 'Demande envoyée')}
                      >
                        <FaIcon name="paper-plane" />
                      </button>
                    )}
                    {canDelete && (
                      <AdminDeleteButton
                        onClick={() =>
                          adminDeleteRecord({
                            url: `/api/care-episodes/${p.id}`,
                            label: p.numero,
                            addToast,
                            onSuccess: reload,
                          })
                        }
                      />
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
