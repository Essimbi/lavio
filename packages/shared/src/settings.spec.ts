import { describe, expect, it } from 'vitest';
import { DEFAULT_TENANT_SETTINGS, DEFAULT_TOUR_DAYS } from './settings.js';
import { DepositStatus, ApprovalType } from './enums.js';

describe('paramètres par défaut', () => {
  it('applique les hypothèses de docs/14', () => {
    expect(DEFAULT_TENANT_SETTINGS.discountApprovalPercent).toBe(10);
    expect(DEFAULT_TENANT_SETTINGS.advanceRequiredAbove).toBeNull();
    expect(DEFAULT_TENANT_SETTINGS.expressSurchargePercent).toBe(0);
    expect(DEFAULT_TOUR_DAYS).toEqual([2, 5]);
  });

  it('inclut les corrections validées (DRAFT, CREDIT)', () => {
    expect(DepositStatus.DRAFT).toBe('DRAFT');
    expect(ApprovalType.CREDIT).toBe('CREDIT');
  });
});
