export function createChatResponse({ text, payload }) {
  return {
    text,
    payload,
    timestamp: new Date().toISOString(),
  };
}
