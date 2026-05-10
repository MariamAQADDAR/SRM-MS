import React, { useEffect, useState } from 'react';
import { isConsultateurRole } from '../authUtils';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import TablePageShell from '../components/TablePageShell';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { getTypeOptions } from '../config/typeConfig';

function statusBadge(statut) {
  const map = {
    Traité: 'badge-success',
    'En cours': 'badge-primary',
    'En attente': 'badge-warning',
    Clôturé: 'badge-info',
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

const META_KEY = 'mutuelle_reimbursement_meta_v1';

function readMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeMeta(meta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta || {}));
}

export default function RemboursementsPage({ setPageTitle, addToast, user }) {
  setPageTitle('Remboursements', 'Gestion des remboursements');
  const isConsult = isConsultateurRole(user);
  const [filterStatut, setFilterStatut] = useState('');
  const [filterMatricule, setFilterMatricule] = useState('');
  const [filterNom, setFilterNom] = useState('');
  const [filterDateEnvoi, setFilterDateEnvoi] = useState('');
  const [filterDateReception, setFilterDateReception] = useState('');
  const [filterDateDebut, setFilterDateDebut] = useState('');
  const [filterDateFin, setFilterDateFin] = useState('');
  const [filterTypeSoin, setFilterTypeSoin] = useState('');
  const [modal, setModal] = useState(null);
  const [validateTarget, setValidateTarget] = useState(null);
  const [rows, setRows] = useState([]);
  const [agents, setAgents] = useState([]);
  const [metaById, setMetaById] = useState(readMeta());
  const [loading, setLoading] = useState(true);
  const careTypes = getTypeOptions('careTypes');

  const reload = async () => {
    setLoading(true);
    try {
      const [rRes, aRes] = await Promise.all([apiFetch('/api/reimbursements'), apiFetch('/api/agents')]);
      setRows(await parseJsonOrThrow(rRes));
      if (!isConsult) setAgents(await parseJsonOrThrow(aRes));
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [isConsult]);

  const agentById = Object.fromEntries((agents || []).map((a) => [a.id, a]));
  const rowsView = rows.map((r) => {
    const meta = metaById[r.id] || {};
    const agent = agentById[r.agentId];
    return {
      ...r,
      matricule: agent?.matricule || '—',
      nomPrenomAgent: agent ? `${agent.nom} ${agent.prenom}` : r.beneficiaire,
      etablissementMed: meta.etablissementMed || '—',
      typeSoin: meta.typeSoin || '—',
      dateReception: meta.dateReception || r.date,
      dateEnvoi: meta.dateEnvoi || r.date,
      dateReponse: meta.dateReponse || null,
      etatReponse: r.statut,
      observation: meta.observation || '—',
    };
  });

  let data = [...rowsView];
  if (filterStatut) data = data.filter((r) => r.statut === filterStatut);
  if (filterMatricule) data = data.filter((r) => r.matricule.toLowerCase().includes(filterMatricule.toLowerCase()));
  if (filterNom) data = data.filter((r) => r.nomPrenomAgent.toLowerCase().includes(filterNom.toLowerCase()));
  if (filterTypeSoin) data = data.filter((r) => r.typeSoin === filterTypeSoin);
  if (filterDateEnvoi) data = data.filter((r) => r.dateEnvoi === filterDateEnvoi);
  if (filterDateReception) data = data.filter((r) => r.dateReception === filterDateReception);
  if (filterDateDebut) data = data.filter((r) => r.dateEnvoi >= filterDateDebut);
  if (filterDateFin) data = data.filter((r) => r.dateEnvoi <= filterDateFin);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const agentLabel = fd.get('beneficiaire');
    const agent = agents.find((a) => `${a.prenom} ${a.nom}` === agentLabel);
    if (!agent) {
      addToast('error', 'Agent invalide');
      return;
    }
    const body = {
      date: fd.get('date'),
      agentId: agent.id,
      beneficiaire: agentLabel,
      montantDemande: Number(fd.get('montantDemande')),
      montantValide: 0,
      statut: 'En attente',
    };
    const meta = {
      etablissementMed: String(fd.get('etablissementMed') || '').trim(),
      typeSoin: String(fd.get('typeSoin') || '').trim(),
      dateReception: String(fd.get('dateReception') || '').trim(),
      dateEnvoi: String(fd.get('dateEnvoi') || '').trim(),
      dateReponse: String(fd.get('dateReponse') || '').trim(),
      observation: String(fd.get('observation') || '').trim(),
    };
    try {
      const created = await parseJsonOrThrow(await apiFetch('/api/reimbursements', { method: 'POST', body }));
      if (created?.id != null) {
        const next = { ...metaById, [created.id]: meta };
        setMetaById(next);
        writeMeta(next);
      }
      setModal(null);
      addToast('success', 'Demande enregistrée !');
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur');
    }
  };

  const form = (
    <form onSubmit={submit}>
      <div className="form-grid">
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
        <div className="form-group">
          <label>Date</label>
          <input name="date" type="date" className="form-control" defaultValue={new Date().toISOString().split('T')[0]} required />
        </div>
        <div className="form-group">
          <label>Établissement_med</label>
          <input name="etablissementMed" className="form-control" placeholder="Ex: Clinique Atlas" />
        </div>
        <div className="form-group">
          <label>Type_soin</label>
          <select name="typeSoin" className="form-control">
            <option value="">—</option>
            {careTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Date réception</label>
          <input name="dateReception" type="date" className="form-control" />
        </div>
        <div className="form-group">
          <label>Date envoi</label>
          <input name="dateEnvoi" type="date" className="form-control" />
        </div>
        <div className="form-group">
          <label>Date réponse</label>
          <input name="dateReponse" type="date" className="form-control" />
        </div>
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label>Montant demandé (DH)</label>
          <input name="montantDemande" type="number" step="0.01" className="form-control" placeholder="0.00" required />
        </div>
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label>Observation</label>
          <textarea name="observation" className="form-control" rows={2} />
        </div>
      </div>
      <div className="modal-footer" style={{ padding: '16px 0 0' }}>
        <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>
          Annuler
        </button>
        <button type="submit" className="btn btn-primary">
          <FaIcon name="floppy-disk" className="fa-inline-icon" /> Enregistrer
        </button>
      </div>
    </form>
  );

  const doValidate = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const montantValide = Number(fd.get('montantValide'));
    if (Number.isNaN(montantValide) || montantValide < 0) {
      addToast('error', 'Montant invalide');
      return;
    }
    try {
      await parseJsonOrThrow(
        await apiFetch(`/api/reimbursements/${validateTarget.id}/validate`, {
          method: 'POST',
          body: { montantValide },
        })
      );
      setValidateTarget(null);
      addToast('success', 'Remboursement validé');
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur');
    }
  };

  const doClose = async (id) => {
    try {
      await parseJsonOrThrow(await apiFetch(`/api/reimbursements/${id}/close`, { method: 'POST' }));
      addToast('success', 'Remboursement clôturé');
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur');
    }
  };

  if (loading) {
    return <div className="card"><div className="card-body">Chargement…</div></div>;
  }

  return (
    <>
      {modal && (
        <Modal title={modal.title} onClose={() => setModal(null)}>
          {modal.content}
        </Modal>
      )}
      {validateTarget && (
        <Modal title={`Valider ${validateTarget.numero}`} onClose={() => setValidateTarget(null)}>
          <form onSubmit={doValidate}>
            <div className="form-group">
              <label>Montant validé (DH)</label>
              <input
                name="montantValide"
                type="number"
                step="0.01"
                className="form-control"
                defaultValue={String(validateTarget.montantDemande)}
                required
              />
            </div>
            <div className="modal-footer" style={{ padding: '16px 0 0' }}>
              <button type="button" className="btn btn-outline" onClick={() => setValidateTarget(null)}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                Valider
              </button>
            </div>
          </form>
        </Modal>
      )}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon green">
            <FaIcon name="circle-check" />
          </div>
          <div className="stat-info">
            <h4>Traités</h4>
            <div className="stat-value">{rows.filter((r) => r.statut === 'Traité').length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <FaIcon name="arrows-rotate" />
          </div>
          <div className="stat-info">
            <h4>En cours</h4>
            <div className="stat-value">{rows.filter((r) => r.statut === 'En cours').length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">
            <FaIcon name="hourglass-half" />
          </div>
          <div className="stat-info">
            <h4>En attente</h4>
            <div className="stat-value">{rows.filter((r) => r.statut === 'En attente').length}</div>
          </div>
        </div>
      </div>
      <TablePageShell
        title="Liste des remboursements"
        icon="receipt"
        toolbar={
          <>
            <div className="table-page-toolbar-filters">
              <div className="filter-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                <input
                  className="form-control"
                  placeholder="Matricule"
                  value={filterMatricule}
                  onChange={(e) => setFilterMatricule(e.target.value)}
                />
                <input
                  className="form-control"
                  placeholder="Nom agent"
                  value={filterNom}
                  onChange={(e) => setFilterNom(e.target.value)}
                />
                <input className="form-control" type="date" title="Date envoi" value={filterDateEnvoi} onChange={(e) => setFilterDateEnvoi(e.target.value)} />
                <input
                  className="form-control"
                  type="date"
                  title="Date réception"
                  value={filterDateReception}
                  onChange={(e) => setFilterDateReception(e.target.value)}
                />
                <input className="form-control" type="date" title="Date début" value={filterDateDebut} onChange={(e) => setFilterDateDebut(e.target.value)} />
                <input className="form-control" type="date" title="Date fin" value={filterDateFin} onChange={(e) => setFilterDateFin(e.target.value)} />
                <select className="form-control" value={filterTypeSoin} onChange={(e) => setFilterTypeSoin(e.target.value)}>
                  <option value="">Type soin</option>
                  {careTypes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <select className="form-control" value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
                  <option value="">Tous les statuts</option>
                  <option>Traité</option>
                  <option>En cours</option>
                  <option>En attente</option>
                  <option>Clôturé</option>
                </select>
              </div>
            </div>
            <div className="table-page-toolbar-row">
              <span className="toolbar-spacer" />
              {!isConsult && (
                <button type="button" className="btn btn-primary" onClick={() => setModal({ title: 'Nouvelle demande de remboursement', content: form })}>
                  <FaIcon name="plus" className="fa-inline-icon" /> Nouvelle demande
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
                  <th>Matricule</th>
                  <th>Nom et Prénom Agent</th>
                  <th>Bénéficiaire</th>
                  <th>Etablissement_med</th>
                  <th>Type_soin</th>
                  <th>Date_reception</th>
                  <th>Date_envoi</th>
                  <th>Date_reponse</th>
                  <th>Etat_reponse</th>
                  <th>Montant_initial (DH)</th>
                  <th>Montant_rembourse (DH)</th>
                  <th>Observation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id}>
                    <td>{r.matricule}</td>
                    <td>{r.nomPrenomAgent}</td>
                    <td>{r.beneficiaire}</td>
                    <td>{r.etablissementMed}</td>
                    <td>{r.typeSoin}</td>
                    <td>{formatDate(r.dateReception)}</td>
                    <td>{formatDate(r.dateEnvoi)}</td>
                    <td>{formatDate(r.dateReponse)}</td>
                    <td>{statusBadge(r.etatReponse)}</td>
                    <td>{Number(r.montantDemande).toLocaleString('fr-FR')} DH</td>
                    <td>{Number(r.montantValide) > 0 ? `${Number(r.montantValide).toLocaleString('fr-FR')} DH` : '—'}</td>
                    <td>{r.observation}</td>
                    <td className="actions-cell">
                      <button className="btn btn-icon btn-view" type="button">
                        <FaIcon name="eye" />
                      </button>
                      {!isConsult && (
                        <>
                          <button
                            className="btn btn-icon btn-edit"
                            type="button"
                            title="Valider"
                            onClick={() => setValidateTarget(r)}
                          >
                            <FaIcon name="check" />
                          </button>
                          <button
                            className="btn btn-icon"
                            type="button"
                            title="Clôturer"
                            onClick={() => doClose(r.id)}
                          >
                            <FaIcon name="lock" />
                          </button>
                        </>
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
