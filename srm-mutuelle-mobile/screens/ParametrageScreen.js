import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { DEFAULT_TYPE_CONFIG, prefetchTypeConfig, readTypeConfig, saveTypeConfigKey } from '../typeConfig';
import {
  ListCard,
  PrimaryButton,
  OutlineButton,
  AppModal,
  FormField,
  TextField,
  EmptyState,
  LoadingCenter,
  TAB_BAR_EXTRA_BOTTOM,
} from '../components/ui';

export default function ParametrageScreen({ addToast }) {
  const [config, setConfig] = useState(DEFAULT_TYPE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const cfg = await prefetchTypeConfig();
      setConfig(cfg);
    } catch {
      setConfig(await readTypeConfig());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const keys = Object.keys(DEFAULT_TYPE_CONFIG);
  const labels = {
    quoteTypes: 'Types de devis',
    ordonnanceTypes: 'Types ordonnance',
    radioTypes: 'Types radiologie',
    careTypes: 'Types prise en charge',
    facilityTypes: 'Types établissement',
    entityTypes: 'Types entité',
    maladieTypes: 'Types maladie',
  };

  const openEdit = (key) => {
    setText((config[key] || []).join('\n'));
    setModal({ key, label: labels[key] || key });
  };

  const save = async () => {
    if (!modal?.key) return;
    setSaving(true);
    try {
      const values = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const cfg = await saveTypeConfigKey(modal.key, values);
      setConfig(cfg);
      addToast('success', 'Paramétrage enregistré');
      setModal(null);
    } catch (e) {
      addToast('error', e.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <LoadingCenter />
      ) : (
        <FlatList
          data={keys}
          keyExtractor={(k) => k}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload(true)} />}
          renderItem={({ item: key }) => (
            <ListCard title={labels[key] || key} subtitle={`${(config[key] || []).length} valeur(s)`} onPress={() => openEdit(key)} />
          )}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={{ paddingBottom: TAB_BAR_EXTRA_BOTTOM + 16 }}
        />
      )}
      <AppModal visible={!!modal} title={modal?.label || 'Paramétrage'} onClose={() => setModal(null)} footer={<PrimaryButton title="Enregistrer" onPress={save} loading={saving} style={{ flex: 1 }} />}>
        <FormField label="Une valeur par ligne"><TextField value={text} onChangeText={setText} multiline /></FormField>
        <OutlineButton title="Réinitialiser liste vide" onPress={() => setText('')} />
      </AppModal>
    </View>
  );
}
