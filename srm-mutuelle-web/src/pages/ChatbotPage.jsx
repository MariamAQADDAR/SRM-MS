import React, { useEffect, useRef, useState, useCallback } from 'react';
import FaIcon from '../components/FaIcon';

const QUICK_PROMPTS = [
  { id: 'remb', label: 'Suivi remboursement', text: 'Comment suivre le statut de mon remboursement ?' },
  { id: 'devis', label: 'Devis optique / dentaire', text: 'Quelle est la procédure pour un devis optique ou dentaire ?' },
  { id: 'pec', label: 'Prise en charge', text: 'Comment demander une prise en charge hospitalière ?' },
  { id: 'carte', label: 'Carte mutuelle', text: 'Ma carte mutuelle est expirée, que faire ?' },
];

function formatTime(d) {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function FormattedMessage({ text, isUser }) {
  if (isUser) {
    return <div className="chatbot-msg-text">{text}</div>;
  }
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return (
    <div className="chatbot-msg-text">
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

/** Réponses locales (maquette) — à remplacer par l’API chatbot backend */
function mockAssistantReply(userText) {
  const t = userText.toLowerCase();
  if (t.includes('remboursement') || t.includes('statut')) {
    return 'Pour le suivi d’un remboursement : connectez-vous à l’espace pro, ouvrez le menu **Remboursements**, puis filtrez par statut (En attente, En cours, Traité). Vous pouvez aussi demander le numéro de dossier à l’assistance.';
  }
  if (t.includes('devis')) {
    return 'Les **devis** optiques et dentaires passent par la validation préalable. Déposez le devis scanné, renseignez les dates et l’établissement ; un opérateur valide ou refuse sous quelques jours ouvrés.';
  }
  if (t.includes('prise en charge') || t.includes('hospital')) {
    return 'Une **prise en charge** hospitalière nécessite un dossier complet : type de soin, dates, établissement conventionné et pièces justificatives. Le statut est visible dans l’écran dédié une fois la demande enregistrée.';
  }
  if (t.includes('carte') || t.includes('expir')) {
    return 'En cas de **carte expirée**, demandez un renouvellement via votre gestionnaire ou le service adhérents. Une nouvelle carte peut être générée après vérification de votre statut.';
  }
  return 'Je suis l’**assistant SRM Mutuelle** (mode démonstration). Posez une question sur les remboursements, devis, prises en charge ou la carte mutuelle, ou utilisez les suggestions ci-dessous. La connexion au moteur conversationnel backend sera branchée à l’étape suivante.';
}

export default function ChatbotPage({ user }) {
  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome',
      role: 'assistant',
      text: `Bonjour${user?.name ? `, **${user.name}**` : ''}. Je peux vous orienter sur les **remboursements**, **devis**, **prises en charge** et la **carte mutuelle**. Comment puis-je vous aider ?`,
      time: formatTime(new Date()),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const scrollToEnd = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, sending, scrollToEnd]);

  const sendMessage = async (raw) => {
    const text = (raw ?? input).trim();
    if (!text || sending) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      time: formatTime(new Date()),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    const reply = mockAssistantReply(text);
    setMessages((prev) => [
      ...prev,
      {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: reply,
        time: formatTime(new Date()),
      },
    ]);
    setSending(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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
            <h3>Assistant professionnel</h3>
            <p>Réponses instantanées sur vos dossiers mutuelle. Bientôt connecté à votre backend et à l’historique des conversations.</p>
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
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q.id}
                type="button"
                className="chatbot-quick-chip"
                onClick={() => sendMessage(q.text)}
                disabled={sending}
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
                  <span className="chatbot-dot" /> Mode démo — réponses locales
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
                  <FormattedMessage text={m.text} isUser={m.role === 'user'} />
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
              placeholder="Écrivez votre message… (Entrée pour envoyer)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={sending}
            />
            <button
              type="button"
              className="chatbot-send"
              onClick={() => sendMessage()}
              disabled={sending || !input.trim()}
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
