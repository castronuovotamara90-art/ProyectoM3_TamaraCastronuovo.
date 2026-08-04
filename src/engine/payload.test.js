import { describe, it, expect } from 'vitest';
import { buildPayload, getCharacter, isValidPayload, listCharacters } from './payload.js';

describe('getCharacter', () => {
  it('devuelve Homer cuando no existe el personaje', () => {
    expect(getCharacter('no-existe')).toMatchObject({ name: 'Homer Simpson' });
  });

  it('devuelve el personaje pedido cuando existe', () => {
    expect(getCharacter('bart')).toMatchObject({ name: 'Bart Simpson' });
  });
});

describe('listCharacters', () => {
  it('devuelve una lista con ids y nombres', () => {
    const list = listCharacters();
    expect(list).toHaveLength(6);
    expect(list[0]).toMatchObject({ id: 'homer', name: 'Homer Simpson' });
  });
});

describe('buildPayload', () => {
  it('construye un payload para Gemini con history', () => {
    const character = getCharacter('lisa');
    const messages = [{ role: 'assistant', content: 'Hola' }];

    const payload = buildPayload(character, messages, 'gemini');

    expect(payload.systemInstruction).toBe(character.system);
    expect(payload.generationConfig).toMatchObject({
      temperature: character.temperature,
      maxOutputTokens: 150,
    });
    expect(payload.history[0]).toMatchObject({ role: 'model', parts: [{ text: 'Hola' }] });
  });

  it('lanza error si el provider no es gemini', () => {
    const character = getCharacter('homer');
    const messages = [{ role: 'user', content: 'Hola' }];

    expect(() => buildPayload(character, messages, 'openrouter')).toThrow('Unsupported provider');
  });
});

describe('isValidPayload', () => {
  it('valida un payload Gemini correcto', () => {
    const payload = {
      systemInstruction: 'prompt',
      generationConfig: { temperature: 0.6, maxOutputTokens: 150 },
      history: [{ role: 'user', parts: [{ text: 'Hola' }] }],
    };

    expect(isValidPayload(payload, 'gemini')).toBe(true);
  });

  it('rechaza payload cuando el provider no es gemini', () => {
    const payload = {
      systemInstruction: 'prompt',
      generationConfig: { temperature: 0.6, maxOutputTokens: 150 },
      history: [{ role: 'user', parts: [{ text: 'Hola' }] }],
    };

    expect(isValidPayload(payload, 'openrouter')).toBe(false);
  });
});
