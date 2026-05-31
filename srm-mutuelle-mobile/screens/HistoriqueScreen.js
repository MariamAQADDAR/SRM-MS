import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, RefreshControl, Text, StyleSheet } from 'react-native';
import { apiFetch, parseJsonOrThrow } from '../api';
import { isAdherentRole } from '../authUtils';
import { formatDate, formatMoney } from '../utils/format';
import { downloadAndShare } from '../fileHelpers';
import { COLORS } from '../theme';
import {
  SearchBar,
  ListCard,
  OutlineButton,
  AppModal,
  DetailItem,
  ScreenToolbar,
  EmptyState,
  LoadingCenter,
  SelectField,
  TAB_BAR_EXTRA_BOTTOM,
} from '../components/ui';

const TABS = [
  { id: 'pec', label: 'PEC', fa: 'hospital' },
  { id: 'devis', label: 'Devis', fa: 'file-invoice' },
  { id: 'remb', label: 'Remboursements', fa: 'money-bill-wave' },
  { id: 'cards', label: 'Cartes', fa: 'id-card' },
];

export default function HistoriqueScreen({ user, addToast }) {
  const isAdherent = isAdherentRole(user);
  const agentId = user?.agentId;
  const [activeTab, setActiveTab] = useState('pec');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pecList, setPecList] = useState([]);
  const [quotesList, setQuotesList] = useState([]);
  const [rembList, setRembList] = useState([]);
  const [cardsList, setCardsList] = useState([]);
  const [detail, setDetail] = useState(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [pec, quotes, remb] = await Promise.all([
        parseJsonOrThrow(await apiFetch('/api/care-episodes')),
        parseJsonOrThrow(await apiFetch('/api/quotes')),
        parseJsonOrThrow(await apiFetch('/api/reimbursements')),
      ]);
      setPecList(pec);
      setQuotesList(quotes);
      setRembList(remb);
      if (agentId) {
        try {
          setCardsList(await parseJsonOrThrow(await apiFetch(`/api/mutual-cards/family/${agentId}`)));
        } catch {
          setCardsList([]);
        }
      }
    } catch (e) {
      addToast('error', e.message || 'Chargement historique impossible');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [agentId, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => ({
    totalReimbursed: rembList.filter((r) => r.statut === 'Traité').reduce((s, r) => s + (Number(r.montantValide) || 0), 0),
    approvedPec: pecList.filter((p) => p.statut === 'Approuvé').length,
    approvedQuotes: quotesList.filter((q) => q.etat === 'Approuvé').length,
    issuedCards: cardsList.filter((c) => c.hasPdf).length,
  }), [pecList, quotesList, rembList, cardsList]);

  const statusOptions = useMemo(() => {
    let list = [];
    if (activeTab === 'pec') list = [...new Set(pecList.map((p) => p.statut))];
    else if (activeTab === 'devis') list = [...new Set(quotesList.map((q) => q.etat))];
    else if (activeTab === 'remb') list = [...new Set(rembList.map((r) => r.statut))];
    return list.filter(Boolean).map((v) => ({ label: v, value: v }));
  }, [activeTab, pecList, quotesList, rembList]);

  const q = search.trim().toLowerCase();
  const match = (s) => !q || String(s || '').toLowerCase().includes(q);

  const data = useMemo(() => {
    if (activeTab === 'pec') {
      return pecList.filter((p) => match(p.numero) || match(p.beneficiaire) || match(p.etablissement)).filter((p) => !statusFilter || p.statut === statusFilter);
    }
    if (activeTab === 'devis') {
      return quotesList.filter((x) => match(x.numero) || match(x.beneficiaire)).filter((x) => !statusFilter || x.etat === statusFilter);
    }
    if (activeTab === 'remb') {
      return rembList.filter((x) => match(x.numero) || match(x.beneficiaire)).filter((x) => !statusFilter || x.statut === statusFilter);
    }
    return cardsList.filter((c) => match(c.fullName) || match(c.cardLabel) || match(c.cin));
  }, [activeTab, pecList, quotesList, rembList, cardsList, q, statusFilter]);

  const downloadDoc = async (type, item) => {
    const map = {
      pec: [`/api/care-episodes/${item.id}/document`, `pec-${item.numero}.pdf`],
      devis: [`/api/quotes/${item.id}/document`, `devis-${item.numero}.pdf`],
      remb: [`/api/reimbursements/${item.id}/document`, `remb-${item.numero}.pdf`],
      card: [`/api/mutual-cards/${item.cardId}/download`, `carte.pdf`],
    };
    const [path, name] = map[type] || [];
    if (!path) return;
    try {
      await downloadAndShare(path, name);
    } catch {
      addToast('error', 'PDF indisponible');
    }
  };

  const renderItem = ({ item }) => {
    if (activeTab === 'pec') {
      return <ListCard title={item.numero} subtitle={`${item.beneficiaire} · ${formatMoney(item.montantDemande)}`} badge={item.statut} onPress={() => setDetail({ type: 'pec', item })} />;
    }
    if (activeTab === 'devis') {
      return <ListCard title={item.numero} subtitle={`${item.beneficiaire} · ${formatMoney(item.montant)}`} badge={item.etat} onPress={() => setDetail({ type: 'devis', item })} />;
    }
    if (activeTab === 'remb') {
      return <ListCard title={item.numero} subtitle={`${item.beneficiaire} · ${formatMoney(item.montantDemande)}`} badge={item.statut} onPress={() => setDetail({ type: 'remb', item })} />;
    }
    return (
      <ListCard
        title={item.fullName}
        subtitle={`${item.cardLabel} · ${item.hasPdf ? 'Émise' : 'Non générée'}`}
        onPress={() => setDetail({ type: 'card', item })}
      />
    );
  };

  const visibleTabs = isAdherent ? TABS.filter((t) => t.id !== 'cards') : TABS;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.statsRow}>
        <View style={styles.stat}><Text style={styles.statLabel}>Remboursé</Text><Text style={styles.statVal}>{stats.totalReimbursed.toLocaleString('fr-FR')} DH</Text></View>
        <View style={styles.stat}><Text style={styles.statLabel}>PEC OK</Text><Text style={styles.statVal}>{stats.approvedPec}</Text></View>
        <View style={styles.stat}><Text style={styles.statLabel}>Devis OK</Text><Text style={styles.statVal}>{stats.approvedQuotes}</Text></View>
      </View>
      <ScreenToolbar>
        {visibleTabs.map((t) => (
          <OutlineButton key={t.id} title={t.label} onPress={() => { setActiveTab(t.id); setSearch(''); setStatusFilter(''); }} style={activeTab === t.id ? { backgroundColor: '#e0f2fe' } : null} />
        ))}
      </ScreenToolbar>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher dans l'historique…" />
      {activeTab !== 'cards' && statusOptions.length > 0 ? (
        <SelectField label="Filtrer par statut" value={statusFilter} options={[{ label: 'Tous', value: '' }, ...statusOptions]} onChange={setStatusFilter} />
      ) : null}
      {loading ? (
        <LoadingCenter />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, idx) => String(item.id ?? item.cardId ?? item.beneficiaryId ?? idx)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={{ paddingBottom: TAB_BAR_EXTRA_BOTTOM + 16 }}
        />
      )}

      <AppModal visible={!!detail} title="Détail" onClose={() => setDetail(null)} footer={<OutlineButton title="Fermer" onPress={() => setDetail(null)} style={{ flex: 1 }} />}>
        {detail?.type === 'pec' && (
          <>
            <DetailItem label="N°">{detail.item.numero}</DetailItem>
            <DetailItem label="Bénéficiaire">{detail.item.beneficiaire}</DetailItem>
            <DetailItem label="Statut">{detail.item.statut}</DetailItem>
            <DetailItem label="Montant PEC">{formatMoney(detail.item.montantPrisEnCharge)}</DetailItem>
            {detail.item.hasPdf ? <OutlineButton title="PDF" onPress={() => downloadDoc('pec', detail.item)} /> : null}
          </>
        )}
        {detail?.type === 'devis' && (
          <>
            <DetailItem label="N°">{detail.item.numero}</DetailItem>
            <DetailItem label="Bénéficiaire">{detail.item.beneficiaire}</DetailItem>
            <DetailItem label="État">{detail.item.etat}</DetailItem>
            {detail.item.hasPdf ? <OutlineButton title="PDF" onPress={() => downloadDoc('devis', detail.item)} /> : null}
          </>
        )}
        {detail?.type === 'remb' && (
          <>
            <DetailItem label="N°">{detail.item.numero}</DetailItem>
            <DetailItem label="Bénéficiaire">{detail.item.beneficiaire}</DetailItem>
            <DetailItem label="Statut">{detail.item.statut}</DetailItem>
            {detail.item.hasPdf ? <OutlineButton title="PDF" onPress={() => downloadDoc('remb', detail.item)} /> : null}
          </>
        )}
        {detail?.type === 'card' && (
          <>
            <DetailItem label="Membre">{detail.item.fullName}</DetailItem>
            <DetailItem label="Lien">{detail.item.cardLabel}</DetailItem>
            <DetailItem label="CIN">{detail.item.cin || '—'}</DetailItem>
            <DetailItem label="Naissance">{formatDate(detail.item.dateNaissance)}</DetailItem>
            {detail.item.hasPdf ? <OutlineButton title="Télécharger carte" onPress={() => downloadDoc('card', detail.item)} /> : null}
          </>
        )}
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  stat: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  statLabel: { fontSize: 11, color: COLORS.textLight, fontWeight: '600' },
  statVal: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
});
