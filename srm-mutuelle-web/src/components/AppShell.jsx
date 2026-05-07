import React, { useCallback, useEffect, useState } from 'react';
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
import NotificationsPage from '../pages/NotificationsPage';
import BroadcastCenterPage from '../pages/BroadcastCenterPage';
import ProfilPage from '../pages/ProfilPage';
import ParametragePage from '../pages/ParametragePage';
import ChatbotWidget from './ChatbotWidget';
import FaIcon from './FaIcon';
import { apiFetch, apiMe, parseJsonOrThrow } from '../api/client';
import { isAdminRole, isAdherentRole, isStaffWriterRole } from '../authUtils';

const ADHERENT_PAGES = new Set(['dashboard', 'devis', 'remboursements', 'maladies', 'notifications', 'profil']);

export default function AppShell() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [navBadges, setNavBadges] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);

  const pageTitles = {
    dashboard: { title: 'Tableau de bord', breadcrumb: 'Accueil' },
    beneficiaires: { title: 'Bénéficiaires', breadcrumb: 'Gestion des bénéficiaires' },
    ordonnances: { title: 'Ordonnances', breadcrumb: 'Gestion des ordonnances' },
    devis: { title: 'Devis', breadcrumb: 'Gestion des devis' },
    remboursements: { title: 'Remboursements', breadcrumb: 'Gestion des remboursements' },
    'prises-en-charge': { title: 'Prises en charge', breadcrumb: 'Gestion des prises en charge' },
    maladies: { title: 'Maladies spéciales', breadcrumb: 'Gestion des maladies spéciales' },
    etablissements: { title: 'Établissements médicaux', breadcrumb: 'Référentiel' },
    entites: { title: 'Entités organisationnelles', breadcrumb: 'Référentiel' },
    utilisateurs: { title: 'Utilisateurs', breadcrumb: 'Administration' },
    notifications: { title: 'Notifications', breadcrumb: 'Messages' },
    'notif-broadcast': { title: 'Centre de publication', breadcrumb: 'Notifications' },
    profil: { title: 'Mon profil', breadcrumb: 'Compte' },
    parametrage: { title: 'Paramétrage', breadcrumb: 'Administration' },
  };
  const pageTitle = pageTitles[currentPage] || { title: 'Page en construction', breadcrumb: 'Inconnu' };

  const [toasts, setToasts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadUnread = useCallback(async () => {
    try {
      const res = await apiFetch('/api/notifications/unread-count');
      const data = await parseJsonOrThrow(res);
      setUnreadCount(Number(data.count) || 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  const loadNavBadges = useCallback(async (u) => {
    if (!u) return;
    try {
      if (isAdherentRole(u)) {
        const [qRes, rRes, mRes] = await Promise.all([
          apiFetch('/api/quotes'),
          apiFetch('/api/reimbursements'),
          apiFetch('/api/special-diseases'),
        ]);
        const quotes = await parseJsonOrThrow(qRes);
        const remb = await parseJsonOrThrow(rRes);
        const mal = await parseJsonOrThrow(mRes);
        setNavBadges({
          devis: quotes.length,
          rembPending: remb.filter((x) => x.statut === 'En attente').length,
          maladies: mal.length,
        });
      } else {
        const reqs = [
          apiFetch('/api/agents'),
          apiFetch('/api/ordonnances'),
          apiFetch('/api/quotes'),
          apiFetch('/api/reimbursements'),
          apiFetch('/api/care-episodes'),
          apiFetch('/api/special-diseases'),
          apiFetch('/api/medical-facilities'),
          apiFetch('/api/organizational-entities'),
        ];
        if (isAdminRole(u)) {
          reqs.push(apiFetch('/api/admin/users'));
        }
        const out = await Promise.all(reqs.map((p) => p.then((r) => parseJsonOrThrow(r))));
        let i = 0;
        const agents = out[i++];
        const ordonnances = out[i++];
        const quotes = out[i++];
        const remb = out[i++];
        const pec = out[i++];
        const mal = out[i++];
        const fac = out[i++];
        const ent = out[i++];
        const users = isAdminRole(u) ? out[i++] : [];
        setNavBadges({
          agents: agents.length,
          ordonnances: ordonnances.length,
          devis: quotes.length,
          rembPending: remb.filter((x) => x.statut === 'En attente').length,
          pec: pec.length,
          maladies: mal.length,
          facilities: fac.length,
          entites: ent.length,
          users: users.length,
        });
      }
    } catch {
      setNavBadges({});
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = sessionStorage.getItem('mutuelle_user');
      if (!raw) {
        navigate('/');
        return;
      }
      let u = JSON.parse(raw);
      if (!u.token) {
        sessionStorage.removeItem('mutuelle_user');
        navigate('/');
        return;
      }
      try {
        const me = await apiMe();
        u = {
          ...u,
          id: me.id ?? u.id,
          email: me.email,
          name: me.fullName,
          role: me.roleLabel || me.role,
          roleCode: me.role,
          agentId: me.agentId ?? null,
        };
        sessionStorage.setItem('mutuelle_user', JSON.stringify(u));
      } catch (e) {
        if (e.status === 401) {
          sessionStorage.removeItem('mutuelle_user');
          navigate('/');
          return;
        }
      }
      if (!cancelled) {
        setUser(u);
        loadNavBadges(u);
        loadUnread();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, loadNavBadges, loadUnread]);

  useEffect(() => {
    const t = setInterval(loadUnread, 45000);
    return () => clearInterval(t);
  }, [loadUnread]);

  useEffect(() => {
    if (!user) return;
    if (isAdherentRole(user) && !ADHERENT_PAGES.has(currentPage)) {
      setCurrentPage('dashboard');
    }
  }, [user, currentPage]);

  const setPageTitle = () => {};

  const addToast = (type, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  if (!user) return null;

  const isAdmin = isAdminRole(user);
  const isAdherent = isAdherentRole(user);
  const staffWriter = isStaffWriterRole(user);

  const pageProps = { setPageTitle, addToast, user };

  const forbiddenForAdherent = () => (
    <div className="empty-state">
      <div className="empty-icon">
        <FaIcon name="triangle-exclamation" />
      </div>
      <h4>Accès non autorisé</h4>
      <p>Cette section est réservée aux équipes SRM-MS.</p>
    </div>
  );

  const forbiddenBroadcast = () => (
    <div className="empty-state">
      <div className="empty-icon">
        <FaIcon name="triangle-exclamation" />
      </div>
      <h4>Accès non autorisé</h4>
      <p>Réservé aux administrateurs et opérateurs.</p>
    </div>
  );

  const renderPage = () => {
    if (isAdherent && !ADHERENT_PAGES.has(currentPage)) {
      return forbiddenForAdherent();
    }
    if (currentPage === 'notif-broadcast' && !staffWriter) {
      return forbiddenBroadcast();
    }
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage {...pageProps} />;
      case 'beneficiaires':
        return isAdherent ? forbiddenForAdherent() : <BeneficiairesPage {...pageProps} />;
      case 'ordonnances':
        return isAdherent ? forbiddenForAdherent() : <OrdonnancesPage {...pageProps} />;
      case 'devis':
        return <DevisPage {...pageProps} />;
      case 'remboursements':
        return <RemboursementsPage {...pageProps} />;
      case 'prises-en-charge':
        return isAdherent ? forbiddenForAdherent() : <PrisesEnChargePage {...pageProps} />;
      case 'maladies':
        return <MaladiesPage {...pageProps} />;
      case 'etablissements':
        return isAdherent ? forbiddenForAdherent() : <EtablissementsPage {...pageProps} />;
      case 'entites':
        return isAdherent ? forbiddenForAdherent() : <EntitesPage {...pageProps} />;
      case 'utilisateurs':
        return isAdmin ? <UtilisateursPage {...pageProps} /> : forbiddenForAdherent();
      case 'notifications':
        return <NotificationsPage {...pageProps} onUnreadChanged={setUnreadCount} />;
      case 'notif-broadcast':
        return staffWriter ? <BroadcastCenterPage {...pageProps} /> : forbiddenBroadcast();
      case 'profil':
        return <ProfilPage {...pageProps} />;
      case 'parametrage':
        return staffWriter ? <ParametragePage {...pageProps} /> : forbiddenBroadcast();
      default:
        return (
          <div className="empty-state">
            <div className="empty-icon">
              <FaIcon name="triangle-exclamation" />
            </div>
            <h4>Page en construction</h4>
          </div>
        );
    }
  };

  return (
    <>
      <Layout user={user} currentPage={currentPage} onNavigate={setCurrentPage} navBadges={navBadges}>
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
              <span className="search-icon">
                <FaIcon name="magnifying-glass" />
              </span>
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div
              className="topbar-btn"
              title="Notifications"
              onClick={() => setCurrentPage('notifications')}
              onKeyDown={(e) => e.key === 'Enter' && setCurrentPage('notifications')}
              role="button"
              tabIndex={0}
            >
              <FaIcon name="bell" />
              {unreadCount > 0 ? <span className="notif-dot" /> : null}
            </div>
            <div
              className="topbar-btn"
              title={`Profil — ${user.role}`}
              onClick={() => setCurrentPage('profil')}
              onKeyDown={(e) => e.key === 'Enter' && setCurrentPage('profil')}
              role="button"
              tabIndex={0}
            >
              <FaIcon name="user" />
            </div>
          </div>
        </div>
        <div className="page-content">{renderPage()}</div>
      </Layout>
      <ChatbotWidget />
      <Toast toasts={toasts} removeToast={removeToast} />
    </>
  );
}
