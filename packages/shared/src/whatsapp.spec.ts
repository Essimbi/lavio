import { describe, expect, it } from 'vitest';
import { fillTemplate, normalizePhone, whatsappUrl } from './whatsapp.js';

describe('WhatsApp', () => {
  it('normalise les numéros camerounais', () => {
    expect(normalizePhone('6 90 00 00 00')).toBe('237690000000');
    expect(normalizePhone('+237 690 00 00 00')).toBe('237690000000');
    expect(normalizePhone('00237690000000')).toBe('237690000000');
  });

  it('remplit un modèle de message', () => {
    expect(
      fillTemplate('Bonjour {nom}, voici {lien} {inconnu}', { nom: 'Awa', lien: 'https://x' }),
    ).toBe('Bonjour Awa, voici https://x {inconnu}');
  });

  it('construit un lien wa.me avec le message encodé', () => {
    expect(whatsappUrl('+237 690000000', 'Bonjour & merci')).toBe(
      'https://wa.me/237690000000?text=Bonjour%20%26%20merci',
    );
  });
});
