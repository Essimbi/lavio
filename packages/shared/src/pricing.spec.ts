import { describe, expect, it } from 'vitest';
import { computeQuote, extractVatXaf, requiredAdvanceXaf, resolveUnitPrice } from './pricing.js';

const base = {
  express: false,
  expressSurchargePercent: 0,
  discountXaf: 0,
  discountApprovalPercent: 10,
};

describe('computeQuote (docs/05)', () => {
  it('calcule les lignes, le sous-total et le total', () => {
    const q = computeQuote({
      ...base,
      lines: [
        { unitPriceXaf: 1500, quantity: 2 },
        { unitPriceXaf: 5000, quantity: 1 },
      ],
    });
    expect(q).toMatchObject({
      lineTotalsXaf: [3000, 5000],
      subtotalXaf: 8000,
      totalXaf: 8000,
      discountNeedsApproval: false,
    });
  });

  it('applique la majoration express sur le sous-total, arrondie au franc', () => {
    const q = computeQuote({
      ...base,
      express: true,
      expressSurchargePercent: 25,
      lines: [{ unitPriceXaf: 1001, quantity: 1 }],
    });
    expect(q.expressSurchargeXaf).toBe(250);
    expect(q.totalXaf).toBe(1251);
  });

  it('demande une validation au-delà du seuil, pas au seuil exact', () => {
    const lines = [{ unitPriceXaf: 10000, quantity: 1 }];
    expect(computeQuote({ ...base, lines, discountXaf: 1000 }).discountNeedsApproval).toBe(false);
    expect(computeQuote({ ...base, lines, discountXaf: 1001 }).discountNeedsApproval).toBe(true);
  });

  it('refuse une remise supérieure au montant et des valeurs invalides', () => {
    expect(() =>
      computeQuote({ ...base, lines: [{ unitPriceXaf: 100, quantity: 1 }], discountXaf: 101 }),
    ).toThrow(RangeError);
    expect(() => computeQuote({ ...base, lines: [{ unitPriceXaf: 100, quantity: 0 }] })).toThrow(
      RangeError,
    );
    expect(() => computeQuote({ ...base, lines: [{ unitPriceXaf: 10.5, quantity: 1 }] })).toThrow(
      RangeError,
    );
  });
});

describe('règles de prix', () => {
  it('préfère le prix spécial du client', () => {
    expect(resolveUnitPrice(800, 1000)).toBe(800);
    expect(resolveUnitPrice(null, 1000)).toBe(1000);
    expect(resolveUnitPrice(undefined, null)).toBeNull();
  });

  it('calcule l’acompte exigé, règle désactivée par défaut', () => {
    expect(requiredAdvanceXaf(50000, null, 50)).toBe(0);
    expect(requiredAdvanceXaf(20000, 20000, 50)).toBe(0);
    expect(requiredAdvanceXaf(20001, 20000, 50)).toBe(10001);
  });

  it('extrait la TVA d’un montant TTC', () => {
    expect(extractVatXaf(11925, 19.25)).toBe(1925);
  });
});
