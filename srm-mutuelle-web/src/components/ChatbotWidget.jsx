import React, { useState } from 'react';

function replyFor(text) {
  const t = text.toLowerCase();
  if (t.includes('remboursement')) return 'Pour suivre un remboursement: ouvrez le module Remboursements puis filtrez par statut.';
  if (t.includes('devis')) return 'Pour un devis optique/dentaire, deposez les pieces puis suivez la validation dans le module Devis.';
  if (t.includes('prise en charge')) return 'La prise en charge necessite le type de soin, les dates et l etablissement.';
  return 'Assistant SRM (mode demo). Posez une question sur remboursements, devis ou prises en charge.';
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 'w1', role: 'bot', text: 'Bonjour. Je suis votre assistant SRM.' },
  ]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text }]);
    setInput('');
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: `b-${Date.now()}`, role: 'bot', text: replyFor(text) }]);
    }, 250);
  };

  return (
    <>
      {open ? (
        <div className="chat-fab-panel">
          <div className="chat-fab-head">
            <strong className="chat-fab-head-title">
              <i className="fa-solid fa-robot chat-fab-head-icon" aria-hidden />
              Assistant SRM
            </strong>
            <button type="button" className="chat-fab-close" onClick={() => setOpen(false)} aria-label="Fermer">
              <i className="fa-solid fa-xmark" aria-hidden />
            </button>
          </div>
          <div className="chat-fab-body">
            {messages.map((m) => (
              <div key={m.id} className={`chat-fab-msg ${m.role}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="chat-fab-input">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Votre message..." />
            <button type="button" className="chat-fab-send" onClick={send} title="Envoyer">
              <i className="fa-solid fa-paper-plane" aria-hidden />
              <span className="sr-only">Envoyer</span>
            </button>
          </div>
        </div>
      ) : null}
      <button type="button" className="chat-fab-btn" onClick={() => setOpen((v) => !v)} title="Assistant SRM" aria-label="Ouvrir l’assistant SRM">
        <i className="fa-solid fa-comment-dots" aria-hidden />
      </button>
    </>
  );
}
