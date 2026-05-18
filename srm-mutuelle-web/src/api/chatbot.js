import { apiFetch, parseJsonOrThrow } from './client';

export async function chatbotBootstrap() {
  const res = await apiFetch('/api/chatbot/bootstrap');
  return parseJsonOrThrow(res);
}

export async function chatbotSendMessage(message) {
  const res = await apiFetch('/api/chatbot/message', {
    method: 'POST',
    body: { message },
  });
  return parseJsonOrThrow(res);
}
