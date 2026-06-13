import React, { useEffect, useState, useMemo } from 'react';
import FaIcon from '../components/FaIcon';
import { isAdherentRole } from '../authUtils';
import TablePageShell from '../components/TablePageShell';
import { apiFetch, apiFetchBlob, parseJsonOrThrow } from '../api/client';
import { exportTableToExcel } from '../utils/exportExcel';
import Modal from '../components/Modal';
import DetailView from '../components/DetailView';
import DetailItem from '../components/DetailItem';
import DetailModalFooter from '../components/DetailModalFooter';
import WorkflowSteps from '../components/WorkflowSteps';
import { resolvePecWorkflow, resolveDevisWorkflow, resolveRemboursementWorkflow } from '../utils/workflowSteps';

function statusBadge(statut, type) {
  const map = {
    // Prises en charge & Remboursements & Devis
    Approuvé: 'badge-success',
    Traité: 'badge-success',
    'En cours': 'badge-primary',
    'En attente': 'badge-warning',
    Soumis: 'badge-primary',
    Brouillon: 'badge-neutral',
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

export default function HistoriquePage({ setPageTitle, addToast, user, personalMode = false }) {
  const effectiveAdherent = personalMode || isAdherentRole(user);
  setPageTitle(
    personalMode ? 'Mon historique' : 'Historique personnel',
    personalMode ? 'Mon espace — Historique' : `Mon historique d'activités`,
  );

  const [activeTab, setActiveTab] = useState('pec'); // 'pec', 'devis', 'remb', 'cards'
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);

  // Raw data from APIs
  const [pecList, setPecList] = useState([]);
  const [quotesList, setQuotesList] = useState([]);
  const [rembList, setRembList] = useState([]);
  const [cardsList, setCardsList] = useState([]);
  const [agents, setAgents] = useState([]);
  const isAdherent = effectiveAdherent;
  const isRealAdherent = isAdherentRole(user);
  const agentId = user?.agentId || null;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pecRes, quotesRes, rembRes, agentsRes] = await Promise.all([
        apiFetch('/api/care-episodes'),
        apiFetch('/api/quotes'),
        apiFetch('/api/reimbursements'),
        apiFetch('/api/agents'),
      ]);

      const parsedPec = await parseJsonOrThrow(pecRes);
      const parsedQuotes = await parseJsonOrThrow(quotesRes);
      const parsedRemb = await parseJsonOrThrow(rembRes);
      const parsedAgents = await parseJsonOrThrow(agentsRes);

      setPecList(Array.isArray(parsedPec) ? parsedPec : []);
      setQuotesList(Array.isArray(parsedQuotes) ? parsedQuotes : []);
      setRembList(Array.isArray(parsedRemb) ? parsedRemb : []);
      setAgents(Array.isArray(parsedAgents) ? parsedAgents : []);

      if (agentId) {
        try {
          const cardsRes = await apiFetch(`/api/mutual-cards/family/${agentId}`);
          const parsedCards = await parseJsonOrThrow(cardsRes);
          setCardsList(Array.isArray(parsedCards) ? parsedCards : []);
        } catch (cardErr) {
          console.error("Failed to load mutual cards", cardErr);
          setCardsList([]);
        }
      }
    } catch (e) {
      addToast('error', e.message || 'Impossible de charger l’historique');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [agentId]);

  const agentById = useMemo(() => {
    return Object.fromEntries((agents || []).map((a) => [a.id, a]));
  }, [agents]);

  // In personal/adherent mode: filter raw lists to own agentId
  const myAgentId = isAdherent && agentId != null ? String(agentId) : null;
  const ownPecList    = isAdherent ? (myAgentId ? pecList.filter((p) => String(p.agentId) === myAgentId) : []) : pecList;
  const ownQuotesList = isAdherent ? (myAgentId ? quotesList.filter((q) => String(q.agentId) === myAgentId) : []) : quotesList;
  const ownRembList   = isAdherent ? (myAgentId ? rembList.filter((r) => String(r.agentId) === myAgentId) : []) : rembList;

  // Statistics calculation
  const stats = useMemo(() => {
    const totalReimbursed = ownRembList
      .filter((r) => r.statut === 'Traité')
      .reduce((sum, r) => sum + (Number(r.montantValide) || 0), 0);

    const approvedPec = ownPecList.filter((p) => p.statut === 'Approuvé').length;
    const approvedQuotes = ownQuotesList.filter((q) => q.etat === 'Approuvé').length;
    const issuedCards = cardsList.filter((c) => c.hasPdf).length;

    return {
      totalReimbursed,
      approvedPec,
      approvedQuotes,
      issuedCards,
    };
  }, [ownPecList, ownQuotesList, ownRembList, cardsList]);

  // Document downloads
  const downloadDoc = async (type, item) => {
    let url = '';
    if (type === 'pec') url = `/api/care-episodes/${item.id}/document`;
    else if (type === 'devis') url = `/api/quotes/${item.id}/document`;
    else if (type === 'remb') url = `/api/reimbursements/${item.id}/document`;
    else if (type === 'card') url = `/api/mutual-cards/${item.cardId}/download`;

    try {
      const blob = await apiFetchBlob(url);
      const fileUrl = URL.createObjectURL(blob);
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
    } catch (e) {
      addToast('error', 'Impossible de récupérer le document PDF');
    }
  };

  // Filtered lists
  const filteredPec = useMemo(() => {
    return ownPecList.filter((p) => {
      const matchesSearch =
        p.numero?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.beneficiaire?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.etablissement?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.typePrestation?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || p.statut === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [ownPecList, searchQuery, statusFilter]);

  const filteredQuotes = useMemo(() => {
    return ownQuotesList.filter((q) => {
      const matchesSearch =
        q.numero?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.beneficiaire?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.dentistName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.providerName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || q.etat === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [ownQuotesList, searchQuery, statusFilter]);

  const filteredRemb = useMemo(() => {
    return ownRembList.filter((r) => {
      const matchesSearch =
        r.numero?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.beneficiaire?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.careType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.establishmentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.medicineName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || r.statut === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [ownRembList, searchQuery, statusFilter]);

  const filteredCards = useMemo(() => {
    return cardsList.filter((c) => {
      return (
        c.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.cardLabel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.cin && c.cin.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [cardsList, searchQuery]);

  // Distinct statuses based on active tab
  const statusOptions = useMemo(() => {
    let list = [];
    if (activeTab === 'pec') list = [...new Set(ownPecList.map((p) => p.statut))];
    else if (activeTab === 'devis') list = [...new Set(ownQuotesList.map((q) => q.etat))];
    else if (activeTab === 'remb') list = [...new Set(ownRembList.map((r) => r.statut))];
    return list.filter(Boolean);
  }, [activeTab, ownPecList, ownQuotesList, ownRembList]);

  // Excel export columns & rows
  const handleExport = () => {
    if (activeTab === 'pec') {
      exportTableToExcel({
        filename: 'Historique_Prises_En_Charge',
        sheetName: 'PEC',
        columns: [
          { key: 'numero', label: 'N° Demande' },
          { key: 'typePrestation', label: 'Type Prestation' },
          { key: 'beneficiaire', label: 'Bénéficiaire' },
          { key: 'etablissement', label: 'Établissement' },
          { key: 'dateDebut', label: 'Date Début' },
          { key: 'montantDemande', label: 'Montant Demandé (DH)' },
          { key: 'montantPrisEnCharge', label: 'Montant PEC (DH)' },
          { key: 'statut', label: 'Statut' },
        ],
        rows: filteredPec.map((p) => ({
          ...p,
          dateDebut: formatDate(p.dateDebut),
        })),
      });
    } else if (activeTab === 'devis') {
      exportTableToExcel({
        filename: 'Historique_Devis',
        sheetName: 'Devis',
        columns: [
          { key: 'numero', label: 'N° Devis' },
          { key: 'type', label: 'Type' },
          { key: 'beneficiaire', label: 'Bénéficiaire' },
          { key: 'providerName', label: 'Prestataire' },
          { key: 'depositDate', label: 'Date Dépôt' },
          { key: 'montant', label: 'Montant (DH)' },
          { key: 'etat', label: 'État' },
        ],
        rows: filteredQuotes.map((q) => ({
          ...q,
          depositDate: formatDate(q.depositDate || q.date),
          providerName: q.providerName || q.dentistName || '—',
        })),
      });
    } else if (activeTab === 'remb') {
      exportTableToExcel({
        filename: 'Historique_Remboursements',
        sheetName: 'Remboursements',
        columns: [
          { key: 'numero', label: 'N° Demande' },
          { key: 'careType', label: 'Type Soin' },
          { key: 'beneficiaire', label: 'Bénéficiaire' },
          { key: 'establishmentName', label: 'Établissement' },
          { key: 'depositDate', label: 'Date Dépôt' },
          { key: 'montantDemande', label: 'Montant Demandé (DH)' },
          { key: 'montantValide', label: 'Montant Remboursé (DH)' },
          { key: 'statut', label: 'Statut' },
        ],
        rows: filteredRemb.map((r) => ({
          ...r,
          depositDate: formatDate(r.depositDate || r.date),
        })),
      });
    } else if (activeTab === 'cards') {
      exportTableToExcel({
        filename: 'Historique_Cartes_Mutuelles',
        sheetName: 'Cartes Mutuelles',
        columns: [
          { key: 'fullName', label: 'Membre Foyer' },
          { key: 'cardLabel', label: 'Lien de Parenté' },
          { key: 'cin', label: 'CIN' },
          { key: 'dateNaissance', label: 'Date Naissance' },
          { key: 'statusText', label: 'État Carte' },
        ],
        rows: filteredCards.map((c) => ({
          ...c,
          dateNaissance: formatDate(c.dateNaissance),
          statusText: c.hasPdf ? 'Émise / Active' : 'Non générée',
        })),
      });
    }
  };

  // Modals for inspecting details
  const viewDetail = (type, item) => {
    const closeModal = () => setModal(null);

    if (type === 'pec') {
      const wf = resolvePecWorkflow(item.statut);
      setModal({
        title: `Prise en charge ${item.numero}`,
        content: (
          <>
            <WorkflowSteps {...wf} />
            {item.hasPdf && (
              <div className="workflow-actions-bar" style={{ marginBottom: 12 }}>
                <button type="button" className="btn btn-outline" onClick={() => downloadDoc('pec', item)}>
                  <FaIcon name="file-pdf" className="fa-inline-icon" /> Voir le justificatif PDF
                </button>
              </div>
            )}
            <DetailView footer={<DetailModalFooter onClose={closeModal} canEdit={false} />}>
              <DetailItem label="N° demande">{item.numero}</DetailItem>
              <DetailItem label="Bénéficiaire">{item.beneficiaire}</DetailItem>
              <DetailItem label="Type prestation">
                <span className="badge badge-primary">{item.typePrestation}</span>
              </DetailItem>
              <DetailItem label="Établissement">{item.etablissement}</DetailItem>
              <DetailItem label="Date début">{formatDate(item.dateDebut)}</DetailItem>
              <DetailItem label="Date fin">{formatDate(item.dateFin)}</DetailItem>
              <DetailItem label="Date dépôt">{formatDate(item.depositDate || item.dateDebut)}</DetailItem>
              <DetailItem label="Date envoi">{formatDate(item.sentDate)}</DetailItem>
              <DetailItem label="Date réponse">{formatDate(item.responseDate)}</DetailItem>
              <DetailItem label="Statut">{statusBadge(item.statut)}</DetailItem>
              <DetailItem label="Montant demandé">
                {item.montantDemande != null ? `${Number(item.montantDemande).toLocaleString('fr-FR')} DH` : '—'}
              </DetailItem>
              <DetailItem label="Montant PEC">
                {item.montantPrisEnCharge != null ? `${Number(item.montantPrisEnCharge).toLocaleString('fr-FR')} DH` : '—'}
              </DetailItem>
              <DetailItem label="Observation">{item.observation || '—'}</DetailItem>
            </DetailView>
          </>
        ),
      });
    } else if (type === 'devis') {
      const wf = resolveDevisWorkflow(item.etat, !!item.scanned);
      const pec = item.montantPrisEnCharge ?? Math.round((Number(item.montant) * item.taux) / 100);
      setModal({
        title: `Devis ${item.numero}`,
        content: (
          <>
            <WorkflowSteps {...wf} />
            {item.hasPdf && (
              <div className="workflow-actions-bar" style={{ marginBottom: 12 }}>
                <button type="button" className="btn btn-outline" onClick={() => downloadDoc('devis', item)}>
                  <FaIcon name="file-pdf" className="fa-inline-icon" /> Voir le PDF du devis
                </button>
              </div>
            )}
            <DetailView footer={<DetailModalFooter onClose={closeModal} canEdit={false} />}>
              <DetailItem label="N° devis">{item.numero}</DetailItem>
              <DetailItem label="Bénéficiaire">{item.beneficiaire}</DetailItem>
              <DetailItem label="Type de devis">
                <span className="badge badge-primary">{item.type}</span>
              </DetailItem>
              <DetailItem label="Prestataire">{item.providerName || item.dentistName || '—'}</DetailItem>
              <DetailItem label="Date devis">{formatDate(item.date)}</DetailItem>
              <DetailItem label="Date dépôt">{formatDate(item.depositDate || item.date)}</DetailItem>
              <DetailItem label="Date envoi">{formatDate(item.sentDate)}</DetailItem>
              <DetailItem label="Date réponse">{formatDate(item.responseDate)}</DetailItem>
              <DetailItem label="État">{statusBadge(item.etat)}</DetailItem>
              <DetailItem label="Montant total">{Number(item.montant).toLocaleString('fr-FR')} DH</DetailItem>
              <DetailItem label="Montant remboursable">{Number(pec).toLocaleString('fr-FR')} DH</DetailItem>
              <DetailItem label="Observation">{item.observation || '—'}</DetailItem>
            </DetailView>
          </>
        ),
      });
    } else if (type === 'remb') {
      const wf = resolveRemboursementWorkflow(item.statut);
      setModal({
        title: `Remboursement ${item.numero}`,
        content: (
          <>
            <WorkflowSteps {...wf} />
            {item.hasPdf && (
              <div className="workflow-actions-bar" style={{ marginBottom: 12 }}>
                <button type="button" className="btn btn-outline" onClick={() => downloadDoc('remb', item)}>
                  <FaIcon name="file-pdf" className="fa-inline-icon" /> Voir le justificatif PDF
                </button>
              </div>
            )}
            <DetailView footer={<DetailModalFooter onClose={closeModal} canEdit={false} />}>
              <DetailItem label="N° remboursement">{item.numero}</DetailItem>
              <DetailItem label="Bénéficiaire">{item.beneficiaire}</DetailItem>
              <DetailItem label="Type de soin">{item.careType}</DetailItem>
              <DetailItem label="Médicament">{item.medicineName || '—'}</DetailItem>
              <DetailItem label="Établissement">{item.establishmentName || '—'}</DetailItem>
              <DetailItem label="Date dépôt">{formatDate(item.depositDate || item.date)}</DetailItem>
              <DetailItem label="Date envoi">{formatDate(item.sentDate)}</DetailItem>
              <DetailItem label="Date réponse">{formatDate(item.responseDate)}</DetailItem>
              <DetailItem label="Statut">{statusBadge(item.statut)}</DetailItem>
              <DetailItem label="Montant demandé">{Number(item.montantDemande).toLocaleString('fr-FR')} DH</DetailItem>
              <DetailItem label="Montant remboursé">
                {item.montantValide != null ? `${Number(item.montantValide).toLocaleString('fr-FR')} DH` : '—'}
              </DetailItem>
              <DetailItem label="Observation">{item.observation || '—'}</DetailItem>
            </DetailView>
          </>
        ),
      });
    }
  };

  const showWarning = isAdherent && !agentId;

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
      {modal && (
        <Modal title={modal.title} onClose={() => setModal(null)} variant="detail">
          {modal.content}
        </Modal>
      )}

      {/* Modern Dashboard Stats Grid */}
      <section className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <article className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(15, 111, 184, 0.1) 0%, rgba(15, 111, 184, 0.02) 100%)', border: '1px solid rgba(15, 111, 184, 0.15)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center' }}>
          <div className="stat-icon-wrap" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0F6FB8', color: '#fff', width: '48px', height: '48px', borderRadius: '12px', marginRight: '16px' }}>
            <FaIcon name="money-bill-trend-up" style={{ fontSize: '20px' }} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Remboursé</h4>
            <div className="stat-value" style={{ fontSize: '22px', fontWeight: 700, color: '#0F6FB8', marginTop: '4px' }}>{stats.totalReimbursed.toLocaleString('fr-FR')} DH</div>
          </div>
        </article>

        <article className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(46, 204, 113, 0.1) 0%, rgba(46, 204, 113, 0.02) 100%)', border: '1px solid rgba(46, 204, 113, 0.15)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center' }}>
          <div className="stat-icon-wrap" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#2ecc71', color: '#fff', width: '48px', height: '48px', borderRadius: '12px', marginRight: '16px' }}>
            <FaIcon name="hospital-user" style={{ fontSize: '20px' }} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PEC Approuvées</h4>
            <div className="stat-value" style={{ fontSize: '22px', fontWeight: 700, color: '#2ecc71', marginTop: '4px' }}>{stats.approvedPec}</div>
          </div>
        </article>

        <article className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(52, 152, 219, 0.1) 0%, rgba(52, 152, 219, 0.02) 100%)', border: '1px solid rgba(52, 152, 219, 0.15)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center' }}>
          <div className="stat-icon-wrap" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#3498db', color: '#fff', width: '48px', height: '48px', borderRadius: '12px', marginRight: '16px' }}>
            <FaIcon name="file-circle-check" style={{ fontSize: '20px' }} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Devis Validés</h4>
            <div className="stat-value" style={{ fontSize: '22px', fontWeight: 700, color: '#3498db', marginTop: '4px' }}>{stats.approvedQuotes}</div>
          </div>
        </article>
      </section>

    {/* Tabs Header Navigation */}
    <div className="tabs-header-wrapper" style={{ display: 'flex', borderBottom: '2px solid var(--gray-200)', marginBottom: '20px', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
      <button
        type="button"
        onClick={() => { setActiveTab('pec'); setSearchQuery(''); setStatusFilter(''); }}
        style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'pec' ? '3px solid #0F6FB8' : '3px solid transparent', color: activeTab === 'pec' ? '#0F6FB8' : 'var(--gray-600)', fontWeight: 600, fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
      >
        <FaIcon name="hospital" /> Prises en charge
      </button>
      <button
        type="button"
        onClick={() => { setActiveTab('devis'); setSearchQuery(''); setStatusFilter(''); }}
        style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'devis' ? '3px solid #0F6FB8' : '3px solid transparent', color: activeTab === 'devis' ? '#0F6FB8' : 'var(--gray-600)', fontWeight: 600, fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
      >
        <FaIcon name="file-invoice" /> Devis
      </button>
      <button
        type="button"
        onClick={() => { setActiveTab('remb'); setSearchQuery(''); setStatusFilter(''); }}
        style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'remb' ? '3px solid #0F6FB8' : '3px solid transparent', color: activeTab === 'remb' ? '#0F6FB8' : 'var(--gray-600)', fontWeight: 600, fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
      >
        <FaIcon name="money-bill-wave" /> Remboursements
      </button>
      {!isAdherent && (
        <button
          type="button"
          onClick={() => { setActiveTab('cards'); setSearchQuery(''); setStatusFilter(''); }}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'cards' ? '3px solid #0F6FB8' : '3px solid transparent', color: activeTab === 'cards' ? '#0F6FB8' : 'var(--gray-600)', fontWeight: 600, fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
        >
          <FaIcon name="id-card" /> Cartes mutuelles
        </button>
      )}
    </div>

      <TablePageShell
        title=""
        icon=""
        toolbar={
          <div className="table-page-toolbar-filters" style={{ width: '100%' }}>
            <div className="filter-group" style={{ display: 'grid', gridTemplateColumns: activeTab === 'cards' ? '1fr auto' : '1fr 180px auto', gap: '12px', alignItems: 'center', width: '100%' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder={
                    activeTab === 'cards'
                      ? "Rechercher une carte (nom, parenté, CIN...)"
                      : "Rechercher dans l'historique (n°, bénéficiaire, type, prestataire...)"
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', paddingLeft: '36px' }}
                />
                <FaIcon name="magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              </div>

              {activeTab !== 'cards' && (
                <select
                  className="form-control"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Tous les états</option>
                  {statusOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              <button
                type="button"
                className="btn btn-outline"
                onClick={handleExport}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '100%', whiteSpace: 'nowrap' }}
              >
                <FaIcon name="file-excel" /> Exporter Excel
              </button>
            </div>
          </div>
        }
      >
        {loading ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div className="card-body">
              <FaIcon name="circle-notch" className="fa-spin" style={{ fontSize: '24px', color: '#0F6FB8', marginBottom: '12px' }} />
              <div>Chargement de vos archives en cours...</div>
            </div>
          </div>
        ) : (
          <div className="data-table-wrapper">
            {activeTab === 'pec' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>N° Demande</th>
                    <th>Type Prestation</th>
                    <th>Bénéficiaire</th>
                    <th>Établissement</th>
                    <th>Date début</th>
                    <th>Montant Demandé</th>
                    <th>Montant PEC</th>
                    <th>Statut</th>
                    <th>Fichier</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPec.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-500)' }}>
                        Aucune demande de prise en charge trouvée dans votre historique.
                      </td>
                    </tr>
                  ) : (
                    filteredPec.map((p) => (
                      <tr key={p.id}>
                        <td><strong>{p.numero}</strong></td>
                        <td><span className="badge badge-neutral">{p.typePrestation}</span></td>
                        <td>{p.beneficiaire}</td>
                        <td>{p.etablissement}</td>
                        <td>{formatDate(p.dateDebut)}</td>
                        <td>{p.montantDemande != null ? `${Number(p.montantDemande).toLocaleString('fr-FR')} DH` : '—'}</td>
                        <td>{p.montantPrisEnCharge != null && Number(p.montantPrisEnCharge) > 0 ? `${Number(p.montantPrisEnCharge).toLocaleString('fr-FR')} DH` : '—'}</td>
                        <td>{statusBadge(p.statut)}</td>
                        <td>
                          {p.hasPdf ? (
                            <button type="button" className="btn btn-sm btn-outline" onClick={() => downloadDoc('pec', p)} title="Télécharger le PDF">
                              <FaIcon name="download" /> PDF
                            </button>
                          ) : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button type="button" className="btn btn-icon btn-view" onClick={() => viewDetail('pec', p)}>
                            <FaIcon name="eye" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'devis' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>N° Devis</th>
                    <th>Type</th>
                    <th>Bénéficiaire</th>
                    <th>Prestataire</th>
                    <th>Date dépôt</th>
                    <th>Montant Total</th>
                    <th>État</th>
                    <th>Fichier</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-500)' }}>
                        Aucun devis trouvé dans votre historique.
                      </td>
                    </tr>
                  ) : (
                    filteredQuotes.map((q) => (
                      <tr key={q.id}>
                        <td><strong>{q.numero}</strong></td>
                        <td><span className="badge badge-neutral">{q.type}</span></td>
                        <td>{q.beneficiaire}</td>
                        <td>{q.providerName || q.dentistName || '—'}</td>
                        <td>{formatDate(q.depositDate || q.date)}</td>
                        <td>{Number(q.montant).toLocaleString('fr-FR')} DH</td>
                        <td>{statusBadge(q.etat)}</td>
                        <td>
                          {q.hasPdf ? (
                            <button type="button" className="btn btn-sm btn-outline" onClick={() => downloadDoc('devis', q)} title="Télécharger le PDF">
                              <FaIcon name="download" /> PDF
                            </button>
                          ) : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button type="button" className="btn btn-icon btn-view" onClick={() => viewDetail('devis', q)}>
                            <FaIcon name="eye" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'remb' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>N° Demande</th>
                    <th>Type Soin</th>
                    <th>Bénéficiaire</th>
                    <th>Établissement / Pharmacie</th>
                    <th>Date dépôt</th>
                    <th>Montant Demandé</th>
                    <th>Montant Remboursé</th>
                    <th>Statut</th>
                    <th>Fichier</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRemb.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-500)' }}>
                        Aucune demande de remboursement trouvée dans votre historique.
                      </td>
                    </tr>
                  ) : (
                    filteredRemb.map((r) => (
                      <tr key={r.id}>
                        <td><strong>{r.numero}</strong></td>
                        <td><span className="badge badge-neutral">{r.careType}</span></td>
                        <td>{r.beneficiaire}</td>
                        <td>{r.establishmentName || '—'}</td>
                        <td>{formatDate(r.depositDate || r.date)}</td>
                        <td>{Number(r.montantDemande).toLocaleString('fr-FR')} DH</td>
                        <td>{r.montantValide != null && Number(r.montantValide) > 0 ? `${Number(r.montantValide).toLocaleString('fr-FR')} DH` : '—'}</td>
                        <td>{statusBadge(r.statut)}</td>
                        <td>
                          {r.hasPdf ? (
                            <button type="button" className="btn btn-sm btn-outline" onClick={() => downloadDoc('remb', r)} title="Télécharger le PDF">
                              <FaIcon name="download" /> PDF
                            </button>
                          ) : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button type="button" className="btn btn-icon btn-view" onClick={() => viewDetail('remb', r)}>
                            <FaIcon name="eye" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {!isAdherent && activeTab === 'cards' && (
              <div className="cartes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', padding: '10px 0' }}>
                {filteredCards.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
                    Aucune carte mutuelle trouvée dans votre historique.
                  </div>
                ) : (
                  filteredCards.map((c) => (
                    <article key={c.beneficiaryId ?? 'titulaire'} className="carte-member-card" style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--gray-200)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', padding: '20px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                      <div className="carte-member-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <img src="/srm-company-logo.png" alt="SRM-MS" className="carte-member-logo" style={{ height: '24px', objectFit: 'contain' }} />
                        <span className={`badge ${c.cardLabel === 'Titulaire' ? 'badge-primary' : (c.cardLabel === 'Conjoint' || c.cardLabel === 'Conjoint(e)') ? 'badge-info' : 'badge-success'}`}>{c.cardLabel}</span>
                      </div>
                      <h3 className="carte-member-name" style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 12px', color: 'var(--gray-900)' }}>{c.fullName}</h3>
                      <ul className="carte-member-meta" style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--gray-500)', fontWeight: 500 }}>CIN :</span> <strong>{c.cin || '—'}</strong>
                        </li>
                        <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--gray-500)', fontWeight: 500 }}>Naissance :</span> <strong>{formatDate(c.dateNaissance)}</strong>
                        </li>
                        <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--gray-500)', fontWeight: 500 }}>Statut :</span> <strong style={{ color: c.hasPdf ? 'var(--success)' : 'var(--gray-600)' }}>{c.hasPdf ? 'Carte émise' : 'Non générée'}</strong>
                        </li>
                      </ul>
                      <div className="carte-member-actions" style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                        {c.hasPdf ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => downloadDoc('card', c)}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          >
                            <FaIcon name="download" /> Télécharger PDF
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            disabled
                            style={{ flex: 1, color: 'var(--gray-400)', borderColor: 'var(--gray-200)', cursor: 'not-allowed' }}
                          >
                            Non générée
                          </button>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </TablePageShell>
    </>
  );
}
