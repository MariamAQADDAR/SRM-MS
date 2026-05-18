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

function monthKey(isoDate) {
  if (!isoDate) return '';
  return isoDate.substring(0, 7);
}

export default function DashboardPage({ setPageTitle, addToast, user }) {
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

  const enAttente = reimb.filter((x) => x.statut === 'En attente').length;
  const totalMontant = reimb.reduce((s, x) => s + (Number(x.montantValide) || 0), 0);

  const last6 = (() => {
    const now = new Date();
    const keys = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const sums = Object.fromEntries(keys.map((k) => [k, 0]));
    reimb.forEach((row) => {
      const k = monthKey(row.date);
      if (sums[k] != null) sums[k] += Number(row.montantDemande) || 0;
    });
    return keys.map((k) => {
      const [, m] = k.split('-');
      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      return { month: monthNames[parseInt(m, 10) - 1] || m, value: sums[k] };
    });
  })();

  const max = Math.max(1, ...last6.map((d) => d.value));
  const colors = ['#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'];

  const totalAgents = summary ? summary.agentsCount : '—';
  const totalOrdonnances = summary ? summary.ordonnancesCount : '—';

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
    return <div className="card"><div className="card-body">Chargement…</div></div>;
  }

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FaIcon name="users" />
          </div>
          <div className="stat-info">
            <h4>Bénéficiaires</h4>
            <div className="stat-value">{adherent ? '—' : totalAgents}</div>
            {!adherent && <span className="stat-change up">Agents (réf.)</span>}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <FaIcon name="clipboard-list" />
          </div>
          <div className="stat-info">
            <h4>Ordonnances</h4>
            <div className="stat-value">{adherent ? '—' : totalOrdonnances}</div>
            {!adherent && <span className="stat-change up">Total base</span>}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <FaIcon name="money-bill-wave" />
          </div>
          <div className="stat-info">
            <h4>Montants validés (liste)</h4>
            <div className="stat-value">
              {totalMontant.toLocaleString('fr-FR')} <small style={{ fontSize: '14px' }}>DH</small>
            </div>
            <span className="stat-change up">Vue {adherent ? 'adhérent' : 'globale'}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">
            <FaIcon name="hourglass-half" />
          </div>
          <div className="stat-info">
            <h4>En attente</h4>
            <div className="stat-value">{enAttente}</div>
            <span className="stat-change down">À traiter</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div className="card">
          <div className="card-header">
            <h3>
              <FaIcon name="chart-line" className="fa-inline-icon" /> Coûts mensuels (demandes, DH)
            </h3>
          </div>
          <div className="card-body">
            <div className="chart-container">
              {last6.map((d, i) => (
                <div key={d.month} className="chart-bar" style={{ height: `${(d.value / max) * 100}%`, background: colors[i % colors.length] }}>
                  <div className="chart-tooltip">{d.value.toLocaleString('fr-FR')} DH</div>
                  <div className="chart-label">{d.month}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>
              <FaIcon name="chart-pie" className="fa-inline-icon" /> Synthèse
            </h3>
          </div>
          <div className="card-body">
            {summary && (
              <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '12px' }}>
                Devis en attente : <strong>{summary.devisEnAttente}</strong>
                <br />
                Remb. en attente (agrégat) : <strong>{summary.remboursementsEnAttente}</strong>
              </p>
            )}
            <p style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
              Dernières lignes : remboursements visibles selon votre rôle.
            </p>
          </div>
        </div>
      </div>

      <TablePageShell
        title="Dernières activités"
        icon="clock-rotate-left"
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
            exportFilename="activites"
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
