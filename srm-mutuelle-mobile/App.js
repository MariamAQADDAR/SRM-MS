import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
  Image,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Pressable,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import ChatbotScreen from './ChatbotScreen';
import FeatureRouter, { FEATURE_SCREEN_IDS } from './FeatureRouter';
import ToastOverlay, { useToast } from './components/Toast';
import { prefetchTypeConfig } from './typeConfig';
import { COLORS, TAB_BAR_EXTRA_BOTTOM } from './theme';
import { API_BASE_URL } from './config';
import {
  apiFetch,
  apiLogin,
  apiMe,
  apiChangePassword,
  apiForgotPassword,
  apiMarkNotificationRead,
  apiUnreadCount,
  clearSession,
  parseJsonOrThrow,
  saveSession,
  sessionUserFromLoginResponse,
  setAuthLostHandler,
  getSession,
} from './api';
import { isAdherentRole, isStaffWriterRole } from './authUtils';
import { routeById, PAGE_SIZE, verticalNavSections, bottomNavEssentials, DASHBOARD_PAGE_ID, PAGE_TOPBAR, isFeatureScreen } from './menu';
import { canAccessTab, defaultHomeTab } from './navigationAccess';

const { width } = Dimensions.get('window');
/** Panneau latéral type « hamburger » (~80–82 % de l’écran, comme le mockup). */
const DRAWER_WIDTH = Math.min(320, Math.round(width * 0.82));

/** Incrémentez après une modif UI : si vous ne voyez pas ce numéro dans l’app, le cache Expo n’est pas rafraîchi. */
const MOBILE_UI_BUILD = '2026-05-29 · parité web complète';
/** Hauteur zone utile barre du bas + marge (évite que le contenu passe sous les onglets). */

