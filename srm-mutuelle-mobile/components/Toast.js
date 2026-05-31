import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme';

export default function ToastOverlay({ toasts }) {
  if (!toasts?.length) return null;
  return (
    <View style={styles.wrap} pointerEvents="none">
      {toasts.map((t) => (
        <View key={t.id} style={[styles.toast, styles[t.type] || styles.info]}>
          <Text style={styles.text}>{t.message}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 56, left: 12, right: 12, zIndex: 9999, gap: 8 },
  toast: { borderRadius: 10, padding: 12, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  success: { backgroundColor: '#dcfce7', borderLeftWidth: 4, borderLeftColor: COLORS.success },
  error: { backgroundColor: '#fee2e2', borderLeftWidth: 4, borderLeftColor: COLORS.danger },
  warning: { backgroundColor: '#fef3c7', borderLeftWidth: 4, borderLeftColor: COLORS.warning },
  info: { backgroundColor: '#e0f2fe', borderLeftWidth: 4, borderLeftColor: COLORS.info },
  text: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
});

export function useToast() {
  const [toasts, setToasts] = React.useState([]);
  const addToast = React.useCallback((type, message) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3500);
  }, []);
  return { toasts, addToast };
}
