export function parseJsonBody(body) {
  if (!body || typeof body !== 'object') return {};
  return body;
}

export function getMessages(payload = {}) {
  const history = Array.isArray(payload.history) ? payload.history : [];
  const message = typeof payload.message === 'string' ? payload.message : '';

  return [
    ...history.map((entry) => ({
      role: entry?.role === 'assistant' ? 'assistant' : 'user',
      content: entry?.content ?? '',
    })),
    { role: 'user', content: message },
  ].filter((entry) => entry.content);
}

export function getGenerationSettings(payload = {}) {
  return {
    system: payload.system || 'Actúa como un asistente útil.',
    modelName: payload.modelName || 'openai/gpt-3.5-turbo',
    temperature: payload.temperature ?? 0.7,
    maxOutputTokens: payload.maxOutputTokens ?? 150,
  };
}
