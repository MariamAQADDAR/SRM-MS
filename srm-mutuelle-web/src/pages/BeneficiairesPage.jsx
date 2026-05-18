import React, { useEffect, useMemo, useState } from 'react';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/TablePagination';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import TablePageShell from '../components/TablePageShell';
import { canAdminDelete, canStaffMutate } from '../authUtils';
import ListPageToolbar from '../components/ListPageToolbar';
import { matchesSearch } from '../utils/filterSearch';
import AdminDeleteButton from '../components/AdminDeleteButton';
import DetailModalFooter from '../components/DetailModalFooter';
import DetailItem from '../components/DetailItem';
import DetailView from '../components/DetailView';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { adminDeleteRecord } from '../utils/adminDelete';

const AGENT_EXPORT_COLS = [
  { key: 'matricule', label: 'Matricule' },
  { key: 'nom', label: 'Nom' },
  { key: 'prenom', label: 'Prénom' },
  { key: 'cin', label: 'CIN' },
  { key: 'situation', label: 'Situation' },
  { key: 'entite', label: 'Entité' },
  { key: 'telephone', label: 'Téléphone' },
  { key: 'email', label: 'E-mail' },
];

const PROCHE_EXPORT_COLS = [
  { key: 'nom', label: 'Nom' },
  { key: 'prenom', label: 'Prénom' },
  { key: 'type', label: 'Type' },
  { key: 'agentLabel', label: 'Agent rattaché' },
  { key: 'cin', label: 'CIN' },
  { key: 'dateNaissance', label: 'Date naissance' },
];

function formatDate(d) {
  if (!d) return '—';
  const s = typeof d === 'string' ? d : '';
  if (!s) return '—';
  const [y, m, day] = s.split('-');
  return `${day}/${m}/${y}`;
}

