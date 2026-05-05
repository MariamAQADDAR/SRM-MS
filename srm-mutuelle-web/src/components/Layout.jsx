import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SimData from '../data';
import FaIcon from './FaIcon';

export default function Layout({ children, currentPage, onNavigate }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = sessionStorage.getItem('mutuelle_user');
    if (!userData) { navigate('/'); return; }
    setUser(JSON.parse(userData));
  }, [navigate]);

  if (!user) return null;

  const isAdmin = user.role === 'Administrateur' || user.role === 'admin';
  const enAttente = SimData.remboursements.filter(r => r.statut === 'En attente').length;

  const navSections = [
    {
      section: 'Principal',
      items: [
        { id: 'dashboard', fa: 'chart-line', label: 'Tableau de bord' },
      ]
    },
    {
      section: 'Gestion',
      items: [
        { id: 'beneficiaires', fa: 'users', label: 'Bénéficiaires', badge: SimData.agents.length },
        { id: 'ordonnances', fa: 'clipboard-list', label: 'Ordonnances', badge: SimData.ordonnances.length },
        { id: 'devis', fa: 'file-invoice', label: 'Devis', badge: SimData.devis.length },
        { id: 'remboursements', fa: 'money-bill-wave', label: 'Remboursements', badge: enAttente },
        { id: 'prises-en-charge', fa: 'hospital', label: 'Prises en charge' },
        { id: 'maladies', fa: 'stethoscope', label: 'Maladies spéciales' },
      ]
    },
    {
      section: 'Référentiel',
      items: [
        { id: 'etablissements', fa: 'building', label: 'Établissements' },
        { id: 'entites', fa: 'landmark', label: 'Entités org.' },
      ]
    },
  ];

  if (isAdmin) {
    navSections.push({
      section: 'Administration',
      items: [
        { id: 'utilisateurs', fa: 'user-shield', label: 'Utilisateurs', badge: SimData.utilisateurs.length },
      ]
    });
  }

  const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="app-layout">
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="s-brand">
            <img
              src="/srm-brand-logo.png"
              alt="SRM-MS — Société Régionale Multiservices Marrakech-Safi"
              className="s-brand-img"
            />
          </div>
        </div>
        <div className="sidebar-nav" id="sidebarNav">
          {navSections.map(sec => (
            <div className="nav-section" key={sec.section}>
              <div className="nav-section-title">{sec.section}</div>
              {sec.items.map(item => (
                <div
                  key={item.id}
                  className={`nav-item${currentPage === item.id ? ' active' : ''}`}
                  onClick={() => onNavigate(item.id)}
                >
                  <span className="nav-icon"><FaIcon name={item.fa} /></span>
                  <span>{item.label}</span>
                  {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-user" id="sidebarUser">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-role">{user.role}</div>
            </div>
            <span
              className="logout-icon"
              id="logoutBtn"
              title="Déconnexion"
              onClick={() => { sessionStorage.removeItem('mutuelle_user'); navigate('/'); }}
            ><FaIcon name="right-from-bracket" title="Déconnexion" /></span>
          </div>
        </div>
      </div>

      <div className="main-content">
        {children}
      </div>
    </div>
  );
}
