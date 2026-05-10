import React, { useEffect, useState } from 'react';
import { isAdherentRole, isConsultateurRole } from '../authUtils';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import TablePageShell from '../components/TablePageShell';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { getTypeOptions } from '../config/typeConfig';

function statusBadge(statut) {
  const map = { Validé: 'badge-success', 'En cours': 'badge-primary', 'En attente': 'badge-warning' };
  return <span className={`badge ${map[statut] || 'badge-info'}`}>{statut}</span>;
}

function formatDate(d) {
  if (!d) return '—';
  const s = typeof d === 'string' ? d : '';
  if (!s) return '—';
  const [y, m, day] = s.split('-');
  return `${day}/${m}/${y}`;
}

export default function MaladiesPage({ setPageTitle, addToast, user }) {
  setPageTitle('Maladies spéciales', 'Gestion des maladies spéciales');
  const isConsult = isConsultateurRole(user);
  const adherent = isAdherentRole(user);
  const [modal, setModal] = useState(null);
  const [diseases, setDiseases] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const maladieTypes = getTypeOptions('maladieTypes');

  const reload = async () => {
    setLoading(true);
    try {
      const dRes = await apiFetch('/api/special-diseases');
      setDiseases(await parseJsonOrThrow(dRes));
      if (adherent) {
        const mRes = await apiFetch('/api/medicines');
        setMedicines(await parseJsonOrThrow(mRes));
      } else if (!isConsult) {
        const aRes = await apiFetch('/api/agents');
        setAgents(await parseJsonOrThrow(aRes));
      }
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [adherent, isConsult]);

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
      typeMaladie: fd.get('typeMaladie'),
      dateDeclaration: fd.get('dateDeclaration'),
      agentId: agent.id,
      beneficiaire: agentLabel,
      statut: 'En attente',
    };
    try {
      await parseJsonOrThrow(await apiFetch('/api/special-diseases', { method: 'POST', body }));
      setModal(null);
      addToast('success', 'Dossier créé !');
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
          <label>Type de maladie</label>
          <select name="typeMaladie" className="form-control" required>
            {maladieTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label>Date de déclaration</label>
          <input name="dateDeclaration" type="date" className="form-control" defaultValue={new Date().toISOString().split('T')[0]} required />
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
      {adherent && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-header">
            <h3>
              <FaIcon name="pills" className="fa-inline-icon" /> Médicaments (référentiel)
            </h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {medicines.slice(0, 40).map((m) => (
                <span key={m.id} className={`badge ${m.reimbursed ? 'badge-success' : 'badge-info'}`}>
                  {m.name}
                </span>
              ))}
              {medicines.length === 0 && <span style={{ color: 'var(--gray-500)' }}>Aucune entrée.</span>}
            </div>
          </div>
        </div>
      )}

      <TablePageShell
        title="Liste des maladies spéciales"
        icon="stethoscope"
        toolbar={
          <div className="table-page-toolbar-row">
            <span style={{ color: 'var(--gray-600)', fontSize: '14px' }}>
              {diseases.length} dossier{diseases.length !== 1 ? 's' : ''}
            </span>
            <span className="toolbar-spacer" />
            {!isConsult && !adherent && (
              <button type="button" className="btn btn-primary" onClick={() => setModal({ title: 'Nouveau dossier maladie spéciale', content: form })}>
                <FaIcon name="plus" className="fa-inline-icon" /> Nouveau dossier
              </button>
            )}
          </div>
        }
      >
        <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Type maladie</th>
                  <th>Date déclaration</th>
                  <th>Bénéficiaire</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {diseases.map((m) => (
                  <tr key={m.id}>
                    <td>{m.numero}</td>
                    <td>
                      <span className="badge badge-warning">{m.typeMaladie}</span>
                    </td>
                    <td>{formatDate(m.dateDeclaration)}</td>
                    <td>{m.beneficiaire}</td>
                    <td>{statusBadge(m.statut)}</td>
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
      </TablePageShell>
    </>
  );
}
