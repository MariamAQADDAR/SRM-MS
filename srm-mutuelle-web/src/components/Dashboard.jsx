import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SimData from '../data';
import FaIcon from './FaIcon';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = sessionStorage.getItem('mutuelle_user');
    if (!userData) {
      navigate('/');
    } else {
      setUser(JSON.parse(userData));
    }
  }, [navigate]);

  if (!user) return null;

  const totalAgents = SimData.agents.length;
  const totalOrdonnances = SimData.ordonnances.length;
  const totalRemboursements = SimData.remboursements.length;
  const enAttente = SimData.remboursements.filter(r => r.statut === 'En attente').length;
  const totalMontant = SimData.remboursements.reduce((s, r) => s + r.montantValide, 0);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="s-logo"><FaIcon name="hospital" /></div>
          <div className="s-info">
            <h2>SRM Mutuelle</h2>
            <span>Portail Web</span>
          </div>
        </div>
        <div className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Principal</div>
            <div className="nav-item active">
              <span className="nav-icon"><FaIcon name="chart-line" /></span>
              <span>Tableau de bord</span>
            </div>
          </div>
          <div className="nav-section">
            <div className="nav-section-title">Gestion</div>
            <div className="nav-item">
              <span className="nav-icon"><FaIcon name="users" /></span>
              <span>Bénéficiaires</span>
              <span className="nav-badge">{SimData.agents.length}</span>
            </div>
            <div className="nav-item">
              <span className="nav-icon"><FaIcon name="clipboard-list" /></span>
              <span>Ordonnances</span>
              <span className="nav-badge">{SimData.ordonnances.length}</span>
            </div>
            <div className="nav-item">
              <span className="nav-icon"><FaIcon name="money-bill-wave" /></span>
              <span>Remboursements</span>
              <span className="nav-badge">{enAttente}</span>
            </div>
            <div className="nav-item">
              <span className="nav-icon"><FaIcon name="hospital" /></span>
              <span>Prises en charge</span>
            </div>
          </div>
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={() => {
            sessionStorage.removeItem('mutuelle_user');
            navigate('/');
          }}>
            <div className="user-avatar">{user.name.substring(0, 2).toUpperCase()}</div>
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-role">{user.role}</div>
            </div>
            <span className="logout-icon" title="Déconnexion"><FaIcon name="right-from-bracket" /></span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="topbar">
          <div className="topbar-left">
            <h2 className="page-title">Tableau de bord</h2>
            <div className="breadcrumb">
              <span>Accueil</span><span className="separator">›</span><span className="current">Tableau de bord</span>
            </div>
          </div>
          <div className="topbar-right">
            <div className="topbar-search">
              <span className="search-icon"><FaIcon name="magnifying-glass" /></span>
              <input type="text" placeholder="Rechercher..." />
            </div>
            <div className="topbar-btn">
              <FaIcon name="bell" /><span className="notif-dot"></span>
            </div>
          </div>
        </div>

        <div className="page-content">
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

          <div className="card mt-3">
            <div className="card-header">
              <h3><FaIcon name="clock-rotate-left" className="fa-inline-icon" /> Dernières activités</h3>
              <button className="btn btn-outline btn-sm">Voir tout</button>
            </div>
            <div className="card-body" style={{padding:0}}>
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
                    {SimData.remboursements.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        <td>{r.numero}</td>
                        <td>Remboursement</td>
                        <td>{r.beneficiaire}</td>
                        <td>{r.montantDemande.toLocaleString('fr-FR')} DH</td>
                        <td>
                          <span className={`badge ${r.statut === 'Traité' ? 'badge-success' : r.statut === 'En attente' ? 'badge-warning' : 'badge-primary'}`}>
                            {r.statut}
                          </span>
                        </td>
                        <td>{r.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
