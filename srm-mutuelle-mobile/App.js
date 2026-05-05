import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Platform, Dimensions, Image } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import SimData from './data';
import { API_BASE_URL } from './config';
import ChatbotScreen from './ChatbotScreen';

const { width } = Dimensions.get('window');

// Colors
const COLORS = {
  primary: '#0d9488', // Teal
  secondary: '#115e59',
  accent: '#14b8a6',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#1e293b',
  textLight: '#64748b',
  border: '#e2e8f0',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6'
};

const MENU_ITEMS = [
  { id: 'agents', title: 'Bénéficiaires', fa: 'users', color: '#3b82f6' },
  { id: 'ordonnances', title: 'Ordonnances', fa: 'clipboard-list', color: '#8b5cf6' },
  { id: 'devis', title: 'Devis', fa: 'file-invoice', color: '#f59e0b' },
  { id: 'remboursements', title: 'Remboursements', fa: 'money-bill-wave', color: '#10b981' },
  { id: 'prisesEnCharge', title: 'Prises en charge', fa: 'hospital', color: '#ec4899' },
  { id: 'maladiesSpeciales', title: 'Maladies', fa: 'stethoscope', color: '#ef4444' },
  { id: 'etablissements', title: 'Établissements', fa: 'building', color: '#6366f1' },
  { id: 'entites', title: 'Entités Org.', fa: 'landmark', color: '#14b8a6' },
  { id: 'utilisateurs', title: 'Utilisateurs', fa: 'user-shield', color: '#64748b' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('home');
  const [loginError, setLoginError] = useState('');
  const [chatOpen, setChatOpen] = useState(false);

  const handleLogin = async () => {
    try {
      setLoginError('');
      const response = await fetch(`${API_BASE_URL}/api/health`);
      if (!response.ok) {
        throw new Error('Backend non disponible');
      }
      setUser({ name: 'Admin SRM', role: 'Administrateur' });
    } catch (error) {
      setLoginError(`Connexion backend echouee: ${error.message}`);
    }
  };
  const logout = () => setUser(null);

  if (!user) {
    return (
      <View style={styles.loginContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loginHeader}>
          <Image
            source={require('./assets/srm-brand-logo.png')}
            style={styles.loginBrandImg}
            resizeMode="contain"
            accessibilityLabel="SRM-MS — Société Régionale Multiservices Marrakech-Safi"
          />
          <Text style={styles.loginSubtitle}>Espace professionnel</Text>
        </View>
        <View style={styles.loginForm}>
          <Text style={styles.label}>Adresse email</Text>
          <TextInput style={styles.input} placeholder="Entrez votre email" placeholderTextColor={COLORS.textLight} keyboardType="email-address" />
          <Text style={styles.label}>Mot de passe</Text>
          <TextInput style={styles.input} placeholder="Votre mot de passe" placeholderTextColor={COLORS.textLight} secureTextEntry />
          <Text style={styles.apiHint}>API: {API_BASE_URL}</Text>
          {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}
          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
            <Text style={styles.primaryButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderHome = () => (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour,</Text>
          <Text style={styles.userName}>{user.name}</Text>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarText}>AD</Text></View>
      </View>

      <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}><FontAwesome5 name="users" size={26} color={COLORS.primary} solid style={styles.statIconFa} /><Text style={styles.statValue}>{SimData.agents.length}</Text><Text style={styles.statLabel}>Agents</Text></View>
        <View style={styles.statCard}><FontAwesome5 name="money-bill-wave" size={26} color={COLORS.primary} solid style={styles.statIconFa} /><Text style={styles.statValue}>{SimData.remboursements.filter(r=>r.statut==='En attente').length}</Text><Text style={styles.statLabel}>À traiter</Text></View>
        <View style={styles.statCard}><FontAwesome5 name="clipboard-list" size={26} color={COLORS.primary} solid style={styles.statIconFa} /><Text style={styles.statValue}>{SimData.ordonnances.length}</Text><Text style={styles.statLabel}>Ordonnances</Text></View>
        <View style={styles.statCard}><FontAwesome5 name="hospital" size={26} color={COLORS.primary} solid style={styles.statIconFa} /><Text style={styles.statValue}>{SimData.etablissements.length}</Text><Text style={styles.statLabel}>Centres</Text></View>
      </View>

      <Text style={styles.sectionTitle}>Dernières demandes</Text>
      {SimData.remboursements.slice(0, 3).map((r) => (
        <View key={r.id} style={styles.listItem}>
          <View style={styles.listItemLeft}>
            <View style={[styles.iconBox, {backgroundColor: COLORS.primary + '20'}]}><FontAwesome5 name="file-alt" size={20} color={COLORS.primary} solid /></View>
            <View>
              <Text style={styles.itemTitle}>{r.montantDemande} DH</Text>
              <Text style={styles.itemSub}>{r.dateDemande} • {r.beneficiaire}</Text>
            </View>
          </View>
          <View style={[styles.badge, r.statut === 'Traité' ? styles.badgeSuccess : styles.badgeWarning]}>
            <Text style={[styles.badgeText, r.statut === 'Traité' ? styles.badgeTextSuccess : styles.badgeTextWarning]}>{r.statut}</Text>
          </View>
        </View>
      ))}
      <View style={{height: 40}}/>
    </ScrollView>
  );

  const renderMenu = () => (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitleBig}>Menu Principal</Text>
      <View style={styles.gridContainer}>
        {MENU_ITEMS.map(item => (
          <TouchableOpacity key={item.id} style={styles.gridItem} onPress={() => setTab(item.id)}>
            <View style={[styles.gridIconBox, { backgroundColor: item.color + '15' }]}>
              <FontAwesome5 name={item.fa} size={22} color={item.color} solid />
            </View>
            <Text style={styles.gridItemText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{height: 40}}/>
    </ScrollView>
  );

  const getStatusColor = (statut) => {
    if (!statut) return COLORS.info;
    const lower = statut.toLowerCase();
    if (lower.includes('validé') || lower.includes('approuvé') || lower.includes('traité') || lower.includes('clôturé') || lower === 'actif') return COLORS.success;
    if (lower.includes('attente')) return COLORS.warning;
    if (lower.includes('rejeté') || lower === 'inactif') return COLORS.danger;
    return COLORS.info;
  };

  const renderGenericList = (type) => {
    const data = SimData[type] || [];
    const menuItem = MENU_ITEMS.find(m => m.id === type);
    const title = menuItem?.title || type;
    const faName = menuItem?.fa || 'file-alt';

    return (
      <View style={styles.page}>
        <View style={styles.listHeader}>
           <TouchableOpacity onPress={() => setTab('menu')} style={styles.backBtnRow}>
             <FontAwesome5 name="chevron-left" size={14} color={COLORS.primary} solid />
             <Text style={styles.backBtnText}>Retour</Text>
           </TouchableOpacity>
           <View style={styles.pageTitleRow}>
             <FontAwesome5 name={faName} size={20} color={COLORS.text} solid />
             <Text style={styles.pageTitleSmall}>{title}</Text>
           </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 80}}>
          {data.length === 0 && <Text style={{textAlign:'center', marginTop:40, color: COLORS.textLight}}>Aucune donnée trouvée.</Text>}
          {data.map(item => {
            const mainTitle = item.numero || item.matricule || item.nom || item.code || `ID: ${item.id}`;
            const subTitle = item.beneficiaire || item.prenom || item.type || item.email || '';
            const badgeValue = item.statut || item.etat || item.situation || null;

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{mainTitle}</Text>
                    {subTitle ? <Text style={styles.cardSubTitle}>{subTitle}</Text> : null}
                  </View>
                  {badgeValue && (
                    <View style={[styles.badge, { backgroundColor: getStatusColor(badgeValue) + '20' }]}>
                      <Text style={[styles.badgeText, { color: getStatusColor(badgeValue) }]}>{badgeValue}</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.cardDivider} />
                
                <View style={styles.cardBody}>
                  {Object.entries(item).filter(([k]) => !['id','numero','matricule','nom','prenom','beneficiaire','statut','etat','situation','type','email'].includes(k)).map(([key, value]) => (
                    <View key={key} style={styles.detailRow}>
                      <Text style={styles.detailKey}>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</Text>
                      <Text style={styles.detailValue}>{Array.isArray(value) ? value.join(', ') : String(value)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderProfile = () => (
    <View style={styles.page}>
      <View style={styles.profileHeader}>
        <View style={styles.largeAvatar}><Text style={styles.largeAvatarText}>AD</Text></View>
        <Text style={styles.profileName}>{user.name}</Text>
        <Text style={styles.profileRole}>{user.role}</Text>
      </View>
      <View style={styles.profileOptions}>
        <TouchableOpacity style={styles.optionItem}><FontAwesome5 name="cog" size={18} color={COLORS.text} solid style={styles.optionFa} /><Text style={styles.optionText}>Paramètres</Text></TouchableOpacity>
        <TouchableOpacity style={styles.optionItem}><FontAwesome5 name="bell" size={18} color={COLORS.text} solid style={styles.optionFa} /><Text style={styles.optionText}>Notifications</Text></TouchableOpacity>
        <TouchableOpacity style={styles.optionItem} onPress={logout}><FontAwesome5 name="sign-out-alt" size={18} color={COLORS.danger} solid style={styles.optionFa} /><Text style={[styles.optionText, { color: COLORS.danger }]}>Déconnexion</Text></TouchableOpacity>
      </View>
    </View>
  );

  const renderContent = () => {
    if (tab === 'home') return renderHome();
    if (tab === 'menu') return renderMenu();
    if (tab === 'profile') return renderProfile();
    return renderGenericList(tab);
  };

  const isMenuTabActive = tab === 'menu' || MENU_ITEMS.some((m) => m.id === tab);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.main}>{renderContent()}</View>
      <TouchableOpacity style={styles.chatFab} onPress={() => setChatOpen(true)} accessibilityLabel="Ouvrir l’assistant SRM">
        <FontAwesome5 name="comment-dots" size={22} color="#fff" solid />
      </TouchableOpacity>
      {chatOpen ? (
        <View style={styles.chatOverlay}>
          <ChatbotScreen onBack={() => setChatOpen(false)} userName={user.name} />
        </View>
      ) : null}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab} onPress={() => setTab('home')}>
          <FontAwesome5 name="home" size={22} color={tab === 'home' ? COLORS.primary : COLORS.textLight} solid />
          <Text style={[styles.tabLabel, tab === 'home' && styles.tabActive]}>Accueil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setTab('menu')}>
          <FontAwesome5 name="th-large" size={20} color={isMenuTabActive ? COLORS.primary : COLORS.textLight} solid />
          <Text style={[styles.tabLabel, isMenuTabActive && styles.tabActive]}>Menu</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setTab('profile')}>
          <FontAwesome5 name="user" size={22} color={tab === 'profile' ? COLORS.primary : COLORS.textLight} solid />
          <Text style={[styles.tabLabel, tab === 'profile' && styles.tabActive]}>Profil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  main: { flex: 1 },
  page: { flex: 1, padding: 20 },
  
  // Login
  loginContainer: { flex: 1, backgroundColor: COLORS.primary },
  loginHeader: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  loginBrandImg: {
    width: Math.min(width * 0.88, 320),
    height: 120,
    marginBottom: 16,
  },
  loginSubtitle: { fontSize: 18, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  loginForm: { backgroundColor: COLORS.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingTop: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, fontSize: 16, color: COLORS.text, marginBottom: 20 },
  apiHint: { fontSize: 12, color: COLORS.textLight, marginBottom: 8 },
  errorText: { color: COLORS.danger, marginBottom: 10, fontSize: 13 },
  primaryButton: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  primaryButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  // Home
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, marginTop: 10 },
  greeting: { fontSize: 16, color: COLORS.textLight },
  userName: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 16, marginTop: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { width: (width - 60) / 2, backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statIconFa: { marginBottom: 12 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  statLabel: { fontSize: 14, color: COLORS.textLight },

  // Generic List Item (Dashboard)
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
  listItemLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  itemSub: { fontSize: 13, color: COLORS.textLight },

  // Badges
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start' },
  badgeWarning: { backgroundColor: COLORS.warning + '20' },
  badgeSuccess: { backgroundColor: COLORS.success + '20' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeTextWarning: { color: COLORS.warning },
  badgeTextSuccess: { color: COLORS.success },

  // Menu Grid
  pageTitleBig: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 24, marginTop: 10 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: (width - 60) / 3, backgroundColor: COLORS.surface, borderRadius: 20, padding: 16, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  gridIconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  gridItemText: { fontSize: 12, color: COLORS.text, fontWeight: '600', textAlign: 'center' },

  // Generic List Screen
  listHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 10, flexWrap: 'wrap', gap: 8 },
  backBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 12, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  backBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
  pageTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 120 },
  pageTitleSmall: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, flex: 1 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  cardSubTitle: { fontSize: 14, color: COLORS.textLight },
  cardDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  cardBody: { flexDirection: 'column' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  detailKey: { fontSize: 13, color: COLORS.textLight, flex: 1 },
  detailValue: { fontSize: 13, color: COLORS.text, fontWeight: '500', flex: 1, textAlign: 'right' },

  // Profile
  profileHeader: { alignItems: 'center', paddingVertical: 40 },
  largeAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  largeAvatarText: { color: 'white', fontSize: 36, fontWeight: 'bold' },
  profileName: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  profileRole: { fontSize: 16, color: COLORS.textLight },
  profileOptions: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 10, marginTop: 20 },
  optionItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  optionFa: { width: 28, marginRight: 12 },
  optionText: { fontSize: 16, color: COLORS.text, fontWeight: '500' },

  // TabBar
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: Platform.OS === 'ios' ? 20 : 10, paddingTop: 10 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 12, color: COLORS.textLight, fontWeight: '500', marginTop: 4 },
  tabActive: { color: COLORS.primary },
  chatFab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 92 : 84,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9,
  },
  chatOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: COLORS.background,
    zIndex: 12,
  },
});
