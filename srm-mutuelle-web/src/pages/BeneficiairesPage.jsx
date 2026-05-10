import React, { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import TablePageShell from '../components/TablePageShell';
import { isConsultateurRole } from '../authUtils';
import { apiFetch, parseJsonOrThrow } from '../api/client';

function formatDate(d) {
  if (!d) return '—';
  const s = typeof d === 'string' ? d : '';
  if (!s) return '—';
  const [y, m, day] = s.split('-');
  return `${day}/${m}/${y}`;
}

function mapBenefToProche(b) {
  return {
    id: b.id,
    agentId: b.agentId,
    nom: b.nom,
    prenom: b.prenom,
    type: b.type,
    cin: b.cin || '',
    dateNaissance: b.dateNaissance,
  };
}

export default function BeneficiairesPage({ setPageTitle, addToast, user }) {
  setPageTitle('Bénéficiaires', 'Gestion des bénéficiaires');
  const isConsult = isConsultateurRole(user);
  const [tab, setTab] = useState('agents');
  const [filterEntite, setFilterEntite] = useState('');
  const [filterSituation, setFilterSituation] = useState('');
  const [modal, setModal] = useState(null);
  const [agents, setAgents] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [orgEntities, setOrgEntities] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const [aRes, bRes, oRes] = await Promise.all([
        apiFetch('/api/agents'),
        apiFetch('/api/beneficiaries'),
        apiFetch('/api/organizational-entities'),
      ]);
      const aJson = await parseJsonOrThrow(aRes);
      const bJson = await parseJsonOrThrow(bRes);
      const oJson = await parseJsonOrThrow(oRes);
      setAgents(aJson);
      setBeneficiaries(bJson.map(mapBenefToProche));
      setOrgEntities(oJson);
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const entites = [...new Set(agents.map((a) => a.entite))];

  let filteredAgents = [...agents];
  if (filterEntite) filteredAgents = filteredAgents.filter((a) => a.entite === filterEntite);
  if (filterSituation) filteredAgents = filteredAgents.filter((a) => a.situation.startsWith(filterSituation));

  const viewAgent = (a) => {
    const proches = beneficiaries.filter((p) => p.agentId === a.id);
    setModal({
      title: `Agent: ${a.prenom} ${a.nom}`,
      content: (
        <div>
          <div className="detail-grid">
            <div className="detail-item">
              <div className="detail-label">Matricule</div>
              <div className="detail-value">{a.matricule}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">CIN</div>
              <div className="detail-value">{a.cin}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Date de naissance</div>
              <div className="detail-value">{formatDate(a.dateNaissance)}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Situation</div>
              <div className="detail-value">{a.situation}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Entité</div>
              <div className="detail-value">{a.entite}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Téléphone</div>
              <div className="detail-value">{a.telephone}</div>
            </div>
          </div>
          {proches.length > 0 && (
            <>
              <h4 style={{ margin: '20px 0 12px', fontSize: '15px', color: 'var(--gray-700)' }}>
                <FaIcon name="user-group" className="fa-inline-icon" /> Proches ({proches.length})
              </h4>
              <table className="data-table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Type</th>
                    <th>Date naiss.</th>
                  </tr>
                </thead>
                <tbody>
                  {proches.map((p) => (
                    <tr key={p.id}>
                      <td>{p.nom}</td>
                      <td>{p.prenom}</td>
                      <td>
                        <span className="badge badge-info">{p.type}</span>
                      </td>
                      <td>{formatDate(p.dateNaissance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      ),
    });
  };

  const submitAgent = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const situation = fd.get('situation');
    const entiteNom = fd.get('entite');
    const body = {
      matricule: fd.get('matricule'),
      cin: fd.get('cin'),
      nom: fd.get('nom'),
      prenom: fd.get('prenom'),
      dateNaissance: fd.get('dateNaissance') || null,
      situation,
      entite: entiteNom,
      telephone: fd.get('telephone') || '',
      email: fd.get('email') || '',
    };
    try {
      await parseJsonOrThrow(await apiFetch('/api/agents', { method: 'POST', body }));
      setModal(null);
      addToast('success', 'Agent enregistré avec succès !');
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur');
    }
  };

  const agentForm = (
    <form onSubmit={submitAgent}>
      <div className="form-grid">
        <div className="form-group">
          <label>
            Matricule <span className="required">*</span>
          </label>
          <input name="matricule" className="form-control" placeholder="AGT-XXX" required />
        </div>
        <div className="form-group">
          <label>
            CIN <span className="required">*</span>
          </label>
          <input name="cin" className="form-control" placeholder="BK000000" required />
        </div>
        <div className="form-group">
          <label>
            Nom <span className="required">*</span>
          </label>
          <input name="nom" className="form-control" required />
        </div>
        <div className="form-group">
          <label>
            Prénom <span className="required">*</span>
          </label>
          <input name="prenom" className="form-control" required />
        </div>
        <div className="form-group">
          <label>Date de naissance</label>
          <input name="dateNaissance" type="date" className="form-control" />
        </div>
        <div className="form-group">
          <label>Situation familiale</label>
          <select name="situation" className="form-control">
            <option>Célibataire</option>
            <option>Marié</option>
            <option>Mariée</option>
          </select>
        </div>
        <div className="form-group">
          <label>Entité</label>
          <select name="entite" className="form-control" required>
            {orgEntities.map((e) => (
              <option key={e.id} value={e.nom}>
                {e.nom}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Téléphone</label>
          <input name="telephone" className="form-control" placeholder="06XXXXXXXX" />
        </div>
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label>Email</label>
          <input name="email" type="email" className="form-control" placeholder="prenom.nom@srm-ms.ma" />
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
      <div className="tabs">
        <div className={`tab-item${tab === 'agents' ? ' active' : ''}`} onClick={() => setTab('agents')}>
          <FaIcon name="user" className="fa-inline-icon" /> Agents
        </div>
        <div className={`tab-item${tab === 'proches' ? ' active' : ''}`} onClick={() => setTab('proches')}>
          <FaIcon name="user-group" className="fa-inline-icon" /> Proches
        </div>
      </div>
      <TablePageShell
        title={tab === 'agents' ? 'Liste des agents' : 'Liste des proches'}
        icon={tab === 'agents' ? 'user' : 'user-group'}
        toolbar={
          <div className="table-page-toolbar-row">
            {tab === 'agents' && (
              <div className="filter-group" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <select className="form-control" value={filterEntite} onChange={(e) => setFilterEntite(e.target.value)}>
                  <option value="">Toutes les entités</option>
                  {entites.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
                <select className="form-control" value={filterSituation} onChange={(e) => setFilterSituation(e.target.value)}>
                  <option value="">Toute situation</option>
                  <option value="Marié">Marié(e)</option>
                  <option value="Célibataire">Célibataire</option>
                </select>
              </div>
            )}
            {tab === 'proches' && <span style={{ color: 'var(--gray-600)', fontSize: '14px' }}>{beneficiaries.length} proche(s)</span>}
            <span className="toolbar-spacer" />
            {!isConsult && tab === 'agents' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setModal({ title: 'Ajouter un agent', content: agentForm })}
              >
                <FaIcon name="plus" className="fa-inline-icon" /> Nouvel agent
              </button>
            )}
          </div>
        }
      >
        <div className="data-table-wrapper">
            {tab === 'agents' ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Matricule</th>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>CIN</th>
                    <th>Situation</th>
                    <th>Entité</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.map((a) => (
                    <tr key={a.id}>
                      <td>{a.matricule}</td>
                      <td>{a.nom}</td>
                      <td>{a.prenom}</td>
                      <td>{a.cin}</td>
                      <td>
                        <span className={`badge ${a.situation && a.situation.startsWith('Marié') ? 'badge-success' : 'badge-info'}`}>
                          {a.situation}
                        </span>
                      </td>
                      <td>{a.entite}</td>
                      <td className="actions-cell">
                        <button className="btn btn-icon btn-view" title="Voir" type="button" onClick={() => viewAgent(a)}>
                          <FaIcon name="eye" />
                        </button>
                        {!isConsult && (
                          <button
                            className="btn btn-icon btn-edit"
                            title="Modifier"
                            type="button"
                            onClick={() => setModal({ title: `Modifier: ${a.prenom} ${a.nom}`, content: agentForm })}
                          >
                            <FaIcon name="pen-to-square" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Type</th>
                    <th>Agent rattaché</th>
                    <th>Date naiss.</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {beneficiaries.map((p) => {
                    const agent = agents.find((x) => x.id === p.agentId);
                    return (
                      <tr key={p.id}>
                        <td>{p.nom}</td>
                        <td>{p.prenom}</td>
                        <td>
                          <span className="badge badge-info">{p.type}</span>
                        </td>
                        <td>{agent ? `${agent.prenom} ${agent.nom}` : '—'}</td>
                        <td>{formatDate(p.dateNaissance)}</td>
                        <td className="actions-cell">
                          <button className="btn btn-icon btn-view" title="Voir" type="button">
                            <FaIcon name="eye" />
                          </button>
                          {!isConsult && (
                            <button className="btn btn-icon btn-edit" title="Modifier" type="button">
                              <FaIcon name="pen-to-square" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
        </div>
      </TablePageShell>
    </>
  );
}
