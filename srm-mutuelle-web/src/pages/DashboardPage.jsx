import React, { useState } from 'react';
import SimData from '../data';
import FaIcon from '../components/FaIcon';

function statusBadge(statut) {
  const map = {
    'Traité': 'badge-success', 'Validé': 'badge-success', 'Approuvé': 'badge-success', 'Clôturé': 'badge-success',
    'En cours': 'badge-primary', 'En attente': 'badge-warning',
    'Rejeté': 'badge-danger', 'Inactif': 'badge-danger',
    'Actif': 'badge-success',
  };
  return <span className={`badge ${map[statut] || 'badge-info'}`}>{statut}</span>;
}

function formatDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export default function DashboardPage({ setPageTitle, addToast }) {
  setPageTitle('Tableau de bord', 'Accueil');
  const totalAgents = SimData.agents.length;
  const totalOrdonnances = SimData.ordonnances.length;
  const enAttente = SimData.remboursements.filter(r => r.statut === 'En attente').length;
  const totalMontant = SimData.remboursements.reduce((s, r) => s + r.montantValide, 0);
  const data = SimData.chartMonthlyCosts;
  const max = Math.max(...data.map(d => d.value));
  const colors = ['#818cf8','#6366f1','#4f46e5','#4338ca','#3730a3','#312e81','#818cf8','#6366f1','#4f46e5','#4338ca','#3730a3','#312e81'];

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><FaIcon name="users" /></div>
          <div className="stat-info">
            <h4>Bénéficiaires</h4>
            <div className="stat-value">{totalAgents + SimData.proches.length}</div>
            <span className="stat-change up">↑ {totalAgents} agents</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><FaIcon name="clipboard-list" /></div>
          <div className="stat-info">
            <h4>Ordonnances</h4>
            <div className="stat-value">{totalOrdonnances}</div>
            <span className="stat-change up">↑ Ce mois</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><FaIcon name="money-bill-wave" /></div>
          <div className="stat-info">
            <h4>Remboursements traités</h4>
            <div className="stat-value">{totalMontant.toLocaleString('fr-FR')} <small style={{fontSize:'14px'}}>DH</small></div>
            <span className="stat-change up">↑ 12%</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><FaIcon name="hourglass-half" /></div>
          <div className="stat-info">
            <h4>En attente</h4>
            <div className="stat-value">{enAttente}</div>
            <span className="stat-change down">↓ À traiter</span>
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'20px',marginBottom:'20px'}}>
        <div className="card">
          <div className="card-header"><h3><FaIcon name="chart-line" className="fa-inline-icon" /> Coûts mensuels (DH)</h3></div>
          <div className="card-body">
            <div className="chart-container">
              {data.map((d, i) => (
                <div key={i} className="chart-bar" style={{height:`${(d.value/max)*100}%`,background:colors[i]}}>
                  <div className="chart-tooltip">{d.value.toLocaleString('fr-FR')} DH</div>
                  <div className="chart-label">{d.month}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3><FaIcon name="chart-pie" className="fa-inline-icon" /> Répartition par type</h3></div>
          <div className="card-body">
            {[
              {label:'Médicaments', pct:42, color:'var(--primary-500)'},
              {label:'Analyses', pct:25, color:'var(--accent-500)'},
              {label:'Radiologie', pct:18, color:'var(--warning-500)'},
              {label:'Optique', pct:10, color:'var(--info-500)'},
              {label:'Dentaire', pct:5, color:'var(--danger-500)'},
            ].map(({label, pct, color}) => (
              <div key={label} style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'16px'}}>
                <div style={{width:'12px',height:'12px',borderRadius:'3px',background:color,flexShrink:0}}></div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                    <span style={{fontSize:'13px',fontWeight:'600',color:'var(--gray-700)'}}>{label}</span>
                    <span style={{fontSize:'13px',fontWeight:'700',color:'var(--gray-900)'}}>{pct}%</span>
                  </div>
                  <div style={{height:'6px',background:'var(--gray-100)',borderRadius:'3px',overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:'3px'}}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3><FaIcon name="clock-rotate-left" className="fa-inline-icon" /> Dernières activités</h3>
          <button className="btn btn-outline btn-sm">Voir tout</button>
        </div>
        <div className="card-body" style={{padding:0}}>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>N°</th><th>Type</th><th>Bénéficiaire</th><th>Montant</th><th>Statut</th><th>Date</th></tr></thead>
              <tbody>
                {SimData.remboursements.slice(0,5).map(r => (
                  <tr key={r.id}>
                    <td>{r.numero}</td>
                    <td>Remboursement</td>
                    <td>{r.beneficiaire}</td>
                    <td>{r.montantDemande.toLocaleString('fr-FR')} DH</td>
                    <td>{statusBadge(r.statut)}</td>
                    <td>{formatDate(r.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
