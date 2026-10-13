import { describe, expect, it } from 'vitest';
import { weekday } from './deposits.js';
import { canChangeTourStatus, isTourDay, nextTourDates, periodRange } from './tours.js';

describe('jours de tournée', () => {
  it('reconnaît le jour de la semaine (0 = dimanche)', () => {
    expect(weekday('2026-10-13')).toBe(2); // mardi
    expect(isTourDay('2026-10-13', [2, 5])).toBe(true);
    expect(isTourDay('2026-10-14', [2, 5])).toBe(false);
  });

  it('liste les prochains jours de tournée', () => {
    expect(nextTourDates('2026-10-14', [2, 5], 3)).toEqual([
      '2026-10-16',
      '2026-10-20',
      '2026-10-23',
    ]);
    expect(nextTourDates('2026-10-14', [], 3)).toEqual([]);
  });
});

describe('statuts de tournée', () => {
  it('suit ramassage et livraison, annulation possible avant la fin', () => {
    expect(canChangeTourStatus('PICKUP', 'TO_COLLECT', 'COLLECTED')).toBe(true);
    expect(canChangeTourStatus('PICKUP', 'TO_COLLECT', 'DELIVERED')).toBe(false);
    expect(canChangeTourStatus('DELIVERY', 'TO_DELIVER', 'DELIVERED')).toBe(true);
    expect(canChangeTourStatus('DELIVERY', 'TO_DELIVER', 'CANCELLED')).toBe(true);
    expect(canChangeTourStatus('DELIVERY', 'DELIVERED', 'CANCELLED')).toBe(false);
  });
});

describe('périodes du tableau de bord', () => {
  it('calcule jour, semaine (lundi), mois, année', () => {
    expect(periodRange('today', '2026-10-13')).toEqual({ from: '2026-10-13', to: '2026-10-13' });
    expect(periodRange('week', '2026-10-13')).toEqual({ from: '2026-10-12', to: '2026-10-13' });
    expect(periodRange('week', '2026-10-18')).toEqual({ from: '2026-10-12', to: '2026-10-18' });
    expect(periodRange('month', '2026-10-13')).toEqual({ from: '2026-10-01', to: '2026-10-13' });
    expect(periodRange('year', '2026-10-13')).toEqual({ from: '2026-01-01', to: '2026-10-13' });
  });
});
