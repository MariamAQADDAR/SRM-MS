import { useCallback, useEffect, useRef, useState } from 'react';
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
import MedicamentsPage from '../pages/MedicamentsPage';
import UtilisateursPage from '../pages/UtilisateursPage';
import NotificationsPage from '../pages/NotificationsPage';
import ProfilPage from '../pages/ProfilPage';
import ParametragePage from '../pages/ParametragePage';
import CartesMutuellesPage from '../pages/CartesMutuellesPage';

import AgentsPage from '../pages/AgentsPage';
import HistoriquePage from '../pages/HistoriquePage';
import ArchivesPage from '../pages/ArchivesPage';
import MedecinsPage from '../pages/MedecinsPage';
import ChatbotWidget from './ChatbotWidget';
import FaIcon from './FaIcon';
import { apiFetch, apiMe, parseJsonOrThrow } from '../api/client';
import { prefetchTypeConfig } from '../config/typeConfig';
import { isAdherentRole, isStaffWriterRole, isAdminRole } from '../authUtils';

const ADHERENT_PAGES = new Set([
  'mes-devis',
  'mes-remboursements',
  'mes-prises-en-charge',
  'mon-historique',
  'notifications',
  'profil',
]);

export default function AppShell() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(() => {
    return sessionStorage.getItem('srm_current_page') || 'dashboard';
  });

  useEffect(() => {
    sessionStorage.setItem('srm_current_page', currentPage);
  }, [currentPage]);
  
  const [activeSpace, setActiveSpace] = useState(() => {
    return sessionStorage.getItem('srm_active_space') || null;
  });

  useEffect(() => {
    if (activeSpace) {
      sessionStorage.setItem('srm_active_space', activeSpace);
    } else {
      sessionStorage.removeItem('srm_active_space');
    }
  }, [activeSpace]);

  const handleNavigate = (page) => {
    if (page === 'portal') {
      setActiveSpace(null);
    } else {
      setCurrentPage(page);
    }
  };

  const [navBadges, setNavBadges] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);

  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdLoading, setPwdLoading] = useState(false);

  const handleForcePasswordChange = async (e) => {
    e.preventDefault();
    if (pwdForm.newPassword.length < 6) {
      addToast('warning', 'Le nouveau mot de passe doit faire au moins 6 caractères');
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      addToast('warning', 'Les mots de passe ne correspondent pas');
      return;
    }
    setPwdLoading(true);
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: pwdForm.currentPassword,
          newPassword: pwdForm.newPassword,
        }),
      });
      addToast('success', 'Mot de passe modifié avec succès');
      const meRes = await apiMe();
      if (meRes) setUser(meRes);
    } catch (err) {
      addToast('error', err.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setPwdLoading(false);
    }
  };

  const pageTitles = {
    dashboard: { title: 'Tableau de bord', breadcrumb: 'Accueil' },
    beneficiaires: { title: 'Bénéficiaires', breadcrumb: 'Gestion des bénéficiaires' },
    ordonnances: { title: 'Ordonnances', breadcrumb: 'Gestion des ordonnances' },
    devis: { title: 'Devis', breadcrumb: 'Gestion des devis' },
    remboursements: { title: 'Remboursements', breadcrumb: 'Gestion des remboursements' },
    'cartes-mutuelles': { title: 'Cartes mutuelles', breadcrumb: 'Affiliation famille' },
    'prises-en-charge': { title: 'Prises en charge', breadcrumb: 'Gestion des prises en charge' },
    maladies: { title: 'Maladies spéciales', breadcrumb: 'Gestion des maladies spéciales' },
    agents: { title: 'Agents', breadcrumb: 'Gestion des agents' },
    etablissements: { title: 'Établissements médicaux', breadcrumb: 'Référentiel' },
    medecins: { title: 'Médecins conventionnés', breadcrumb: 'Référentiel' },
    entites: { title: 'Entités organisationnelles', breadcrumb: 'Référentiel' },
    medicaments: { title: 'Médicaments', breadcrumb: 'Référentiel médicaments' },
    utilisateurs: { title: 'Utilisateurs', breadcrumb: 'Administration' },
    archives: { title: 'Archives', breadcrumb: 'Administration' },
    notifications: { title: 'Notifications', breadcrumb: 'Messages' },
    profil: { title: 'Mon profil', breadcrumb: 'Compte' },
    historique: { title: 'Historique personnel', breadcrumb: `Mon historique d'activités` },
    parametrage: { title: 'Paramétrage', breadcrumb: 'Administration' },
    // Personal-space pages (all roles)
    'mes-devis': { title: 'Mes devis', breadcrumb: 'Mon espace — Mes devis' },
    'mes-remboursements': { title: 'Mes remboursements', breadcrumb: 'Mon espace — Remboursements' },
    'mes-prises-en-charge': { title: 'Mes prises en charge', breadcrumb: 'Mon espace — PEC' },
    'mon-historique': { title: 'Mon historique', breadcrumb: 'Mon espace — Historique' },
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
        const [qRes, rRes, pRes] = await Promise.all([
          apiFetch('/api/quotes'),
          apiFetch('/api/reimbursements'),
          apiFetch('/api/care-episodes'),
        ]);
        const quotes = await parseJsonOrThrow(qRes);
        const remb = await parseJsonOrThrow(rRes);
        const pec = await parseJsonOrThrow(pRes);
        const pendingQuotes = quotes.filter((q) => {
          const e = q.etat;
          return e === 'En attente' || e === 'Brouillon' || e === 'Soumis';
        }).length;
        setNavBadges({
          devis: pendingQuotes,
          rembPending: remb.filter((x) => x.statut === 'En attente' || x.statut === 'En cours').length,
          pec: pec.filter((x) => x.statut === 'En attente' || x.statut === 'En cours').length,
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
          apiFetch('/api/medicines'),
          apiFetch('/api/contracted-doctors'),
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
        const medicines = out[i++];
        const doctors = out[i++];
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
          medicaments: medicines.length,
          medecins: doctors.length,
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
          setCurrentPage((prev) => (prev === 'dashboard' || !ADHERENT_PAGES.has(prev) ? 'mes-devis' : prev));
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
    if ((isAdherentRole(user) || activeSpace === 'personal') && !ADHERENT_PAGES.has(currentPage)) {
      setCurrentPage('mes-devis');
    }
  }, [user, currentPage, activeSpace]);

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

  const handleNotifClick = async (n) => {
    const type = (n.notifType || '').toUpperCase();
    const isAdh = isAdherentRole(user);
    let target = 'notifications';
    if (type.includes('DEVIS')) {
      target = isAdh ? 'mes-devis' : 'devis';
    } else if (type.includes('REMBOURSEMENT')) {
      target = isAdh ? 'mes-remboursements' : 'remboursements';
    } else if (type.includes('PEC')) {
      target = isAdh ? 'mes-prises-en-charge' : 'prises-en-charge';
    }

    if (!n.read) {
      await markNotifRead(n.id);
    }
    setCurrentPage(target);
    setNotifPopupOpen(false);
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
  const isAdmin = isAdminRole(user);

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

  const NoAgentLinkedPage = () => {
    const [agentsList, setAgentsList] = useState([]);
    const [loadingAgents, setLoadingAgents] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [linking, setLinking] = useState(false);

    useEffect(() => {
      (async () => {
        try {
          const res = await apiFetch('/api/agents');
          const data = await parseJsonOrThrow(res);
          setAgentsList(Array.isArray(data) ? data : []);
        } catch {
          setAgentsList([]);
        } finally {
          setLoadingAgents(false);
        }
      })();
    }, []);

    const filteredAgents = searchQuery.trim()
      ? agentsList.filter((a) =>
          `${a.matricule} ${a.nom} ${a.prenom}`.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : agentsList;

    const handleLink = async () => {
      if (!selectedAgentId) return;
      setLinking(true);
      try {
        await apiFetch('/api/auth/link-agent', {
          method: 'PATCH',
          body: { agentId: Number(selectedAgentId) },
        });
        // Refresh user from /api/me to get updated agentId
        const meRes = await apiFetch('/api/auth/me');
        const me = await parseJsonOrThrow(meRes);
        const raw = sessionStorage.getItem('mutuelle_user');
        const stored = raw ? JSON.parse(raw) : {};
        const updatedUser = { ...stored, agentId: me.agentId };
        sessionStorage.setItem('mutuelle_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        addToast('success', 'Votre dossier adhérent a été lié avec succès !');
      } catch (e) {
        addToast('error', e.message || 'Impossible de lier le dossier');
      } finally {
        setLinking(false);
      }
    };

    return (
      <div style={{ maxWidth: 560, margin: '40px auto', padding: '0 16px' }}>
        <div className="card" style={{ borderRadius: 16, overflow: 'hidden' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, #1a3a6b) 100%)',
            padding: '32px 32px 24px',
            textAlign: 'center',
            color: '#fff',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.9 }}>
              <FaIcon name="user-tie" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Associer votre dossier adhérent</h3>
            <p style={{ margin: '8px 0 0', opacity: 0.85, fontSize: '0.9rem' }}>
              Sélectionnez votre dossier pour accéder à votre espace personnel
            </p>
          </div>
          <div className="card-body" style={{ padding: 28 }}>
            {loadingAgents ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
                Chargement des agents…
              </div>
            ) : agentsList.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><FaIcon name="users-slash" /></div>
                <p>Aucun agent trouvé dans le système.</p>
              </div>
            ) : (
              <>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Rechercher votre dossier
                  </label>
                  <div className="input-group">
                    <span className="input-icon"><FaIcon name="magnifying-glass" /></span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Matricule, nom ou prénom…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ paddingLeft: 36 }}
                    />
                  </div>
                </div>
                <div style={{
                  maxHeight: 260,
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: 8,
                  marginBottom: 20,
                }}>
                  {filteredAgents.length === 0 ? (
                    <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
                      Aucun résultat pour « {searchQuery} »
                    </div>
                  ) : (
                    filteredAgents.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => setSelectedAgentId(String(a.id))}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border-color)',
                          background: selectedAgentId === String(a.id) ? 'var(--primary-light, #e8f0ff)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          transition: 'background 0.15s',
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: selectedAgentId === String(a.id) ? 'var(--primary)' : 'var(--gray-200)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: selectedAgentId === String(a.id) ? '#fff' : 'var(--gray-500)',
                          fontSize: '0.85rem', fontWeight: 700, flexShrink: 0,
                        }}>
                          {(a.prenom?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                            {a.prenom} {a.nom}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Matricule : {a.matricule || '—'}
                          </div>
                        </div>
                        {selectedAgentId === String(a.id) && (
                          <FaIcon name="circle-check" style={{ marginLeft: 'auto', color: 'var(--primary)', fontSize: '1.1rem' }} />
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleNavigate('portal')}
                  >
                    Retour au portail
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!selectedAgentId || linking}
                    onClick={handleLink}
                  >
                    {linking ? (
                      <><FaIcon name="spinner" className="fa-inline-icon" /> Liaison en cours…</>
                    ) : (
                      <><FaIcon name="link" className="fa-inline-icon" /> Lier ce dossier</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPage = () => {
    // Adherents are only allowed in ADHERENT_PAGES
    if (isAdherent && !ADHERENT_PAGES.has(currentPage)) {
      return forbiddenForAdherent();
    }

    // Staff in personal space with no linked agent → show agent picker
    const isInPersonalSpace = activeSpace === 'personal' && !isAdherent;
    if (isInPersonalSpace && !user.agentId) {
      return <NoAgentLinkedPage />;
    }

    switch (currentPage) {
      // ── Personal space (all roles) ────────────────────────────────
      case 'mes-devis':
        return <DevisPage {...pageProps} personalMode />;
      case 'mes-remboursements':
        return <RemboursementsPage {...pageProps} personalMode />;
      case 'mes-prises-en-charge':
        return <PrisesEnChargePage {...pageProps} personalMode />;
      case 'mon-historique':
        return <HistoriquePage {...pageProps} personalMode />;

      // ── Staff / management pages ──────────────────────────────────
      case 'dashboard':
        return isAdherent ? (
          <DevisPage {...pageProps} personalMode />
        ) : (
          <DashboardPage {...pageProps} onNavigate={setCurrentPage} />
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
      case 'medecins':
        return isAdherent ? forbiddenForAdherent() : <MedecinsPage {...pageProps} />;
      case 'entites':
        return isAdherent ? forbiddenForAdherent() : <EntitesPage {...pageProps} />;
      case 'medicaments':
        return <MedicamentsPage {...pageProps} />;
      case 'utilisateurs':
        return staffWriter ? <UtilisateursPage {...pageProps} /> : forbiddenForAdherent();
      case 'notifications':
        return <NotificationsPage {...pageProps} onUnreadChanged={setUnreadCount} onNavigate={setCurrentPage} />;
      case 'profil':
        return <ProfilPage {...pageProps} />;
      case 'historique':
        return <HistoriquePage {...pageProps} />;
      case 'parametrage':
        return staffWriter ? <ParametragePage {...pageProps} /> : forbiddenBroadcast();
      case 'archives':
        return isAdmin ? <ArchivesPage {...pageProps} /> : forbiddenBroadcast();
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

  if (user && user.forcePasswordChange) {
    return (
      <div className="auth-container">
        <div className="auth-panel" style={{ maxWidth: '400px' }}>
          <div className="auth-brand">
            <div className="auth-logo">
              <FaIcon name="shield-halved" />
            </div>
            <h2>SRM Mutuelle</h2>
          </div>
          <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Changement obligatoire</h3>
          <p style={{ textAlign: 'center', color: 'var(--text-color)', marginBottom: '20px', fontSize: '14px' }}>
            Pour des raisons de sécurité, vous devez modifier votre mot de passe lors de votre première connexion.
          </p>
          <form onSubmit={handleForcePasswordChange} className="auth-form">
            <div className="form-group">
              <label>Mot de passe actuel (celui reçu par email)</label>
              <div className="input-group">
                <span className="input-icon"><FaIcon name="lock" /></span>
                <input
                  type="password"
                  required
                  value={pwdForm.currentPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                  placeholder="Mot de passe actuel"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Nouveau mot de passe</label>
              <div className="input-group">
                <span className="input-icon"><FaIcon name="key" /></span>
                <input
                  type="password"
                  required
                  minLength="6"
                  value={pwdForm.newPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                  placeholder="Nouveau mot de passe (min 6 car.)"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Confirmer le nouveau mot de passe</label>
              <div className="input-group">
                <span className="input-icon"><FaIcon name="check-double" /></span>
                <input
                  type="password"
                  required
                  minLength="6"
                  value={pwdForm.confirmPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                  placeholder="Confirmer"
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary auth-submit" disabled={pwdLoading}>
              {pwdLoading ? 'Modification en cours...' : 'Changer mon mot de passe'}
            </button>
            <div style={{ marginTop: '15px', textAlign: 'center' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  localStorage.removeItem('srm_token');
                  window.location.reload();
                }}
              >
                Déconnexion
              </button>
            </div>
          </form>
          <div className="toast-container">
            {toasts.map((t) => (
              <Toast key={t.id} type={t.type} message={t.message} onClose={() => removeToast(t.id)} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!activeSpace) {
    return (
      <div className="portal-container">
        {/* Portal Header */}
        <div className="portal-header">
          <div className="portal-brand">
            <img src="/srm-company-logo.png" alt="SRM-MS" className="portal-logo-img" />
            <span className="portal-brand-text">SRM Mutuelle</span>
          </div>
          <div className="portal-header-right">
            <div className="portal-user-chip">
              <div className="portal-user-avatar">{initials}</div>
              <div className="portal-user-info">
                <span className="portal-user-name">{user.name}</span>
                <span className="portal-user-role">{user.role}</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm portal-logout-btn"
              onClick={() => {
                sessionStorage.removeItem('mutuelle_user');
                sessionStorage.removeItem('srm_active_space');
                navigate('/');
              }}
            >
              <FaIcon name="right-from-bracket" className="fa-inline-icon" /> Déconnexion
            </button>
          </div>
        </div>

        {/* Portal Body */}
        <div className="portal-body animate-fade-in">
          <div className="portal-welcome-section">
            <h1 className="portal-welcome-title">Bienvenue sur le portail SRM-MS</h1>
            <p className="portal-welcome-subtitle">Veuillez sélectionner un espace pour continuer</p>
            

          </div>

          <div className="portal-cards-grid">
            {/* Mon Espace Card */}
            <div
              className="portal-space-card personal-space"
              onClick={() => {
                setActiveSpace('personal');
                setCurrentPage('mes-devis');
              }}
            >
              <div className="portal-card-icon-wrapper">
                <FaIcon name="house-user" />
              </div>
              <div className="portal-card-meta">
                <h3>Mon Espace</h3>
                <p>Mes devis, remboursements, prises en charge et profil</p>
              </div>
            </div>

            {/* Espace Gestion Card (visible for staff only) */}
            {!isAdherent && (
              <div
                className="portal-space-card staff-space"
                onClick={() => {
                  setActiveSpace('staff');
                  setCurrentPage('dashboard');
                }}
              >
                <div className="portal-card-icon-wrapper">
                  <FaIcon name="shield-halved" />
                </div>
                <div className="portal-card-meta">
                  <h3>Espace Gestion</h3>
                  <p>Gestion des adhérents, devis, remboursements, PEC, et référentiels</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Portal Footer */}
        <div className="portal-footer">
          <span>&copy; 2026 SRM-MS développé pour la gestion mutuelle</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Layout user={user} currentPage={currentPage} onNavigate={handleNavigate} navBadges={navBadges} activeSpace={activeSpace}>
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
                {unreadCount > 0 ? <span className="notif-badge">{unreadCount}</span> : null}
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
                      notifRows.slice(0, 5).map((n) => (
                        <div
                          key={n.id}
                          className={`notif-item${n.read ? '' : ' unread'}`}
                          onClick={() => handleNotifClick(n)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="notif-item-title">{n.notifType || 'Notification'}</div>
                          <div className="notif-item-body">{n.body}</div>
                          <div className="notif-item-footer">
                            <span>{formatNotifTs(n.createdAt)}</span>
                            {!n.read ? (
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markNotifRead(n.id);
                                }}
                              >
                                Marquer lu
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="notif-panel-footer">
                    <button
                      type="button"
                      className="btn-view-all"
                      onClick={() => {
                        setCurrentPage('notifications');
                        setNotifPopupOpen(false);
                      }}
                    >
                      Voir tout
                    </button>
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
