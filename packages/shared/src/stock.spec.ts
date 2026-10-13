import { describe, expect, it } from 'vitest';
import {
  firstMonthlyDueOn,
  lowStockTransition,
  nextMonthlyDueOn,
  roundQty,
  stockValueXaf,
  weightedAverageCost,
} from './stock.js';

describe('coût moyen pondéré', () => {
  it('applique la formule de docs/05 et arrondit au franc', () => {
    // 10 à 1 000 + 5 à 1 300 → (10 000 + 6 500) / 15 = 1 100
    expect(weightedAverageCost(10, 1000, 5, 1300)).toBe(1100);
    // 3 à 100 + 1 à 101 → 401 / 4 = 100,25 → 100
    expect(weightedAverageCost(3, 100, 1, 101)).toBe(100);
    expect(weightedAverageCost(2.5, 400, 0.5, 700)).toBe(450);
  });

  it('prend le coût d’entrée pour un stock nul ou négatif', () => {
    expect(weightedAverageCost(0, 0, 4, 250)).toBe(250);
    expect(weightedAverageCost(-2, 900, 4, 250)).toBe(250);
  });

  it('valorise et arrondit les quantités', () => {
    expect(stockValueXaf(2.5, 1101)).toBe(2753);
    expect(roundQty(0.1 + 0.2)).toBe(0.3);
  });
});

describe('alerte de seuil', () => {
  it('notifie une seule fois par franchissement et se réarme au-dessus du seuil', () => {
    expect(lowStockTransition(5, 5, false)).toEqual({ notify: true, sent: true });
    expect(lowStockTransition(3, 5, true)).toEqual({ notify: false, sent: true });
    expect(lowStockTransition(8, 5, true)).toEqual({ notify: false, sent: false });
    expect(lowStockTransition(4, 5, false)).toEqual({ notify: true, sent: true });
  });
});

describe('échéances mensuelles', () => {
  it('passe au mois suivant, y compris en décembre', () => {
    expect(nextMonthlyDueOn('2026-10-05', 5)).toBe('2026-11-05');
    expect(nextMonthlyDueOn('2026-12-28', 28)).toBe('2027-01-28');
  });

  it('commence ce mois-ci si le jour n’est pas passé', () => {
    expect(firstMonthlyDueOn('2026-10-13', 20)).toBe('2026-10-20');
    expect(firstMonthlyDueOn('2026-10-13', 13)).toBe('2026-10-13');
    expect(firstMonthlyDueOn('2026-10-13', 5)).toBe('2026-11-05');
  });
});
