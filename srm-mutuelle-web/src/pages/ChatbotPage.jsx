import React, { useEffect, useRef, useState } from 'react';
import FaIcon from '../components/FaIcon';
import ChatFormattedMessage from '../components/ChatFormattedMessage';
import useChatbot from '../hooks/useChatbot';

export default function ChatbotPage({ user }) {
  const [input, setInput] = useState('');
  const { messages, suggestions, statusLabel, ready, sending, sendMessage } = useChatbot(user);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const onSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendMessage(text);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="chatbot-page">
      <div className="chatbot-layout">
        <aside className="chatbot-aside">
          <div className="chatbot-aside-card">
            <div className="chatbot-aside-icon">
              <FaIcon name="wand-magic-sparkles" style={{ fontSize: 22 }} />
            </div>
            <h3>Assistant personnalisé</h3>
            <p>
              Réponses basées sur <strong>vos dossiers réels</strong> : devis, remboursements, cartes mutuelles et
              notifications de votre session.
            </p>
          </div>
          <div className="chatbot-aside-card muted">
            <div className="chatbot-aside-row">
              <FaIcon name="shield-halved" className="chatbot-aside-accent" style={{ fontSize: 18 }} />
              <span>Espace sécurisé</span>
            </div>
            <p className="chatbot-aside-small">Ne communiquez jamais votre mot de passe dans le chat.</p>
          </div>
          <div className="chatbot-quick-title">Suggestions</div>
          <div className="chatbot-quick-list">
            {suggestions.map((q) => (
              <button
                key={q.id}
                type="button"
                className="chatbot-quick-chip"
                onClick={() => sendMessage(q.text)}
                disabled={sending || !ready}
              >
                {q.label}
              </button>
            ))}
          </div>
        </aside>

        <section className="chatbot-panel" aria-label="Conversation">
          <header className="chatbot-panel-header">
            <div className="chatbot-panel-title">
              <span className="chatbot-avatar-bot">
                <FaIcon name="robot" style={{ fontSize: 22 }} />
              </span>
              <div>
                <div className="chatbot-panel-name">Assistant SRM</div>
                <div className="chatbot-panel-status">
                  <span className="chatbot-dot" /> {statusLabel}
                </div>
              </div>
            </div>
          </header>

          <div className="chatbot-messages">
            {messages.map((m) => (
              <div key={m.id} className={`chatbot-msg chatbot-msg--${m.role}`}>
                <div className="chatbot-msg-avatar">
                  {m.role === 'assistant' ? (
                    <FaIcon name="robot" style={{ fontSize: 18 }} />
                  ) : (
                    <FaIcon name="user" style={{ fontSize: 18 }} />
                  )}
                </div>
                <div className="chatbot-msg-body">
                  <ChatFormattedMessage text={m.text} isUser={m.role === 'user'} />
                  <div className="chatbot-msg-time">{m.time}</div>
                </div>
              </div>
            ))}
            {sending ? (
              <div className="chatbot-msg chatbot-msg--assistant">
                <div className="chatbot-msg-avatar">
                  <FaIcon name="robot" style={{ fontSize: 18 }} />
                </div>
                <div className="chatbot-msg-body">
                  <div className="chatbot-typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <footer className="chatbot-composer">
            <textarea
              rows={1}
              className="chatbot-input"
              placeholder="Ex. : résumé de ma situation, mes devis en cours, DEV-2026-…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={sending || !ready}
            />
            <button
              type="button"
              className="chatbot-send"
              onClick={onSend}
              disabled={sending || !ready || !input.trim()}
              aria-label="Envoyer"
            >
              <FaIcon name="paper-plane" style={{ fontSize: 20 }} />
            </button>
          </footer>
        </section>
      </div>
    </div>
  );
}
