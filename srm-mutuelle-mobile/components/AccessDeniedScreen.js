import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from '../theme';

export default function AccessDeniedScreen({ message }) {
  return (
    <View style={styles.wrap}>
      <FontAwesome5 name="lock" size={36} color={COLORS.textLight} solid />
      <Text style={styles.title}>Accès non autorisé</Text>
      <Text style={styles.body}>
        {message || 'Vous n’avez pas les permissions nécessaires pour cette section.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: COLORS.background },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  body: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', lineHeight: 20 },
});
