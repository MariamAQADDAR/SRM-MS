import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS, TAB_BAR_EXTRA_BOTTOM } from '../theme';

export { COLORS, TAB_BAR_EXTRA_BOTTOM };

export function StatusBadge({ value }) {
  if (!value) return null;
  const color = getStatusColorLocal(value);
  return (
    <View style={[ui.badge, { backgroundColor: `${color}20` }]}>
      <Text style={[ui.badgeText, { color }]}>{String(value)}</Text>
    </View>
  );
}

function getStatusColorLocal(statut) {
  const lower = String(statut).toLowerCase();
  if (lower.includes('validé') || lower.includes('approuvé') || lower.includes('traité') || lower.includes('actif')) return COLORS.success;
  if (lower.includes('attente')) return COLORS.warning;
  if (lower.includes('rejeté') || lower === 'inactif') return COLORS.danger;
  return COLORS.info;
}

export function PrimaryButton({ title, onPress, disabled, loading, style }) {
  return (
    <TouchableOpacity style={[ui.primaryBtn, disabled && ui.btnDisabled, style]} onPress={onPress} disabled={disabled || loading}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={ui.primaryBtnText}>{title}</Text>}
    </TouchableOpacity>
  );
}

export function OutlineButton({ title, onPress, disabled, danger, style }) {
  return (
    <TouchableOpacity
      style={[ui.outlineBtn, danger && ui.outlineBtnDanger, disabled && ui.btnDisabled, style]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[ui.outlineBtnText, danger && { color: COLORS.danger }]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function FormField({ label, required, error, children }) {
  return (
    <View style={ui.formGroup}>
      {label ? (
        <Text style={ui.label}>
          {label}
          {required ? <Text style={ui.req}> *</Text> : null}
        </Text>
      ) : null}
      {children}
      {error ? <Text style={ui.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function TextField({ value, onChangeText, placeholder, keyboardType, multiline, editable = true, autoFocus, selectTextOnFocus }) {
  return (
    <TextInput
      style={[ui.input, multiline && ui.inputMultiline, !editable && ui.inputReadonly]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textLight}
      keyboardType={keyboardType}
      multiline={multiline}
      editable={editable}
      autoFocus={autoFocus}
      selectTextOnFocus={selectTextOnFocus}
    />
  );
}

export function SelectField({ label, value, options, onChange, required, inline = false }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  if (inline) {
    return (
      <FormField label={label} required={required}>
        <TouchableOpacity style={ui.selectBtn} onPress={() => setOpen((v) => !v)} activeOpacity={0.8}>
          <Text style={ui.selectBtnText}>{selected?.label || '— Choisir —'}</Text>
          <FontAwesome5 name={open ? 'chevron-up' : 'chevron-down'} size={12} color={COLORS.textLight} />
        </TouchableOpacity>
        {open ? (
          <View style={ui.inlineSelectList}>
            {options.map((o) => (
              <TouchableOpacity
                key={String(o.value)}
                style={[ui.selectOption, o.value === value && ui.selectOptionActive]}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <Text style={ui.selectOptionText}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </FormField>
    );
  }

  return (
    <FormField label={label} required={required}>
      <TouchableOpacity style={ui.selectBtn} onPress={() => setOpen(true)}>
        <Text style={ui.selectBtnText}>{selected?.label || '— Choisir —'}</Text>
        <FontAwesome5 name="chevron-down" size={12} color={COLORS.textLight} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={ui.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={ui.selectSheet}>
            <Text style={ui.selectSheetTitle}>{label || 'Choisir'}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {options.map((o) => (
                <TouchableOpacity
                  key={String(o.value)}
                  style={[ui.selectOption, o.value === value && ui.selectOptionActive]}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Text style={ui.selectOptionText}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </FormField>
  );
}

export function Stepper({ step, labels }) {
  return (
    <View style={ui.stepper}>
      {labels.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <View key={label} style={ui.stepItem}>
            <View style={[ui.stepCircle, active && ui.stepCircleActive, done && ui.stepCircleDone]}>
              {done ? (
                <FontAwesome5 name="check" size={10} color="#fff" solid />
              ) : (
                <Text style={[ui.stepNum, (active || done) && { color: '#fff' }]}>{n}</Text>
              )}
            </View>
            <Text style={[ui.stepLabel, active && ui.stepLabelActive]} numberOfLines={2}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function DetailItem({ label, children }) {
  return (
    <View style={ui.detailItem}>
      <Text style={ui.detailLabel}>{label}</Text>
      <Text style={ui.detailValue}>{children}</Text>
    </View>
  );
}

export function DetailSection({ title, icon, children }) {
  return (
    <View style={ui.detailSection}>
      <View style={ui.detailSectionTitle}>
        {icon ? <FontAwesome5 name={icon} size={14} color={COLORS.primary} solid style={{ marginRight: 8 }} /> : null}
        <Text style={ui.detailSectionTitleText}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export function SearchBar({ value, onChangeText, placeholder }) {
  return (
    <View style={ui.searchWrap}>
      <FontAwesome5 name="search" size={14} color={COLORS.textLight} style={ui.searchIcon} />
      <TextInput
        style={ui.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || 'Rechercher…'}
        placeholderTextColor={COLORS.textLight}
      />
    </View>
  );
}

export function AppModal({ visible, title, onClose, children, footer }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={ui.modalScreen}>
          <View style={ui.modalHeader}>
            <Text style={ui.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <FontAwesome5 name="times" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={ui.modalBody}
            contentContainerStyle={{ paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {children}
          </ScrollView>
          {footer ? <View style={ui.modalFooter}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ListCard({ title, subtitle, badge, onPress, rightIcon = 'chevron-right' }) {
  return (
    <TouchableOpacity style={ui.listCard} onPress={onPress} activeOpacity={onPress ? 0.65 : 1} disabled={!onPress}>
      <View style={{ flex: 1 }}>
        <Text style={ui.listCardTitle}>{title}</Text>
        {subtitle ? <Text style={ui.listCardSub}>{subtitle}</Text> : null}
      </View>
      {badge ? <StatusBadge value={badge} /> : null}
      {onPress ? <FontAwesome5 name={rightIcon} size={14} color={COLORS.textLight} solid style={{ marginLeft: 8 }} /> : null}
    </TouchableOpacity>
  );
}

export function ScreenToolbar({ children }) {
  return <View style={ui.toolbar}>{children}</View>;
}

export function EmptyState({ text }) {
  return <Text style={ui.empty}>{text || 'Aucune donnée.'}</Text>;
}

export function LoadingCenter() {
  return <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 32 }} />;
}

export const ui = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  outlineBtn: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  outlineBtnDanger: { borderColor: COLORS.danger },
  outlineBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
  formGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  req: { color: COLORS.danger },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  inputReadonly: { backgroundColor: '#f1f5f9', color: COLORS.textLight },
  fieldError: { color: COLORS.danger, fontSize: 12, marginTop: 4 },
  selectBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
  },
  selectBtnText: { fontSize: 15, color: COLORS.text, flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  selectSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  selectSheetTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: COLORS.text },
  selectOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  selectOptionActive: { backgroundColor: `${COLORS.primary}10` },
  selectOptionText: { fontSize: 15, color: COLORS.text },
  inlineSelectList: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: 'hidden',
    maxHeight: 220,
  },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  stepItem: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepCircleActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepCircleDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  stepNum: { fontSize: 12, fontWeight: '700', color: COLORS.textLight },
  stepLabel: { fontSize: 10, textAlign: 'center', color: COLORS.textLight },
  stepLabelActive: { color: COLORS.primary, fontWeight: '700' },
  detailItem: { marginBottom: 10 },
  detailLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textLight, textTransform: 'uppercase', marginBottom: 2 },
  detailValue: { fontSize: 15, color: COLORS.text },
  detailSection: { marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailSectionTitle: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  detailSectionTitleText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  searchWrap: { position: 'relative', marginBottom: 12 },
  searchIcon: { position: 'absolute', left: 12, top: 14, zIndex: 1 },
  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingLeft: 36,
    paddingRight: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
  },
  modalScreen: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 12 },
  modalBody: { flex: 1, padding: 16 },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingBottom: 16 + TAB_BAR_EXTRA_BOTTOM,
  },
  listCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listCardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  listCardSub: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' },
  empty: { textAlign: 'center', marginTop: 40, color: COLORS.textLight, fontSize: 15 },
});
