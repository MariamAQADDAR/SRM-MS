import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Platform, Dimensions } from 'react-native';
import SimData from './data';

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
  { id: 'agents', title: 'Bénéficiaires', icon: '👥', color: '#3b82f6' },
  { id: 'ordonnances', title: 'Ordonnances', icon: '📋', color: '#8b5cf6' },
  { id: 'devis', title: 'Devis', icon: '📄', color: '#f59e0b' },
  { id: 'remboursements', title: 'Remboursements', icon: '💰', color: '#10b981' },
  { id: 'prisesEnCharge', title: 'Prises en charge', icon: '🏥', color: '#ec4899' },
  { id: 'maladiesSpeciales', title: 'Maladies', icon: '🩺', color: '#ef4444' },
  { id: 'etablissements', title: 'Établissements', icon: '🏢', color: '#6366f1' },
  { id: 'entites', title: 'Entités Org.', icon: '🏛️', color: '#14b8a6' },
  { id: 'utilisateurs', title: 'Utilisateurs', icon: '🔐', color: '#64748b' }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('home');

  const handleLogin = () => setUser({ name: 'Admin SRM', role: 'Administrateur' });
  const logout = () => setUser(null);

  if (!user) {
    return (
      <View style={styles.loginContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loginHeader}>
          <Text style={styles.loginTitle}>SRM Mutuelle</Text>
          <Text style={styles.loginSubtitle}>Espace Professionnel</Text>
        </View>
        <View style={styles.loginForm}>
          <Text style={styles.label}>Adresse email</Text>
          <TextInput style={styles.input} placeholder="Entrez votre email" placeholderTextColor={COLORS.textLight} keyboardType="email-address" />
          <Text style={styles.label}>Mot de passe</Text>
          <TextInput style={styles.input} placeholder="Votre mot de passe" placeholderTextColor={COLORS.textLight} secureTextEntry />
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
        <View style={styles.statCard}><Text style={styles.statIcon}>👥</Text><Text style={styles.statValue}>{SimData.agents.length}</Text><Text style={styles.statLabel}>Agents</Text></View>
        <View style={styles.statCard}><Text style={styles.statIcon}>💰</Text><Text style={styles.statValue}>{SimData.remboursements.filter(r=>r.statut==='En attente').length}</Text><Text style={styles.statLabel}>À traiter</Text></View>
        <View style={styles.statCard}><Text style={styles.statIcon}>📋</Text><Text style={styles.statValue}>{SimData.ordonnances.length}</Text><Text style={styles.statLabel}>Ordonnances</Text></View>
        <View style={styles.statCard}><Text style={styles.statIcon}>🏥</Text><Text style={styles.statValue}>{SimData.etablissements.length}</Text><Text style={styles.statLabel}>Centres</Text></View>
      </View>

      <Text style={styles.sectionTitle}>Dernières demandes</Text>
      {SimData.remboursements.slice(0, 3).map((r) => (
        <View key={r.id} style={styles.listItem}>
          <View style={styles.listItemLeft}>
            <View style={[styles.iconBox, {backgroundColor: COLORS.primary + '20'}]}><Text>📄</Text></View>
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
              <Text style={styles.gridIcon}>{item.icon}</Text>
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
    const icon = menuItem?.icon || '📄';

    return (
      <View style={styles.page}>
        <View style={styles.listHeader}>
           <TouchableOpacity onPress={() => setTab('menu')} style={styles.backBtn}>
             <Text style={styles.backBtnText}>← Retour</Text>
           </TouchableOpacity>
           <Text style={styles.pageTitleSmall}>{icon} {title}</Text>
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
        <TouchableOpacity style={styles.optionItem}><Text style={styles.optionIcon}>⚙️</Text><Text style={styles.optionText}>Paramètres</Text></TouchableOpacity>
        <TouchableOpacity style={styles.optionItem}><Text style={styles.optionIcon}>🔔</Text><Text style={styles.optionText}>Notifications</Text></TouchableOpacity>
        <TouchableOpacity style={styles.optionItem} onPress={logout}><Text style={styles.optionIcon}>🚪</Text><Text style={[styles.optionText, { color: COLORS.danger }]}>Déconnexion</Text></TouchableOpacity>
      </View>
    </View>
  );

  const renderContent = () => {
    if(tab === 'home') return renderHome();
    if(tab === 'menu') return renderMenu();
    if(tab === 'profile') return renderProfile();
    return renderGenericList(tab);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.main}>{renderContent()}</View>
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab} onPress={() => setTab('home')}>
          <Text style={[styles.tabIcon, tab === 'home' && styles.tabActive]}>🏠</Text>
          <Text style={[styles.tabLabel, tab === 'home' && styles.tabActive]}>Accueil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setTab('menu')}>
          <Text style={[styles.tabIcon, (tab !== 'home' && tab !== 'profile') && styles.tabActive]}>🗂️</Text>
          <Text style={[styles.tabLabel, (tab !== 'home' && tab !== 'profile') && styles.tabActive]}>Menu</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setTab('profile')}>
          <Text style={[styles.tabIcon, tab === 'profile' && styles.tabActive]}>👤</Text>
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
  loginHeader: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  loginTitle: { fontSize: 36, fontWeight: 'bold', color: 'white', marginBottom: 10 },
  loginSubtitle: { fontSize: 18, color: 'rgba(255,255,255,0.8)' },
  loginForm: { backgroundColor: COLORS.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingTop: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, fontSize: 16, color: COLORS.text, marginBottom: 20 },
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
  statIcon: { fontSize: 28, marginBottom: 12 },
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
  gridIcon: { fontSize: 24 },
  gridItemText: { fontSize: 12, color: COLORS.text, fontWeight: '600', textAlign: 'center' },

  // Generic List Screen
  listHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  backBtn: { marginRight: 16, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: COLORS.surface, borderRadius: 10 },
  backBtnText: { color: COLORS.primary, fontWeight: '600' },
  pageTitleSmall: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
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
  optionIcon: { fontSize: 20, marginRight: 16 },
  optionText: { fontSize: 16, color: COLORS.text, fontWeight: '500' },

  // TabBar
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: Platform.OS === 'ios' ? 20 : 10, paddingTop: 10 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { fontSize: 24, color: COLORS.textLight, marginBottom: 4 },
  tabLabel: { fontSize: 12, color: COLORS.textLight, fontWeight: '500' },
  tabActive: { color: COLORS.primary },
});
