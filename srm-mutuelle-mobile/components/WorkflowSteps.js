import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from '../theme';

/**
 * 3 étapes horizontales (dépôt → instruction → décision) — même logique que le web.
 */
export default function WorkflowSteps({ steps, activeStep, terminal, terminalLabel }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {steps.map((s) => {
          const done = terminal ? s.step <= activeStep : s.step < activeStep;
          const current = !terminal && s.step === activeStep;
          const state = done ? 'done' : current ? 'current' : 'pending';
          return (
            <View key={s.step} style={styles.step}>
              <View style={[styles.marker, styles[`marker_${state}`]]}>
                {done ? (
                  <FontAwesome5 name="check" size={10} color="#fff" />
                ) : (
                  <Text style={[styles.markerNum, state === 'current' && styles.markerNumCurrent]}>{s.step}</Text>
                )}
              </View>
              <View style={styles.textCol}>
                <Text style={[styles.label, state === 'current' && styles.labelCurrent]}>{s.label}</Text>
                {s.hint ? <Text style={styles.hint}>{s.hint}</Text> : null}
              </View>
              {s.step < steps.length ? <View style={[styles.connector, done && styles.connectorDone]} /> : null}
            </View>
          );
        })}
      </View>
      {terminal && terminalLabel ? (
        <Text style={styles.terminal}>
          Décision : <Text style={styles.terminalStrong}>{terminalLabel}</Text>
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  step: { flex: 1, minWidth: 90, alignItems: 'center', position: 'relative', paddingHorizontal: 2 },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 6,
  },
  marker_pending: { borderColor: COLORS.border, backgroundColor: COLORS.surface },
  marker_current: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  marker_done: { borderColor: COLORS.success || '#22c55e', backgroundColor: COLORS.success || '#22c55e' },
  markerNum: { fontSize: 12, fontWeight: '700', color: COLORS.textLight },
  markerNumCurrent: { color: '#fff' },
  textCol: { alignItems: 'center' },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.textLight, textAlign: 'center' },
  labelCurrent: { color: COLORS.primary },
  hint: { fontSize: 10, color: COLORS.textLight, textAlign: 'center', marginTop: 2 },
  connector: {
    position: 'absolute',
    top: 14,
    right: -8,
    width: 16,
    height: 2,
    backgroundColor: COLORS.border,
  },
  connectorDone: { backgroundColor: COLORS.success || '#22c55e' },
  terminal: { marginTop: 10, fontSize: 13, color: COLORS.textLight, textAlign: 'center' },
  terminalStrong: { fontWeight: '700', color: COLORS.text },
});
