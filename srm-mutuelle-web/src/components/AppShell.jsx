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

export default function AppShell() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pageTitle, setPageTitleState] = useState({ title: 'Tableau de bord', breadcrumb: 'Accueil' });
  const [toasts, setToasts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const userData = sessionStorage.getItem('mutuelle_user');
    if (!userData) { navigate('/'); return; }
    setUser(JSON.parse(userData));
  }, [navigate]);

  const setPageTitle = (title, breadcrumb) => setPageTitleState({ title, breadcrumb });

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
            <div className="empty-icon">🚧</div>
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
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="topbar-btn" onClick={() => addToast('info', 'Aucune nouvelle notification.')}>
              🔔<span className="notif-dot"></span>
            </div>
            <div className="topbar-btn" title={`Connecté: ${user.role}`}>
              👤
            </div>
          </div>
        </div>
        <div className="page-content">
          {renderPage()}
        </div>
      </Layout>
      <Toast toasts={toasts} removeToast={removeToast} />
    </>
  );
}
