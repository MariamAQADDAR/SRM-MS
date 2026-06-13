import { useEffect, useState } from 'react';
import FaIcon from './FaIcon';
import { isAdherentRole, isStaffWriterRole, isAdminRole, isConsultateurRole } from '../authUtils';

export default function Layout({ children, currentPage, onNavigate, user, navBadges, activeSpace }) {
  if (!user) return null;

  const isAdherent = isAdherentRole(user);
  const staffWriter = isStaffWriterRole(user);
  const isAdmin = isAdminRole(user);
  const isConsult = isConsultateurRole(user);
  const b = navBadges || {};

  const navSections = [];

  if (isAdherent || activeSpace === 'personal') {
    navSections.push({
      section: 'Mon espace',
      items: [
        { id: 'mes-devis', fa: 'file-invoice', label: 'Mes devis', badge: b['mes-devis'] },
        { id: 'mes-remboursements', fa: 'money-bill-wave', label: 'Mes remboursements', badge: b['mes-rembPending'] },
        { id: 'mes-cartes', fa: 'id-card', label: 'Mes cartes mutuelles' },
        { id: 'mes-prises-en-charge', fa: 'hospital', label: 'Mes prises en charge', badge: b['mes-pec'] },
        { id: 'mon-historique', fa: 'clock-rotate-left', label: 'Mon historique' },
      ],

    });
  } else if (activeSpace === 'staff' && !isAdherent) {
    navSections.push(
      {
        section: 'Principal',
        items: [
          { id: 'dashboard', fa: 'chart-line', label: 'Tableau de bord' },
        ],
      },
      {
        section: 'Gestion',
        items: [
          ...(isAdmin || staffWriter || isConsult ? [{ id: 'agents', fa: 'user-tie', label: 'Agents', badge: b.agents }] : []),
          { id: 'beneficiaires', fa: 'users', label: 'Bénéficiaires', badge: b.agents },
          { id: 'cartes-mutuelles', fa: 'id-card', label: 'Cartes mutuelles' },
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
          { id: 'medecins', fa: 'user-doctor', label: 'Médecins conv.', badge: b.medecins },
          { id: 'entites', fa: 'landmark', label: 'Entités org.', badge: b.entites },
          { id: 'medicaments', fa: 'pills', label: 'Médicaments', badge: b.medicaments },
        ],
      }
    );

    const adminSectionItems = [];
    if (staffWriter) {
      adminSectionItems.push({ id: 'utilisateurs', fa: 'user-shield', label: 'Utilisateurs', badge: b.users });
      adminSectionItems.push({ id: 'parametrage', fa: 'sliders', label: 'Paramétrage' });
    }
    if (isAdmin) {
      adminSectionItems.push({ id: 'archives', fa: 'box-archive', label: 'Archives' });
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
          <div className="s-brand" onClick={() => onNavigate('portal')} style={{ cursor: 'pointer' }} title="Retour au portail">
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