function procheTypeBadge(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('conjoint')) {
    return <span className="badge badge-primary">Conjoint</span>;
  }
  if (t.includes('enfant')) {
    return <span className="badge badge-info">Enfant</span>;
  }
  return <span className="badge badge-secondary">{type || '—'}</span>;
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
  const canMutate = canStaffMutate(user);
  const canDelete = canAdminDelete(user);
  const [tab, setTab] = useState('agents');
  const [searchQuery, setSearchQuery] = useState('');
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

  const deleteAgent = (a) =>
    adminDeleteRecord({
      url: `/api/agents/${a.id}`,
      label: `${a.prenom} ${a.nom}`,
      addToast,
      onSuccess: reload,
    });

  const deleteProche = (p) =>
    adminDeleteRecord({
      url: `/api/beneficiaries/${p.id}`,
      label: `${p.prenom} ${p.nom}`,
      addToast,
      onSuccess: reload,
    });

  const filteredAgents = useMemo(() => {
    let list = [...agents];
    if (searchQuery.trim()) {
      list = list.filter((a) =>
        matchesSearch(searchQuery, a.matricule, a.nom, a.prenom, a.cin, a.entite, a.email, a.telephone),
      );
    }
    return list;
  }, [agents, searchQuery]);

  const filteredProches = useMemo(() => {
    if (!searchQuery.trim()) return beneficiaries;
    return beneficiaries.filter((p) => {
      const agent = agents.find((x) => x.id === p.agentId);
      const agentLabel = agent ? `${agent.prenom} ${agent.nom}` : '';
      return matchesSearch(searchQuery, p.nom, p.prenom, p.cin, p.type, agentLabel);
    });
  }, [beneficiaries, agents, searchQuery]);

  const listForTab = tab === 'agents' ? filteredAgents : filteredProches;

  const prochesExportRows = useMemo(() => {
    const list = tab === 'proches' ? filteredProches : beneficiaries;
    return list.map((p) => {
      const agent = agents.find((x) => x.id === p.agentId);
      return {
        ...p,
        agentLabel: agent ? `${agent.prenom} ${agent.nom}` : '—',
        dateNaissance: formatDate(p.dateNaissance),
      };
    });
  }, [tab, filteredProches, beneficiaries, agents]);

  useEffect(() => {
    setSearchQuery('');
  }, [tab]);
  const { pageData, page, setPage, totalPages } = usePagination(listForTab, tab);

  const closeModal = () => setModal(null);

  const viewAgent = (a) => {
    const proches = beneficiaries.filter((p) => p.agentId === a.id);
    setModal({
      title: `Agent : ${a.prenom} ${a.nom}`,
      variant: 'detail',
      content: (
        <>
          <div className="detail-agent-ids">
            <span>{a.matricule}</span>
            <span>{a.cin}</span>
          </div>
          <DetailView
            footer={
              <DetailModalFooter
                onClose={closeModal}
                canEdit={canMutate}
                onEdit={() => setModal({ title: `Modifier : ${a.prenom} ${a.nom}`, content: buildAgentForm(a) })}
              />
            }
          >
            <DetailItem label="Date de naissance">{formatDate(a.dateNaissance)}</DetailItem>
            <DetailItem label="Situation">{a.situation || '—'}</DetailItem>
            <DetailItem label="Entité">{a.entite || '—'}</DetailItem>
            <DetailItem label="Téléphone">{a.telephone || '—'}</DetailItem>
            <DetailItem label="Email" fullWidth>
              {a.email || '—'}
            </DetailItem>
          </DetailView>
          <section className="detail-proches-section">
            <h4>
              <FaIcon name="user-group" className="fa-inline-icon" /> Proches ({proches.length})
            </h4>
            <div className="data-table-wrapper">
              <table className="data-table detail-proches-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Type</th>
                    <th>Date naiss.</th>
                  </tr>
                </thead>
                <tbody>
                  {proches.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-muted">
                        Aucun proche enregistré
                      </td>
                    </tr>
                  ) : (
                    proches.map((p) => (
                      <tr key={p.id}>
                        <td>{p.nom}</td>
                        <td>{p.prenom}</td>
                        <td>{procheTypeBadge(p.type)}</td>
                        <td>{formatDate(p.dateNaissance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ),
    });
  };

  const buildAgentForm = (agent = null) => {
    const isEdit = !!agent;
    const submit = async (e) => {
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
        const url = isEdit ? `/api/agents/${agent.id}` : '/api/agents';
        await parseJsonOrThrow(await apiFetch(url, { method: isEdit ? 'PUT' : 'POST', body }));
        closeModal();
        addToast('success', isEdit ? 'Agent mis à jour' : 'Agent enregistré avec succès !');
        reload();
      } catch (err) {
        addToast('error', err.message || 'Erreur');
      }
    };
    return (
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="form-group">
            <label>
              Matricule <span className="required">*</span>
            </label>
            <input name="matricule" className="form-control" placeholder="AGT-XXX" defaultValue={agent?.matricule ?? ''} required />
          </div>
          <div className="form-group">
            <label>
              CIN <span className="required">*</span>
            </label>
            <input name="cin" className="form-control" placeholder="BK000000" defaultValue={agent?.cin ?? ''} required />
          </div>
          <div className="form-group">
            <label>
              Nom <span className="required">*</span>
            </label>
            <input name="nom" className="form-control" defaultValue={agent?.nom ?? ''} required />
          </div>
          <div className="form-group">
            <label>
              Prénom <span className="required">*</span>
            </label>
            <input name="prenom" className="form-control" defaultValue={agent?.prenom ?? ''} required />
          </div>
          <div className="form-group">
            <label>Date de naissance</label>
            <input name="dateNaissance" type="date" className="form-control" defaultValue={agent?.dateNaissance ?? ''} />
          </div>
          <div className="form-group">
            <label>Situation familiale</label>
            <select name="situation" className="form-control" defaultValue={agent?.situation ?? 'Célibataire'}>
              <option>Célibataire</option>
              <option>Marié</option>
              <option>Mariée</option>
            </select>
          </div>
          <div className="form-group">
            <label>Entité</label>
            <select name="entite" className="form-control" defaultValue={agent?.entite ?? ''} required>
              {orgEntities.map((e) => (
                <option key={e.id} value={e.nom}>
                  {e.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Téléphone</label>
            <input name="telephone" className="form-control" placeholder="06XXXXXXXX" defaultValue={agent?.telephone ?? ''} />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label>Email</label>
            <input name="email" type="email" className="form-control" placeholder="prenom.nom@srm-ms.ma" defaultValue={agent?.email ?? ''} />
          </div>
        </div>
        <div className="modal-footer" style={{ padding: '16px 0 0' }}>
          <button type="button" className="btn btn-outline" onClick={closeModal}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary">
            <FaIcon name="floppy-disk" className="fa-inline-icon" /> {isEdit ? 'Mettre à jour' : 'Enregistrer'}
          </button>
        </div>
      </form>
    );
  };

  const buildProcheForm = (p) => {
    const submit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const agentId = Number(fd.get('agentId'));
      const body = {
        agentId,
        nom: fd.get('nom'),
        prenom: fd.get('prenom'),
        type: fd.get('type'),
        cin: fd.get('cin') || '',
        dateNaissance: fd.get('dateNaissance') || null,
      };
      try {
        await parseJsonOrThrow(await apiFetch(`/api/beneficiaries/${p.id}`, { method: 'PUT', body }));
        closeModal();
        addToast('success', 'Proche mis à jour');
        reload();
      } catch (err) {
        addToast('error', err.message || 'Erreur');
      }
    };
    return (
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Agent rattaché</label>
            <select name="agentId" className="form-control" defaultValue={String(p.agentId)} required>
              {agents.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.prenom} {a.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Nom</label>
            <input name="nom" className="form-control" defaultValue={p.nom} required />
          </div>
          <div className="form-group">
            <label>Prénom</label>
            <input name="prenom" className="form-control" defaultValue={p.prenom} required />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select name="type" className="form-control" defaultValue={p.type}>
              <option>Conjoint(e)</option>
              <option>Enfant</option>
              <option>Ascendant</option>
            </select>
          </div>
          <div className="form-group">
            <label>CIN</label>
            <input name="cin" className="form-control" defaultValue={p.cin || ''} />
          </div>
          <div className="form-group">
            <label>Date de naissance</label>
            <input name="dateNaissance" type="date" className="form-control" defaultValue={p.dateNaissance ?? ''} />
          </div>
        </div>
        <div className="modal-footer" style={{ padding: '16px 0 0' }}>
          <button type="button" className="btn btn-outline" onClick={closeModal}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary">
            <FaIcon name="floppy-disk" className="fa-inline-icon" /> Mettre à jour
          </button>
        </div>
      </form>
    );
  };

  const viewProche = (p) => {
    const agent = agents.find((x) => x.id === p.agentId);
    setModal({
      title: `Proche : ${p.prenom} ${p.nom}`,
      variant: 'detail',
      content: (
        <DetailView
          footer={
            <DetailModalFooter
              onClose={closeModal}
              canEdit={canMutate}
              onEdit={() => setModal({ title: `Modifier — ${p.prenom} ${p.nom}`, content: buildProcheForm(p) })}
            />
          }
        >
          <DetailItem label="Nom">{p.nom}</DetailItem>
          <DetailItem label="Prénom">{p.prenom}</DetailItem>
          <DetailItem label="Type">{procheTypeBadge(p.type)}</DetailItem>
          <DetailItem label="Agent rattaché">{agent ? `${agent.prenom} ${agent.nom}` : '—'}</DetailItem>
          <DetailItem label="CIN">{p.cin || '—'}</DetailItem>
          <DetailItem label="Date naissance">{formatDate(p.dateNaissance)}</DetailItem>
        </DetailView>
      ),
    });
  };

  if (loading) {
    return <div className="card"><div className="card-body">Chargement…</div></div>;
  }

  return (
    <>
      {modal && (
        <Modal title={modal.title} onClose={closeModal} variant={modal.variant}>
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
          <ListPageToolbar
            searchValue={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            searchPlaceholder={tab === 'agents' ? 'Rechercher un agent…' : 'Rechercher un proche…'}
            exportColumns={tab === 'agents' ? AGENT_EXPORT_COLS : PROCHE_EXPORT_COLS}
            exportRows={tab === 'agents' ? filteredAgents : prochesExportRows}
            exportFilename={tab === 'agents' ? 'agents' : 'proches'}
            showNew={canMutate && tab === 'agents'}
            newLabel="Nouvel agent"
            onNew={() => setModal({ title: 'Ajouter un agent', content: buildAgentForm() })}
          />
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
                  {pageData.map((a) => (
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
                        {canMutate && (
                          <button
                            className="btn btn-icon btn-edit"
                            title="Modifier"
                            type="button"
                            onClick={() => setModal({ title: `Modifier: ${a.prenom} ${a.nom}`, content: buildAgentForm(a) })}
                          >
                            <FaIcon name="pen-to-square" />
                          </button>
                        )}
                        {canDelete && <AdminDeleteButton onClick={() => deleteAgent(a)} />}
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
                  {pageData.map((p) => {
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
                          <button className="btn btn-icon btn-view" title="Voir" type="button" onClick={() => viewProche(p)}>
                            <FaIcon name="eye" />
                          </button>
                          {canMutate && (
                            <button
                              className="btn btn-icon btn-edit"
                              title="Modifier"
                              type="button"
                              onClick={() => setModal({ title: `Modifier — ${p.prenom} ${p.nom}`, content: buildProcheForm(p) })}
                            >
                              <FaIcon name="pen-to-square" />
                            </button>
                          )}
                          {canDelete && <AdminDeleteButton onClick={() => deleteProche(p)} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
        </div>
        <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </TablePageShell>
    </>
  );
}
