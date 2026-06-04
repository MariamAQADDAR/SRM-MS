import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { isAdherentRole, isStaffWriterRole, canAdminDelete } from '../authUtils';
import FaIcon from '../components/FaIcon';
import Modal from '../components/Modal';
import TablePageShell from '../components/TablePageShell';
import ListPageToolbar from '../components/ListPageToolbar';
import TablePagination from '../components/TablePagination';
import DetailItem from '../components/DetailItem';
import DetailModalFooter from '../components/DetailModalFooter';
import AdminDeleteButton from '../components/AdminDeleteButton';
import { usePagination } from '../hooks/usePagination';
import { apiFetch, apiFetchBlob, parseJsonOrThrow } from '../api/client';
import { matchesSearch } from '../utils/filterSearch';
import { adminDeleteRecord } from '../utils/adminDelete';

const REQUEST_TYPES = ['Adhésion (Première carte)', 'Duplicata', 'Changement'];
const REQUEST_STATUSES = ['En attente', 'Accordée', 'Refusée'];

const EXPORT_COLS = [
  { key: 'matricule', label: 'Matricule Agent' },
  { key: 'beneficiaire', label: 'Bénéficiaire' },
  { key: 'typeDemande', label: 'Type Demande' },
  { key: 'dateDemande', label: 'Date Demande' },
  { key: 'statut', label: 'Statut' },
  { key: 'raison', label: 'Raison' },
];

function statusBadge(statut) {
  const map = {
    'En attente': 'badge-warning',
    Accordée: 'badge-success',
    Refusée: 'badge-danger',
  };
  return <span className={`badge ${map[statut] || 'badge-info'}`}>{statut}</span>;
}

function linkBadge(label) {
  const map = {
    Titulaire: 'badge-primary',
    Conjoint: 'badge-info',
    Enfant: 'badge-success',
  };
  return <span className={`badge ${map[label] || 'badge-neutral'}`}>{label}</span>;
}

function emptyForm(isAdherent, userAgentId) {
  return {
    agentId: isAdherent && userAgentId != null ? String(userAgentId) : '',
    beneficiaryId: '',
    typeDemande: REQUEST_TYPES[0],
    statut: 'En attente',
    raison: '',
  };
}

