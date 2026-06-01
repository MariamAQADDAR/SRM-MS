import React from 'react';
import { Text, View } from 'react-native';

export default function ChatFormattedMessage({ text, isUser }) {
  if (!text) return null;
  if (isUser) {
    return <Text style={{ fontSize: 15, color: '#fff', lineHeight: 22 }}>{text}</Text>;
  }
  const parts = String(text).split(/(\*\*.+?\*\*)/g);
  return (
    <Text style={{ fontSize: 15, color: '#1e293b', lineHeight: 22 }}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} style={{ fontWeight: '700' }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}
