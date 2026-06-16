import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { isAdherentRole, isStaffWriterRole, canAdminDelete } from '../authUtils';
import FaIcon from '../components/FaIcon';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import TablePageShell from '../components/TablePageShell';
import ExportExcelButton from '../components/ExportExcelButton';
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
  openCreate,
  canCreate,
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

  const EMISSION_EXPORT_COLS = [
    { key: 'matricule', label: 'Matricule' },
    { key: 'agent', label: 'Agent', value: (a) => `${a.nom} ${a.prenom}` },
    { key: 'statut', label: 'Statut de la carte', value: (a) => cardsByAgentId[a.id]?.hasPdf ? 'Carte émise' : 'Non générée' },
    {
      key: 'dateEmission', label: "Date d'émission", value: (a) => {
        const issuedAt = cardsByAgentId[a.id]?.issuedAt;
        return issuedAt ? new Date(issuedAt).toLocaleString('fr-FR') : '—';
      }
    }
  ];

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
      <div className="table-page-toolbar-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <input
          type="text"
          className="form-control"
          placeholder="Rechercher par matricule ou nom de l'agent..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '360px' }}
        />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <ExportExcelButton
            columns={EMISSION_EXPORT_COLS}
            rows={filteredAgents}
            filename="emission-cartes-mutuelle"
            sheetName="Émission"
          />
          {canCreate && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreate}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: '40px', padding: '0 16px', borderRadius: 'var(--radius-md)', fontWeight: '600' }}
            >
              <FaIcon name="plus" />
              <span>Ajouter une carte</span>
            </button>
          )}
        </div>
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
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm(isAdherent, user?.agentId));
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [family, setFamily] = useState([]);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [allCards, setAllCards] = useState([]);
  const [allCardsLoading, setAllCardsLoading] = useState(false);

  const isRealAdherent = isAdherentRole(user);
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

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (isAdherent) {
        if (!effectiveAgentId || String(r.agentId) !== String(effectiveAgentId)) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesMatricule = r.matricule && r.matricule.toLowerCase().includes(q);
        const matchesBeneficiaire = r.beneficiaire && r.beneficiaire.toLowerCase().includes(q);
        const matchesDate = r.dateDemande && r.dateDemande.toLowerCase().includes(q);
        if (!matchesMatricule && !matchesBeneficiaire && !matchesDate) return false;
      }
      if (typeFilter && r.typeDemande !== typeFilter) return false;
      if (statusFilter && r.statut !== statusFilter) return false;
      return true;
    });
  }, [requests, searchQuery, typeFilter, statusFilter, isAdherent, effectiveAgentId]);

  const { pageData, page, setPage, totalPages } = usePagination(filteredRequests, `${searchQuery}_${typeFilter}_${statusFilter}`);

  const [viewData, setViewData] = useState({
    loading: false,
    agent: null,
    family: [],
  });

  const closeModal = () => {
    setModal(null);
    setViewData({ loading: false, agent: null, family: [] });
  };

  const openCreate = () => {
    const f = emptyForm(isAdherent, user?.agentId);
    if (!isAdherent && agents.length) f.agentId = String(agents[0].id);
    setForm(f);
    setModal({ mode: 'create' });
  };

  const openEdit = (row) => {
    setForm({
      agentId: String(row.agentId),
      beneficiaryId: '',
      typeDemande: row.typeDemande,
      statut: row.statut,
      raison: row.raison || '',
    });
    setModal({ mode: 'edit', row });
  };

  const openView = async (row) => {
    setModal({ mode: 'view', row });
    setViewData({ loading: true, agent: null, family: [] });
    try {
      const [agentRes, familyRes] = await Promise.all([
        apiFetch(`/api/agents/${row.agentId}`),
        apiFetch(`/api/mutual-cards/family/${row.agentId}`),
      ]);
      const agent = await parseJsonOrThrow(agentRes);
      const family = await parseJsonOrThrow(familyRes);
      setViewData({ loading: false, agent, family });
    } catch (e) {
      addToast('error', e.message || 'Chargement des détails impossible');
      setViewData({ loading: false, agent: null, family: [] });
    }
  };

  const handlePrintBulletin = (row, agent, family) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addToast('error', 'Le bloqueur de fenêtres a empêché l\'ouverture de la page d\'impression.');
      return;
    }

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      return String(dateStr).split('-').reverse().join('/');
    };

    const agentName = (agent.nom || '').toUpperCase();
    const agentPrenom = agent.prenom || '';
    const matricule = agent.matricule || '';
    const service = agent.entite || 'Service relation avec CMSS';
    const birthDate = formatDate(agent.dateNaissance);
    const situation = agent.situation || '';
    const contact = agent.telephone || agent.email || '';
    const entryDate = formatDate(agent.dateRecrutement);
    const typeDemande = row.typeDemande || 'Adhésion (Première carte)';
    const raison = row.raison || '';

    const conjoint = family ? family.find(f => f.cardLabel === 'Conjoint' || f.cardLabel === 'Conjoint(e)') : null;
    const conjointName = conjoint ? conjoint.fullName : '';
    const conjointBirth = conjoint ? formatDate(conjoint.dateNaissance) : '';

    const kids = family ? family.filter(f => f.cardLabel === 'Enfant') : [];

    let kidsTableRows = '';
    const maxRows = Math.max(2, kids.length);
    for (let i = 0; i < maxRows; i++) {
      const k = kids[i];
      kidsTableRows += `
        <tr>
          <td style="border: 1px solid black; padding: 12px; height: 30px; font-size: 14px;">${k ? k.fullName : ''}</td>
          <td style="border: 1px solid black; padding: 12px; height: 30px; font-size: 14px; text-align: center;">${k ? formatDate(k.dateNaissance) : ''}</td>
        </tr>
      `;
    }

    const currentDateStr = new Date().toLocaleDateString('fr-FR');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Bulletin d'Adhésion - ${agentPrenom} ${agentName}</title>
        <style>
          @media print {
            body {
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
          }
          
          body {
            font-family: Arial, sans-serif;
            color: #000;
            line-height: 1.4;
            padding: 20px;
            box-sizing: border-box;
          }

          .header-container {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 25px;
            position: relative;
          }

          .header-logo {
            position: absolute;
            left: 0;
            top: 0;
            height: 60px;
          }

          .header-text {
            text-align: center;
            font-size: 11px;
            font-weight: bold;
            margin-left: 70px;
            margin-right: 70px;
          }

          .document-title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            text-decoration: underline;
            margin: 30px 0;
            letter-spacing: 1px;
          }

          .form-section {
            margin-bottom: 15px;
          }

          .form-row {
            display: flex;
            margin-bottom: 12px;
            font-size: 14px;
          }

          .field-label {
            font-weight: bold;
            white-space: nowrap;
          }

          .field-value {
            border-bottom: 1px dotted #000;
            width: 100%;
            padding-left: 8px;
            min-height: 18px;
          }

          .checkbox-container {
            display: inline-flex;
            align-items: center;
            margin-right: 15px;
          }

          .checkbox-box {
            border: 1px solid #000;
            width: 14px;
            height: 14px;
            margin-right: 6px;
            display: inline-block;
            text-align: center;
            line-height: 14px;
            font-size: 11px;
            font-weight: bold;
          }

          .subsection-title {
            font-weight: bold;
            font-size: 14px;
            text-decoration: underline;
            margin-top: 20px;
            margin-bottom: 10px;
            letter-spacing: 0.5px;
          }

          .kids-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }

          .kids-table th {
            border: 1px solid #000;
            padding: 8px;
            font-size: 13px;
            font-weight: bold;
            background-color: #f2f2f2;
          }

          .statement-text {
            font-size: 13px;
            font-weight: bold;
            margin-top: 25px;
            text-align: justify;
          }

          .footer-section {
            margin-top: 20px;
            border-top: 1.5px solid #000;
            padding-top: 8px;
            text-align: center;
            font-size: 14px;
            font-weight: bold;
          }

          .admin-box {
            border: 1.5px solid #000;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 30px;
            font-size: 14px;
            min-height: 250px;
            box-sizing: border-box;
          }

          .admin-box-title {
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 15px;
            text-decoration: underline;
          }

          .dotted-lines {
            margin: 15px 0;
            line-height: 1.8;
          }

          .dotted-line {
            border-bottom: 1px dotted #000;
            height: 25px;
            margin-bottom: 8px;
          }

          .signature-line {
            display: flex;
            justify-content: space-between;
            margin-top: 35px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>

        <!-- PAGE 1 -->
        <div class="page-break">
          <div class="header-container">
            <img src="${window.location.origin}/srm-company-logo.png" alt="SRM" class="header-logo" onerror="this.style.display='none'" />
            <div class="header-text">
              CAISSE MUTUELLE DE SECURITE SOCIALE DU PERSONNEL DES REGIES<br>
              AUTONOMES DES DISTRIBUTIONS D'EAU ET D'ELECTRICITE AU MAROC CMSS<br>
              N°3, Rue Bouchaib Ferrad - CASABLANCA<br>
              Tél: 05 22 31 06 54
            </div>
          </div>

          <div class="document-title">BULLETIN D'ADHESION</div>

          <div class="form-section">
            <div class="form-row">
              <div class="field-label" style="width: 140px;">Je soussigné, Nom:</div>
              <div class="field-value" style="font-weight: bold; font-size: 15px;">${agentName}</div>
              <div class="field-label" style="width: 150px; margin-left: 20px;">Prénom de l'agent:</div>
              <div class="field-value" style="font-weight: bold; font-size: 15px;">${agentPrenom}</div>
            </div>

            <div class="form-row">
              <div class="field-label" style="width: 80px;">Matricule:</div>
              <div class="field-value" style="width: 150px; font-weight: bold;">${matricule}</div>
              <div class="field-label" style="width: 70px; margin-left: 15px;">Service:</div>
              <div class="field-value" style="width: 250px;">${service}</div>
              <div class="field-label" style="width: 100px; margin-left: 15px;">Exploitation:</div>
              <div class="field-value" style="width: 120px; font-weight: bold;">SRM-MS</div>
            </div>

            <div class="form-row">
              <div class="field-label" style="width: 200px;">Date et lieu de naissance:</div>
              <div class="field-value" style="width: 200px;">${birthDate}</div>
              <div class="field-label" style="width: 20px; margin-left: 10px; margin-right: 5px;">à</div>
              <div class="field-value">${agent.ville || ''}</div>
            </div>

            <div class="form-row">
              <div class="field-label" style="width: 160px;">Situation de famille:</div>
              <div class="field-value">${situation}</div>
            </div>

            <div class="form-row">
              <div class="field-label" style="width: 110px;">Demeurant à:</div>
              <div class="field-value"></div>
            </div>

            <div class="form-row">
              <div class="field-label" style="width: 80px;">Contact:</div>
              <div class="field-value">${contact}</div>
            </div>

            <div class="form-row">
              <div class="field-label" style="width: 190px;">Date d'entrée à la Régie:</div>
              <div class="field-value" style="width: 250px;">${entryDate}</div>
              <div class="field-label" style="width: 170px; margin-left: 20px;">Date de titularisation:</div>
              <div class="field-value"></div>
            </div>

            <div class="form-row">
              <div class="field-label" style="width: 100px;">Classement:</div>
              <div class="field-value"></div>
            </div>

            <div class="form-row">
              <div class="field-label" style="width: 100px;">Demande de:</div>
              <div class="field-value" style="font-weight: bold;">${typeDemande}</div>
            </div>

            <div class="form-row">
              <div class="field-label" style="width: 170px;">Raison de changement:</div>
              <div class="field-value" style="font-style: italic;">${raison}</div>
            </div>
            <div style="font-size: 11px; margin-top: -5px; margin-left: 170px; color: #333;">
              (1) de Duplicata suite à déclaration de perte (dûment cacheté et signé par les autorités compétentes)
            </div>
          </div>

          <div class="subsection-title">AYANTS DROIT</div>

          <div style="margin-left: 15px;">
            <div class="subsection-title" style="font-size: 13px; text-decoration: none; margin-top: 10px; margin-bottom: 8px;">1. CONJOINT:</div>
            
            <div class="form-row">
              <div class="field-label" style="width: 110px;">Nom Complet:</div>
              <div class="field-value" style="font-weight: bold;">${conjointName}</div>
            </div>

            <div class="form-row">
              <div class="field-label" style="width: 190px;">Date et lieu de naissance:</div>
              <div class="field-value" style="width: 200px;">${conjointBirth}</div>
              <div class="field-label" style="width: 20px; margin-left: 10px; margin-right: 5px;">à</div>
              <div class="field-value">${conjoint && conjoint.ville ? conjoint.ville : ''}</div>
            </div>

            <div class="form-row">
              <div class="field-label" style="width: 140px;">Date de mariage:</div>
              <div class="field-value" style="width: 250px;"></div>
              <div class="field-label" style="width: 150px; margin-left: 20px;">Est-elle salariée? (1)</div>
              <div class="checkbox-container" style="margin-left: 10px;">
                <span class="checkbox-box"></span> OUI
              </div>
              <div class="checkbox-container">
                <span class="checkbox-box"></span> NON
              </div>
            </div>

            <div class="form-row">
              <div class="field-label" style="width: 310px;">Nom et adresse de l'employeur du conjoint:</div>
              <div class="field-value"></div>
            </div>

            <div class="form-row">
              <div class="field-label" style="width: 240px;">Est-elle affiliée à une mutuelle?</div>
              <div class="checkbox-container" style="margin-left: 10px;">
                <span class="checkbox-box"></span> OUI
              </div>
              <div class="checkbox-container">
                <span class="checkbox-box"></span> NON
              </div>
              <div style="font-size: 11px; margin-left: auto; font-style: italic;">(1) cocher la case utile</div>
            </div>
          </div>

          <div style="margin-left: 15px; margin-top: 15px;">
            <div class="subsection-title" style="font-size: 13px; text-decoration: none; margin-top: 10px; margin-bottom: 5px;">2. ENFANTS:</div>
            
            <table class="kids-table">
              <thead>
                <tr>
                  <th style="width: 60%; text-align: left; padding-left: 12px;">PRENOM</th>
                  <th style="width: 40%;">DATE DE NAISSANCE</th>
                </tr>
              </thead>
              <tbody>
                ${kidsTableRows}
              </tbody>
            </table>
          </div>

          <div class="statement-text">
            *Je déclare sur l'honneur que les renseignements ci-dessus sont exacts et je m'engage à informer la CMSS de tout autre changement qui pourrait intervenir ultérieurement.
          </div>

          <div class="footer-section">
            Réservé au mutualiste
            <div class="signature-line">
              <div style="width: 60%; text-align: left; font-size: 13px;">Nom, date et signature : <span style="font-weight: normal; border-bottom: 1px solid #000; display: inline-block; width: 200px; padding-left: 8px;">${agentPrenom} ${agentName}</span></div>
              <div style="width: 40%; text-align: right; font-size: 13px;">Le: <span style="font-weight: normal; border-bottom: 1px solid #000; display: inline-block; width: 120px; text-align: center;">${currentDateStr}</span></div>
            </div>
          </div>
        </div>

        <!-- PAGE 2 -->
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; margin-bottom: 25px;">
            <div>Nom, date et signature : <span style="border-bottom: 1px solid #000; display: inline-block; width: 180px; height: 18px;"></span></div>
            <div>Le: <span style="border-bottom: 1px solid #000; display: inline-block; width: 120px; height: 18px; text-align: center;">${currentDateStr}</span></div>
          </div>

          <div class="admin-box">
            <div class="admin-box-title">Réservé au delegué de la mutuelle</div>
            <div class="dotted-lines">
              <div style="font-weight: bold; margin-bottom: 10px;">Avis :</div>
              <div class="dotted-line"></div>
              <div class="dotted-line"></div>
              <div class="dotted-line"></div>
              <div class="dotted-line"></div>
              <div class="dotted-line"></div>
              <div class="dotted-line"></div>
            </div>
            <div class="signature-line" style="margin-top: 40px;">
              <div>Nom, date et signature :</div>
              <div style="border-bottom: 1px solid #000; width: 250px; height: 1px;"></div>
            </div>
          </div>

          <div class="admin-box" style="margin-top: 40px;">
            <div class="admin-box-title">Réservé à la CMSS</div>
            <div class="dotted-lines">
              <div style="font-weight: bold; margin-bottom: 10px;">Avis :</div>
              <div class="dotted-line"></div>
              <div class="dotted-line"></div>
              <div class="dotted-line"></div>
              <div class="dotted-line"></div>
              <div class="dotted-line"></div>
              <div class="dotted-line"></div>
            </div>
            <div class="signature-line" style="margin-top: 40px;">
              <div>Nom, date et signature :</div>
              <div style="border-bottom: 1px solid #000; width: 250px; height: 1px;"></div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const onAgentChange = (agentId) => {
    setForm((prev) => ({ ...prev, agentId, beneficiaryId: '' }));
  };

  const buildPayload = () => {
    const agent = agents.find((a) => String(a.id) === String(form.agentId));
    const beneficiaire = agent ? `${agent.prenom} ${agent.nom}` : '';
    return {
      agentId: Number(form.agentId),
      beneficiaryId: null,
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

  const showWarning = isAdherent && !effectiveAgentId;

  if (showWarning) {
    return (
      <>
        <div className="card" style={{ marginTop: '0' }}>
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
      </>
    );
  }

  return (
    <>
      <TablePageShell
        title={isAdherent ? 'Mes cartes mutuelles' : 'Gestion Cartes Mutuelle'}
        icon="id-card"
        toolbar={false}
      >
        <div className="table-page-toolbar-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap', background: '#fff', padding: '12px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)' }}>
          {/* Tabs on Left */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={`btn ${activeTab === 'demandes' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('demandes')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <FaIcon name="clipboard-list" />
              <span>Demandes</span>
            </button>
            <button
              type="button"
              className={`btn ${activeTab === 'emission' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('emission')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <FaIcon name="file-pdf" />
              <span>Émission PDF</span>
            </button>
          </div>

          {/* Actions on Right */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginLeft: 'auto' }}>
            {activeTab === 'demandes' && (
              <>
                <ExportExcelButton
                  columns={EXPORT_COLS}
                  rows={filteredRequests}
                  filename="demandes-cartes-mutuelle"
                  sheetName="Demandes"
                />
                {canCreate && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={openCreate}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: '40px', padding: '0 16px', borderRadius: 'var(--radius-md)', fontWeight: '600' }}
                  >
                    <FaIcon name="plus" />
                    <span>Nouvelle demande</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {activeTab === 'demandes' ? (
          loading ? (
            <div className="card">
              <div className="card-body">Chargement…</div>
            </div>
          ) : (
            <>
              <div className="filters-card" style={{ padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Unified Search Input */}
                  <div style={{ flex: '2 1 300px', position: 'relative' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--gray-500)', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Recherche rapide
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="form-control"
                        placeholder="Rechercher par matricule, nom, date..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: '36px', height: '40px' }}
                      />
                      <FaIcon
                        name="magnifying-glass"
                        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}
                      />
                    </div>
                  </div>

                  {/* Type Filter */}
                  <div style={{ flex: '1 1 180px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--gray-500)', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Type de demande
                    </label>
                    <select
                      className="form-control"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      style={{ height: '40px' }}
                    >
                      <option value="">Tous les types</option>
                      {REQUEST_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div style={{ flex: '1 1 180px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--gray-500)', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Statut
                    </label>
                    <select
                      className="form-control"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      style={{ height: '40px' }}
                    >
                      <option value="">Tous les statuts</option>
                      {REQUEST_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {pageData.length === 0 ? (
                <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--gray-500)' }}>
                  <FaIcon name="inbox" style={{ fontSize: '2.5rem', marginBottom: '12px', display: 'block', color: 'var(--gray-300)' }} />
                  <p>Aucune demande de carte ne correspond à votre recherche.</p>
                </div>
              ) : (
                <div className="card-requests-grid">
                  {pageData.map((r) => (
                    <div className="request-card" key={r.id}>
                      <div className="request-card-header" style={{
                        background: r.statut === 'Accordée' ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' :
                          r.statut === 'Refusée' ? 'linear-gradient(135deg, #fef2f2, #fee2e2)' :
                            'linear-gradient(135deg, #fffbeb, #fef3c7)',
                        borderBottom: '1px solid var(--gray-200)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FaIcon name="id-card-clip" style={{ color: 'var(--primary-500)', fontSize: '1.2rem' }} />
                          <span style={{ fontWeight: '700', color: 'var(--gray-800)', fontSize: '14px' }}>
                            {r.matricule || 'Agent'}
                          </span>
                        </div>
                        {statusBadge(r.statut)}
                      </div>

                      <div className="request-card-body">
                        <div>
                          <div className="request-card-title">
                            {r.beneficiaire}
                          </div>

                          <div className="request-card-meta">
                            <div className="request-card-meta-row">
                              <span className="request-card-meta-label">Type de demande :</span>
                              <span className="request-card-meta-value">{r.typeDemande}</span>
                            </div>
                            <div className="request-card-meta-row">
                              <span className="request-card-meta-label">Date de demande :</span>
                              <span className="request-card-meta-value">
                                {r.dateDemande ? String(r.dateDemande).split('-').reverse().join('/') : '—'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {r.raison && (
                          <div className="request-card-reason">
                            <div className="request-card-reason-title">Raison / Motif</div>
                            <div className="request-card-reason-text">{r.raison}</div>
                          </div>
                        )}
                      </div>

                      <div className="request-card-footer">
                        <button
                          className="btn btn-icon btn-view"
                          type="button"
                          title="Voir"
                          onClick={() => openView(r)}
                          style={{ background: '#fff', border: '1px solid var(--gray-200)', width: '36px', height: '36px' }}
                        >
                          <FaIcon name="eye" />
                        </button>
                        {canMutate && (
                          <button
                            className="btn btn-icon btn-edit"
                            type="button"
                            title="Modifier"
                            onClick={() => openEdit(r)}
                            style={{ background: '#fff', border: '1px solid var(--gray-200)', width: '36px', height: '36px' }}
                          >
                            <FaIcon name="pen" />
                          </button>
                        )}
                        {canDelete && (
                          <AdminDeleteButton onClick={() => handleDelete(r)} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
            openCreate={openCreate}
            canCreate={canCreate}
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
              <SearchableSelect
                label="Agent (Matricule)"
                placeholder="Choisir un agent…"
                value={form.agentId}
                onChange={onAgentChange}
                required
                options={agents.map((a) => ({
                  value: String(a.id),
                  label: `${a.matricule} — ${a.prenom} ${a.nom}`,
                  subtitle: `CIN: ${a.cin || '—'}`
                }))}
              />
            )}

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
          {viewData.loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-500)' }}>
              <FaIcon name="spinner" className="fa-spin" style={{ fontSize: '2rem', marginBottom: '12px' }} />
              <p>Chargement des détails de l'agent et des ayants droit...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Section 1: Demande Details */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: 'var(--primary-600)', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                  <FaIcon name="file-invoice" style={{ marginRight: 8 }} />
                  Informations sur la Demande
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <DetailItem label="Matricule">{modal.row.matricule}</DetailItem>
                  <DetailItem label="Bénéficiaire">{modal.row.beneficiaire}</DetailItem>
                  <DetailItem label="Type de demande">{modal.row.typeDemande}</DetailItem>
                  <DetailItem label="Date de demande">{modal.row.dateDemande ? String(modal.row.dateDemande).split('-').reverse().join('/') : '—'}</DetailItem>
                  <DetailItem label="Statut">{statusBadge(modal.row.statut)}</DetailItem>
                  <DetailItem label="Motif / Raison" fullWidth={true}>{modal.row.raison || '—'}</DetailItem>
                </div>
              </div>

              {/* Section 2: Agent Details */}
              {viewData.agent && (
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: 'var(--primary-600)', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    <FaIcon name="user" style={{ marginRight: 8 }} />
                    Détails du Titulaire (Agent)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <DetailItem label="Nom complet">{viewData.agent.prenom} {viewData.agent.nom}</DetailItem>
                    <DetailItem label="CIN">{viewData.agent.cin || '—'}</DetailItem>
                    <DetailItem label="Date de naissance">{viewData.agent.dateNaissance ? String(viewData.agent.dateNaissance).split('-').reverse().join('/') : '—'}</DetailItem>
                    <DetailItem label="Situation de famille">{viewData.agent.situation || '—'}</DetailItem>
                    <DetailItem label="Service / Entité">{viewData.agent.entite || '—'}</DetailItem>
                    <DetailItem label="Téléphone">{viewData.agent.telephone || '—'}</DetailItem>
                    <DetailItem label="Date d'entrée">{viewData.agent.dateRecrutement ? String(viewData.agent.dateRecrutement).split('-').reverse().join('/') : '—'}</DetailItem>
                    <DetailItem label="Statut de l'agent">{viewData.agent.statut || '—'}</DetailItem>
                  </div>
                </div>
              )}

              {/* Section 3: Family Members Details */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: 'var(--primary-600)', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                  <FaIcon name="users" style={{ marginRight: 8 }} />
                  Ayants Droit (Famille)
                </h4>
                {viewData.family && viewData.family.filter(m => m.beneficiaryId !== null).length > 0 ? (
                  <div className="data-table-wrapper" style={{ marginTop: '8px' }}>
                    <table className="data-table" style={{ width: '100%', fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th>Lien de parenté</th>
                          <th>Nom Complet</th>
                          <th>CIN</th>
                          <th>Date de Naissance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewData.family
                          .filter(m => m.beneficiaryId !== null)
                          .map((m, idx) => (
                            <tr key={idx}>
                              <td>{linkBadge(m.cardLabel)}</td>
                              <td>{m.fullName}</td>
                              <td>{m.cin || '—'}</td>
                              <td>{m.dateNaissance ? String(m.dateNaissance).split('-').reverse().join('/') : '—'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ margin: 0, padding: '8px 0', fontSize: '13px', color: 'var(--gray-500)', fontStyle: 'italic' }}>
                    Aucun ayant droit enregistré pour cet agent.
                  </p>
                )}
              </div>
            </div>
          )}
          <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-outline" onClick={closeModal}>
              Annuler
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={viewData.loading || !viewData.agent}
              onClick={() => handlePrintBulletin(modal.row, viewData.agent, viewData.family)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <FaIcon name="print" />
              <span>Imprimer bulletin d'adhésion</span>
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
