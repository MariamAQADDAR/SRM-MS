import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { chatbotBootstrap, chatbotSendMessage } from './api/chatbot';
import ChatFormattedMessage from './components/ChatFormattedMessage';

const COLORS = {
  primary: '#0f6fb8',
  secondary: '#0e5aa0',
  background: '#f4f7fb',
  surface: '#ffffff',
  text: '#1e293b',
  textLight: '#64748b',
  border: '#e2e8f0',
  botBubble: '#eef8ff',
  userBubble: '#0f6fb8',
};

function formatTime(d) {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatbotScreen({ onBack, userName }) {
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [statusLabel, setStatusLabel] = useState('Connexion…');
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const scrollEnd = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await chatbotBootstrap();
        if (cancelled) return;
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            text: data.welcomeMessage,
            time: formatTime(new Date()),
          },
        ]);
        setSuggestions(data.suggestions || []);
        setStatusLabel(data.statusLabel || 'Données SRM-MS');
      } catch (e) {
        if (cancelled) return;
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            text: `Bonjour${userName ? `, ${userName}` : ''}. Je n’ai pas pu charger vos données (${e.message || 'vérifiez le backend'}). Réessayez après connexion.`,
            time: formatTime(new Date()),
          },
        ]);
        setStatusLabel('Hors ligne');
        setSuggestions([
          { id: 'aide', label: 'Aide', message: 'Que peux-tu faire ?' },
          { id: 'mdp', label: 'Mot de passe', message: 'Comment réinitialiser mon mot de passe ?' },
        ]);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userName]);

  useEffect(() => {
    scrollEnd();
  }, [messages, sending, scrollEnd]);

  const send = useCallback(
    async (raw) => {
      const text = (raw ?? input).trim();
      if (!text || sending) return;

      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: 'user', text, time: formatTime(new Date()) },
      ]);
      setInput('');
      setSending(true);

      try {
        const data = await chatbotSendMessage(text);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: data.reply,
            time: formatTime(new Date()),
          },
        ]);
        if (data.suggestions?.length) {
          setSuggestions(data.suggestions);
        }
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            text: e.message || 'Erreur lors de l’échange avec l’assistant.',
            time: formatTime(new Date()),
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [input, sending],
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <FontAwesome5 name="chevron-left" size={14} color={COLORS.primary} solid />
          <Text style={[styles.backText, styles.backTextAfterIcon]}>Retour</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Assistant SRM</Text>
          <Text style={styles.headerSub}>{statusLabel}</Text>
        </View>
        <View style={styles.headerIcon}>
          <FontAwesome5 name="robot" size={18} color={COLORS.primary} solid />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {suggestions.length > 0 ? (
          <View style={styles.chipsRow}>
            {suggestions.map((q) => (
              <TouchableOpacity
                key={q.id}
                style={[styles.chip, sending && styles.chipDisabled]}
                onPress={() => send(q.message)}
                disabled={sending || !ready}
              >
                <Text style={styles.chipText}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {messages.map((m) => (
          <View
            key={m.id}
            style={[styles.msgRow, m.role === 'user' ? styles.msgRowUser : styles.msgRowBot]}
          >
            <View style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
              <ChatFormattedMessage text={m.text} isUser={m.role === 'user'} />
              <Text style={[styles.msgTime, m.role === 'user' && styles.msgTimeUser]}>{m.time}</Text>
            </View>
          </View>
        ))}

        {sending ? (
          <View style={[styles.msgRow, styles.msgRowBot]}>
            <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Posez votre question…"
          placeholderTextColor={COLORS.textLight}
          value={input}
          onChangeText={setInput}
          editable={!sending && ready}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending || !ready) && styles.sendBtnOff]}
          onPress={() => send()}
          disabled={!input.trim() || sending || !ready}
          accessibilityLabel="Envoyer le message"
        >
          <FontAwesome5 name="paper-plane" size={18} color="#fff" solid />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, paddingRight: 12 },
  backTextAfterIcon: { marginLeft: 6 },
  backText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.botBubble,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, marginHorizontal: -4 },
  chip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    margin: 4,
  },
  chipDisabled: { opacity: 0.5 },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.secondary },
  msgRow: { marginBottom: 12, maxWidth: '92%' },
  msgRowUser: { alignSelf: 'flex-end' },
  msgRowBot: { alignSelf: 'flex-start' },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  bubbleUser: { backgroundColor: COLORS.userBubble },
  bubbleBot: { backgroundColor: COLORS.botBubble, borderWidth: 1, borderColor: COLORS.border },
  msgTime: { fontSize: 11, color: COLORS.textLight, marginTop: 6 },
  msgTimeUser: { color: 'rgba(255,255,255,0.85)' },
  typingBubble: { minWidth: 60, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    width: 48,
    height: 48,
    borderRadius: 12,
    marginBottom: 2,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { opacity: 0.45 },
});
