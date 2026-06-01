import { apiFetch, parseJsonOrThrow } from '../api';

export async function chatbotBootstrap() {
  return parseJsonOrThrow(await apiFetch('/api/chatbot/bootstrap'));
}

export async function chatbotSendMessage(message) {
  return parseJsonOrThrow(
    await apiFetch('/api/chatbot/message', {
      method: 'POST',
      body: { message },
    }),
  );
}
