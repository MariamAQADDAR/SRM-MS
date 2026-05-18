import React from 'react';

export default function ChatFormattedMessage({ text, isUser }) {
  if (isUser) {
    return <div className="chatbot-msg-text">{text}</div>;
  }
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return (
    <div className="chatbot-msg-text" style={{ whiteSpace: 'pre-wrap' }}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}
