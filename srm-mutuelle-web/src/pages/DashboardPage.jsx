import React, { useEffect, useMemo, useState } from 'react';
import FaIcon from '../components/FaIcon';
import TablePageShell from '../components/TablePageShell';
import ListPageToolbar from '../components/ListPageToolbar';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { isAdherentRole } from '../authUtils';
import { matchesSearch } from '../utils/filterSearch';
import { motion } from 'framer-motion';

function statusBadge(statut) {
  const map = {
    Traité: 'badge-success',
    Validé: 'badge-success',
    Approuvé: 'badge-success',
    Clôturé: 'badge-success',
    'En cours': 'badge-primary',
    'En attente': 'badge-warning',
    Rejeté: 'badge-danger',
    Inactif: 'badge-danger',
    Actif: 'badge-success',
    Accordée: 'badge-success',
    Refusée: 'badge-danger',
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

function formatIsoDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('T')[0].split('-');
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

export default function DashboardPage({ setPageTitle, addToast, user, onNavigate }) {
  setPageTitle('Tableau de bord', 'Accueil');
  const adherent = isAdherentRole(user);
  const [summary, setSummary] = useState(null);
  const [reimb, setReimb] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [careEpisodes, setCareEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [rRes, qRes, pRes] = await Promise.all([
          apiFetch('/api/reimbursements'),
          apiFetch('/api/quotes'),
          apiFetch('/api/care-episodes'),
        ]);
        const rList = await parseJsonOrThrow(rRes);
        const qList = await parseJsonOrThrow(qRes);
        const pList = await parseJsonOrThrow(pRes);
        if (cancelled) return;
        setReimb(rList);
        setQuotes(qList);
        setCareEpisodes(pList);
        if (!adherent) {
          const sRes = await apiFetch('/api/stats/summary');
          if (sRes.ok) {
            setSummary(await parseJsonOrThrow(sRes));
          } else {
            setSummary(null);
          }
        }
      } catch (e) {
        if (!cancelled) addToast('error', e.message || 'Chargement impossible');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adherent, addToast]);

  const activityRows = useMemo(() => {
    const base = reimb.map((r) => ({
      ...r,
      type: 'Remboursement',
      montant: `${Number(r.montantDemande).toLocaleString('fr-FR')} DH`,
    }));
    if (!searchQuery.trim()) return base;
    return base.filter((r) =>
      matchesSearch(searchQuery, r.numero, r.beneficiaire, r.statut, formatDate(r.date), r.montant),
    );
  }, [reimb, searchQuery]);

  const monthlyQuoteStats = useMemo(() => {
    const frenchMonths = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    const now = new Date();
    const stats = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const targetYear = d.getFullYear();
      const targetMonth = d.getMonth() + 1; // 1-indexed
      const label = frenchMonths[d.getMonth()];
      
      let totalMontant = 0;
      let totalPec = 0;
      
      for (const q of quotes) {
        if (!q.date) continue;
        const [y, m] = q.date.split('-');
        if (Number(y) === targetYear && Number(m) === targetMonth) {
          totalMontant += Number(q.montant) || 0;
          totalPec += Number(q.montantPrisEnCharge) || 0;
        }
      }
      
      stats.push({
        month: label,
        montant: totalMontant,
        montantPrisEnCharge: totalPec,
      });
    }
    return stats;
  }, [quotes]);

  const monthlyPecStats = useMemo(() => {
    const frenchMonths = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    const now = new Date();
    const stats = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const targetYear = d.getFullYear();
      const targetMonth = d.getMonth() + 1; // 1-indexed
      const label = frenchMonths[d.getMonth()];
      
      let totalDemande = 0;
      let totalValide = 0;
      
      for (const p of careEpisodes) {
        const dateStr = p.dateDebut || p.depositDate;
        if (!dateStr) continue;
        const [y, m] = dateStr.split('-');
        if (Number(y) === targetYear && Number(m) === targetMonth) {
          totalDemande += Number(p.montantDemande) || 0;
          totalValide += Number(p.montantPrisEnCharge) || 0;
        }
      }
      
      stats.push({
        month: label,
        montantDemande: totalDemande,
        montantValide: totalValide,
      });
    }
    return stats;
  }, [careEpisodes]);

  const quotesStatusStats = useMemo(() => {
    let attente = 0;
    let valide = 0;
    let refuse = 0;
    (quotes || []).forEach((q) => {
      const s = q.etat || q.statut || '';
      if (s === 'En attente' || s === 'En cours' || s === 'Soumis' || s === 'Brouillon') attente++;
      else if (s === 'Approuvé' || s === 'Validé' || s === 'Accordée') valide++;
      else if (s === 'Rejeté' || s === 'Refusé' || s === 'Refusée') refuse++;
    });
    const total = attente + valide + refuse;
    return { attente, valide, refuse, total };
  }, [quotes]);

  const pecStatusStats = useMemo(() => {
    let attente = 0;
    let valide = 0;
    let refuse = 0;
    (careEpisodes || []).forEach((p) => {
      const s = p.statut || p.status || '';
      if (s === 'En attente' || s === 'En cours') attente++;
      else if (s === 'Approuvé' || s === 'Clôturé' || s === 'Validé') valide++;
      else if (s === 'Rejeté' || s === 'Refusé') refuse++;
    });
    const total = attente + valide + refuse;
    return { attente, valide, refuse, total };
  }, [careEpisodes]);

  if (loading) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '60px' }}>
          <FaIcon name="spinner" className="fa-spin" style={{ fontSize: '2rem', color: 'var(--primary-600)', marginBottom: '12px' }} />
          <div style={{ color: 'var(--gray-600)', fontWeight: 500 }}>Chargement des données du tableau de bord...</div>
        </div>
      </div>
    );
  }

  // Extract variables
  const totalAgentsCount = summary?.agentsCount ?? 0;
  const totalOrdonnances = summary?.ordonnancesCount ?? 0;
  const remboursementsEnAttente = summary?.remboursementsEnAttente ?? 0;
  const devisEnAttente = summary?.devisEnAttente ?? 0;
  const totalReimbursementsCount = summary?.totalReimbursementsCount ?? 0;
  const pendingCareEpisodesCount = summary?.pendingCareEpisodesCount ?? 0;
  const pendingMutualCardRequestsCount = summary?.pendingMutualCardRequestsCount ?? 0;
  
  // Referentials Counts
  const medicinesCount = summary?.medicinesCount ?? 0;
  const facilitiesCount = summary?.facilitiesCount ?? 0;
  const entitiesCount = summary?.entitiesCount ?? 0;
  const diseasesCount = summary?.diseasesCount ?? 0;
  const doctorsCount = summary?.doctorsCount ?? 0;

  const statusStats = summary?.statusStats || {};
  const careTypeStats = summary?.careTypeStats || {};
  const monthlyStats = summary?.monthlyStats || [];
  const recentActivities = summary?.recentActivities || [];

  // Calculations for Donut Chart
  const countTraite = (statusStats['Traité'] || 0) + (statusStats['Clôturé'] || 0) + (statusStats['Validé'] || 0) + (statusStats['Approuvé'] || 0);
  const countAttente = (statusStats['En attente'] || 0) + (statusStats['En cours'] || 0) + (statusStats['Soumis'] || 0);
  const countRejete = statusStats['Rejeté'] || 0;
  const totalStatus = countTraite + countAttente + countRejete;

  const donutSlices = [
    { label: 'Traités', value: countTraite, color: 'var(--accent-500)' },
    { label: 'En attente', value: countAttente, color: 'var(--warning-500)' },
    { label: 'Rejetés', value: countRejete, color: 'var(--danger-500)' },
  ].filter(s => s.value > 0);

  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  // Max value for Double Bar Chart (Quotes)
  const maxValQuotes = Math.max(
    1,
    ...monthlyQuoteStats.map(d => Math.max(Number(d.montant) || 0, Number(d.montantPrisEnCharge) || 0))
  );

  const yTicksQuotes = [];
  for (let i = 4; i >= 0; i--) {
    yTicksQuotes.push((maxValQuotes * i) / 4);
  }

  // Max value for Double Bar Chart (Care Episodes - PEC)
  const maxValPec = Math.max(
    1,
    ...monthlyPecStats.map(d => Math.max(Number(d.montantDemande) || 0, Number(d.montantValide) || 0))
  );

  const yTicksPec = [];
  for (let i = 4; i >= 0; i--) {
    yTicksPec.push((maxValPec * i) / 4);
  }

  return (
    <>
      <style>{`
        .charts-timeline-row {
          display: grid;
          grid-template-columns: 1.8fr 1.2fr;
          gap: 20px;
          margin-bottom: 24px;
        }

        @media (max-width: 1024px) {
          .charts-timeline-row {
            grid-template-columns: 1fr;
          }
        }

        /* Donut chart legend styling */
        .donut-legend {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          margin-top: 10px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--gray-600);
        }
        .legend-color-dot {
          width: 10px;
          height: 10px;
          border-radius: 3px;
        }
        .legend-value {
          font-weight: 700;
          margin-left: auto;
          color: var(--gray-800);
        }
        .legend-percent {
          font-size: 10px;
          color: var(--gray-400);
          margin-left: 2px;
        }

        /* Timeline styling */
        .timeline {
          position: relative;
          padding-left: 20px;
        }
        .timeline::before {
          content: '';
          position: absolute;
          left: 4px;
          top: 10px;
          bottom: 10px;
          width: 2px;
          background: var(--gray-200);
        }
        .timeline-item {
          position: relative;
          padding-bottom: 16px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .timeline-item:last-child {
          padding-bottom: 0;
        }
        .timeline-marker {
          position: absolute;
          left: -20px;
          top: 8px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--gray-400);
          border: 2px solid #fff;
          box-shadow: 0 0 0 2px var(--gray-200);
        }
        .timeline-marker.remboursement { background: var(--accent-500); }
        .timeline-marker.devis { background: var(--primary-500); }
        .timeline-marker.prise-en-charge { background: var(--danger-500); }
        .timeline-marker.carte-mutuelle { background: var(--warning-500); }

        .timeline-content {
          flex-grow: 1;
          background: #fff;
          border: 1px solid var(--gray-100);
          border-radius: 8px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all var(--transition-fast);
        }
        .timeline-content:hover {
          border-color: var(--primary-200);
          box-shadow: var(--shadow-sm);
          background: var(--gray-50);
        }
        .timeline-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .timeline-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .timeline-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--gray-800);
        }
        .timeline-type-badge {
          font-size: 9px;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .timeline-type-badge.remboursement { background: #e8f8f0; color: var(--accent-600); }
        .timeline-type-badge.devis { background: #e0f2fe; color: var(--primary-700); }
        .timeline-type-badge.prise-en-charge { background: #fef2f2; color: var(--danger-600); }
        .timeline-type-badge.carte-mutuelle { background: #fffbeb; color: var(--warning-600); }

        .timeline-subtext {
          font-size: 11px;
          color: var(--gray-500);
        }
        .timeline-action {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .timeline-date {
          font-size: 11px;
          color: var(--gray-400);
        }

        /* Double-Bar Chart Tooltip & Interactivity */
        .double-bar {
          position: relative;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .double-bar:hover {
          filter: brightness(1.1) contrast(1.05);
          transform: scaleX(1.05);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        .double-bar:hover .chart-tooltip {
          opacity: 1;
          visibility: visible;
          transform: translate(-50%, -8px);
        }
        .chart-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translate(-50%, 0);
          background: rgba(15, 23, 42, 0.96);
          color: #fff;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          box-shadow: var(--shadow-lg);
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
          z-index: 100;
          text-align: center;
          line-height: 1.45;
          border: 1px solid rgba(255, 255, 255, 0.12);
          white-space: nowrap;
        }
      `}</style>

      {/* KPI Cards Grid */}
      <div className="stats-grid">
        {/* 1. Agents */}
        <motion.div
          className="stat-card"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate?.('agents')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.0 }}
          whileHover={{ y: -5, boxShadow: 'var(--shadow-md)', borderColor: 'var(--primary-300)' }}
        >
          <div className="stat-icon blue">
            <FaIcon name="users" />
          </div>
          <div className="stat-info">
            <h4>Agents</h4>
            <div className="stat-value">{totalAgentsCount}</div>
            <span className="stat-change up" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>Gérer les dossiers</span>
          </div>
        </motion.div>

        {/* 2. Ordonnances */}
        <motion.div
          className="stat-card"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate?.('ordonnances')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          whileHover={{ y: -5, boxShadow: 'var(--shadow-md)', borderColor: 'var(--info-300)' }}
        >
          <div className="stat-icon cyan">
            <FaIcon name="clipboard-list" />
          </div>
          <div className="stat-info">
            <h4>Ordonnances</h4>
            <div className="stat-value">{totalOrdonnances}</div>
            <span className="stat-change up" style={{ color: 'var(--info-600)', fontWeight: 600 }}>Total enregistrées</span>
          </div>
        </motion.div>

        {/* 3. Remboursements en attente */}
        <motion.div
          className="stat-card"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate?.('remboursements')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          whileHover={{ y: -5, boxShadow: 'var(--shadow-md)', borderColor: 'var(--warning-300)' }}
        >
          <div className="stat-icon orange">
            <FaIcon name="hourglass-half" />
          </div>
          <div className="stat-info">
            <h4>Remb. en attente</h4>
            <div className="stat-value">{remboursementsEnAttente}</div>
            <span className="stat-change down" style={{ color: 'var(--warning-600)', fontWeight: 600 }}>À instruire</span>
          </div>
        </motion.div>

        {/* 4. Devis en attente */}
        <motion.div
          className="stat-card"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate?.('devis')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          whileHover={{ y: -5, boxShadow: 'var(--shadow-md)', borderColor: 'var(--primary-300)' }}
        >
          <div className="stat-icon purple">
            <FaIcon name="file-invoice-dollar" />
          </div>
          <div className="stat-info">
            <h4>Devis en attente</h4>
            <div className="stat-value">{devisEnAttente}</div>
            <span className="stat-change down" style={{ color: 'var(--primary-700)', fontWeight: 600 }}>À valider</span>
          </div>
        </motion.div>

        {/* 5. PEC en attente */}
        <motion.div
          className="stat-card"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate?.('prises-en-charge')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          whileHover={{ y: -5, boxShadow: 'var(--shadow-md)', borderColor: 'var(--danger-300)' }}
        >
          <div className="stat-icon red">
            <FaIcon name="hospital" />
          </div>
          <div className="stat-info">
            <h4>PEC en attente</h4>
            <div className="stat-value">{pendingCareEpisodesCount}</div>
            <span className="stat-change down" style={{ color: 'var(--danger-600)', fontWeight: 600 }}>PEC hospitalières</span>
          </div>
        </motion.div>

        {/* 6. Cartes en attente */}
        <motion.div
          className="stat-card"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate?.('cartes-mutuelles')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          whileHover={{ y: -5, boxShadow: 'var(--shadow-md)', borderColor: 'var(--warning-300)' }}
        >
          <div className="stat-icon orange">
            <FaIcon name="address-card" />
          </div>
          <div className="stat-info">
            <h4>Cartes en attente</h4>
            <div className="stat-value">{pendingMutualCardRequestsCount}</div>
            <span className="stat-change down" style={{ color: 'var(--warning-600)', fontWeight: 600 }}>Demandes cartes</span>
          </div>
        </motion.div>

        {/* 7. Médicaments */}
        <motion.div
          className="stat-card"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate?.('medicaments')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          whileHover={{ y: -5, boxShadow: 'var(--shadow-md)', borderColor: 'var(--success-300)' }}
        >
          <div className="stat-icon green">
            <FaIcon name="pills" />
          </div>
          <div className="stat-info">
            <h4>Médicaments</h4>
            <div className="stat-value">{medicinesCount}</div>
            <span className="stat-change up" style={{ color: 'var(--accent-600)', fontWeight: 600 }}>Référentiel</span>
          </div>
        </motion.div>

        {/* 8. Établissements */}
        <motion.div
          className="stat-card"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate?.('etablissements')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          whileHover={{ y: -5, boxShadow: 'var(--shadow-md)', borderColor: 'var(--info-300)' }}
        >
          <div className="stat-icon cyan">
            <FaIcon name="house-chimney-medical" />
          </div>
          <div className="stat-info">
            <h4>Établissements</h4>
            <div className="stat-value">{facilitiesCount}</div>
            <span className="stat-change up" style={{ color: 'var(--info-600)', fontWeight: 600 }}>Cliniques / Hôpitaux</span>
          </div>
        </motion.div>

        {/* 9. Entités */}
        <motion.div
          className="stat-card"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate?.('entites')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          whileHover={{ y: -5, boxShadow: 'var(--shadow-md)', borderColor: 'var(--primary-300)' }}
        >
          <div className="stat-icon purple">
            <FaIcon name="sitemap" />
          </div>
          <div className="stat-info">
            <h4>Entités</h4>
            <div className="stat-value">{entitiesCount}</div>
            <span className="stat-change up" style={{ color: 'var(--primary-700)', fontWeight: 600 }}>Organisation</span>
          </div>
        </motion.div>

        {/* 10. Médecins conventionnés */}
        <motion.div
          className="stat-card"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate?.('medecins')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          whileHover={{ y: -5, boxShadow: 'var(--shadow-md)', borderColor: 'var(--primary-300)' }}
        >
          <div className="stat-icon blue">
            <FaIcon name="user-doctor" />
          </div>
          <div className="stat-info">
            <h4>Médecins conv.</h4>
            <div className="stat-value">{doctorsCount}</div>
            <span className="stat-change up" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>Référentiel médical</span>
          </div>
        </motion.div>
      </div>

      {/* Charts (Monthly costs & Donut stats) */}
      <div className="charts-timeline-row">
        {/* Monthly Expenses Chart */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
        >
          <div className="card-header">
            <h3 style={{ margin: 0 }}>
              <FaIcon name="chart-simple" className="fa-inline-icon" /> Statistiques des devis (montant total vs accordé, DH)
            </h3>
          </div>
          <div className="card-body" style={{ minHeight: '320px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            {monthlyQuoteStats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--gray-400)' }}>
                Aucune donnée de devis disponible
              </div>
            ) : (
              <>
                <div style={{ position: 'relative', height: '240px', paddingLeft: '55px', paddingRight: '10px', marginTop: '10px' }}>
                  {/* Grid Lines & Y-Axis Scale */}
                  <div style={{ position: 'absolute', top: 0, bottom: '30px', left: '55px', right: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                    {yTicksQuotes.map((tick, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', width: '100%', height: 0, position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '-55px', width: '48px', textAlign: 'right', fontSize: '10px', color: 'var(--gray-400)', fontWeight: '700' }}>
                          {tick >= 1000000 ? `${(tick / 1000000).toFixed(1)}M` : tick >= 1000 ? `${(tick / 1000).toFixed(0)}k` : tick.toFixed(0)}
                        </span>
                        <div style={{ flexGrow: 1, borderBottom: '1px dashed var(--gray-200)', width: '100%' }}></div>
                      </div>
                    ))}
                  </div>

                  {/* Bars Container */}
                  <div style={{ position: 'absolute', top: 0, bottom: '30px', left: '55px', right: 0, display: 'flex', alignItems: 'end', justifyContent: 'space-around', zIndex: 1 }}>
                    {monthlyQuoteStats.map((d, i) => {
                      const heightDemande = ((Number(d.montant) || 0) / maxValQuotes) * 100;
                      const heightValide = ((Number(d.montantPrisEnCharge) || 0) / maxValQuotes) * 100;
                      return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'end', width: `${100 / monthlyQuoteStats.length}%` }}>
                          <div style={{ display: 'flex', alignItems: 'end', gap: '6px', height: '100%', justifyContent: 'center', position: 'relative', width: '100%' }}>
                            {/* Requested Bar */}
                            <div 
                              className="double-bar requested" 
                              style={{ 
                                height: `${Math.max(1, heightDemande)}%`,
                                width: '20px',
                                background: 'linear-gradient(to top, var(--primary-500), var(--primary-300))',
                                borderRadius: '4px 4px 0 0',
                                position: 'relative',
                                transition: 'height 0.4s ease-out'
                              }}
                            >
                              <div className="chart-tooltip">
                                <div style={{ color: 'var(--primary-300)', fontWeight: '700', marginBottom: '2px' }}>Total Devis ({d.month})</div>
                                <div style={{ fontSize: '13px' }}>{Number(d.montant || 0).toLocaleString('fr-FR')} DH</div>
                              </div>
                            </div>

                            {/* Validated Bar */}
                            <div 
                              className="double-bar validated" 
                              style={{ 
                                height: `${Math.max(1, heightValide)}%`,
                                width: '20px',
                                background: 'linear-gradient(to top, var(--accent-600), var(--accent-400))',
                                borderRadius: '4px 4px 0 0',
                                position: 'relative',
                                transition: 'height 0.4s ease-out'
                              }}
                            >
                              <div className="chart-tooltip">
                                <div style={{ color: 'var(--accent-400)', fontWeight: '700', marginBottom: '2px' }}>Accordé ({d.month})</div>
                                <div style={{ fontSize: '13px' }}>{Number(d.montantPrisEnCharge || 0).toLocaleString('fr-FR')} DH</div>
                              </div>
                            </div>
                          </div>
                          <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: '700', color: 'var(--gray-500)' }}>
                            {d.month}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '16px', borderTop: '1px solid var(--gray-100)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--gray-600)', fontWeight: '600' }}>
                    <div style={{ width: '12px', height: '12px', background: 'linear-gradient(to top, var(--primary-500), var(--primary-300))', borderRadius: '3px' }}></div>
                    <span>Montant total devis (DH)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--gray-600)', fontWeight: '600' }}>
                    <div style={{ width: '12px', height: '12px', background: 'linear-gradient(to top, var(--accent-600), var(--accent-400))', borderRadius: '3px' }}></div>
                    <span>Montant accordé (DH)</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Circular Donut Chart */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
        >
          <div className="card-header">
            <h3 style={{ margin: 0 }}>
              <FaIcon name="chart-pie" className="fa-inline-icon" /> Statuts des remboursements
            </h3>
          </div>
          <div className="card-body" style={{ minHeight: '320px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            {totalStatus === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--gray-400)' }}>
                Aucun remboursement pour générer le diagramme
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '16px', alignItems: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                  <svg width="150" height="150" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="16" />
                    {(() => {
                      let currentAcc = 0;
                      return donutSlices.map((slice, idx) => {
                        const percent = (slice.value / totalStatus) * 100;
                        const strokeLength = (slice.value / totalStatus) * circumference;
                        const strokeOffset = circumference - (currentAcc / 100) * circumference;
                        currentAcc += percent;
                        return (
                          <circle
                            key={idx}
                            cx="80"
                            cy="80"
                            r={radius}
                            fill="transparent"
                            stroke={slice.color}
                            strokeWidth="16"
                            strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
                            strokeDashoffset={strokeOffset}
                            transform="rotate(-90 80 80)"
                            style={{ transition: 'stroke-dashoffset 0.5s ease', cursor: 'pointer' }}
                          />
                        );
                      });
                    })()}
                    <text x="80" y="75" textAnchor="middle" style={{ fontSize: '18px', fontWeight: 800, fill: 'var(--gray-900)' }}>
                      {totalStatus}
                    </text>
                    <text x="80" y="93" textAnchor="middle" style={{ fontSize: '10px', fontWeight: 600, fill: 'var(--gray-400)', textTransform: 'uppercase' }}>
                      Dossiers
                    </text>
                  </svg>
                </div>
                
                <div className="donut-legend">
                  {donutSlices.map((slice, idx) => {
                    const percent = ((slice.value / totalStatus) * 100).toFixed(0);
                    return (
                      <div key={idx} className="legend-item">
                        <div className="legend-color-dot" style={{ background: slice.color }}></div>
                        <span>{slice.label}</span>
                        <span className="legend-percent">({percent}%)</span>
                        <span className="legend-value">{slice.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Activities & Care types */}
      <motion.div 
        className="charts-timeline-row"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        {/* Unified Activities Log */}
        <motion.div 
          className="card"
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
        >
          <div className="card-header">
            <h3 style={{ margin: 0 }}><FaIcon name="clock-rotate-left" className="fa-inline-icon" /> Flux des activités récentes</h3>
          </div>
          <div className="card-body">
            {recentActivities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-400)' }}>
                Aucune activité récente trouvée dans le système
              </div>
            ) : (
              <div className="timeline">
                {recentActivities.map((a, i) => {
                  const typeClass = (a.type || '').toLowerCase().replace(/\s+/g, '-');
                  return (
                    <div key={i} className="timeline-item">
                      <div className={`timeline-marker ${typeClass}`}></div>
                      <div className="timeline-content">
                        <div className="timeline-details">
                          <div className="timeline-title-row">
                            <span className="timeline-title">{a.numero}</span>
                            <span className={`timeline-type-badge ${typeClass}`}>{a.type}</span>
                          </div>
                          <div className="timeline-subtext">
                            <strong>{a.beneficiaire}</strong> • {a.details}
                          </div>
                        </div>
                        <div className="timeline-action">
                          <span className="timeline-date">{formatIsoDate(a.date)}</span>
                          {statusBadge(a.status)}
                          <button 
                            className="btn btn-outline btn-sm"
                            style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px' }}
                            onClick={() => {
                              if (a.type === 'Remboursement') onNavigate?.('remboursements');
                              else if (a.type === 'Devis') onNavigate?.('devis');
                              else if (a.type === 'Prise en charge') onNavigate?.('prises-en-charge');
                              else if (a.type === 'Carte Mutuelle') onNavigate?.('cartes-mutuelles');
                            }}
                          >
                            <FaIcon name="arrow-right" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Care types breakdown */}
        <motion.div 
          className="card"
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
        >
          <div className="card-header">
            <h3 style={{ margin: 0 }}><FaIcon name="stethoscope" className="fa-inline-icon" /> Répartition par soins</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.keys(careTypeStats).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--gray-400)', fontSize: '13px' }}>
                Aucune donnée de remboursement disponible
              </div>
            ) : (
              Object.entries(careTypeStats).slice(0, 5).map(([type, count]) => {
                const percentage = totalReimbursementsCount > 0 ? (count / totalReimbursementsCount) * 100 : 0;
                return (
                  <div key={type} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                      <span style={{ color: 'var(--gray-700)' }}>{type}</span>
                      <span style={{ color: 'var(--gray-900)' }}>{count} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--gray-100)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--primary-500)', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                );
              })
            )}
            <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '8px', fontStyle: 'italic' }}>
              Statistiques basées sur les remboursements actifs enregistrés dans le système.
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom Charts view (Devis & PEC Donut Charts) */}
      <div className="charts-timeline-row" style={{ marginTop: '24px' }}>
        {/* Devis Donut Chart */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
        >
          <div className="card-header">
            <h3 style={{ margin: 0 }}>
              <FaIcon name="chart-pie" className="fa-inline-icon" /> Statut des devis
            </h3>
          </div>
          <div className="card-body" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            {quotesStatusStats.total === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--gray-400)' }}>
                Aucun devis disponible
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '16px', alignItems: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                  <svg width="150" height="150" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="16" />
                    {(() => {
                      const slices = [
                        { label: 'Validés', value: quotesStatusStats.valide, color: 'var(--accent-500)' },
                        { label: 'En attente', value: quotesStatusStats.attente, color: 'var(--warning-500)' },
                        { label: 'Refusés', value: quotesStatusStats.refuse, color: 'var(--danger-500)' },
                      ].filter(s => s.value > 0);
                      
                      let currentAcc = 0;
                      return slices.map((slice, idx) => {
                        const percent = (slice.value / quotesStatusStats.total) * 100;
                        const strokeLength = (slice.value / quotesStatusStats.total) * circumference;
                        const strokeOffset = circumference - (currentAcc / 100) * circumference;
                        currentAcc += percent;
                        return (
                          <circle
                            key={idx}
                            cx="80"
                            cy="80"
                            r={radius}
                            fill="transparent"
                            stroke={slice.color}
                            strokeWidth="16"
                            strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
                            strokeDashoffset={strokeOffset}
                            transform="rotate(-90 80 80)"
                            style={{ transition: 'stroke-dashoffset 0.5s ease', cursor: 'pointer' }}
                          />
                        );
                      });
                    })()}
                    <text x="80" y="75" textAnchor="middle" style={{ fontSize: '18px', fontWeight: 800, fill: 'var(--gray-900)' }}>
                      {quotesStatusStats.total}
                    </text>
                    <text x="80" y="93" textAnchor="middle" style={{ fontSize: '10px', fontWeight: 600, fill: 'var(--gray-400)', textTransform: 'uppercase' }}>
                      Devis
                    </text>
                  </svg>
                </div>
                
                <div className="donut-legend">
                  {[
                    { label: 'Validés', value: quotesStatusStats.valide, color: 'var(--accent-500)' },
                    { label: 'En attente', value: quotesStatusStats.attente, color: 'var(--warning-500)' },
                    { label: 'Refusés', value: quotesStatusStats.refuse, color: 'var(--danger-500)' },
                  ].map((slice, idx) => {
                    const percent = quotesStatusStats.total > 0 ? ((slice.value / quotesStatusStats.total) * 100).toFixed(0) : 0;
                    return (
                      <div key={idx} className="legend-item">
                        <div className="legend-color-dot" style={{ background: slice.color }}></div>
                        <span>{slice.label}</span>
                        <span className="legend-percent">({percent}%)</span>
                        <span className="legend-value">{slice.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* PEC Donut Chart */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
        >
          <div className="card-header">
            <h3 style={{ margin: 0 }}>
              <FaIcon name="chart-pie" className="fa-inline-icon" /> Statut des prises en charge (PEC)
            </h3>
          </div>
          <div className="card-body" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            {pecStatusStats.total === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--gray-400)' }}>
                Aucune prise en charge disponible
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '16px', alignItems: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                  <svg width="150" height="150" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="16" />
                    {(() => {
                      const slices = [
                        { label: 'Validées', value: pecStatusStats.valide, color: 'var(--accent-500)' },
                        { label: 'En attente', value: pecStatusStats.attente, color: 'var(--warning-500)' },
                        { label: 'Refusées', value: pecStatusStats.refuse, color: 'var(--danger-500)' },
                      ].filter(s => s.value > 0);
                      
                      let currentAcc = 0;
                      return slices.map((slice, idx) => {
                        const percent = (slice.value / pecStatusStats.total) * 100;
                        const strokeLength = (slice.value / pecStatusStats.total) * circumference;
                        const strokeOffset = circumference - (currentAcc / 100) * circumference;
                        currentAcc += percent;
                        return (
                          <circle
                            key={idx}
                            cx="80"
                            cy="80"
                            r={radius}
                            fill="transparent"
                            stroke={slice.color}
                            strokeWidth="16"
                            strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
                            strokeDashoffset={strokeOffset}
                            transform="rotate(-90 80 80)"
                            style={{ transition: 'stroke-dashoffset 0.5s ease', cursor: 'pointer' }}
                          />
                        );
                      });
                    })()}
                    <text x="80" y="75" textAnchor="middle" style={{ fontSize: '18px', fontWeight: 800, fill: 'var(--gray-900)' }}>
                      {pecStatusStats.total}
                    </text>
                    <text x="80" y="93" textAnchor="middle" style={{ fontSize: '10px', fontWeight: 600, fill: 'var(--gray-400)', textTransform: 'uppercase' }}>
                      PEC
                    </text>
                  </svg>
                </div>
                
                <div className="donut-legend">
                  {[
                    { label: 'Validées', value: pecStatusStats.valide, color: 'var(--accent-500)' },
                    { label: 'En attente', value: pecStatusStats.attente, color: 'var(--warning-500)' },
                    { label: 'Refusées', value: pecStatusStats.refuse, color: 'var(--danger-500)' },
                  ].map((slice, idx) => {
                    const percent = pecStatusStats.total > 0 ? ((slice.value / pecStatusStats.total) * 100).toFixed(0) : 0;
                    return (
                      <div key={idx} className="legend-item">
                        <div className="legend-color-dot" style={{ background: slice.color }}></div>
                        <span>{slice.label}</span>
                        <span className="legend-percent">({percent}%)</span>
                        <span className="legend-value">{slice.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}
