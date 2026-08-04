import { describe, it, expect } from 'vitest';
import { extractUsage, normalizeAIResponse } from './normalizer.js';

describe('normalizeAIResponse', () => {
  it('normaliza la respuesta de Gemini', () => {
    const raw = {
      candidates: [{ content: { parts: [{ text: 'Hola' }] }, finishReason: 'STOP' }],
    };

    expect(normalizeAIResponse(raw, 'gemini')).toEqual({ text: 'Hola', truncated: false });
  });

  it('marca truncado cuando Gemini devuelve MAX_TOKENS', () => {
    const raw = {
      candidates: [{ content: { parts: [{ text: 'Hola' }] }, finishReason: 'MAX_TOKENS' }],
    };

    expect(normalizeAIResponse(raw, 'gemini')).toEqual({ text: 'Hola', truncated: true });
  });

  it('devuelve texto vacio con provider no soportado', () => {
    const raw = {
      candidates: [{ content: { parts: [{ text: 'Hola' }] }, finishReason: 'STOP' }],
    };

    expect(normalizeAIResponse(raw, 'openrouter')).toEqual({ text: '', truncated: false });
  });
});

describe('extractUsage', () => {
  it('extrae usage de Gemini', () => {
    const raw = {
      usageMetadata: { promptTokenCount: 7, candidatesTokenCount: 3 },
    };

    expect(extractUsage(raw, 'gemini')).toEqual({ inputTokens: 7, outputTokens: 3 });
  });

  it('devuelve usage en cero con provider no soportado', () => {
    const raw = {
      usageMetadata: { promptTokenCount: 7, candidatesTokenCount: 3 },
    };

    expect(extractUsage(raw, 'openrouter')).toEqual({ inputTokens: 0, outputTokens: 0 });
  });
});
