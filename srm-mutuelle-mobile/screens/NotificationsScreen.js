import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { apiFetch, parseJsonOrThrow, apiMarkNotificationRead, apiUnreadCount } from '../api';
import { notificationNavigateTarget } from '../navigationAccess';
import {
  SearchBar,
  ListCard,
  OutlineButton,
  ScreenToolbar,
  EmptyState,
  LoadingCenter,
  TAB_BAR_EXTRA_BOTTOM,
} from '../components/ui';

function formatTs(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR');
  } catch {
    return String(iso).slice(0, 16).replace('T', ' ');
  }
}

export default function NotificationsScreen({ user, addToast, onNavigate, onUnreadChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const reload = useCallback(async () => {
    try {
      const data = await parseJsonOrThrow(await apiFetch('/api/notifications'));
      setRows(Array.isArray(data) ? data : []);
      const c = await apiUnreadCount();
      if (onUnreadChanged) onUnreadChanged(Number(c.count) || 0);
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast, onUnreadChanged]);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    return rows.filter((n) => matchesSearch(search, n.notifType, n.body));
  }, [rows, search]);

  const markRead = async (id) => {
    try {
      await apiMarkNotificationRead(id);
      setRows((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      const c = await apiUnreadCount();
      if (onUnreadChanged) onUnreadChanged(Number(c.count) || 0);
    } catch (e) {
      addToast('error', e.message || 'Erreur');
    }
  };

  const handlePress = async (n) => {
    if (!n.read) await markRead(n.id);
    const target = notificationNavigateTarget(n.notifType, user);
    if (onNavigate && target !== 'notifications') onNavigate(target);
  };

  if (loading && !rows.length) return <LoadingCenter />;

  return (
    <View style={{ flex: 1 }}>
      <ScreenToolbar>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Type, contenu…" />
        <OutlineButton title="Actualiser" onPress={reload} style={{ marginTop: 8 }} />
      </ScreenToolbar>
      {filtered.length === 0 ? (
        <EmptyState text="Aucune notification." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); reload(); }} />}
          contentContainerStyle={{ padding: 16, paddingBottom: TAB_BAR_EXTRA_BOTTOM + 24 }}
          renderItem={({ item: n }) => (
            <View style={{ marginBottom: 8 }}>
              <ListCard
                title={n.notifType || 'INFO'}
                subtitle={n.body}
                badge={n.read ? 'Lu' : 'Non lu'}
                onPress={() => handlePress(n)}
              />
              <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, paddingHorizontal: 4 }}>
                {formatTs(n.createdAt)}
              </Text>
              {!n.read ? (
                <OutlineButton title="Marquer lu" onPress={() => markRead(n.id)} style={{ marginTop: 6 }} />
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}
