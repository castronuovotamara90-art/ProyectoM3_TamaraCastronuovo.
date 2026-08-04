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
  it('construye un payload para OpenRouter con history', () => {
    const character = getCharacter('lisa');
    const messages = [{ role: 'assistant', content: 'Hola' }];

    const payload = buildPayload(character, messages, 'openrouter');

    expect(payload.temperature).toBe(character.temperature);
    expect(payload.max_tokens).toBe(150);
    expect(payload.messages[0]).toMatchObject({ role: 'system', content: character.system });
    expect(payload.messages[1]).toMatchObject({ role: 'assistant', content: 'Hola' });
  });

  it('lanza error si el provider no es openrouter', () => {
    const character = getCharacter('homer');
    const messages = [{ role: 'user', content: 'Hola' }];

    expect(() => buildPayload(character, messages, 'gemini')).toThrow('Unsupported provider');
  });
});

describe('isValidPayload', () => {
  it('valida un payload OpenRouter correcto', () => {
    const payload = {
      temperature: 0.6,
      max_tokens: 150,
      messages: [{ role: 'user', content: 'Hola' }],
    };

    expect(isValidPayload(payload, 'openrouter')).toBe(true);
  });

  it('rechaza payload cuando el provider no es openrouter', () => {
    const payload = {
      temperature: 0.6,
      max_tokens: 150,
      messages: [{ role: 'user', content: 'Hola' }],
    };

    expect(isValidPayload(payload, 'gemini')).toBe(false);
  });
});
