import React, { useEffect, useState } from 'react';
import FaIcon from './FaIcon';
import { isAdherentRole, isStaffWriterRole } from '../authUtils';

export default function Layout({ children, currentPage, onNavigate, user, navBadges }) {
  if (!user) return null;

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
    const adminSectionItems = [];
    if (staffWriter) {
      adminSectionItems.push({ id: 'utilisateurs', fa: 'user-shield', label: 'Utilisateurs', badge: b.users });
      adminSectionItems.push({ id: 'parametrage', fa: 'sliders', label: 'Paramétrage' });
    }
    if (adminSectionItems.length > 0) {
      navSections.push({
        section: 'Administration',
        items: adminSectionItems,
      });
    }
  }

  const getSectionForPage = (pageId) =>
    navSections.find((sec) => sec.items.some((item) => item.id === pageId))?.section || null;

  const [openSection, setOpenSection] = useState(getSectionForPage(currentPage) || navSections[0]?.section || null);

  useEffect(() => {
    const activeSection = getSectionForPage(currentPage);
    if (activeSection) {
      setOpenSection(activeSection);
    }
  }, [currentPage]);

  const toggleSection = (sectionName) => {
    setOpenSection((prev) => (prev === sectionName ? null : sectionName));
  };

  return (
    <div className="app-layout">
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="s-brand">
            <img
              src="/srm-company-logo.png"
              alt="SRM-MS — Société Régionale Multiservices Marrakech-Safi"
              className="s-brand-img"
            />
          </div>
        </div>
        <div className="sidebar-nav" id="sidebarNav">
          {navSections.map((sec) => (
            <div className="nav-section" key={sec.section}>
              <div
                className="nav-section-title nav-section-toggle"
                onClick={() => toggleSection(sec.section)}
                onKeyDown={(e) => e.key === 'Enter' && toggleSection(sec.section)}
                role="button"
                tabIndex={0}
              >
                <span>{sec.section}</span>
                <FaIcon name={openSection === sec.section ? 'chevron-down' : 'chevron-right'} />
              </div>
              {openSection === sec.section && sec.items.map((item) => (
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
      </div>

      <div className="main-content">{children}</div>
    </div>
  );
}
