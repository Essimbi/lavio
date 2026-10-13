import { describe, expect, it } from 'vitest';
import {
  checkItemTransition,
  expectedCashXaf,
  isMobileMoney,
  isQualityChecklistComplete,
  paymentSign,
} from './tracking.js';

describe('transitions des articles (docs/05)', () => {
  it('laisse l’opérateur avancer jusqu’au contrôle qualité, sauts compris', () => {
    expect(checkItemTransition('RECEIVED', 'IN_PROGRESS', ['OPERATOR'])).toEqual({
      ok: true,
      rework: false,
    });
    expect(checkItemTransition('RECEIVED', 'IRONING', ['OPERATOR'])).toEqual({
      ok: true,
      rework: false,
    });
    expect(checkItemTransition('IRONING', 'QUALITY_CHECK', ['OPERATOR'])).toEqual({
      ok: true,
      rework: false,
    });
    expect(checkItemTransition('QUALITY_CHECK', 'READY', ['OPERATOR'])).toEqual({
      ok: false,
      reason: 'ROLE',
    });
  });

  it('n’autorise « Prêt » que depuis le contrôle qualité, par le contrôle qualité ou la responsable', () => {
    expect(checkItemTransition('IRONING', 'READY', ['OWNER'])).toEqual({
      ok: false,
      reason: 'QUALITY_REQUIRED',
    });
    expect(checkItemTransition('QUALITY_CHECK', 'READY', ['QUALITY'])).toEqual({
      ok: true,
      rework: false,
    });
    expect(checkItemTransition('QUALITY_CHECK', 'READY', ['OWNER'])).toEqual({
      ok: true,
      rework: false,
    });
  });

  it('traite un retour en arrière comme une reprise réservée au contrôle qualité et à la responsable', () => {
    expect(checkItemTransition('READY', 'IN_PROGRESS', ['QUALITY'])).toEqual({
      ok: true,
      rework: true,
    });
    expect(checkItemTransition('IRONING', 'RECEIVED', ['OPERATOR'])).toEqual({
      ok: false,
      reason: 'ROLE',
    });
  });

  it('réserve « Retiré » à la restitution et fige un article retiré', () => {
    expect(checkItemTransition('READY', 'RETURNED', ['OWNER'])).toEqual({
      ok: false,
      reason: 'USE_RETURN',
    });
    expect(checkItemTransition('RETURNED', 'READY', ['OWNER'])).toEqual({
      ok: false,
      reason: 'RETURNED',
    });
    expect(checkItemTransition('IRONING', 'IRONING', ['OWNER'])).toEqual({
      ok: false,
      reason: 'SAME',
    });
  });

  it('refuse le caissier', () => {
    expect(checkItemTransition('RECEIVED', 'IN_PROGRESS', ['CASHIER'])).toEqual({
      ok: false,
      reason: 'ROLE',
    });
  });

  it('exige une check-list qualité complète', () => {
    expect(isQualityChecklistComplete({ clean: true, pressed: true, intact: true })).toBe(false);
    expect(
      isQualityChecklistComplete({ clean: true, pressed: true, intact: true, packed: true }),
    ).toBe(true);
  });
});

describe('paiements et caisse', () => {
  it('calcule le sens d’un paiement, d’un remboursement et de leurs annulations', () => {
    expect(paymentSign('BALANCE', false)).toBe(1);
    expect(paymentSign('BALANCE', true)).toBe(-1);
    expect(paymentSign('REFUND', false)).toBe(-1);
    expect(paymentSign('REFUND', true)).toBe(1);
  });

  it('calcule les espèces attendues', () => {
    expect(expectedCashXaf(10000, [5000, 2000, -1500], 500)).toBe(15000);
  });

  it('reconnaît le Mobile Money', () => {
    expect(isMobileMoney('ORANGE_MONEY')).toBe(true);
    expect(isMobileMoney('MTN_MOMO')).toBe(true);
    expect(isMobileMoney('CASH')).toBe(false);
  });
});
