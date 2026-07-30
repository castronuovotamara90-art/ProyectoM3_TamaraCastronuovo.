import { describe, it, expect } from 'vitest';
import { getLocationName, getOriginName, toCharacterProfile, toCharacterProfileList } from './character.js';

describe('getOriginName', () => {
  it('devuelve Unknown si no hay origin', () => {
    expect(getOriginName({})).toBe('Unknown');
  });

  it('devuelve el nombre del origin cuando existe', () => {
    expect(getOriginName({ origin: { name: 'Springfield' } })).toBe('Springfield');
  });
});

describe('getLocationName', () => {
  it('devuelve place not found cuando no hay location', () => {
    expect(getLocationName({})).toBe('place not found');
  });
});

describe('toCharacterProfile', () => {
  it('transforma un personaje crudo en view model', () => {
    const raw = {
      id: 1,
      name: 'Homer',
      status: 'Alive',
      species: 'Human',
      image: 'https://example.com/homer.png',
      origin: { name: 'Springfield' },
      location: { name: 'Home' },
    };

    expect(toCharacterProfile(raw)).toMatchObject({
      id: 1,
      name: 'Homer',
      status: 'Alive',
      statusClass: 'alive',
      species: 'Human',
      image: 'https://example.com/homer.png',
    });
  });

  it('usa portrait_path si no hay image', () => {
    const raw = {
      portrait_path: '/portrait.png',
      origin: {},
      location: {},
    };

    const profile = toCharacterProfile(raw);
    expect(profile.image).toContain('/portrait.png');
  });
});

describe('toCharacterProfileList', () => {
  it('transforma un array de personajes crudos', () => {
    const rawList = [{ id: 1, name: 'Homer' }, { id: 2, name: 'Marge' }];
    const list = toCharacterProfileList(rawList);

    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ id: 1, name: 'Homer' });
  });
});
