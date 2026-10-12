import { describe, expect, it } from 'vitest';
import {
  daysLeft,
  effectiveLicenseStatus,
  graceEndsAt,
  isReadOnlyStatus,
  licenseBannerLevel,
} from './licenses.js';

const endsAt = new Date('2026-11-01T00:00:00Z');
const at = (iso: string) => new Date(iso);

describe('effectiveLicenseStatus', () => {
  it('garde le statut avant la fin', () => {
    expect(
      effectiveLicenseStatus(
        { status: 'ACTIVE', endsAt, graceDays: 7 },
        at('2026-10-31T23:59:59Z'),
      ),
    ).toBe('ACTIVE');
    expect(
      effectiveLicenseStatus({ status: 'TRIAL', endsAt, graceDays: 7 }, at('2026-10-20T00:00:00Z')),
    ).toBe('TRIAL');
  });

  it('passe en GRACE à la date de fin, puis en EXPIRED après la grâce', () => {
    expect(effectiveLicenseStatus({ status: 'ACTIVE', endsAt, graceDays: 7 }, endsAt)).toBe(
      'GRACE',
    );
    expect(
      effectiveLicenseStatus({ status: 'TRIAL', endsAt, graceDays: 7 }, at('2026-11-07T23:59:59Z')),
    ).toBe('GRACE');
    expect(
      effectiveLicenseStatus({ status: 'GRACE', endsAt, graceDays: 7 }, at('2026-11-08T00:00:00Z')),
    ).toBe('EXPIRED');
  });

  it('ne réactive jamais une licence suspendue, révoquée ou expirée', () => {
    for (const status of ['SUSPENDED', 'REVOKED', 'EXPIRED'] as const) {
      expect(
        effectiveLicenseStatus({ status, endsAt, graceDays: 7 }, at('2026-01-01T00:00:00Z')),
      ).toBe(status);
    }
  });

  it('calcule la fin de grâce', () => {
    expect(graceEndsAt({ endsAt, graceDays: 7 }).toISOString()).toBe('2026-11-08T00:00:00.000Z');
  });
});

describe('lecture seule et bannières', () => {
  it('met en lecture seule EXPIRED, SUSPENDED et REVOKED seulement', () => {
    expect(isReadOnlyStatus('GRACE')).toBe(false);
    expect(isReadOnlyStatus('EXPIRED')).toBe(true);
    expect(isReadOnlyStatus('SUSPENDED')).toBe(true);
    expect(isReadOnlyStatus('REVOKED')).toBe(true);
  });

  it('affiche les bannières à J-7, J-3, J-0 et pendant la grâce', () => {
    expect(licenseBannerLevel('ACTIVE', 8)).toBe('none');
    expect(licenseBannerLevel('ACTIVE', 7)).toBe('notice');
    expect(licenseBannerLevel('ACTIVE', 3)).toBe('warning');
    expect(licenseBannerLevel('TRIAL', 0)).toBe('urgent');
    expect(licenseBannerLevel('GRACE', -2)).toBe('grace');
    expect(licenseBannerLevel('EXPIRED', -10)).toBe('readOnly');
  });

  it('compte les jours restants', () => {
    expect(daysLeft(endsAt, at('2026-10-25T12:00:00Z'))).toBe(7);
    expect(daysLeft(endsAt, endsAt)).toBe(0);
  });
});
