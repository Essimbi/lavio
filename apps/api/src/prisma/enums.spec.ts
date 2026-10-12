import * as shared from '@lavio/shared';
import * as prisma from '../generated/prisma/enums.js';

/** Les enums Prisma et ceux de @lavio/shared doivent rester identiques. */
describe('enums Prisma ↔ @lavio/shared', () => {
  const names = [
    'TenantStatus',
    'LicenseStatus',
    'LicenseEventType',
    'PlatformRole',
    'TenantRole',
    'SubscriptionPaymentMethod',
    'SubscriptionPaymentStatus',
    'LeadStatus',
  ] as const;

  it.each(names)('%s a les mêmes valeurs', (name) => {
    const fromPrisma = Object.values(prisma[name] as Record<string, string>).sort();
    const fromShared = Object.values(shared[name] as Record<string, string>).sort();
    expect(fromPrisma).toEqual(fromShared);
  });
});
