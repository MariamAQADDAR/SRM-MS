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

function AgentWorkflowModal({ agent, onClose, orgEntities, beneficiaries, addToast, reload }) {
  const [step, setStep] = useState(1);
  
  const [agentData, setAgentData] = useState({
    matricule: agent?.matricule || '',
    cin: agent?.cin || '',
    nom: agent?.nom || '',
    prenom: agent?.prenom || '',
    dateNaissance: agent?.dateNaissance || '',
    situation: agent?.situation || 'Célibataire',
    entite: agent?.entite || (orgEntities[0]?.nom || ''),
    telephone: agent?.telephone || '',
    email: agent?.email || '',
    dateRecrutement: agent?.dateRecrutement || '',
    statut: agent?.statut || 'Actif',
  });

  const [errors, setErrors] = useState({});
  const [benefs, setBenefs] = useState(agent ? beneficiaries.filter(b => b.agentId === agent.id) : []);

  const [newBenef, setNewBenef] = useState({
    nom: '',
    prenom: '',
    type: 'Enfant',
    dateNaissance: '',
    cin: ''
  });

  const validateStep1 = () => {
    const errs = {};
    if (!agentData.matricule.trim()) errs.matricule = 'Le matricule est requis';
    if (!agentData.nom.trim()) errs.nom = 'Le nom est requis';
    if (!agentData.prenom.trim()) errs.prenom = 'Le prénom est requis';
    if (!agentData.entite.trim()) errs.entite = "L'entité est requise";
    
    if (agentData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(agentData.email)) {
        errs.email = "L'adresse email n'est pas valide";
      }
    }
    
    if (agentData.telephone.trim()) {
      const telRegex = /^[0-9+\s-.()]{8,20}$/;
      if (!telRegex.test(agentData.telephone)) {
        errs.telephone = "Le numéro de téléphone n'est pas valide";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const addBeneficiary = () => {
    if (!newBenef.nom.trim()) {
      addToast('error', 'Le nom du proche est requis');
      return;
    }
    if (!newBenef.prenom.trim()) {
      addToast('error', 'Le prénom du proche est requis');
      return;
    }
    
    setBenefs([...benefs, { ...newBenef, id: null }]);
    setNewBenef({
      nom: '',
      prenom: '',
      type: 'Enfant',
      dateNaissance: '',
      cin: ''
    });
    addToast('success', 'Bénéficiaire ajouté temporairement');
  };

  const removeBeneficiary = (index) => {
    setBenefs(benefs.filter((_, i) => i !== index));
    addToast('info', 'Bénéficiaire retiré');
  };

  const handleSubmit = async () => {
    const isEdit = !!agent;
    const url = isEdit ? `/api/agents/${agent.id}` : '/api/agents';
    const method = isEdit ? 'PUT' : 'POST';
    
    const body = {
      ...agentData,
      beneficiaries: benefs.map(b => ({
        id: b.id,
        nom: b.nom,
        prenom: b.prenom,
        type: b.type,
        cin: b.cin || '',
        dateNaissance: b.dateNaissance || null
      }))
    };

    try {
      await parseJsonOrThrow(await apiFetch(url, { method, body }));
      addToast('success', isEdit ? 'Agent mis à jour' : 'Agent enregistré avec succès !');
      onClose();
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur lors de l\'enregistrement');
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="agent-workflow">
      <div className="stepper-header">
        <div className="stepper-progress">
          <div className="stepper-progress-fill" style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
        </div>
        <div className="stepper-steps">
          <div className={`stepper-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`} onClick={() => step > 1 && setStep(1)}>
            <div className="stepper-circle">
              {step > 1 ? <FaIcon name="check" /> : '1'}
            </div>
            <div className="stepper-label">Informations</div>
          </div>
          <div className={`stepper-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`} onClick={() => { if (step > 2) setStep(2); else if (step === 1 && validateStep1()) setStep(2); }}>
            <div className="stepper-circle">
              {step > 2 ? <FaIcon name="check" /> : '2'}
            </div>
            <div className="stepper-label">Bénéficiaires</div>
          </div>
          <div className={`stepper-step ${step >= 3 ? 'active' : ''}`} onClick={() => { if (step === 2 || (step === 1 && validateStep1())) setStep(3); }}>
            <div className="stepper-circle">3</div>
            <div className="stepper-label">Récapitulatif</div>
          </div>
        </div>
      </div>

      <div className="stepper-content">
        {step === 1 && (
          <div className="step-panel animate-slide-in">
            <h4 className="step-title"><FaIcon name="user" /> Informations générales de l'Agent</h4>
            <div className="form-grid">
              <div className={`form-group ${errors.matricule ? 'has-error' : ''}`}>
                <label>Matricule <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="AGT-XXX"
                  value={agentData.matricule}
                  onChange={(e) => setAgentData({ ...agentData, matricule: e.target.value })}
                />
                {errors.matricule && <span className="field-error">{errors.matricule}</span>}
              </div>

              <div className="form-group">
                <label>CIN</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="BK000000"
                  value={agentData.cin}
                  onChange={(e) => setAgentData({ ...agentData, cin: e.target.value })}
                />
              </div>

              <div className={`form-group ${errors.nom ? 'has-error' : ''}`}>
                <label>Nom <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  value={agentData.nom}
                  onChange={(e) => setAgentData({ ...agentData, nom: e.target.value })}
                />
                {errors.nom && <span className="field-error">{errors.nom}</span>}
              </div>

              <div className={`form-group ${errors.prenom ? 'has-error' : ''}`}>
                <label>Prénom <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  value={agentData.prenom}
                  onChange={(e) => setAgentData({ ...agentData, prenom: e.target.value })}
                />
                {errors.prenom && <span className="field-error">{errors.prenom}</span>}
              </div>

              <div className="form-group">
                <label>Date de naissance</label>
                <input
                  type="date"
                  className="form-control"
                  value={agentData.dateNaissance}
                  onChange={(e) => setAgentData({ ...agentData, dateNaissance: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Situation familiale</label>
                <select
                  className="form-control"
                  value={agentData.situation}
                  onChange={(e) => setAgentData({ ...agentData, situation: e.target.value })}
                >
                  <option value="Célibataire">Célibataire</option>
                  <option value="Marié">Marié</option>
                  <option value="Mariée">Mariée</option>
                  <option value="Divorcé(e)">Divorcé(e)</option>
                  <option value="Veuf(ve)">Veuf(ve)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Entité rattachée <span className="required">*</span></label>
                <select
                  className="form-control"
                  value={agentData.entite}
                  onChange={(e) => setAgentData({ ...agentData, entite: e.target.value })}
                >
                  {orgEntities.map((e) => (
                    <option key={e.id} value={e.nom}>
                      {e.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`form-group ${errors.telephone ? 'has-error' : ''}`}>
                <label>Téléphone</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="06XXXXXXXX"
                  value={agentData.telephone}
                  onChange={(e) => setAgentData({ ...agentData, telephone: e.target.value })}
                />
                {errors.telephone && <span className="field-error">{errors.telephone}</span>}
              </div>

              <div className="form-group">
                <label>Date de recrutement</label>
                <input
                  type="date"
                  className="form-control"
                  value={agentData.dateRecrutement}
                  onChange={(e) => setAgentData({ ...agentData, dateRecrutement: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Statut</label>
                <select
                  className="form-control"
                  value={agentData.statut}
                  onChange={(e) => setAgentData({ ...agentData, statut: e.target.value })}
                >
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                  <option value="Suspendu">Suspendu</option>
                </select>
              </div>

              <div className={`form-group ${errors.email ? 'has-error' : ''}`} style={{ gridColumn: '1/-1' }}>
                <label>Adresse E-mail</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="prenom.nom@srm-ms.ma"
                  value={agentData.email}
                  onChange={(e) => setAgentData({ ...agentData, email: e.target.value })}
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-panel animate-slide-in">
            <h4 className="step-title"><FaIcon name="user-group" /> Bénéficiaires (Famille)</h4>
            
            <div className="benefs-list">
              {benefs.length === 0 ? (
                <div className="empty-benefs">
                  <FaIcon name="users-slash" className="empty-icon" />
                  <p>Aucun bénéficiaire rattaché pour le moment.</p>
                  <span>Ajoutez des conjoints, enfants ou ascendants à l'aide du formulaire ci-dessous.</span>
                </div>
              ) : (
                <div className="benefs-grid">
                  {benefs.map((b, idx) => (
                    <div key={idx} className="benef-card">
                      <div className="benef-card-header">
                        <div className={`benef-icon-wrapper ${b.type.toLowerCase().includes('conjoint') ? 'partner' : b.type.toLowerCase().includes('enfant') ? 'child' : 'elder'}`}>
                          <FaIcon name={b.type.toLowerCase().includes('conjoint') ? 'heart' : b.type.toLowerCase().includes('enfant') ? 'child' : 'user'} />
                        </div>
                        <div className="benef-card-info">
                          <h5>{b.prenom} {b.nom}</h5>
                          <span className="badge badge-info">{b.type}</span>
                        </div>
                        <button type="button" className="btn-remove-benef" onClick={() => removeBeneficiary(idx)} title="Retirer">
                          <FaIcon name="trash-can" />
                        </button>
                      </div>
                      <div className="benef-card-body">
                        {b.dateNaissance && (
                          <div className="benef-meta-item">
                            <FaIcon name="calendar" />
                            <span>Né(e) le : {formatDate(b.dateNaissance)}</span>
                          </div>
                        )}
                        {b.cin && (
                          <div className="benef-meta-item">
                            <FaIcon name="fingerprint" />
                            <span>CIN : {b.cin}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="add-benef-section">
              <h5><FaIcon name="plus" /> Ajouter un nouveau proche</h5>
              <div className="add-benef-grid">
                <div className="form-group">
                  <label>Nom</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nom du proche"
                    value={newBenef.nom}
                    onChange={(e) => setNewBenef({ ...newBenef, nom: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Prénom</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Prénom du proche"
                    value={newBenef.prenom}
                    onChange={(e) => setNewBenef({ ...newBenef, prenom: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Type de lien</label>
                  <select
                    className="form-control"
                    value={newBenef.type}
                    onChange={(e) => setNewBenef({ ...newBenef, type: e.target.value })}
                  >
                    <option value="Conjoint(e)">Conjoint(e)</option>
                    <option value="Enfant">Enfant</option>
                    <option value="Ascendant">Ascendant</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Date de naissance</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newBenef.dateNaissance}
                    onChange={(e) => setNewBenef({ ...newBenef, dateNaissance: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>CIN (Optionnel)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="CIN du proche"
                    value={newBenef.cin}
                    onChange={(e) => setNewBenef({ ...newBenef, cin: e.target.value })}
                  />
                </div>
                <div className="form-group add-btn-group">
                  <button type="button" className="btn btn-outline-primary" onClick={addBeneficiary}>
                    <FaIcon name="plus" className="fa-inline-icon" /> Ajouter à la liste
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-panel animate-slide-in">
            <h4 className="step-title"><FaIcon name="square-check" /> Récapitulatif et Validation</h4>
            
            <div className="recap-container">
              <div className="recap-section">
                <h5>Détails de l'Agent</h5>
                <div className="recap-grid">
                  <div className="recap-item">
                    <span className="recap-label">Matricule :</span>
                    <span className="recap-val">{agentData.matricule}</span>
                  </div>
                  <div className="recap-item">
                    <span className="recap-label">CIN :</span>
                    <span className="recap-val">{agentData.cin || '—'}</span>
                  </div>
                  <div className="recap-item">
                    <span className="recap-label">Nom Complet :</span>
                    <span className="recap-val">{agentData.prenom} {agentData.nom}</span>
                  </div>
                  <div className="recap-item">
                    <span className="recap-label">Situation :</span>
                    <span className="recap-val">{agentData.situation}</span>
                  </div>
                  <div className="recap-item">
                    <span className="recap-label">Date Naissance :</span>
                    <span className="recap-val">{formatDate(agentData.dateNaissance)}</span>
                  </div>
                  <div className="recap-item">
                    <span className="recap-label">Entité :</span>
                    <span className="recap-val">{agentData.entite}</span>
                  </div>
                  <div className="recap-item">
                    <span className="recap-label">Téléphone :</span>
                    <span className="recap-val">{agentData.telephone || '—'}</span>
                  </div>
                  <div className="recap-item">
                    <span className="recap-label">Recrutement :</span>
                    <span className="recap-val">{formatDate(agentData.dateRecrutement)}</span>
                  </div>
                  <div className="recap-item">
                    <span className="recap-label">Statut :</span>
                    <span className={`badge ${agentData.statut === 'Actif' ? 'badge-success' : agentData.statut === 'Suspendu' ? 'badge-warning' : 'badge-secondary'}`}>
                      {agentData.statut}
                    </span>
                  </div>
                  <div className="recap-item" style={{ gridColumn: '1/-1' }}>
                    <span className="recap-label">E-mail :</span>
                    <span className="recap-val">{agentData.email || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="recap-section">
                <h5>Bénéficiaires Rattachés ({benefs.length})</h5>
                {benefs.length === 0 ? (
                  <p className="recap-empty-msg">Aucun proche enregistré pour cet agent.</p>
                ) : (
                  <div className="data-table-wrapper">
                    <table className="data-table recap-table">
                      <thead>
                        <tr>
                          <th>Nom Complet</th>
                          <th>Relation</th>
                          <th>Date de naissance</th>
                          <th>CIN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {benefs.map((b, idx) => (
                          <tr key={idx}>
                            <td>{b.prenom} {b.nom}</td>
                            <td><span className="badge badge-info">{b.type}</span></td>
                            <td>{formatDate(b.dateNaissance)}</td>
                            <td>{b.cin || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="stepper-footer">
        {step > 1 ? (
          <button type="button" className="btn btn-outline" onClick={prevStep}>
            <FaIcon name="arrow-left" className="fa-inline-icon" /> Précédent
          </button>
        ) : (
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Annuler
          </button>
        )}
        
        {step < 3 ? (
          <button type="button" className="btn btn-primary" onClick={nextStep}>
            Suivant <FaIcon name="arrow-right" className="fa-inline-icon" style={{ marginLeft: '6px', marginRight: '0' }} />
          </button>
        ) : (
          <button type="button" className="btn btn-success" onClick={handleSubmit}>
            <FaIcon name="floppy-disk" className="fa-inline-icon" /> Confirmer et Enregistrer
          </button>
        )}
      </div>
    </div>
  );
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
            <DetailItem label="Date de recrutement">{formatDate(a.dateRecrutement)}</DetailItem>
            <DetailItem label="Statut">
              <span className={`badge ${a.statut === 'Actif' ? 'badge-success' : a.statut === 'Suspendu' ? 'badge-warning' : 'badge-secondary'}`}>
                {a.statut || 'Actif'}
              </span>
            </DetailItem>
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
    return (
      <AgentWorkflowModal
        agent={agent}
        onClose={closeModal}
        orgEntities={orgEntities}
        beneficiaries={beneficiaries}
        addToast={addToast}
        reload={reload}
      />
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
                    <th>Statut</th>
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
                      <td>
                        <span className={`badge ${a.statut === 'Actif' ? 'badge-success' : a.statut === 'Suspendu' ? 'badge-warning' : 'badge-secondary'}`}>
                          {a.statut || 'Actif'}
                        </span>
                      </td>
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
