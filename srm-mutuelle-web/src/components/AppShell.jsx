import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import ProfilPage from '../pages/ProfilPage';
import ParametragePage from '../pages/ParametragePage';

import AgentsPage from '../pages/AgentsPage';
import HistoriquePage from '../pages/HistoriquePage';
import ChatbotWidget from './ChatbotWidget';
import FaIcon from './FaIcon';
import { apiFetch, apiMe, parseJsonOrThrow } from '../api/client';
import { prefetchTypeConfig } from '../config/typeConfig';
import { isAdherentRole, isStaffWriterRole } from '../authUtils';

const ADHERENT_PAGES = new Set(['devis', 'remboursements', 'prises-en-charge', 'historique', 'notifications', 'profil']);

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
    agents: { title: 'Agents', breadcrumb: 'Gestion des agents' },
    etablissements: { title: 'Établissements médicaux', breadcrumb: 'Référentiel' },
    entites: { title: 'Entités organisationnelles', breadcrumb: 'Référentiel' },
    utilisateurs: { title: 'Utilisateurs', breadcrumb: 'Administration' },
    notifications: { title: 'Notifications', breadcrumb: 'Messages' },
    profil: { title: 'Mon profil', breadcrumb: 'Compte' },
    historique: { title: 'Historique personnel', breadcrumb: 'Mon historique d’activités' },
    parametrage: { title: 'Paramétrage', breadcrumb: 'Administration' },
  };
  const pageTitle = pageTitles[currentPage] || { title: 'Page en construction', breadcrumb: 'Inconnu' };

  const [toasts, setToasts] = useState([]);
  const [notifPopupOpen, setNotifPopupOpen] = useState(false);
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const [notifRows, setNotifRows] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);

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
        const [qRes, rRes] = await Promise.all([apiFetch('/api/quotes'), apiFetch('/api/reimbursements')]);
        const quotes = await parseJsonOrThrow(qRes);
        const remb = await parseJsonOrThrow(rRes);
        const pendingQuotes = quotes.filter((q) => {
          const e = q.etat;
          return e === 'En attente' || e === 'Brouillon' || e === 'Soumis';
        }).length;
        setNavBadges({
          devis: pendingQuotes,
          rembPending: remb.filter((x) => x.statut === 'En attente' || x.statut === 'En cours').length,
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
        if (isStaffWriterRole(u)) {
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
        const users = isStaffWriterRole(u) ? out[i++] : [];
        const devisATraiter = quotes.filter((q) => q.etat === 'Soumis').length;
        setNavBadges({
          agents: agents.length,
          ordonnances: ordonnances.length,
          devis: devisATraiter,
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
        try {
          await prefetchTypeConfig();
        } catch {
          /* listes types : fallback défauts / cache local */
        }
        setUser(u);
        if (isAdherentRole(u)) {
          setCurrentPage((prev) => (prev === 'dashboard' || !ADHERENT_PAGES.has(prev) ? 'devis' : prev));
        }
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
    const handleOutsideClick = (event) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setNotifPopupOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setProfilePopupOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (isAdherentRole(user) && !ADHERENT_PAGES.has(currentPage)) {
      setCurrentPage('devis');
    }
  }, [user, currentPage]);

  const setPageTitle = () => {};

  const lastErrorToastRef = useRef({ key: '', at: 0 });
  const addToast = useCallback((type, message) => {
    const text = String(message ?? '').trim() || (type === 'error' ? 'Une erreur est survenue' : '');
    if (type === 'error' && text) {
      const now = Date.now();
      if (lastErrorToastRef.current.key === text && now - lastErrorToastRef.current.at < 2000) {
        return;
      }
      lastErrorToastRef.current = { key: text, at: now };
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    setToasts((prev) => [...prev, { id, type, message: text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const loadNotificationsPopup = async () => {
    setNotifLoading(true);
    try {
      const res = await apiFetch('/api/notifications');
      const rows = await parseJsonOrThrow(res);
      setNotifRows(Array.isArray(rows) ? rows : []);
    } catch (e) {
      addToast('error', e.message || 'Notifications indisponibles');
    } finally {
      setNotifLoading(false);
    }
  };

  const formatNotifTs = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('fr-FR');
    } catch {
      return '—';
    }
  };

  const openNotifPopup = async () => {
    setProfilePopupOpen(false);
    const nextOpen = !notifPopupOpen;
    setNotifPopupOpen(nextOpen);
    if (nextOpen) {
      await loadNotificationsPopup();
    }
  };

  const markNotifRead = async (id) => {
    try {
      await parseJsonOrThrow(await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' }));
      await Promise.all([loadNotificationsPopup(), loadUnread()]);
    } catch (e) {
      addToast('error', e.message || 'Impossible de marquer la notification');
    }
  };

  if (!user) return null;

  const initials = (user.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

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
    switch (currentPage) {
      case 'dashboard':
        return isAdherent ? (
          <DevisPage {...pageProps} />
        ) : (
          <DashboardPage {...pageProps} />
        );
      case 'beneficiaires':
        return isAdherent ? forbiddenForAdherent() : <BeneficiairesPage {...pageProps} />;
      case 'ordonnances':
        return isAdherent ? forbiddenForAdherent() : <OrdonnancesPage {...pageProps} />;
      case 'devis':
        return <DevisPage {...pageProps} />;
      case 'remboursements':
        return <RemboursementsPage {...pageProps} />;
      case 'cartes-mutuelles':
        return <CartesMutuellesPage {...pageProps} />;
      case 'prises-en-charge':
        return <PrisesEnChargePage {...pageProps} />;
      case 'maladies':
        return isAdherent ? forbiddenForAdherent() : <MaladiesPage {...pageProps} />;
      case 'etablissements':
        return isAdherent ? forbiddenForAdherent() : <EtablissementsPage {...pageProps} />;
      case 'entites':
        return isAdherent ? forbiddenForAdherent() : <EntitesPage {...pageProps} />;
      case 'utilisateurs':
        return staffWriter ? <UtilisateursPage {...pageProps} /> : forbiddenForAdherent();
      case 'notifications':
        return <NotificationsPage {...pageProps} onUnreadChanged={setUnreadCount} />;
      case 'profil':
        return <ProfilPage {...pageProps} />;
      case 'historique':
        return <HistoriquePage {...pageProps} />;
      case 'parametrage':
        return staffWriter ? <ParametragePage {...pageProps} /> : forbiddenBroadcast();
      case 'agents':
        return <AgentsPage {...pageProps} />;
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
            <div className="topbar-dropdown-wrap" ref={notifDropdownRef}>
              <div
                className={`topbar-btn${notifPopupOpen ? ' active' : ''}`}
                title="Notifications"
                onClick={openNotifPopup}
                onKeyDown={(e) => e.key === 'Enter' && openNotifPopup()}
                role="button"
                tabIndex={0}
              >
                <FaIcon name="bell" />
                {unreadCount > 0 ? <span className="notif-dot" /> : null}
              </div>
              {notifPopupOpen && (
                <div className="topbar-dropdown-panel notif-dropdown-panel">
                  <div className="notif-panel-header">
                    <h4>CENTRE DE NOTIFICATIONS</h4>
                    <span className="badge badge-primary">{unreadCount} nouvelles</span>
                  </div>
                  <div className="notif-panel-body">
                    {notifLoading ? (
                      <div className="notif-loading">Chargement...</div>
                    ) : notifRows.length === 0 ? (
                      <div className="notif-empty">Aucune notification.</div>
                    ) : (
                      notifRows.map((n) => (
                        <div key={n.id} className={`notif-item${n.read ? '' : ' unread'}`}>
                          <div className="notif-item-title">{n.notifType || 'Notification'}</div>
                          <div className="notif-item-body">{n.body}</div>
                          <div className="notif-item-footer">
                            <span>{formatNotifTs(n.createdAt)}</span>
                            {!n.read ? (
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => markNotifRead(n.id)}
                              >
                                Marquer lu
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="topbar-dropdown-wrap" ref={userDropdownRef}>
              <div
                className={`topbar-user-chip${profilePopupOpen ? ' active' : ''}`}
                title={`${user.name} — ${user.role}`}
                onClick={() => {
                  setNotifPopupOpen(false);
                  setProfilePopupOpen((prev) => !prev);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setNotifPopupOpen(false);
                    setProfilePopupOpen((prev) => !prev);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="topbar-user-avatar">{initials}</div>
                <div className="topbar-user-meta">
                  <div className="topbar-user-name">{user.name}</div>
                  <div className="topbar-user-role">{user.role}</div>
                </div>
              </div>
              {profilePopupOpen && (
                <div className="topbar-dropdown-panel user-dropdown-panel">
                  <div className="user-dropdown-head">
                    <div className="user-dropdown-name">{user.name || 'Utilisateur'}</div>
                    <div className="user-dropdown-role">{user.role || '—'}</div>
                  </div>
                  <button
                    type="button"
                    className="user-dropdown-action"
                    onClick={() => {
                      setProfilePopupOpen(false);
                      setCurrentPage('profil');
                    }}
                  >
                    <FaIcon name="id-card" /> Mon profil
                  </button>
                  <button
                    type="button"
                    className="user-dropdown-action"
                    onClick={() => {
                      setProfilePopupOpen(false);
                      if (staffWriter) setCurrentPage('utilisateurs');
                    }}
                    disabled={!staffWriter}
                  >
                    <FaIcon name="user-shield" /> Utilisateurs
                  </button>
                  <button
                    type="button"
                    className="user-dropdown-action danger"
                    onClick={() => {
                      sessionStorage.removeItem('mutuelle_user');
                      navigate('/');
                    }}
                  >
                    <FaIcon name="right-from-bracket" /> Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="page-content">{renderPage()}</div>
      </Layout>
      <ChatbotWidget user={user} />
      <Toast toasts={toasts} removeToast={removeToast} />
    </>
  );
}