function EmissionPdfSection({
  isAdherent,
  canGenerate,
  agents,
  allCards,
  family,
  loading,
  busyId,
  generateCardForAgent,
  downloadCardById,
  downloadMembershipTemplate,
}) {
  const [search, setSearch] = useState('');

  const filteredAgents = useMemo(() => {
    if (isAdherent) return [];
    return agents.filter(
      (a) =>
        matchesSearch(search, a.matricule, a.nom, a.prenom)
    );
  }, [agents, search, isAdherent]);

  const cardsByAgentId = useMemo(() => {
    const map = {};
    allCards.forEach((c) => {
      if (c.beneficiaryId === null) {
        map[c.agentId] = c;
      }
    });
    return map;
  }, [allCards]);

  if (isAdherent) {
    const myCard = family.find((m) => m.beneficiaryId === null);
    const busy = busyId === 'titulaire';
    return (
      <>
        <div className="table-page-toolbar-row" style={{ marginBottom: 16 }}>
          <span className="toolbar-spacer" />
          <button type="button" className="btn btn-outline" onClick={downloadMembershipTemplate}>
            <FaIcon name="file-word" className="fa-inline-icon" /> Bulletin d&apos;adhésion
          </button>
        </div>

        {loading ? (
          <div className="card">
            <div className="card-body">Chargement…</div>
          </div>
        ) : !myCard ? (
          <div className="card">
            <div className="card-body cartes-empty">
              <FaIcon name="users" className="fa-inline-icon" />
              <p>Aucune carte disponible. Veuillez contacter un administrateur.</p>
            </div>
          </div>
        ) : (
          <div className="cartes-grid">
            <article className="carte-member-card" style={{ maxWidth: '420px', margin: '0 auto' }}>
              <div className="carte-member-header">
                <img src="/srm-company-logo.png" alt="SRM-MS" className="carte-member-logo" />
                {linkBadge('Titulaire')}
              </div>
              <h3 className="carte-member-name">{myCard.fullName}</h3>
              <ul className="carte-member-meta">
                <li>
                  <span>CIN</span> {myCard.cin || '—'}
                </li>
                <li>
                  <span>Naissance</span>{' '}
                  {myCard.dateNaissance ? String(myCard.dateNaissance).split('-').reverse().join('/') : '—'}
                </li>
                <li>
                  <span>Statut</span> {myCard.hasPdf ? 'Carte émise' : 'Non générée'}
                </li>
              </ul>
              <div className="carte-member-actions">
                {canGenerate && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={busy}
                    onClick={() => generateCardForAgent({ id: myCard.agentId, prenom: '', nom: myCard.fullName })}
                  >
                    <FaIcon name="file-pdf" className="fa-inline-icon" />
                    {myCard.hasPdf ? 'Régénérer' : 'Générer PDF'}
                  </button>
                )}
                {myCard.hasPdf && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => downloadCardById(myCard.cardId)}>
                    <FaIcon name="download" className="fa-inline-icon" /> Télécharger
                  </button>
                )}
              </div>
            </article>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="table-page-toolbar-row" style={{ marginBottom: 16 }}>
        <input
          type="text"
          className="form-control"
          placeholder="Rechercher par matricule ou nom de l'agent..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '360px' }}
        />
        <span className="toolbar-spacer" />
        <button type="button" className="btn btn-outline" onClick={downloadMembershipTemplate}>
          <FaIcon name="file-word" className="fa-inline-icon" /> Bulletin d&apos;adhésion
        </button>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Matricule</th>
              <th>Agent</th>
              <th>Statut de la carte</th>
              <th>Date d'émission</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAgents.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--gray-500)' }}>
                  Aucun agent trouvé.
                </td>
              </tr>
            ) : (
              filteredAgents.map((a) => {
                const card = cardsByAgentId[a.id];
                const hasPdf = card?.hasPdf;
                const busy = busyId === a.id;
                const issuedAt = card?.issuedAt;
                const formattedDate = issuedAt ? new Date(issuedAt).toLocaleString('fr-FR') : '—';
                return (
                  <tr key={a.id}>
                    <td>{a.matricule}</td>
                    <td>{a.nom} {a.prenom}</td>
                    <td>
                      {hasPdf ? (
                        <span className="badge badge-success">Carte émise</span>
                      ) : (
                        <span className="badge badge-warning">Non générée</span>
                      )}
                    </td>
                    <td>{formattedDate}</td>
                    <td className="actions-cell">
                      {canGenerate && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={busy}
                          onClick={() => generateCardForAgent(a)}
                          style={{ marginRight: 8 }}
                        >
                          <FaIcon name="file-pdf" className="fa-inline-icon" />
                          {hasPdf ? 'Régénérer' : 'Générer'}
                        </button>
                      )}
                      {hasPdf && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => downloadCardById(card.id)}
                        >
                          <FaIcon name="download" className="fa-inline-icon" /> Télécharger
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function CartesMutuellesPage({ setPageTitle, addToast, user, personalMode = false }) {
  const effectiveAdherent = personalMode || isAdherentRole(user);
  const isAdherent = effectiveAdherent;
  const canMutate = isStaffWriterRole(user);
  const canDelete = canAdminDelete(user);
  const canCreate = isAdherent || canMutate;
  const canGenerate = isAdherent || canMutate;

  setPageTitle(
    personalMode ? 'Mes cartes mutuelles' : 'Gestion Cartes Mutuelle',
    personalMode ? 'Mon espace — Cartes' : 'Demandes et émission PDF',
  );

  const [activeTab, setActiveTab] = useState('demandes');
  const [requests, setRequests] = useState([]);
  const [agents, setAgents] = useState([]);
  const [modalBeneficiaries, setModalBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm(isAdherent, user?.agentId));
  const [colFilters, setColFilters] = useState({
    matricule: '',
    beneficiaire: '',
    typeDemande: '',
    dateDemande: '',
    statut: '',
  });

  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [family, setFamily] = useState([]);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [allCards, setAllCards] = useState([]);
  const [allCardsLoading, setAllCardsLoading] = useState(false);

  const effectiveAgentId = isAdherent ? (user?.agentId != null ? String(user.agentId) : null) : selectedAgentId;

  const reloadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, agentRes] = await Promise.all([apiFetch('/api/mutual-card-requests'), apiFetch('/api/agents')]);
      setRequests(await parseJsonOrThrow(reqRes));
      setAgents(await parseJsonOrThrow(agentRes));
    } catch (e) {
      addToast('error', e.message || 'Chargement demandes impossible');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const loadFamily = useCallback(async () => {
    if (!effectiveAgentId) {
      setFamily([]);
      return;
    }
    setFamilyLoading(true);
    try {
      const rows = await parseJsonOrThrow(await apiFetch(`/api/mutual-cards/family/${effectiveAgentId}`));
      setFamily(rows);
    } catch (e) {
      addToast('error', e.message || 'Chargement cartes impossible');
      setFamily([]);
    } finally {
      setFamilyLoading(false);
    }
  }, [effectiveAgentId, addToast]);

  const loadAllCards = useCallback(async () => {
    if (isAdherent) return;
    setAllCardsLoading(true);
    try {
      const res = await apiFetch('/api/mutual-cards');
      setAllCards(await parseJsonOrThrow(res));
    } catch (e) {
      addToast('error', e.message || 'Impossible de charger la liste des cartes');
    } finally {
      setAllCardsLoading(false);
    }
  }, [isAdherent, addToast]);

  useEffect(() => {
    reloadRequests();
  }, [reloadRequests]);

  useEffect(() => {
    if (agents.length && !selectedAgentId && !isAdherent) {
      setSelectedAgentId(String(agents[0].id));
    }
  }, [agents, selectedAgentId, isAdherent]);

  useEffect(() => {
    if (activeTab === 'emission') {
      if (isAdherent) {
        loadFamily();
      } else {
        loadAllCards();
      }
    }
  }, [activeTab, isAdherent, loadFamily, loadAllCards]);

  const loadBeneficiariesForAgent = useCallback(async (agentId) => {
    if (!agentId) {
      setModalBeneficiaries([]);
      return;
    }
    try {
      const list = await parseJsonOrThrow(await apiFetch(`/api/beneficiaries?agentId=${agentId}`));
      setModalBeneficiaries(list);
    } catch {
      setModalBeneficiaries([]);
    }
  }, []);

  const beneficiaryOptions = useMemo(() => {
    const agentId = form.agentId;
    const agent = agents.find((a) => String(a.id) === String(agentId));
    const opts = [];
    if (agent) {
      opts.push({
        id: '',
        label: `${agent.prenom} ${agent.nom} (Titulaire)`,
        name: `${agent.prenom} ${agent.nom}`,
      });
    }
    modalBeneficiaries.forEach((b) => {
      opts.push({
        id: String(b.id),
        label: `${b.prenom} ${b.nom} (${b.type || b.linkType || 'Ayant droit'})`,
        name: `${b.prenom} ${b.nom}`,
      });
    });
    return opts;
  }, [agents, form.agentId, modalBeneficiaries]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (colFilters.matricule && !matchesSearch(colFilters.matricule, r.matricule)) return false;
      if (colFilters.beneficiaire && !matchesSearch(colFilters.beneficiaire, r.beneficiaire)) return false;
      if (colFilters.typeDemande && !matchesSearch(colFilters.typeDemande, r.typeDemande)) return false;
      if (colFilters.dateDemande && !matchesSearch(colFilters.dateDemande, r.dateDemande)) return false;
      if (colFilters.statut && !matchesSearch(colFilters.statut, r.statut)) return false;
      return true;
    });
  }, [requests, colFilters]);

  const { pageData, page, setPage, totalPages } = usePagination(filteredRequests, JSON.stringify(colFilters));

  const closeModal = () => setModal(null);

  const openCreate = () => {
    const f = emptyForm(isAdherent, user?.agentId);
    if (!isAdherent && agents.length) f.agentId = String(agents[0].id);
    setForm(f);
    loadBeneficiariesForAgent(f.agentId);
    setModal({ mode: 'create' });
  };

  const openEdit = (row) => {
    setForm({
      agentId: String(row.agentId),
      beneficiaryId: row.beneficiaryId != null ? String(row.beneficiaryId) : '',
      typeDemande: row.typeDemande,
      statut: row.statut,
      raison: row.raison || '',
    });
    loadBeneficiariesForAgent(row.agentId);
    setModal({ mode: 'edit', row });
  };

  const openView = (row) => setModal({ mode: 'view', row });

  const onAgentChange = (agentId) => {
    setForm((prev) => ({ ...prev, agentId, beneficiaryId: '' }));
    loadBeneficiariesForAgent(agentId);
  };

  const onBeneficiaryChange = (beneficiaryId) => {
    const opt = beneficiaryOptions.find((o) => String(o.id) === String(beneficiaryId));
    setForm((prev) => ({
      ...prev,
      beneficiaryId,
      beneficiaireName: opt?.name,
    }));
  };

  const buildPayload = () => {
    const agent = agents.find((a) => String(a.id) === String(form.agentId));
    const opt = beneficiaryOptions.find((o) => String(o.id) === String(form.beneficiaryId));
    const beneficiaire = opt?.name || (agent ? `${agent.prenom} ${agent.nom}` : '');
    return {
      agentId: Number(form.agentId),
      beneficiaryId: form.beneficiaryId ? Number(form.beneficiaryId) : null,
      beneficiaire,
      typeDemande: form.typeDemande,
      dateDemande: modal?.row?.dateDemande || null,
      statut: isAdherent ? 'En attente' : form.statut,
      raison: form.raison || null,
    };
  };

  const saveRequest = async () => {
    if (!form.agentId) {
      addToast('error', 'Sélectionnez un agent');
      return;
    }
    const needsReason = /duplicata|changement/i.test(form.typeDemande);
    if (needsReason && !String(form.raison || '').trim()) {
      addToast('error', 'Indiquez la raison pour un duplicata ou changement');
      return;
    }
    try {
      const body = buildPayload();
      if (modal?.mode === 'edit') {
        await parseJsonOrThrow(
          await apiFetch(`/api/mutual-card-requests/${modal.row.id}`, { method: 'PUT', body }),
        );
        addToast('success', 'Demande mise à jour');
      } else {
        await parseJsonOrThrow(await apiFetch('/api/mutual-card-requests', { method: 'POST', body }));
        addToast('success', 'Demande enregistrée');
      }
      closeModal();
      reloadRequests();
    } catch (e) {
      addToast('error', e.message || 'Enregistrement impossible');
    }
  };

  const handleDelete = (row) => {
    adminDeleteRecord({
      url: `/api/mutual-card-requests/${row.id}`,
      label: row.beneficiaire,
      addToast,
      onSuccess: reloadRequests,
    });
  };

  const generateCardForAgent = async (agent) => {
    setBusyId(isAdherent ? 'titulaire' : agent.id);
    try {
      await parseJsonOrThrow(
        await apiFetch('/api/mutual-cards', {
          method: 'POST',
          body: { agentId: agent.id, beneficiaryId: null },
        }),
      );
      addToast('success', `Carte générée pour ${agent.prenom} ${agent.nom}`);
      if (isAdherent) {
        loadFamily();
      } else {
        loadAllCards();
      }
    } catch (e) {
      addToast('error', e.message || 'Génération impossible');
    } finally {
      setBusyId(null);
    }
  };

  const downloadCardById = async (cardId) => {
    try {
      const blob = await apiFetchBlob(`/api/mutual-cards/${cardId}/download`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      addToast('error', e.message || 'Téléchargement impossible');
    }
  };

  const downloadMembershipTemplate = async () => {
    try {
      const blob = await apiFetchBlob('/api/document-templates/mutual-card-membership');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulletin-adhesion-carte-mutuelle.docx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      addToast('error', e.message || 'Modèle carte mutuelle indisponible');
    }
  };

  const setColFilter = (key, value) => setColFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <>
      <TablePageShell
        title={isAdherent ? 'Mes cartes mutuelles' : 'Gestion Cartes Mutuelle'}
        icon="id-card"
        toolbar={
          activeTab === 'demandes' ? (
            <ListPageToolbar
              exportColumns={EXPORT_COLS}
              exportRows={filteredRequests}
              exportFilename="demandes-cartes-mutuelle"
              exportSheetName="Demandes"
              trailing={
                canCreate ? (
                  <button type="button" className="btn btn-primary btn-icon-round" onClick={openCreate} title="Nouvelle demande">
                    <FaIcon name="plus" />
                  </button>
                ) : null
              }
            />
          ) : null
        }
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'demandes' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('demandes')}
          >
            <FaIcon name="clipboard-list" className="fa-inline-icon" /> Demandes
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'emission' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('emission')}
          >
            <FaIcon name="file-pdf" className="fa-inline-icon" /> Émission PDF
          </button>
        </div>

        {activeTab === 'demandes' ? (
          loading ? (
            <div className="card">
              <div className="card-body">Chargement…</div>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      {!isAdherent && <th>Matricule Agent</th>}
                      <th>Bénéficiaire</th>
                      <th>Type Demande</th>
                      <th>Date Demande</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                    <tr className="table-filter-row">
                      {!isAdherent && (
                        <th>
                          <input
                            className="form-control form-control-sm"
                            placeholder="Filtre Matricule Agent…"
                            value={colFilters.matricule}
                            onChange={(e) => setColFilter('matricule', e.target.value)}
                          />
                        </th>
                      )}
                      <th>
                        <input
                          className="form-control form-control-sm"
                          placeholder="Filtre Bénéficiaire…"
                          value={colFilters.beneficiaire}
                          onChange={(e) => setColFilter('beneficiaire', e.target.value)}
                        />
                      </th>
                      <th>
                        <input
                          className="form-control form-control-sm"
                          placeholder="Filtre Type Demande…"
                          value={colFilters.typeDemande}
                          onChange={(e) => setColFilter('typeDemande', e.target.value)}
                        />
                      </th>
                      <th>
                        <input
                          className="form-control form-control-sm"
                          placeholder="Filtre Date Demande…"
                          value={colFilters.dateDemande}
                          onChange={(e) => setColFilter('dateDemande', e.target.value)}
                        />
                      </th>
                      <th>
                        <input
                          className="form-control form-control-sm"
                          placeholder="Filtre Statut…"
                          value={colFilters.statut}
                          onChange={(e) => setColFilter('statut', e.target.value)}
                        />
                      </th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.length === 0 ? (
                      <tr>
                        <td colSpan={isAdherent ? 5 : 6} style={{ textAlign: 'center', padding: 24 }}>
                          Aucune demande de carte.
                        </td>
                      </tr>
                    ) : (
                      pageData.map((r) => (
                        <tr key={r.id}>
                          {!isAdherent && <td>{r.matricule}</td>}
                          <td>{r.beneficiaire}</td>
                          <td>{r.typeDemande}</td>
                          <td>{r.dateDemande || '—'}</td>
                          <td>{statusBadge(r.statut)}</td>
                          <td className="actions-cell">
                            <button className="btn btn-icon btn-view" type="button" title="Voir" onClick={() => openView(r)}>
                              <FaIcon name="eye" />
                            </button>
                            {canMutate && (
                              <button className="btn btn-icon btn-edit" type="button" title="Modifier" onClick={() => openEdit(r)}>
                                <FaIcon name="pen" />
                              </button>
                            )}
                            {canDelete && (
                              <AdminDeleteButton onClick={() => handleDelete(r)} />
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
              <p className="table-footer-hint">
                Affichage de {pageData.length} entrée(s) sur {filteredRequests.length} au total
              </p>
            </>
          )
        ) : (
          <EmissionPdfSection
            isAdherent={isAdherent}
            canGenerate={canGenerate}
            agents={agents}
            allCards={allCards}
            family={family}
            loading={isAdherent ? familyLoading : allCardsLoading}
            busyId={busyId}
            generateCardForAgent={generateCardForAgent}
            downloadCardById={downloadCardById}
            downloadMembershipTemplate={downloadMembershipTemplate}
          />
        )}
      </TablePageShell>

      {modal && (modal.mode === 'create' || modal.mode === 'edit') && (
        <Modal
          title={modal.mode === 'create' ? 'Nouvelle Demande de Carte' : 'Modifier la demande'}
          onClose={closeModal}
        >
          <div className="form-grid">
            {!isAdherent && (
              <label className="form-group">
                <span>Agent (Matricule)</span>
                <select className="form-control" value={form.agentId} onChange={(e) => onAgentChange(e.target.value)}>
                  <option value="">Choisir un agent…</option>
                  {agents.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.matricule} — {a.prenom} {a.nom}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="form-group">
              <span>Bénéficiaire</span>
              <select
                className="form-control"
                value={form.beneficiaryId}
                onChange={(e) => onBeneficiaryChange(e.target.value)}
                disabled={!form.agentId}
              >
                {!form.agentId ? (
                  <option value="">Sélectionnez d&apos;abord un agent</option>
                ) : (
                  beneficiaryOptions.map((o) => (
                    <option key={o.id || 'titulaire'} value={o.id}>
                      {o.label}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="form-group">
              <span>Type de Demande</span>
              <select
                className="form-control"
                value={form.typeDemande}
                onChange={(e) => setForm((p) => ({ ...p, typeDemande: e.target.value }))}
              >
                {REQUEST_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            {canMutate && (
              <label className="form-group">
                <span>Statut</span>
                <select
                  className="form-control"
                  value={form.statut}
                  onChange={(e) => setForm((p) => ({ ...p, statut: e.target.value }))}
                >
                  {REQUEST_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="form-group form-group--full">
              <span>Raison (si duplicata/changement)</span>
              <textarea
                className="form-control"
                rows={3}
                value={form.raison}
                onChange={(e) => setForm((p) => ({ ...p, raison: e.target.value }))}
              />
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={closeModal}>
              Annuler
            </button>
            <button type="button" className="btn btn-primary" onClick={saveRequest}>
              Enregistrer
            </button>
          </div>
        </Modal>
      )}

      {modal?.mode === 'view' && (
        <Modal title="Détail de la demande" onClose={closeModal} variant="detail">
          <DetailItem label="Matricule" value={modal.row.matricule} />
          <DetailItem label="Bénéficiaire" value={modal.row.beneficiaire} />
          <DetailItem label="Type de demande" value={modal.row.typeDemande} />
          <DetailItem label="Date demande" value={modal.row.dateDemande || '—'} />
          <DetailItem label="Statut" value={modal.row.statut} />
          <DetailItem label="Raison" value={modal.row.raison || '—'} />
          <DetailModalFooter onClose={closeModal} />
        </Modal>
      )}
    </>
  );
}
