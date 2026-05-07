import React from 'react';
import { useNavigate } from 'react-router-dom';
import FaIcon from './FaIcon';
import { isAdminRole, isAdherentRole, isStaffWriterRole } from '../authUtils';

export default function Layout({ children, currentPage, onNavigate, user, navBadges }) {
  const navigate = useNavigate();

  if (!user) return null;

  const isAdmin = isAdminRole(user);
  const isAdherent = isAdherentRole(user);
  const staffWriter = isStaffWriterRole(user);
  const b = navBadges || {};

  let navSections;
  if (isAdherent) {
    navSections = [
      {
        section: 'Principal',
        items: [
          { id: 'dashboard', fa: 'chart-line', label: 'Tableau de bord' },
          { id: 'notifications', fa: 'bell', label: 'Notifications' },
          { id: 'profil', fa: 'id-card', label: 'Mon profil' },
        ],
      },
      {
        section: 'Espace adhérent',
        items: [
          { id: 'devis', fa: 'file-invoice', label: 'Devis', badge: b.devis },
          { id: 'remboursements', fa: 'money-bill-wave', label: 'Remboursements', badge: b.rembPending },
          { id: 'maladies', fa: 'stethoscope', label: 'Maladies & médicaments', badge: b.maladies },
        ],
      },
    ];
  } else {
    navSections = [
      {
        section: 'Principal',
        items: [
          { id: 'dashboard', fa: 'chart-line', label: 'Tableau de bord' },
          { id: 'notifications', fa: 'bell', label: 'Notifications' },
          { id: 'profil', fa: 'id-card', label: 'Mon profil' },
        ],
      },
      {
        section: 'Gestion',
        items: [
          { id: 'beneficiaires', fa: 'users', label: 'Bénéficiaires', badge: b.agents },
          { id: 'ordonnances', fa: 'clipboard-list', label: 'Ordonnances', badge: b.ordonnances },
          { id: 'devis', fa: 'file-invoice', label: 'Devis', badge: b.devis },
          { id: 'remboursements', fa: 'money-bill-wave', label: 'Remboursements', badge: b.rembPending },
          { id: 'prises-en-charge', fa: 'hospital', label: 'Prises en charge', badge: b.pec },
          { id: 'maladies', fa: 'stethoscope', label: 'Maladies spéciales', badge: b.maladies },
        ],
      },
      {
        section: 'Référentiel',
        items: [
          { id: 'etablissements', fa: 'building', label: 'Établissements', badge: b.facilities },
          { id: 'entites', fa: 'landmark', label: 'Entités org.', badge: b.entites },
        ],
      },
    ];
    if (staffWriter) {
      navSections.splice(2, 0, {
        section: 'Communication',
        items: [{ id: 'notif-broadcast', fa: 'bullhorn', label: 'Centre de publication' }],
      });
    }
    if (isAdmin) {
      navSections.push({
        section: 'Administration',
        items: [
          { id: 'utilisateurs', fa: 'user-shield', label: 'Utilisateurs', badge: b.users },
          { id: 'parametrage', fa: 'sliders', label: 'Paramétrage' },
        ],
      });
    }
  }

  const initials = (user.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

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
          {navSections.map((sec) => (
            <div className="nav-section" key={sec.section}>
              <div className="nav-section-title">{sec.section}</div>
              {sec.items.map((item) => (
                <div
                  key={item.id}
                  className={`nav-item${currentPage === item.id ? ' active' : ''}`}
                  onClick={() => onNavigate(item.id)}
                  onKeyDown={(e) => e.key === 'Enter' && onNavigate(item.id)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="nav-icon">
                    <FaIcon name={item.fa} />
                  </span>
                  <span>{item.label}</span>
                  {item.badge != null && item.badge > 0 ? <span className="nav-badge">{item.badge}</span> : null}
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
              onClick={() => {
                sessionStorage.removeItem('mutuelle_user');
                navigate('/');
              }}
            >
              <FaIcon name="right-from-bracket" title="Déconnexion" />
            </span>
          </div>
        </div>
      </div>

      <div className="main-content">{children}</div>
    </div>
  );
}
