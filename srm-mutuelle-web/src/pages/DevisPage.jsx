import React, { useEffect, useState } from 'react';
import { isAdherentRole, isConsultateurRole } from '../authUtils';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { getTypeOptions } from '../config/typeConfig';

const META_KEY = 'mutuelle_quotes_meta_v1';

function statusBadge(statut) {
  const map = { Approuvé: 'badge-success', 'En attente': 'badge-warning', Rejeté: 'badge-danger' };
  return <span className={`badge ${map[statut] || 'badge-info'}`}>{statut}</span>;
}

function formatDate(d) {
  if (!d) return '—';
  const s = typeof d === 'string' ? d : '';
  if (!s) return '—';
  const [y, m, day] = s.split('-');
  return `${day}/${m}/${y}`;
}

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

export default function DevisPage({ setPageTitle, addToast, user }) {
  setPageTitle('Devis', 'Gestion des devis');
  const isConsult = isConsultateurRole(user);
  const isAdherent = isAdherentRole(user);
  const canMutate = !isConsult;
  const canCreate = isAdherent || canMutate;

  const [filterMatricule, setFilterMatricule] = useState('');
  const [filterNom, setFilterNom] = useState('');
  const [filterDateRef, setFilterDateRef] = useState('dateDepot');
  const [filterDateRefValue, setFilterDateRefValue] = useState('');
  const [filterDateDebut, setFilterDateDebut] = useState('');
  const [filterDateFin, setFilterDateFin] = useState('');
  const [filterEtat, setFilterEtat] = useState('');
  const [filterDentiste, setFilterDentiste] = useState('');

  const [modal, setModal] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [agents, setAgents] = useState([]);
  const [dentistes, setDentistes] = useState([]);
  const [metaById, setMetaById] = useState(readMeta());
  const [loading, setLoading] = useState(true);
  const quoteTypes = getTypeOptions('quoteTypes');

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
  const dentistById = Object.fromEntries((dentistes || []).map((d) => [d.id, d]));
  const dentaireRows = quotes.filter((q) => q.type === 'Dentaire');
  const rowsView = dentaireRows.map((d) => {
    const meta = metaById[d.id] || {};
    const agent = agentById[d.agentId];
    const dentistId = meta.dentisteId ? Number(meta.dentisteId) : null;
    const dentiste = dentistId ? dentistById[dentistId] : null;
    return {
      ...d,
      matricule: agent?.matricule || '—',
      nomPrenomAgent: agent ? `${agent.nom} ${agent.prenom}` : d.beneficiaire,
      dentiste: dentiste?.fullName || '—',
      dateDevis: meta.dateDevis || d.date,
      dateDepot: meta.dateDepot || d.date,
      dateEnvoi: meta.dateEnvoi || d.date,
      dateReponse: meta.dateReponse || null,
      montantPrisEnCharge: meta.montantPrisEnCharge ? Number(meta.montantPrisEnCharge) : Number(d.montantRemboursable || 0),
      scanDevisDent: meta.scanDevisDent || '—',
      observation: meta.observation || '—',
    };
  });

  let data = [...rowsView];
  if (filterMatricule) data = data.filter((d) => d.matricule.toLowerCase().includes(filterMatricule.toLowerCase()));
  if (filterNom) data = data.filter((d) => d.nomPrenomAgent.toLowerCase().includes(filterNom.toLowerCase()));
  if (filterDateRefValue) data = data.filter((d) => String(d[filterDateRef] || '') === filterDateRefValue);
  if (filterDateDebut) data = data.filter((d) => String(d.dateDepot || '') >= filterDateDebut);
  if (filterDateFin) data = data.filter((d) => String(d.dateDepot || '') <= filterDateFin);
  if (filterEtat) data = data.filter((d) => d.etat === filterEtat);
  if (filterDentiste) data = data.filter((d) => d.dentiste === filterDentiste);

  const submitQuote = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const agentLabel = fd.get('beneficiaire');
    const agent = agents.find((a) => `${a.prenom} ${a.nom}` === agentLabel);
    if (!agent) {
      addToast('error', 'Agent invalide');
      return;
    }
    const montant = Number(fd.get('montant'));
    const taux = Number(fd.get('taux'));
    const montantPrisEnCharge = Number(fd.get('montantPrisEnCharge') || 0);
    const body = {
      type: 'Dentaire',
      date: fd.get('dateDevis') || fd.get('dateDepot') || new Date().toISOString().split('T')[0],
      agentId: agent.id,
      beneficiaire: agentLabel,
      montant,
      taux,
      etat: 'En attente',
    };
    const meta = {
      dentisteId: String(fd.get('dentisteId') || '').trim(),
      dateDevis: String(fd.get('dateDevis') || '').trim(),
      dateDepot: String(fd.get('dateDepot') || '').trim(),
      dateEnvoi: String(fd.get('dateEnvoi') || '').trim(),
      dateReponse: String(fd.get('dateReponse') || '').trim(),
      montantPrisEnCharge: Number.isNaN(montantPrisEnCharge) ? 0 : montantPrisEnCharge,
      scanDevisDent: String(fd.get('scanDevisDent') || '').trim(),
      observation: String(fd.get('observation') || '').trim(),
    };
    try {
      const created = await parseJsonOrThrow(await apiFetch('/api/quotes', { method: 'POST', body }));
      if (created?.id != null) {
        const next = { ...metaById, [created.id]: meta };
        setMetaById(next);
        writeMeta(next);
      }
      setModal(null);
      addToast('success', 'Devis dentaire enregistré !');
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur');
    }
  };

  const form = (
    <form onSubmit={submitQuote}>
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
          <label>Dentiste</label>
          <select name="dentisteId" className="form-control">
            <option value="">Select One</option>
            {dentistes.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.fullName}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Date devis</label>
          <input name="dateDevis" type="date" className="form-control" />
        </div>
        <div className="form-group">
          <label>Date dépôt</label>
          <input name="dateDepot" type="date" className="form-control" defaultValue={new Date().toISOString().split('T')[0]} />
        </div>
        <div className="form-group">
          <label>Date envoi</label>
          <input name="dateEnvoi" type="date" className="form-control" />
        </div>
        <div className="form-group">
          <label>Date réponse</label>
          <input name="dateReponse" type="date" className="form-control" />
        </div>
        <div className="form-group">
          <label>Montant devis (DH)</label>
          <input name="montant" type="number" step="0.01" className="form-control" placeholder="0.00" required />
        </div>
        <div className="form-group">
          <label>Montant prise en charge (DH)</label>
          <input name="montantPrisEnCharge" type="number" step="0.01" className="form-control" placeholder="0.00" />
        </div>
        <div className="form-group">
          <label>Taux (%)</label>
          <input name="taux" type="number" className="form-control" defaultValue="60" required />
        </div>
        <div className="form-group">
          <label>Scan Devis_dent</label>
          <input name="scanDevisDent" className="form-control" placeholder="Nom fichier / ref." />
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

  const doAction = async (path, label) => {
    try {
      await parseJsonOrThrow(await apiFetch(path, { method: 'POST' }));
      addToast('success', label);
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur');
    }
  };

  if (loading) {
    return <div className="card"><div className="card-body">Chargement…</div></div>;
  }

  const etats = [...new Set(rowsView.map((x) => x.etat))].filter(Boolean);

  return (
    <>
      {modal && (
        <Modal title={modal.title} onClose={() => setModal(null)}>
          {modal.content}
        </Modal>
      )}
      <div className="toolbar">
        <div className="toolbar-left" style={{ width: '100%' }}>
          <div className="filter-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(8,minmax(110px,1fr))', gap: 8 }}>
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
            <select className="form-control" value={filterDentiste} onChange={(e) => setFilterDentiste(e.target.value)}>
              <option value="">Dentiste</option>
              {dentistes.map((d) => (
                <option key={d.id}>{d.fullName}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="toolbar-right">
          {canCreate && (
            <button className="btn btn-primary" onClick={() => setModal({ title: 'Nouveau devis dentaire', content: form })}>
              <FaIcon name="plus" className="fa-inline-icon" /> Créer
            </button>
          )}
        </div>
      </div>
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Nom et Prénom Agent</th>
                  <th>Bénéficiaire</th>
                  <th>Dentiste</th>
                  <th>Numéro devis</th>
                  <th>Date devis</th>
                  <th>Date dépôt</th>
                  <th>Date d'envoi</th>
                  <th>Date réponse</th>
                  <th>État réponse</th>
                  <th>Montant devis (DH)</th>
                  <th>Montant prise en charge (DH)</th>
                  <th>Scan Devis_dent</th>
                  <th>Observation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.id}>
                    <td>{d.matricule}</td>
                    <td>{d.nomPrenomAgent}</td>
                    <td>{d.beneficiaire}</td>
                    <td>{d.dentiste}</td>
                    <td>{d.numero}</td>
                    <td>{formatDate(d.dateDevis)}</td>
                    <td>{formatDate(d.dateDepot)}</td>
                    <td>{formatDate(d.dateEnvoi)}</td>
                    <td>{formatDate(d.dateReponse)}</td>
                    <td>{statusBadge(d.etat)}</td>
                    <td>{Number(d.montant).toLocaleString('fr-FR')} DH</td>
                    <td>{Number(d.montantPrisEnCharge || 0).toLocaleString('fr-FR')} DH</td>
                    <td>{d.scanDevisDent}</td>
                    <td>{d.observation}</td>
                    <td className="actions-cell">
                      <button className="btn btn-icon btn-view" type="button">
                        <FaIcon name="eye" />
                      </button>
                      {canMutate && (
                        <>
                          <button className="btn btn-icon btn-edit" type="button" title="Scanner" onClick={() => doAction(`/api/quotes/${d.id}/scan`, 'Devis scanné')}>
                            <FaIcon name="print" />
                          </button>
                          <button className="btn btn-icon" type="button" title="Approuver" onClick={() => doAction(`/api/quotes/${d.id}/approve`, 'Devis approuvé')}>
                            <FaIcon name="check" />
                          </button>
                          <button className="btn btn-icon btn-edit" type="button" title="Refuser" onClick={() => doAction(`/api/quotes/${d.id}/reject`, 'Devis refusé')}>
                            <FaIcon name="xmark" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
