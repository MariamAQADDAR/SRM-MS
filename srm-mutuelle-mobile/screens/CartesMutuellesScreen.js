import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, RefreshControl, Text, StyleSheet } from 'react-native';
import { apiFetch, parseJsonOrThrow } from '../api';
import { isAdherentRole, isStaffWriterRole } from '../authUtils';
import { formatDate } from '../utils/format';
import { downloadAndShare } from '../fileHelpers';
import { COLORS } from '../theme';
import {
  SelectField,
  PrimaryButton,
  OutlineButton,
  ScreenToolbar,
  EmptyState,
  LoadingCenter,
  StatusBadge,
  TAB_BAR_EXTRA_BOTTOM,
} from '../components/ui';

export default function CartesMutuellesScreen({ user, addToast }) {
  const isAdherent = isAdherentRole(user);
  const canGenerate = isAdherent || isStaffWriterRole(user);
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [family, setFamily] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const effectiveAgentId = isAdherent && user?.agentId != null ? String(user.agentId) : selectedAgentId;

  const loadAgents = useCallback(async () => {
    if (isAdherent) return;
    try {
      const list = await parseJsonOrThrow(await apiFetch('/api/agents'));
      setAgents(list);
      if (list.length && !selectedAgentId) setSelectedAgentId(String(list[0].id));
    } catch (e) {
      addToast('error', e.message || 'Chargement porteurs impossible');
    }
  }, [isAdherent, selectedAgentId, addToast]);

  const loadFamily = useCallback(async (isRefresh = false) => {
    if (!effectiveAgentId) {
      setFamily([]);
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setFamily(await parseJsonOrThrow(await apiFetch(`/api/mutual-cards/family/${effectiveAgentId}`)));
    } catch (e) {
      addToast('error', e.message || 'Chargement cartes impossible');
      setFamily([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [effectiveAgentId, addToast]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    loadFamily();
  }, [loadFamily]);

  const generateCard = async (member) => {
    if (!effectiveAgentId) return;
    const key = member.beneficiaryId ?? 'titulaire';
    setBusyId(key);
    try {
      await parseJsonOrThrow(
        await apiFetch('/api/mutual-cards', {
          method: 'POST',
          body: { agentId: Number(effectiveAgentId), beneficiaryId: member.beneficiaryId },
        }),
      );
      addToast('success', `Carte générée pour ${member.fullName}`);
      loadFamily();
    } catch (e) {
      addToast('error', e.message || 'Génération impossible');
    } finally {
      setBusyId(null);
    }
  };

  const downloadCard = async (member) => {
    if (!member.cardId) {
      addToast('warning', 'Générez d’abord la carte');
      return;
    }
    try {
      await downloadAndShare(`/api/mutual-cards/${member.cardId}/download`, `carte-${member.fullName.replace(/\s+/g, '-')}.pdf`);
    } catch (e) {
      addToast('error', e.message || 'Téléchargement impossible');
    }
  };

  const renderMember = ({ item: m }) => {
    const busy = busyId === (m.beneficiaryId ?? 'titulaire');
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.name}>{m.fullName}</Text>
          <StatusBadge value={m.cardLabel} />
        </View>
        <Text style={styles.meta}>CIN : {m.cin || '—'}</Text>
        <Text style={styles.meta}>Naissance : {formatDate(m.dateNaissance)}</Text>
        <Text style={styles.meta}>Statut : {m.hasPdf ? 'Carte émise' : 'Non générée'}</Text>
        <View style={styles.actions}>
          {canGenerate && !m.hasPdf ? (
            <PrimaryButton title={busy ? '…' : 'Générer PDF'} onPress={() => generateCard(m)} disabled={busy} style={{ flex: 1 }} />
          ) : null}
          {m.hasPdf ? (
            <OutlineButton title="Télécharger" onPress={() => downloadCard(m)} style={{ flex: 1 }} />
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenToolbar>
        {!isAdherent && agents.length > 0 ? (
          <SelectField
            label="Porteur"
            value={selectedAgentId}
            options={agents.map((a) => ({ label: `${a.matricule} — ${a.prenom} ${a.nom}`, value: String(a.id) }))}
            onChange={setSelectedAgentId}
          />
        ) : null}
        <OutlineButton
          title="Bulletin adhésion"
          onPress={() => downloadAndShare('/api/document-templates/mutual-card-membership', 'bulletin-adhesion-carte-mutuelle.docx').catch((e) => addToast('error', e.message))}
        />
      </ScreenToolbar>
      <Text style={styles.intro}>
        {isAdherent
          ? 'Générez une carte PDF pour vous, votre conjoint et vos enfants déclarés.'
          : 'Cartes du foyer — une carte par membre (titulaire, conjoint, enfants).'}
      </Text>
      {loading ? (
        <LoadingCenter />
      ) : (
        <FlatList
          data={family}
          keyExtractor={(m) => String(m.beneficiaryId ?? 'titulaire')}
          renderItem={renderMember}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFamily(true)} />}
          ListEmptyComponent={<EmptyState text="Aucun membre du foyer." />}
          contentContainerStyle={{ paddingBottom: TAB_BAR_EXTRA_BOTTOM + 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { color: COLORS.textLight, marginBottom: 12, fontSize: 14, lineHeight: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  name: { fontSize: 17, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 8 },
  meta: { fontSize: 13, color: COLORS.textLight, marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
});