function initialsFromName(name) {
  if (!name || typeof name !== 'string') return '?';
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return '?';
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function getStatusColor(statut) {
  if (!statut) return COLORS.info;
  const lower = String(statut).toLowerCase();
  if (lower.includes('validé') || lower.includes('approuvé') || lower.includes('traité') || lower.includes('clôturé') || lower === 'actif') {
    return COLORS.success;
  }
  if (lower.includes('attente')) return COLORS.warning;
  if (lower.includes('rejeté') || lower === 'inactif') return COLORS.danger;
  return COLORS.info;
}

function summarizeRecord(item) {
  const mainTitle =
    item.numero ?? item.matricule ?? item.nom ?? item.code ?? item.title ?? item.email ?? (item.id != null ? `ID ${item.id}` : '—');
  const subTitle =
    item.beneficiaire ??
    (item.prenom && item.nom ? `${item.prenom} ${item.nom}` : item.prenom) ??
    item.type ??
    item.body?.slice?.(0, 80) ??
    '';
  const badgeValue = item.statut ?? item.etat ?? item.situation ?? item.status ?? null;
  return { mainTitle: String(mainTitle), subTitle: subTitle ? String(subTitle) : '', badgeValue };
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const { toasts, addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [showPwdNew, setShowPwdNew] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [homeLoading, setHomeLoading] = useState(false);
  const [homeError, setHomeError] = useState('');
  const [homeStats, setHomeStats] = useState(null);
  const [homeRecentRemb, setHomeRecentRemb] = useState([]);

  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [listRows, setListRows] = useState([]);
  const [listKind, setListKind] = useState('array');
  const [listVisible, setListVisible] = useState(PAGE_SIZE);
  const [listRefreshing, setListRefreshing] = useState(false);

  const [notifLoading, setNotifLoading] = useState(false);
  const [notifRows, setNotifRows] = useState([]);
  const [notifVisible, setNotifVisible] = useState(PAGE_SIZE);
  const [notifRefreshing, setNotifRefreshing] = useState(false);
  const [navBadges, setNavBadges] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  /** Clés = titres de section (`verticalNavSections`). */
  const [drawerSectionsOpen, setDrawerSectionsOpen] = useState({});

  useEffect(() => {
    setAuthLostHandler(() => {
      setSidebarOpen(false);
      setUser(null);
      setTab('dashboard');
    });
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!user?.token) return;
    try {
      const data = await apiUnreadCount();
      setUnreadCount(Number(data.count) || 0);
    } catch {
      setUnreadCount(0);
    }
  }, [user?.token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getSession();
        if (!s?.token) {
          if (!cancelled) setBooting(false);
          return;
        }
        try {
          const me = await apiMe();
          const merged = {
            ...s,
            id: me.id ?? s.id,
            email: me.email,
            name: me.fullName,
            role: me.roleLabel || me.role,
            roleCode: me.role,
            agentId: me.agentId ?? null,
            forcePasswordChange: !!me.forcePasswordChange,
          };
          await saveSession(merged);
          if (!cancelled) {
            if (merged.forcePasswordChange) {
              setEmail(merged.email || '');
              setAuthMode('forcePassword');
              setUser(null);
            } else {
              setUser(merged);
              if (isAdherentRole(merged)) setTab(defaultHomeTab(merged));
              refreshUnread();
              prefetchTypeConfig().catch(() => {});
            }
          }
        } catch {
          await clearSession();
          if (!cancelled) setUser(null);
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUnread]);

  useEffect(() => {
    if (!user?.token) return;
    const t = setInterval(refreshUnread, 45000);
    return () => clearInterval(t);
  }, [user?.token, refreshUnread]);

  const loadHome = useCallback(async () => {
    if (!user?.token) return;
    setHomeLoading(true);
    setHomeError('');
    try {
      if (isAdherentRole(user)) {
        const [qRes, rRes, mRes, medRes] = await Promise.all([
          apiFetch('/api/quotes'),
          apiFetch('/api/reimbursements'),
          apiFetch('/api/special-diseases'),
          apiFetch('/api/medicines'),
        ]);
        const quotes = await parseJsonOrThrow(qRes);
        const remb = await parseJsonOrThrow(rRes);
        const mal = await parseJsonOrThrow(mRes);
        const med = await parseJsonOrThrow(medRes);
        setHomeStats({
          devis: quotes.length,
          pending: remb.filter((x) => x.statut === 'En attente').length,
          maladies: mal.length,
          medicaments: med.length,
        });
        setNavBadges({
          devis: quotes.length,
          rembPending: remb.filter((x) => x.statut === 'En attente').length,
          maladies: mal.length,
          medicaments: med.length,
        });
        setHomeRecentRemb(
          [...remb].sort((a, b) => String(b.dateDemande || '').localeCompare(String(a.dateDemande || ''))).slice(0, 5),
        );
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
        ];
        if (isStaffWriterRole(user)) {
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
        const med = out[i++];
        const users = isStaffWriterRole(user) ? out[i++] : [];
        setHomeStats({
          agents: agents.length,
          pending: remb.filter((x) => x.statut === 'En attente').length,
          ordonnances: ordonnances.length,
          centres: fac.length,
          devis: quotes.length,
          pec: pec.length,
          maladies: mal.length,
          entites: ent.length,
          medicaments: med.length,
          users: users.length,
        });
        setNavBadges({
          agents: agents.length,
          ordonnances: ordonnances.length,
          devis: quotes.length,
          rembPending: remb.filter((x) => x.statut === 'En attente').length,
          pec: pec.length,
          maladies: mal.length,
          facilities: fac.length,
          entites: ent.length,
          medicaments: med.length,
          users: isStaffWriterRole(user) ? users.length : 0,
        });
        setHomeRecentRemb(
          [...remb].sort((a, b) => String(b.dateDemande || '').localeCompare(String(a.dateDemande || ''))).slice(0, 5),
        );
      }
    } catch (e) {
      setHomeError(e.message || 'Impossible de charger l’accueil');
      setHomeStats(null);
      setHomeRecentRemb([]);
      setNavBadges({});
    } finally {
      setHomeLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.token && (tab === 'dashboard' || sidebarOpen)) {
      loadHome();
    }
  }, [user, tab, sidebarOpen, loadHome]);

  useEffect(() => {
    if (tab === 'menu') {
      setTab('dashboard');
      setSidebarOpen(true);
    }
  }, [tab]);

  const loadListForRoute = useCallback(
    async (route, { refreshing } = {}) => {
      if (!route || !user?.token) return;
      if (refreshing) setListRefreshing(true);
      else setListLoading(true);
      setListError('');
      try {
        const res = await apiFetch(route.endpoint);
        const data = await parseJsonOrThrow(res);
        if (route.responseKind === 'map' || (!Array.isArray(data) && data && typeof data === 'object')) {
          const entries = Object.entries(data).map(([key, values]) => ({
            id: key,
            key,
            values: Array.isArray(values) ? values.join(', ') : String(values),
          }));
          setListKind('map');
          setListRows(entries);
        } else if (Array.isArray(data)) {
          setListKind('array');
          setListRows(data);
        } else {
          setListKind('array');
          setListRows([]);
        }
        setListVisible(PAGE_SIZE);
      } catch (e) {
        setListError(e.message || 'Erreur de chargement');
        setListRows([]);
        setListKind('array');
      } finally {
        setListLoading(false);
        setListRefreshing(false);
      }
    },
    [user],
  );

  const loadNotifications = useCallback(
    async ({ refreshing } = {}) => {
      if (!user?.token) return;
      if (refreshing) setNotifRefreshing(true);
      else setNotifLoading(true);
      try {
        const res = await apiFetch('/api/notifications');
        const data = await parseJsonOrThrow(res);
        setNotifRows(Array.isArray(data) ? data : []);
        setNotifVisible(PAGE_SIZE);
        refreshUnread();
      } catch {
        setNotifRows([]);
      } finally {
        setNotifLoading(false);
        setNotifRefreshing(false);
      }
    },
    [user, refreshUnread],
  );

  useEffect(() => {
    if (!user?.token) return;
    const r = routeById(tab);
    if (!r) return;
    if (r.isNotifications) {
      loadNotifications({});
      return;
    }
    if (isFeatureScreen(tab) || FEATURE_SCREEN_IDS.has(tab)) return;
    if (['dashboard', 'menu', 'profil'].includes(tab)) return;
    loadListForRoute(r, {});
  }, [tab, user, loadListForRoute, loadNotifications]);

  const handleLogin = async () => {
    setLoginError('');
    setLoginLoading(true);
    try {
      const data = await apiLogin(email, password);
      if (data.forcePasswordChange) {
        setAuthMode('forcePassword');
        setNewPassword('');
        setConfirmPassword('');
        return;
      }
      const payload = sessionUserFromLoginResponse(data);
      if (!payload.token) throw new Error('Réponse serveur invalide');
      await saveSession(payload);
      setUser(payload);
      setAuthMode('login');
      setTab(defaultHomeTab(payload));
      refreshUnread();
      prefetchTypeConfig().catch(() => {});
    } catch (e) {
      setLoginError(e.message || 'Connexion impossible');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoginError('');
    setLoginLoading(true);
    try {
      await apiForgotPassword(forgotEmail || email);
      setForgotSuccess(true);
    } catch (e) {
      setLoginError(e.message || 'Demande impossible');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForcePasswordChange = async () => {
    setLoginError('');
    if (newPassword !== confirmPassword) {
      setLoginError('Les mots de passe ne correspondent pas');
      return;
    }
    if (newPassword.length < 6) {
      setLoginError('Mot de passe trop court (6 caractères minimum)');
      return;
    }
    setLoginLoading(true);
    try {
      const data = await apiLogin(email, password);
      const payload = sessionUserFromLoginResponse(data);
      if (!payload.token) throw new Error('Connexion impossible');
      await saveSession(payload);
      await apiChangePassword(password, newPassword);
      const me = await apiMe();
      const merged = {
        ...payload,
        id: me.id ?? payload.id,
        email: me.email,
        name: me.fullName,
        role: me.roleLabel || me.role,
        roleCode: me.role,
        agentId: me.agentId ?? null,
        forcePasswordChange: false,
      };
      await saveSession(merged);
      setUser(merged);
      setAuthMode('login');
      setPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setTab(defaultHomeTab(merged));
      addToast('success', 'Mot de passe modifié avec succès');
      refreshUnread();
      prefetchTypeConfig().catch(() => {});
    } catch (e) {
      setLoginError(e.message || 'Changement de mot de passe impossible');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleProfilePasswordChange = async () => {
    if (pwdNew !== pwdConfirm) {
      addToast('error', 'Les mots de passe ne correspondent pas');
      return;
    }
    if (pwdNew.length < 6) {
      addToast('error', 'Mot de passe trop court (6 caractères minimum)');
      return;
    }
    setPwdLoading(true);
    try {
      await apiChangePassword(pwdCurrent, pwdNew);
      setPwdCurrent('');
      setPwdNew('');
      setPwdConfirm('');
      addToast('success', 'Mot de passe mis à jour');
    } catch (e) {
      addToast('error', e.message || 'Échec du changement');
    } finally {
      setPwdLoading(false);
    }
  };

  const logout = async () => {
    await clearSession();
    setSidebarOpen(false);
    setUser(null);
    setTab('dashboard');
    setEmail('');
    setPassword('');
    setAuthMode('login');
    setForgotSuccess(false);
  };

  const navSections = useMemo(() => verticalNavSections(user, navBadges), [user, navBadges]);
  const bottomNavItems = useMemo(() => bottomNavEssentials(user), [user]);

  useEffect(() => {
    if (!sidebarOpen || navSections.length === 0) return;
    const active = navSections.find((s) => s.items.some((it) => it && it.id === tab));
    const next = {};
    navSections.forEach((s) => {
      next[s.section] = false;
    });
    if (active) next[active.section] = true;
    setDrawerSectionsOpen(next);
  }, [sidebarOpen, tab, navSections]);

  const onMarkNotifRead = async (row) => {
    if (!row?.id || row.read) return;
    try {
      await apiMarkNotificationRead(row.id);
      setNotifRows((prev) => prev.map((n) => (n.id === row.id ? { ...n, read: true } : n)));
      refreshUnread();
    } catch {
      /* ignore */
    }
  };

  const renderLogin = () => (
    <View style={styles.loginRoot}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.loginScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.loginBrandBlock}>
          <View style={styles.loginLogoRing}>
            <Image
              source={require('./assets/srm-company-logo.png')}
              style={styles.loginBrandImg}
              resizeMode="contain"
              accessibilityLabel="SRM-MS — Société Régionale Multiservices Marrakech-Safi"
            />
          </View>
          <Text style={styles.loginBrandTitle}>SRM-MS</Text>
          <Text style={styles.loginBrandKicker}>Mutuelle</Text>
          <Text style={styles.loginBrandSub}>Marrakech-Safi</Text>
          <Text style={styles.loginBrandLine}>Gestion de la mutuelle — espace connecté</Text>
          <Text style={styles.loginTagline}>Chaque dossier compte, chaque bénéficiaire a son importance.</Text>
        </View>

        <View style={styles.loginCard}>
          {authMode === 'forgot' ? (
            <>
              <Text style={styles.loginHeading}>Mot de passe oublié</Text>
              <Text style={styles.loginLead}>Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.</Text>
              {forgotSuccess ? (
                <View style={[styles.loginAlert, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
                  <Text style={[styles.loginAlertText, { color: '#065f46' }]}>
                    Si un compte existe pour cette adresse, un e-mail avec le lien de réinitialisation a été envoyé (vérifiez les courriers indésirables). Le lien est valide 1 heure.
                  </Text>
                </View>
              ) : (
                <>
                  {loginError ? (
                    <View style={styles.loginAlert} accessibilityRole="alert">
                      <Text style={styles.loginAlertText}>{loginError}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.label}>Adresse email <Text style={styles.req}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    placeholder="vous@exemple.com"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                  />
                  <TouchableOpacity style={styles.primaryButton} onPress={handleForgotPassword} disabled={loginLoading}>
                    {loginLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Envoyer le lien</Text>}
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => { setAuthMode('login'); setLoginError(''); setForgotSuccess(false); }}
              >
                <Text style={styles.linkBtnText}>← Retour à la connexion</Text>
              </TouchableOpacity>
            </>
          ) : authMode === 'forcePassword' ? (
            <>
              <Text style={styles.loginHeading}>Changement obligatoire</Text>
              <Text style={styles.loginLead}>
                Pour des raisons de sécurité, modifiez votre mot de passe lors de votre première connexion.
              </Text>
              {loginError ? (
                <View style={styles.loginAlert} accessibilityRole="alert">
                  <Text style={styles.loginAlertText}>{loginError}</Text>
                </View>
              ) : null}
              <Text style={styles.label}>Nouveau mot de passe <Text style={styles.req}>*</Text></Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textLight}
                  secureTextEntry={!showPwdNew}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPwdNew((v) => !v)}>
                  <FontAwesome5 name={showPwdNew ? 'eye-slash' : 'eye'} size={18} color={COLORS.textLight} solid />
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>Confirmer <Text style={styles.req}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textLight}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleForcePasswordChange} disabled={loginLoading}>
                {loginLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Mettre à jour le mot de passe</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.loginHeading}>Se connecter</Text>
              <Text style={styles.loginLead}>Accédez à votre compte avec les mêmes identifiants que sur le web.</Text>
              {loginError ? (
                <View style={styles.loginAlert} accessibilityRole="alert">
                  <Text style={styles.loginAlertText}>{loginError}</Text>
                </View>
              ) : null}
              <Text style={styles.label}>
                Adresse email <Text style={styles.req}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="vous@exemple.com"
                placeholderTextColor={COLORS.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              <Text style={styles.label}>
                Mot de passe <Text style={styles.req}>*</Text>
              </Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textLight}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)} accessibilityLabel={showPassword ? 'Masquer' : 'Afficher'}>
                  <FontAwesome5 name={showPassword ? 'eye-slash' : 'eye'} size={18} color={COLORS.textLight} solid />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.forgotLink}
                onPress={() => { setAuthMode('forgot'); setForgotEmail(email); setLoginError(''); setForgotSuccess(false); }}
              >
                <Text style={styles.forgotLinkText}>Mot de passe oublié ?</Text>
              </TouchableOpacity>
              <Text style={styles.apiHint}>API : {API_BASE_URL}</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loginLoading}>
                {loginLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Se connecter</Text>}
              </TouchableOpacity>
            </>
          )}
          <Text style={styles.loginBuildTag}>{MOBILE_UI_BUILD}</Text>
          <Text style={styles.loginCopy}>© {new Date().getFullYear()} SRM-MS — Direction SI et transformation digitale</Text>
        </View>
      </ScrollView>
    </View>
  );

  const renderHome = () => (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={homeLoading} onRefresh={loadHome} />}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Bonjour,</Text>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.rolePill}>{user.role}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsFromName(user.name)}</Text>
        </View>
      </View>
      {homeError ? <Text style={styles.errorBanner}>{homeError}</Text> : null}
      <Text style={styles.sectionTitle}>Vue d’ensemble</Text>
      {homeLoading && !homeStats ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 24 }} />
      ) : homeStats ? (
        <View style={styles.statsGrid}>
          {isAdherentRole(user) ? (
            <>
              <View style={styles.statCard}>
                <FontAwesome5 name="file-invoice" size={26} color={COLORS.primary} solid style={styles.statIconFa} />
                <Text style={styles.statValue}>{homeStats.devis}</Text>
                <Text style={styles.statLabel}>Devis</Text>
              </View>
              <View style={styles.statCard}>
                <FontAwesome5 name="money-bill-wave" size={26} color={COLORS.primary} solid style={styles.statIconFa} />
                <Text style={styles.statValue}>{homeStats.pending}</Text>
                <Text style={styles.statLabel}>Remb. en attente</Text>
              </View>
              <View style={styles.statCard}>
                <FontAwesome5 name="stethoscope" size={26} color={COLORS.primary} solid style={styles.statIconFa} />
                <Text style={styles.statValue}>{homeStats.maladies}</Text>
                <Text style={styles.statLabel}>Maladies</Text>
              </View>
              <View style={styles.statCard}>
                <FontAwesome5 name="bell" size={26} color={COLORS.primary} solid style={styles.statIconFa} />
                <Text style={styles.statValue}>{unreadCount}</Text>
                <Text style={styles.statLabel}>Notifs non lues</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.statCard}>
                <FontAwesome5 name="users" size={26} color={COLORS.primary} solid style={styles.statIconFa} />
                <Text style={styles.statValue}>{homeStats.agents}</Text>
                <Text style={styles.statLabel}>Agents</Text>
              </View>
              <View style={styles.statCard}>
                <FontAwesome5 name="money-bill-wave" size={26} color={COLORS.primary} solid style={styles.statIconFa} />
                <Text style={styles.statValue}>{homeStats.pending}</Text>
                <Text style={styles.statLabel}>À traiter</Text>
              </View>
              <View style={styles.statCard}>
                <FontAwesome5 name="clipboard-list" size={26} color={COLORS.primary} solid style={styles.statIconFa} />
                <Text style={styles.statValue}>{homeStats.ordonnances}</Text>
                <Text style={styles.statLabel}>Ordonnances</Text>
              </View>
              <View style={styles.statCard}>
                <FontAwesome5 name="hospital" size={26} color={COLORS.primary} solid style={styles.statIconFa} />
                <Text style={styles.statValue}>{homeStats.centres}</Text>
                <Text style={styles.statLabel}>Établissements</Text>
              </View>
              {homeStats.devis != null ? (
                <View style={styles.statCard}>
                  <FontAwesome5 name="file-invoice" size={26} color={COLORS.primary} solid style={styles.statIconFa} />
                  <Text style={styles.statValue}>{homeStats.devis}</Text>
                  <Text style={styles.statLabel}>Devis</Text>
                </View>
              ) : null}
              {homeStats.pec != null ? (
                <View style={styles.statCard}>
                  <FontAwesome5 name="clipboard-check" size={26} color={COLORS.primary} solid style={styles.statIconFa} />
                  <Text style={styles.statValue}>{homeStats.pec}</Text>
                  <Text style={styles.statLabel}>PEC</Text>
                </View>
              ) : null}
              {isStaffWriterRole(user) && homeStats.users != null ? (
                <View style={styles.statCard}>
                  <FontAwesome5 name="user-shield" size={26} color={COLORS.primary} solid style={styles.statIconFa} />
                  <Text style={styles.statValue}>{homeStats.users}</Text>
                  <Text style={styles.statLabel}>Utilisateurs</Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Dernières demandes de remboursement</Text>
      {homeRecentRemb.length === 0 && !homeLoading ? (
        <Text style={{ color: COLORS.textLight, marginBottom: 16 }}>Aucun remboursement à afficher.</Text>
      ) : null}
      {homeRecentRemb.map((r) => (
        <View key={String(r.id)} style={styles.listItem}>
          <View style={styles.listItemLeft}>
            <View style={[styles.iconBox, { backgroundColor: `${COLORS.primary}20` }]}>
              <FontAwesome5 name="file-alt" size={20} color={COLORS.primary} solid />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{r.montantDemande} DH</Text>
              <Text style={styles.itemSub}>
                {r.dateDemande} • {r.beneficiaire}
              </Text>
            </View>
          </View>
          <View style={[styles.badge, r.statut === 'Traité' ? styles.badgeSuccess : styles.badgeWarning]}>
            <Text style={[styles.badgeText, r.statut === 'Traité' ? styles.badgeTextSuccess : styles.badgeTextWarning]}>{r.statut}</Text>
          </View>
        </View>
      ))}
      <View style={{ height: 24 + TAB_BAR_EXTRA_BOTTOM }} />
    </ScrollView>
  );

  const safeNavigate = useCallback(
    (targetTab) => {
      if (!canAccessTab(user, targetTab)) {
        addToast('warning', 'Accès non autorisé à cette section');
        return;
      }
      setSidebarOpen(false);
      setTab(targetTab);
    },
    [user, addToast],
  );

  const onNavItemPress = (item) => {
    if (item.id === DASHBOARD_PAGE_ID) {
      safeNavigate('dashboard');
      return;
    }
    safeNavigate(item.id);
  };

  const pageBar = useMemo(() => PAGE_TOPBAR[tab] || { title: 'SRM-MS', breadcrumb: '—' }, [tab]);

  /** Une seule section ouverte à la fois ; fermer les autres à l’ouverture. */
  const toggleDrawerSection = (sectionTitle) => {
    setDrawerSectionsOpen((prev) => {
      if (prev[sectionTitle]) {
        return { ...prev, [sectionTitle]: false };
      }
      const next = {};
      navSections.forEach((s) => {
        next[s.section] = s.section === sectionTitle;
      });
      return next;
    });
  };

  const renderSidebarNav = () => (
    <ScrollView style={styles.drawerScroll} contentContainerStyle={styles.drawerScrollContent} showsVerticalScrollIndicator>
      {navSections.map((sec) => {
        const expanded = !!drawerSectionsOpen[sec.section];
        return (
          <View key={sec.section} style={styles.navSection}>
            <Pressable
              style={styles.navSectionHeader}
              onPress={() => toggleDrawerSection(sec.section)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
            >
              <Text style={styles.navSectionHeading}>{sec.section}</Text>
              <FontAwesome5 name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={COLORS.textLight} solid />
            </Pressable>
            {expanded ? (
              <View style={styles.navSectionCard}>
                {sec.items.map((item, idx) => (
                  <TouchableOpacity
                    key={`${sec.section}-${item.id}`}
                    style={[styles.navRow, idx < sec.items.length - 1 && styles.navRowBorder]}
                    onPress={() => onNavItemPress(item)}
                    activeOpacity={0.65}
                  >
                    <View style={[styles.navRowIconWrap, { backgroundColor: `${item.color}14` }]}>
                      <FontAwesome5 name={item.fa} size={14} color={item.color} solid />
                    </View>
                    <Text style={styles.navRowLabel} numberOfLines={2}>
                      {item.label}
                    </Text>
                    {item.badge != null && item.badge > 0 ? (
                      <View style={styles.navCountBadge}>
                        <Text style={styles.navCountBadgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}

      <View style={styles.drawerFooter}>
        <TouchableOpacity
          style={styles.drawerFooterRow}
          onPress={() => {
            setSidebarOpen(false);
            setTab('profil');
          }}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="user-circle" size={17} color={COLORS.primary} solid style={{ width: 26 }} />
          <Text style={styles.drawerFooterText}>Mon profil</Text>
        </TouchableOpacity>
        <Text style={styles.drawerBuildTag}>{MOBILE_UI_BUILD}</Text>
      </View>
    </ScrollView>
  );

  const renderGenericCard = ({ item }) => {
    if (listKind === 'map') {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{item.key}</Text>
          <Text style={styles.cardSubTitle}>{item.values}</Text>
        </View>
      );
    }
    const { mainTitle, subTitle, badgeValue } = summarizeRecord(item);
    const skip = new Set(['id', 'numero', 'matricule', 'nom', 'prenom', 'beneficiaire', 'statut', 'etat', 'situation', 'type', 'email', 'title', 'body', 'read', 'createdAt']);
    const extras = Object.entries(item).filter(([k]) => !skip.has(k));

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{mainTitle}</Text>
            {subTitle ? <Text style={styles.cardSubTitle}>{subTitle}</Text> : null}
          </View>
          {badgeValue ? (
            <View style={[styles.badge, { backgroundColor: `${getStatusColor(badgeValue)}20` }]}>
              <Text style={[styles.badgeText, { color: getStatusColor(badgeValue) }]}>{String(badgeValue)}</Text>
            </View>
          ) : null}
        </View>
        {extras.length > 0 ? (
          <>
            <View style={styles.cardDivider} />
            <View style={styles.cardBody}>
              {extras.slice(0, 8).map(([key, value]) => (
                <View key={key} style={styles.detailRow}>
                  <Text style={styles.detailKey}>{key}</Text>
                  <Text style={styles.detailValue} numberOfLines={3}>
                    {Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </View>
    );
  };

  const renderListScreen = () => {
    const route = routeById(tab);
    if (!route) return null;
    const slice = listRows.slice(0, listVisible);
    const canMore = listVisible < listRows.length;

    return (
      <View style={styles.page}>
        <View style={styles.listHeader}>
          <TouchableOpacity
            onPress={() => {
              setTab('dashboard');
              setSidebarOpen(true);
            }}
            style={styles.backLink}
            activeOpacity={0.55}
          >
            <FontAwesome5 name="chevron-left" size={14} color={COLORS.primary} solid />
            <Text style={styles.backLinkText}>Menu</Text>
          </TouchableOpacity>
          <View style={styles.pageTitleRow}>
            <FontAwesome5 name={route.fa} size={20} color={COLORS.text} solid />
            <Text style={styles.pageTitleSmall} numberOfLines={1}>
              {route.title}
            </Text>
          </View>
        </View>
        {listError ? <Text style={styles.errorBanner}>{listError}</Text> : null}
        {listLoading && listRows.length === 0 ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 32 }} />
        ) : (
          <FlatList
            data={slice}
            keyExtractor={(row, idx) => String(row.id ?? row.key ?? idx)}
            renderItem={renderGenericCard}
            refreshControl={
              <RefreshControl
                refreshing={listRefreshing}
                onRefresh={() => loadListForRoute(route, { refreshing: true })}
              />
            }
            ListEmptyComponent={
              !listLoading ? <Text style={{ textAlign: 'center', marginTop: 40, color: COLORS.textLight }}>Aucune donnée.</Text> : null
            }
            ListFooterComponent={
              canMore ? (
                <TouchableOpacity style={styles.loadMoreBtn} onPress={() => setListVisible((v) => v + PAGE_SIZE)}>
                  <Text style={styles.loadMoreText}>Charger {PAGE_SIZE} de plus ({listRows.length - listVisible} restants)</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ height: 24 }} />
              )
            }
            contentContainerStyle={{ paddingBottom: 24 + TAB_BAR_EXTRA_BOTTOM }}
          />
        )}
      </View>
    );
  };

  const renderNotifications = () => {
    const slice = notifRows.slice(0, notifVisible);
    const canMore = notifVisible < notifRows.length;
    return (
      <View style={styles.page}>
        <View style={styles.listHeader}>
          <TouchableOpacity onPress={() => setTab('dashboard')} style={styles.backLink} activeOpacity={0.55}>
            <FontAwesome5 name="chevron-left" size={14} color={COLORS.primary} solid />
            <Text style={styles.backLinkText}>Tableau de bord</Text>
          </TouchableOpacity>
          <View style={styles.pageTitleRow}>
            <FontAwesome5 name="bell" size={20} color={COLORS.text} solid />
            <Text style={styles.pageTitleSmall}>Notifications</Text>
          </View>
        </View>
        {notifLoading && notifRows.length === 0 ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 32 }} />
        ) : (
          <FlatList
            data={slice}
            keyExtractor={(row) => String(row.id)}
            refreshControl={<RefreshControl refreshing={notifRefreshing} onRefresh={() => loadNotifications({ refreshing: true })} />}
            ItemSeparatorComponent={() => <View style={styles.notifSeparator} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.notifCell, item.read ? null : styles.notifCellUnread]}
                onPress={() => onMarkNotifRead(item)}
                activeOpacity={0.65}
              >
                <Text style={styles.notifCellTitle}>{item.notifType || 'Message'}</Text>
                <Text style={styles.notifCellBody} numberOfLines={4}>
                  {item.body}
                </Text>
                <Text style={styles.notifCellMeta}>
                  {item.read ? 'Lu' : 'Non lu'} · {item.createdAt ? String(item.createdAt).slice(0, 16).replace('T', ' ') : ''}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={!notifLoading ? <Text style={{ textAlign: 'center', marginTop: 40, color: COLORS.textLight }}>Aucune notification.</Text> : null}
            ListFooterComponent={
              canMore ? (
                <TouchableOpacity style={styles.loadMoreBtn} onPress={() => setNotifVisible((v) => v + PAGE_SIZE)}>
                  <Text style={styles.loadMoreText}>Charger {PAGE_SIZE} de plus</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ height: 24 }} />
              )
            }
            contentContainerStyle={{ paddingBottom: 24 + TAB_BAR_EXTRA_BOTTOM }}
          />
        )}
      </View>
    );
  };

  const renderProfile = () => (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHeader}>
        <View style={styles.largeAvatar}>
          <Text style={styles.largeAvatarText}>{initialsFromName(user.name)}</Text>
        </View>
        <Text style={styles.profileName}>{user.name}</Text>
        <Text style={styles.profileRole}>{user.role}</Text>
        <Text style={styles.profileEmail}>{user.email}</Text>
      </View>
      <View style={styles.profileSection}>
        <Text style={styles.profileSectionTitle}>Changer le mot de passe</Text>
        <Text style={styles.label}>Mot de passe actuel</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={pwdCurrent}
          onChangeText={setPwdCurrent}
          placeholder="••••••••"
          placeholderTextColor={COLORS.textLight}
        />
        <Text style={styles.label}>Nouveau mot de passe</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={pwdNew}
          onChangeText={setPwdNew}
          placeholder="••••••••"
          placeholderTextColor={COLORS.textLight}
        />
        <Text style={styles.label}>Confirmer</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={pwdConfirm}
          onChangeText={setPwdConfirm}
          placeholder="••••••••"
          placeholderTextColor={COLORS.textLight}
        />
        <TouchableOpacity style={styles.primaryButton} onPress={handleProfilePasswordChange} disabled={pwdLoading}>
          {pwdLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Mettre à jour le mot de passe</Text>}
        </TouchableOpacity>
      </View>
      <View style={styles.profileOptions}>
        <TouchableOpacity style={styles.optionItem} onPress={() => safeNavigate('notifications')}>
          <FontAwesome5 name="bell" size={18} color={COLORS.text} solid style={styles.optionFa} />
          <Text style={styles.optionText}>Notifications</Text>
          {unreadCount > 0 ? (
            <View style={styles.miniBadge}>
              <Text style={styles.miniBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionItem} onPress={logout}>
          <FontAwesome5 name="sign-out-alt" size={18} color={COLORS.danger} solid style={styles.optionFa} />
          <Text style={[styles.optionText, { color: COLORS.danger }]}>Déconnexion</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 24 + TAB_BAR_EXTRA_BOTTOM }} />
    </ScrollView>
  );

  const onBottomTabPress = (itemId) => {
    if (itemId === DASHBOARD_PAGE_ID) {
      safeNavigate(isAdherentRole(user) ? 'mes-devis' : 'dashboard');
      return;
    }
    safeNavigate(itemId);
  };

  const renderBottomNav = () => (
    <View style={styles.bottomTabBarOuter} accessibilityRole="tablist">
      <View style={styles.bottomTabBar}>
        {bottomNavItems.map((item) => {
          const active = tab === item.id;
          return (
            <Pressable
              key={item.id}
              style={styles.bottomTabItem}
              onPress={() => onBottomTabPress(item.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <FontAwesome5 name={item.fa} size={19} color={active ? COLORS.primary : COLORS.textLight} solid />
              <Text
                style={[styles.bottomTabLabel, active && styles.bottomTabLabelActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderContent = () => {
    if (tab === 'dashboard') return renderHome();
    if (tab === 'profil') return renderProfile();
    if (FEATURE_SCREEN_IDS.has(tab) || tab === 'notifications') {
      return (
        <View style={[styles.page, styles.featurePage]}>
          <FeatureRouter
            tab={tab}
            user={user}
            addToast={addToast}
            onNavigate={safeNavigate}
            onUnreadChanged={setUnreadCount}
          />
        </View>
      );
    }
    if (routeById(tab)) return renderListScreen();
    return renderHome();
  };

  if (booting) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, color: COLORS.textLight }}>Chargement…</Text>
      </View>
    );
  }

  if (!user) {
    return renderLogin();
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.appShell}>
        <View style={styles.appHeader}>
          <Pressable
            style={styles.headerIconPress}
            onPress={() => setSidebarOpen(true)}
            accessibilityLabel="Ouvrir le menu"
            hitSlop={10}
          >
            <FontAwesome5 name="bars" size={22} color={COLORS.text} solid />
          </Pressable>
          <View style={styles.appHeaderCenter}>
            <Text style={styles.appHeaderTitle} numberOfLines={1}>
              {pageBar.title}
            </Text>
            <Text style={styles.appHeaderBreadcrumb} numberOfLines={1}>
              Accueil • {pageBar.breadcrumb}
            </Text>
          </View>
          <Pressable
            style={styles.headerIconPress}
            onPress={() => {
              setSidebarOpen(false);
              safeNavigate('notifications');
            }}
            accessibilityLabel="Notifications"
            hitSlop={10}
          >
            <View style={styles.headerBellWrap}>
              <FontAwesome5 name="bell" size={22} color={COLORS.primary} solid />
              {unreadCount > 0 ? <View style={styles.headerBellDot} /> : null}
            </View>
          </Pressable>
        </View>

        <View style={styles.main}>{renderContent()}</View>
        {!sidebarOpen ? renderBottomNav() : null}

        {sidebarOpen ? (
          <>
            <Pressable
              style={styles.drawerBackdrop}
              onPress={() => setSidebarOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Fermer le menu"
            />
            <View style={[styles.drawerPanel, { width: DRAWER_WIDTH }]} accessibilityViewIsModal>
              <View style={styles.drawerBrand}>
                <Image source={require('./assets/srm-company-logo.png')} style={styles.drawerLogo} resizeMode="contain" />
                <View style={styles.drawerBrandText}>
                  <Text style={styles.drawerBrandTitle}>SRM-MS</Text>
                  <Text style={styles.drawerBrandUser} numberOfLines={1}>
                    {user.name}
                  </Text>
                  <Text style={styles.drawerBrandRole} numberOfLines={1}>
                    {user.role}
                  </Text>
                </View>
                <Pressable onPress={() => setSidebarOpen(false)} style={styles.drawerCloseBtn} hitSlop={14} accessibilityLabel="Fermer le menu">
                  <FontAwesome5 name="times" size={22} color="rgba(255,255,255,0.95)" solid />
                </Pressable>
              </View>
              {renderSidebarNav()}
            </View>
          </>
        ) : null}
      </View>

      <TouchableOpacity style={styles.chatFab} onPress={() => setChatOpen(true)} accessibilityLabel="Assistant SRM">
        <FontAwesome5 name="comment-dots" size={22} color="#fff" solid />
      </TouchableOpacity>
      {chatOpen ? (
        <View style={styles.chatOverlay}>
          <ChatbotScreen onBack={() => setChatOpen(false)} userName={user.name} />
        </View>
      ) : null}
      <ToastOverlay toasts={toasts} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  appShell: { flex: 1, position: 'relative' },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 52,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  /** Icônes seules, sans cadre ni fond (type barre native). */
  headerIconPress: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appHeaderCenter: { flex: 1, minWidth: 0, paddingHorizontal: 6, justifyContent: 'center' },
  appHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  appHeaderBreadcrumb: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 2,
  },
  headerBellWrap: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  headerBellDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.danger,
    borderWidth: 1,
    borderColor: COLORS.surface,
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    zIndex: 1000,
  },
  drawerPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1001,
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 28,
  },
  drawerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: COLORS.loginBrandBg,
  },
  drawerLogo: { width: 44, height: 44, marginRight: 10 },
  drawerBrandText: { flex: 1, minWidth: 0, marginRight: 8 },
  drawerBrandTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  drawerBrandUser: { fontSize: 13, color: 'rgba(255,255,255,0.92)', marginTop: 3 },
  drawerBrandRole: { fontSize: 11, color: 'rgba(255,255,255,0.78)', marginTop: 2 },
  drawerCloseBtn: { padding: 6, justifyContent: 'center', alignItems: 'center' },
  drawerScroll: { flex: 1, backgroundColor: COLORS.surface },
  drawerScrollContent: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 20 },
  drawerFooter: { marginTop: 4, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  drawerFooterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  drawerFooterText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text, marginLeft: 8 },
  drawerBuildTag: { fontSize: 10, color: COLORS.textLight, marginTop: 12, textAlign: 'center' },
  main: { flex: 1 },
  page: { flex: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 + TAB_BAR_EXTRA_BOTTOM },
  featurePage: { paddingHorizontal: 16, paddingTop: 12 },
  bottomTabBarOuter: {
    backgroundColor: COLORS.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 18 : 10,
  },
  bottomTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    minHeight: 48,
  },
  bottomTabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, gap: 4 },
  bottomTabLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textLight, textAlign: 'center' },
  bottomTabLabelActive: { color: COLORS.primary },

  loginRoot: { flex: 1, backgroundColor: COLORS.background },
  loginScroll: { flexGrow: 1, paddingBottom: 32 },
  loginBrandBlock: {
    alignItems: 'center',
    paddingTop: 44,
    paddingHorizontal: 20,
    paddingBottom: 32,
    backgroundColor: COLORS.loginBrandBg,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  loginLogoRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  loginBrandImg: { width: 76, height: 76 },
  loginBrandTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  loginBrandKicker: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4, fontWeight: '600' },
  loginBrandSub: { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 8 },
  loginBrandLine: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 6, paddingHorizontal: 12 },
  loginTagline: { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 20, fontStyle: 'italic', paddingHorizontal: 16 },
  loginCard: {
    marginHorizontal: 16,
    marginTop: -16,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  loginHeading: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  loginLead: { fontSize: 14, color: COLORS.textLight, marginBottom: 16, lineHeight: 20 },
  loginAlert: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#fecaca' },
  loginAlertText: { color: COLORS.danger, fontSize: 14 },
  req: { color: COLORS.danger },
  loginBuildTag: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: 14,
  },
  loginCopy: { fontSize: 11, color: COLORS.textLight, textAlign: 'center', marginTop: 8 },

  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, fontSize: 16, color: COLORS.text, marginBottom: 16 },
  inputFlex: { flex: 1, marginBottom: 0 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  eyeBtn: { padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  apiHint: { fontSize: 11, color: COLORS.textLight, marginBottom: 8 },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: { color: 'white', fontSize: 17, fontWeight: '700' },

  rolePill: { marginTop: 6, fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  errorBanner: { color: COLORS.danger, marginBottom: 12, fontSize: 13 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 8 },
  greeting: { fontSize: 16, color: COLORS.textLight },
  userName: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  sectionTitle: { fontSize: 19, fontWeight: '700', color: COLORS.text, marginBottom: 14, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { width: (width - 56) / 2, backgroundColor: COLORS.surface, borderRadius: 18, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  statIconFa: { marginBottom: 10 },
  statValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  statLabel: { fontSize: 13, color: COLORS.textLight },

  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  listItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  itemSub: { fontSize: 12, color: COLORS.textLight },

  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start' },
  badgeWarning: { backgroundColor: `${COLORS.warning}22` },
  badgeSuccess: { backgroundColor: `${COLORS.success}22` },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextWarning: { color: COLORS.warning },
  badgeTextSuccess: { color: COLORS.success },

  pageTitleBig: { fontSize: 26, fontWeight: 'bold', color: COLORS.text, marginBottom: 8, marginTop: 4 },
  menuHint: { fontSize: 13, color: COLORS.textLight, marginBottom: 16, lineHeight: 19 },
  navSection: { marginBottom: 10 },
  navSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  navSectionHeading: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.secondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  navSectionCard: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginLeft: 2,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  navRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  navRowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  navRowLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text, marginRight: 6 },
  navCountBadge: {
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    marginRight: 6,
  },
  navCountBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center' },

  listHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 0, flexWrap: 'wrap', gap: 8 },
  /** Lien retour texte + chevron, sans carte ni bordure. */
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingRight: 8 },
  backLinkText: { color: COLORS.primary, fontWeight: '600', fontSize: 16 },
  notifCell: {
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    paddingHorizontal: 2,
  },
  notifCellUnread: { backgroundColor: 'rgba(15, 111, 184, 0.06)' },
  notifCellTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  notifCellBody: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  notifCellMeta: { fontSize: 12, color: COLORS.textLight, marginTop: 8 },
  notifSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },
  pageTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 100 },
  pageTitleSmall: { fontSize: 17, fontWeight: 'bold', color: COLORS.text, flex: 1 },

  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  cardSubTitle: { fontSize: 13, color: COLORS.textLight, lineHeight: 18 },
  cardDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  cardBody: { flexDirection: 'column' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, gap: 8 },
  detailKey: { fontSize: 12, color: COLORS.textLight, flex: 1 },
  detailValue: { fontSize: 12, color: COLORS.text, fontWeight: '500', flex: 1.2, textAlign: 'right' },

  loadMoreBtn: { marginVertical: 16, padding: 14, borderRadius: 12, backgroundColor: `${COLORS.primary}18`, alignItems: 'center' },
  loadMoreText: { color: COLORS.secondary, fontWeight: '700', fontSize: 14 },

  profileHeader: { alignItems: 'center', paddingVertical: 28 },
  largeAvatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  largeAvatarText: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  profileName: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  profileRole: { fontSize: 15, color: COLORS.textLight },
  profileEmail: { fontSize: 13, color: COLORS.textLight, marginTop: 8 },
  profileSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileSectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 12, marginTop: -8 },
  forgotLinkText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  linkBtn: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  linkBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  profileOptions: { backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginHorizontal: 16 },
  optionItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  optionFa: { width: 28, marginRight: 12 },
  optionText: { fontSize: 16, color: COLORS.text, fontWeight: '500', flex: 1 },
  miniBadge: { backgroundColor: COLORS.danger, borderRadius: 10, minWidth: 22, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center' },
  miniBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  chatFab: {
    position: 'absolute',
    right: 18,
    bottom: Platform.OS === 'ios' ? 96 : 88,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 50,
  },
  chatOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: COLORS.background, zIndex: 2000 },
});
