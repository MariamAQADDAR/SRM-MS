import React, { useEffect, useRef, useState } from 'react';
import ChatFormattedMessage from './ChatFormattedMessage';
import useChatbot from '../hooks/useChatbot';

export default function ChatbotWidget({ user }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, suggestions, statusLabel, ready, sending, sendMessage } = useChatbot(user);
  const endRef = useRef(null);

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, sending, open]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendMessage(text);
  };

  if (!user) return null;

  return (
    <div className="chatbot-widget-container">
      {open && (
        <div className="chat-fab-panel chat-fab-panel--smart">
          <div className="chat-fab-head">
            <div className="chat-fab-head-main">
              <strong className="chat-fab-head-title">
                <i className="fa-solid fa-robot chat-fab-head-icon" aria-hidden />
                Assistant SRM
              </strong>
              <span className="chat-fab-status">{statusLabel}</span>
            </div>
            <button type="button" className="chat-fab-close" onClick={() => setOpen(false)} aria-label="Fermer">
              <i className="fa-solid fa-xmark" aria-hidden />
            </button>
          </div>
          <div className="chat-fab-body">
            {!ready && messages.length === 0 ? (
              <div className="chat-fab-msg bot">
                <span className="chat-fab-typing">Connexion à vos données…</span>
              </div>
            ) : null}
            {messages.map((m) => (
              <div key={m.id} className={`chat-fab-msg ${m.role === 'user' ? 'user' : 'bot'}`}>
                <ChatFormattedMessage text={m.text} isUser={m.role === 'user'} />
              </div>
            ))}
            {sending ? (
              <div className="chat-fab-msg bot">
                <span className="chat-fab-typing">Analyse de vos dossiers…</span>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
          {suggestions.length > 0 && (
            <div className="chat-fab-suggestions">
              {suggestions.slice(0, 3).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="chat-fab-suggestion-chip"
                  disabled={sending || !ready}
                  onClick={() => sendMessage(s.text)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <div className="chat-fab-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Votre question…"
              disabled={!ready || sending}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button type="button" className="chat-fab-send" onClick={send} disabled={!ready || sending || !input.trim()} title="Envoyer">
              <i className="fa-solid fa-paper-plane" aria-hidden />
            </button>
          </div>
        </div>
      )}
      <button type="button" className="chat-fab-btn" onClick={() => setOpen((v) => !v)} title="Assistant SRM" aria-label="Ouvrir l’assistant SRM">
        <i className="fa-solid fa-comment-dots" aria-hidden />
      </button>
    </div>
  );
}
