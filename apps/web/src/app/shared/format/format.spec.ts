import { dateInputToIso, formatDate, formatDateTime, formatPhone, formatXaf } from './format';

describe('formats (docs/08)', () => {
  it('formate les montants en FCFA avec espaces insécables', () => {
    expect(formatXaf(12500)).toBe('12 500 FCFA');
    expect(formatXaf(null)).toBe('—');
  });

  it('formate les dates et heures à Douala', () => {
    expect(formatDate('2026-10-11T23:30:00Z')).toBe('12/10/2026');
    expect(formatDateTime('2026-10-12T13:05:00Z')).toBe('12/10/2026 14:05');
  });

  it('formate les téléphones camerounais', () => {
    expect(formatPhone('237690123456')).toBe('+237 690 12 34 56');
  });

  it('convertit une date de formulaire en minuit à Douala', () => {
    expect(dateInputToIso('2026-10-12')).toBe('2026-10-11T23:00:00.000Z');
  });
});
