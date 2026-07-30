import { describe, it, expect } from 'vitest';
import { extractUsage, normalizeAIResponse } from './normalizer.js';

describe('normalizeAIResponse', () => {
  it('normaliza la respuesta de OpenRouter', () => {
    const raw = {
      choices: [{ message: { content: 'Hola' }, finish_reason: 'stop' }],
    };

    expect(normalizeAIResponse(raw, 'openrouter')).toEqual({ text: 'Hola', truncated: false });
  });

  it('marca truncado cuando OpenRouter devuelve length', () => {
    const raw = {
      choices: [{ message: { content: 'Hola' }, finish_reason: 'length' }],
    };

    expect(normalizeAIResponse(raw, 'openrouter')).toEqual({ text: 'Hola', truncated: true });
  });

  it('devuelve texto vacio con provider no soportado', () => {
    const raw = {
      choices: [{ message: { content: 'Hola' }, finish_reason: 'stop' }],
    };

    expect(normalizeAIResponse(raw, 'gemini')).toEqual({ text: '', truncated: false });
  });
});

describe('extractUsage', () => {
  it('extrae usage de OpenRouter', () => {
    const raw = {
      usage: { prompt_tokens: 7, completion_tokens: 3 },
    };

    expect(extractUsage(raw, 'openrouter')).toEqual({ inputTokens: 7, outputTokens: 3 });
  });

  it('devuelve usage en cero con provider no soportado', () => {
    const raw = {
      usage: { prompt_tokens: 7, completion_tokens: 3 },
    };

    expect(extractUsage(raw, 'gemini')).toEqual({ inputTokens: 0, outputTokens: 0 });
  });
});
