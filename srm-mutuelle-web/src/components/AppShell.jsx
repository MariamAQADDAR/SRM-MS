import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import Toast from './Toast';
import DashboardPage from '../pages/DashboardPage';
import BeneficiairesPage from '../pages/BeneficiairesPage';
import OrdonnancesPage from '../pages/OrdonnancesPage';
import DevisPage from '../pages/DevisPage';
import RemboursementsPage from '../pages/RemboursementsPage';
import PrisesEnChargePage from '../pages/PrisesEnChargePage';
import MaladiesPage from '../pages/MaladiesPage';
import EtablissementsPage from '../pages/EtablissementsPage';
import EntitesPage from '../pages/EntitesPage';
import UtilisateursPage from '../pages/UtilisateursPage';
import ChatbotWidget from './ChatbotWidget';
import FaIcon from './FaIcon';

export default function AppShell() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');

  const pageTitles = {
    'dashboard': { title: 'Tableau de bord', breadcrumb: 'Accueil' },
    'beneficiaires': { title: 'Bénéficiaires', breadcrumb: 'Gestion des bénéficiaires' },
    'ordonnances': { title: 'Ordonnances', breadcrumb: 'Gestion des ordonnances' },
    'devis': { title: 'Devis', breadcrumb: 'Gestion des devis' },
    'remboursements': { title: 'Remboursements', breadcrumb: 'Gestion des remboursements' },
    'prises-en-charge': { title: 'Prises en charge', breadcrumb: 'Gestion des prises en charge' },
    'maladies': { title: 'Maladies spéciales', breadcrumb: 'Gestion des maladies spéciales' },
    'etablissements': { title: 'Établissements médicaux', breadcrumb: 'Référentiel' },
    'entites': { title: 'Entités organisationnelles', breadcrumb: 'Référentiel' },
    'utilisateurs': { title: 'Utilisateurs', breadcrumb: 'Administration' }
  };
  const pageTitle = pageTitles[currentPage] || { title: 'Page en construction', breadcrumb: 'Inconnu' };

  const [toasts, setToasts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const userData = sessionStorage.getItem('mutuelle_user');
    if (!userData) { navigate('/'); return; }
    setUser(JSON.parse(userData));
  }, [navigate]);

  const setPageTitle = (title, breadcrumb) => {}; // No-op to prevent infinite render loops from child components

  const addToast = (type, message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  if (!user) return null;

  const isAdmin = user.role === 'Administrateur' || user.role === 'admin';

  const pageProps = { setPageTitle, addToast, user };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':       return <DashboardPage {...pageProps} />;
      case 'beneficiaires':   return <BeneficiairesPage {...pageProps} />;
      case 'ordonnances':     return <OrdonnancesPage {...pageProps} />;
      case 'devis':           return <DevisPage {...pageProps} />;
      case 'remboursements':  return <RemboursementsPage {...pageProps} />;
      case 'prises-en-charge':return <PrisesEnChargePage {...pageProps} />;
      case 'maladies':        return <MaladiesPage {...pageProps} />;
      case 'etablissements':  return <EtablissementsPage {...pageProps} />;
      case 'entites':         return <EntitesPage {...pageProps} />;
      case 'utilisateurs':    return isAdmin ? <UtilisateursPage {...pageProps} /> : null;
      default:
        return (
          <div className="empty-state">
            <div className="empty-icon"><FaIcon name="triangle-exclamation" /></div>
            <h4>Page en construction</h4>
          </div>
        );
    }
  };

  return (
    <>
      <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
        <div className="topbar">
          <div className="topbar-left">
            <div>
              <div className="page-title">{pageTitle.title}</div>
              <div className="breadcrumb">
                <span>Accueil</span>
                <span className="separator">›</span>
                <span className="current">{pageTitle.breadcrumb}</span>
              </div>
            </div>
          </div>
          <div className="topbar-right">
            <div className="topbar-search">
              <span className="search-icon"><FaIcon name="magnifying-glass" /></span>
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="topbar-btn" onClick={() => addToast('info', 'Aucune nouvelle notification.')}>
              <FaIcon name="bell" /><span className="notif-dot"></span>
            </div>
            <div className="topbar-btn" title={`Connecté: ${user.role}`}>
              <FaIcon name="user" />
            </div>
          </div>
        </div>
        <div className="page-content">
          {renderPage()}
        </div>
      </Layout>
      <ChatbotWidget />
      <Toast toasts={toasts} removeToast={removeToast} />
    </>
  );
}
