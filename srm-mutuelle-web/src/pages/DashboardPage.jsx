import React, { useEffect, useMemo, useState } from 'react';
import FaIcon from '../components/FaIcon';
import TablePageShell from '../components/TablePageShell';
import ListPageToolbar from '../components/ListPageToolbar';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { isAdherentRole } from '../authUtils';
import { matchesSearch } from '../utils/filterSearch';

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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rRes = await apiFetch('/api/reimbursements');
        const rList = await parseJsonOrThrow(rRes);
        if (cancelled) return;
        setReimb(rList);
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

  // Max value for Double Bar Chart
  const maxVal = Math.max(
    1,
    ...monthlyStats.map(d => Math.max(Number(d.montantDemande) || 0, Number(d.montantValide) || 0))
  );

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

        /* SVG Double-Bar Chart Styling */
        .double-chart-container {
          height: 220px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          padding-top: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--gray-200);
        }
        .double-chart-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-grow: 1;
          height: 100%;
          justify-content: flex-end;
          position: relative;
        }
        .double-bar-pair {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 100%;
          justify-content: center;
          width: 100%;
        }
        .double-bar {
          width: 18px;
          border-radius: 4px 4px 0 0;
          position: relative;
          transition: height 0.5s ease;
          cursor: pointer;
        }
        .double-bar.requested {
          background: #818cf8;
        }
        .double-bar.validated {
          background: #34d399;
        }
        .double-bar:hover .chart-tooltip {
          opacity: 1;
          visibility: visible;
          transform: translate(-50%, -8px);
        }
        .double-chart-label {
          margin-top: 8px;
          font-size: 11px;
          font-weight: 600;
          color: var(--gray-500);
        }
      `}</style>

      {/* KPI Cards Grid */}
      <div className="stats-grid">
        {/* 1. Agents */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('agents')}>
          <div className="stat-icon blue">
            <FaIcon name="users" />
          </div>
          <div className="stat-info">
            <h4>Agents</h4>
            <div className="stat-value">{totalAgentsCount}</div>
            <span className="stat-change up" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>Gérer les dossiers</span>
          </div>
        </div>

        {/* 2. Ordonnances */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('ordonnances')}>
          <div className="stat-icon cyan">
            <FaIcon name="clipboard-list" />
          </div>
          <div className="stat-info">
            <h4>Ordonnances</h4>
            <div className="stat-value">{totalOrdonnances}</div>
            <span className="stat-change up" style={{ color: 'var(--info-600)', fontWeight: 600 }}>Total enregistrées</span>
          </div>
        </div>

        {/* 3. Remboursements en attente */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('remboursements')}>
          <div className="stat-icon orange">
            <FaIcon name="hourglass-half" />
          </div>
          <div className="stat-info">
            <h4>Remb. en attente</h4>
            <div className="stat-value">{remboursementsEnAttente}</div>
            <span className="stat-change down" style={{ color: 'var(--warning-600)', fontWeight: 600 }}>À instruire</span>
          </div>
        </div>

        {/* 4. Devis en attente */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('devis')}>
          <div className="stat-icon purple">
            <FaIcon name="file-invoice-dollar" />
          </div>
          <div className="stat-info">
            <h4>Devis en attente</h4>
            <div className="stat-value">{devisEnAttente}</div>
            <span className="stat-change down" style={{ color: 'var(--primary-700)', fontWeight: 600 }}>À valider</span>
          </div>
        </div>

        {/* 5. PEC en attente */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('prises-en-charge')}>
          <div className="stat-icon red">
            <FaIcon name="hospital" />
          </div>
          <div className="stat-info">
            <h4>PEC en attente</h4>
            <div className="stat-value">{pendingCareEpisodesCount}</div>
            <span className="stat-change down" style={{ color: 'var(--danger-600)', fontWeight: 600 }}>PEC hospitalières</span>
          </div>
        </div>

        {/* 6. Cartes en attente */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('cartes-mutuelles')}>
          <div className="stat-icon orange">
            <FaIcon name="address-card" />
          </div>
          <div className="stat-info">
            <h4>Cartes en attente</h4>
            <div className="stat-value">{pendingMutualCardRequestsCount}</div>
            <span className="stat-change down" style={{ color: 'var(--warning-600)', fontWeight: 600 }}>Demandes cartes</span>
          </div>
        </div>

        {/* 7. Médicaments */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('medicaments')}>
          <div className="stat-icon green">
            <FaIcon name="pills" />
          </div>
          <div className="stat-info">
            <h4>Médicaments</h4>
            <div className="stat-value">{medicinesCount}</div>
            <span className="stat-change up" style={{ color: 'var(--accent-600)', fontWeight: 600 }}>Référentiel</span>
          </div>
        </div>

        {/* 8. Établissements */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('etablissements')}>
          <div className="stat-icon cyan">
            <FaIcon name="house-chimney-medical" />
          </div>
          <div className="stat-info">
            <h4>Établissements</h4>
            <div className="stat-value">{facilitiesCount}</div>
            <span className="stat-change up" style={{ color: 'var(--info-600)', fontWeight: 600 }}>Cliniques / Hôpitaux</span>
          </div>
        </div>

        {/* 9. Entités */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('entites')}>
          <div className="stat-icon purple">
            <FaIcon name="sitemap" />
          </div>
          <div className="stat-info">
            <h4>Entités</h4>
            <div className="stat-value">{entitiesCount}</div>
            <span className="stat-change up" style={{ color: 'var(--primary-700)', fontWeight: 600 }}>Organisation</span>
          </div>
        </div>

        {/* 10. Maladies spéciales */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('maladies')}>
          <div className="stat-icon red">
            <FaIcon name="heart-pulse" />
          </div>
          <div className="stat-info">
            <h4>Maladies spéciales</h4>
            <div className="stat-value">{diseasesCount}</div>
            <span className="stat-change up" style={{ color: 'var(--danger-600)', fontWeight: 600 }}>Déclarations</span>
          </div>
        </div>

        {/* 11. Médecins conventionnés */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('medecins')}>
          <div className="stat-icon blue">
            <FaIcon name="user-doctor" />
          </div>
          <div className="stat-info">
            <h4>Médecins conv.</h4>
            <div className="stat-value">{doctorsCount}</div>
            <span className="stat-change up" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>Référentiel médical</span>
          </div>
        </div>
      </div>

      {/* Charts (Monthly costs & Donut stats) */}
      <div className="charts-timeline-row">
        {/* Monthly Expenses Chart */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0 }}>
              <FaIcon name="chart-line" className="fa-inline-icon" /> Coûts mensuels (demandes vs validations, DH)
            </h3>
          </div>
          <div className="card-body" style={{ minHeight: '320px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            {monthlyStats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--gray-400)' }}>
                Aucune donnée mensuelle disponible
              </div>
            ) : (
              <>
                <div className="double-chart-container">
                  {monthlyStats.map((d, i) => {
                    const heightDemande = ((Number(d.montantDemande) || 0) / maxVal) * 100;
                    const heightValide = ((Number(d.montantValide) || 0) / maxVal) * 100;
                    return (
                      <div key={i} className="double-chart-column">
                        <div className="double-bar-pair">
                          <div 
                            className="double-bar requested" 
                            style={{ height: `${heightDemande}%` }}
                          >
                            <div className="chart-tooltip">
                              <strong>Demandé :</strong><br/>
                              {(Number(d.montantDemande) || 0).toLocaleString('fr-FR')} DH
                            </div>
                          </div>
                          <div 
                            className="double-bar validated" 
                            style={{ height: `${heightValide}%` }}
                          >
                            <div className="chart-tooltip" style={{ background: 'var(--accent-600)' }}>
                              <strong>Validé :</strong><br/>
                              {(Number(d.montantValide) || 0).toLocaleString('fr-FR')} DH
                            </div>
                          </div>
                        </div>
                        <div className="double-chart-label">{d.month}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--gray-600)' }}>
                    <div style={{ width: '12px', height: '12px', background: '#818cf8', borderRadius: '3px' }}></div>
                    <span>Montant demandé (DH)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--gray-600)' }}>
                    <div style={{ width: '12px', height: '12px', background: '#34d399', borderRadius: '3px' }}></div>
                    <span>Montant validé (DH)</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Circular Donut Chart */}
        <div className="card">
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
        </div>
      </div>

      {/* Activities & Care types */}
      <div className="charts-timeline-row">
        {/* Unified Activities Log */}
        <div className="card">
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
        </div>

        {/* Care types breakdown */}
        <div className="card">
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
        </div>
      </div>

      {/* Bottom Table view (Reimbursement table search & export) */}
      <TablePageShell
        title="Recherche générale des remboursements"
        icon="magnifying-glass"
        toolbar={
          <ListPageToolbar
            searchValue={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            searchPlaceholder="Rechercher (n°, bénéficiaire, statut, date…)"
            exportColumns={[
              { key: 'numero', label: 'N°' },
              { key: 'type', label: 'Type' },
              { key: 'beneficiaire', label: 'Bénéficiaire' },
              { key: 'montant', label: 'Montant' },
              { key: 'statut', label: 'Statut' },
              { key: 'date', label: 'Date', value: (r) => formatDate(r.date) },
            ]}
            exportRows={activityRows}
            exportFilename="remboursements"
          />
        }
      >
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Type</th>
                <th>Bénéficiaire</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {activityRows.slice(0, searchQuery.trim() ? 20 : 5).map((r) => (
                <tr key={r.id}>
                  <td>{r.numero}</td>
                  <td>{r.type}</td>
                  <td>{r.beneficiaire}</td>
                  <td>{r.montant}</td>
                  <td>{statusBadge(r.statut)}</td>
                  <td>{formatDate(r.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TablePageShell>
    </>
  );
}
