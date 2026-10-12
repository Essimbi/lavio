import { describe, expect, it } from 'vitest';
import {
  defaultDueDate,
  formatTicketNumber,
  labelCode,
  numberToFrenchWords,
  parseTicketNumber,
  ticketQrPayload,
  weekday,
} from './deposits.js';

describe('date de retrait par défaut', () => {
  // Lundi 12/10/2026 à 10 h à Douala ; tournées mardi (2) et vendredi (5).
  const monday = new Date('2026-10-12T09:00:00Z');

  it('prend le prochain jour de tournée après le délai de traitement', () => {
    expect(weekday('2026-10-12')).toBe(1);
    expect(defaultDueDate(monday, 2, [2, 5])).toBe('2026-10-16');
    expect(defaultDueDate(monday, 0, [2, 5])).toBe('2026-10-13');
  });

  it('sans tournée : réception + délai', () => {
    expect(defaultDueDate(monday, 2, [])).toBe('2026-10-14');
  });

  it('utilise la date locale de Douala (23 h 30 UTC = lendemain)', () => {
    expect(defaultDueDate(new Date('2026-10-11T23:30:00Z'), 0, [])).toBe('2026-10-12');
  });
});

describe('numéros de ticket', () => {
  it('formate le numéro, le code d’étiquette et le QR', () => {
    expect(formatTicketNumber(124)).toBe('000124');
    expect(formatTicketNumber(124, 'A-')).toBe('A-000124');
    expect(labelCode(124, 3)).toBe('000124-03');
    expect(ticketQrPayload('pressing-demo', 124)).toBe('LAVIO|pressing-demo|124');
  });

  it('retrouve un dépôt avec ou sans zéros initiaux', () => {
    expect(parseTicketNumber('000124')).toBe(124);
    expect(parseTicketNumber('124')).toBe(124);
    expect(parseTicketNumber('A-000124')).toBe(124);
    expect(parseTicketNumber('abc')).toBeNull();
    expect(parseTicketNumber('0')).toBeNull();
  });
});

describe('nombre en toutes lettres', () => {
  it.each([
    [1, 'un'],
    [17, 'dix-sept'],
    [21, 'vingt et un'],
    [71, 'soixante et onze'],
    [72, 'soixante-douze'],
    [80, 'quatre-vingts'],
    [81, 'quatre-vingt-un'],
    [91, 'quatre-vingt-onze'],
    [100, 'cent'],
    [124, 'cent vingt-quatre'],
    [200, 'deux cents'],
    [201, 'deux cent un'],
    [1000, 'mille'],
    [2080, 'deux mille quatre-vingts'],
    [80000, 'quatre-vingt mille'],
    [200000, 'deux cent mille'],
    [999999, 'neuf cent quatre-vingt-dix-neuf mille neuf cent quatre-vingt-dix-neuf'],
  ])('%i → %s', (n, words) => {
    expect(numberToFrenchWords(n)).toBe(words);
  });
});
