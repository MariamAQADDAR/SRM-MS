import React, { useEffect, useState } from 'react';
import { isConsultateurRole } from '../authUtils';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { getTypeOptions } from '../config/typeConfig';

function statusBadge(statut) {
  const map = { Clôturé: 'badge-success', 'En cours': 'badge-primary', 'En attente': 'badge-warning' };
  return <span className={`badge ${map[statut] || 'badge-info'}`}>{statut}</span>;
}

function formatDate(d) {
  if (!d) return '—';
  const s = typeof d === 'string' ? d : '';
  if (!s) return '—';
  const [y, m, day] = s.split('-');
  return `${day}/${m}/${y}`;
}

export default function PrisesEnChargePage({ setPageTitle, addToast, user }) {
  setPageTitle('Prises en charge', 'Gestion des prises en charge');
  const isConsult = isConsultateurRole(user);
  const [modal, setModal] = useState(null);
  const [rows, setRows] = useState([]);
  const [agents, setAgents] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const careTypes = getTypeOptions('careTypes');

  const reload = async () => {
    setLoading(true);
    try {
      const [cRes, aRes, fRes] = await Promise.all([
        apiFetch('/api/care-episodes'),
        apiFetch('/api/agents'),
        apiFetch('/api/medical-facilities'),
      ]);
      setRows(await parseJsonOrThrow(cRes));
      setAgents(await parseJsonOrThrow(aRes));
      setFacilities(await parseJsonOrThrow(fRes));
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const agentLabel = fd.get('beneficiaire');
    const agent = agents.find((a) => `${a.prenom} ${a.nom}` === agentLabel);
    const etab = fd.get('etablissement');
    if (!agent) {
      addToast('error', 'Agent invalide');
      return;
    }
    const dateFinVal = fd.get('dateFin');
    const body = {
      typePrestation: fd.get('typePrestation'),
      dateDebut: fd.get('dateDebut'),
      dateFin: dateFinVal && String(dateFinVal).trim() !== '' ? dateFinVal : null,
      agentId: agent.id,
      beneficiaire: agentLabel,
      etablissement: etab,
      statut: 'En attente',
    };
    try {
      await parseJsonOrThrow(await apiFetch('/api/care-episodes', { method: 'POST', body }));
      setModal(null);
      addToast('success', 'PEC enregistrée !');
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur');
    }
  };

  const form = (
    <form onSubmit={submit}>
      <div className="form-grid">
        <div className="form-group">
          <label>Type de prestation</label>
          <select name="typePrestation" className="form-control" required>
            {careTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
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
          <label>Date début</label>
          <input name="dateDebut" type="date" className="form-control" required />
        </div>
        <div className="form-group">
          <label>Date fin</label>
          <input name="dateFin" type="date" className="form-control" />
        </div>
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label>Établissement</label>
          <select name="etablissement" className="form-control" required>
            {facilities.map((e) => (
              <option key={e.id} value={e.nom}>
                {e.nom}
              </option>
            ))}
          </select>
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
      <div className="toolbar">
        <div className="toolbar-left">
          <h4 style={{ color: 'var(--gray-700)' }}>
            <FaIcon name="clipboard-list" className="fa-inline-icon" /> {rows.length} prises en charge enregistrées
          </h4>
        </div>
        <div className="toolbar-right">
          {!isConsult && (
            <button className="btn btn-primary" onClick={() => setModal({ title: 'Nouvelle prise en charge', content: form })}>
              <FaIcon name="plus" className="fa-inline-icon" /> Nouvelle PEC
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
                  <th>N°</th>
                  <th>Type</th>
                  <th>Début</th>
                  <th>Fin</th>
                  <th>Bénéficiaire</th>
                  <th>Établissement</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>{p.numero}</td>
                    <td>
                      <span className="badge badge-primary">{p.typePrestation}</span>
                    </td>
                    <td>{formatDate(p.dateDebut)}</td>
                    <td>{p.dateFin ? formatDate(p.dateFin) : '—'}</td>
                    <td>{p.beneficiaire}</td>
                    <td>{p.etablissement}</td>
                    <td>{statusBadge(p.statut)}</td>
                    <td className="actions-cell">
                      <button className="btn btn-icon btn-view" type="button">
                        <FaIcon name="eye" />
                      </button>
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
