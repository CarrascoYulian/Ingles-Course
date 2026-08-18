import { describe, expect, it } from 'vitest';

import { pickEnglishVoice } from './answer-audio';

function voice(overrides: Partial<SpeechSynthesisVoice>): SpeechSynthesisVoice {
  return {
    voiceURI: overrides.name ?? 'voice',
    name: 'voice',
    lang: 'en-US',
    default: false,
    localService: true,
    ...overrides,
  } as SpeechSynthesisVoice;
}

describe('pickEnglishVoice', () => {
  it('devuelve null si no hay voces', () => {
    expect(pickEnglishVoice([])).toBeNull();
  });

  it('devuelve null si no hay ninguna voz en inglés', () => {
    const voices = [voice({ lang: 'es-ES' }), voice({ lang: 'fr-FR' })];
    expect(pickEnglishVoice(voices)).toBeNull();
  });

  it('prefiere en-US entre varias voces en inglés', () => {
    const enGB = voice({ name: 'gb', lang: 'en-GB' });
    const enUS = voice({ name: 'us', lang: 'en-US' });
    expect(pickEnglishVoice([enGB, enUS])).toBe(enUS);
  });

  it('si no hay en-US, prefiere la voz en inglés marcada default', () => {
    const enGB = voice({ name: 'gb', lang: 'en-GB' });
    const enAU = voice({ name: 'au', lang: 'en-AU', default: true });
    expect(pickEnglishVoice([enGB, enAU])).toBe(enAU);
  });

  it('si ninguna es default, devuelve la primera voz en inglés', () => {
    const enGB = voice({ name: 'gb', lang: 'en-GB' });
    const enAU = voice({ name: 'au', lang: 'en-AU' });
    expect(pickEnglishVoice([enGB, enAU])).toBe(enGB);
  });

  it('ignora mayúsculas/minúsculas en el lang', () => {
    const enUS = voice({ name: 'us', lang: 'EN-US' });
    expect(pickEnglishVoice([enUS])).toBe(enUS);
  });
});
