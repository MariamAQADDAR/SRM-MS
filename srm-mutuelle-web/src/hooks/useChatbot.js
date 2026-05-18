import { useCallback, useEffect, useState } from 'react';
import { chatbotBootstrap, chatbotSendMessage } from '../api/chatbot';

function formatTime(d) {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function useChatbot(user) {
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [statusLabel, setStatusLabel] = useState('Connexion…');
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user?.token) return;
    let cancelled = false;
    setReady(false);
    setStatusLabel('Connexion…');
    setSuggestions([]);
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
        setStatusLabel(data.statusLabel || 'Données personnalisées');
      } catch {
        if (cancelled) return;
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            text: `Bonjour${user?.name ? ` **${user.name}**` : ''}. L’assistant n’a pas pu charger vos données (vérifiez que le backend est démarré sur le port 8082).`,
            time: formatTime(new Date()),
          },
        ]);
        setStatusLabel('Hors ligne');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.token, user?.name]);

  const sendMessage = useCallback(
    async (raw) => {
      const text = (raw || '').trim();
      if (!text || sending) return;

      const userMsg = {
        id: `u-${Date.now()}`,
        role: 'user',
        text,
        time: formatTime(new Date()),
      };
      setMessages((prev) => [...prev, userMsg]);
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
    [sending],
  );

  return { messages, suggestions, statusLabel, ready, sending, sendMessage };
}
