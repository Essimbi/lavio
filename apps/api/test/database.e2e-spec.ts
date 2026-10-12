import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { generateLicenseKey } from '../src/licenses/license-key.js';

/** Contraintes de la base qui ne dépendent pas du code applicatif (docs/03). */
describe('Contraintes de la base (e2e)', () => {
  let prisma: PrismaClient;
  let planId: string;

  const createTenant = (slug: string) =>
    prisma.tenant.create({ data: { name: `Pressing ${slug}`, slug } });

  const license = (tenantId: string, status: 'TRIAL' | 'ACTIVE' | 'GRACE' | 'EXPIRED') => ({
    tenantId,
    planId,
    key: generateLicenseKey(),
    status,
    startsAt: new Date('2026-01-01T00:00:00Z'),
    endsAt: new Date('2026-02-01T00:00:00Z'),
  });

  beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] ?? '' }),
    });
    await prisma.$executeRawUnsafe(
      'TRUNCATE audit_logs, license_events, subscription_payments, licenses, invitations, refresh_tokens, users, tenants, plans, leads, platform_settings CASCADE',
    );
    planId = (await prisma.plan.create({ data: { code: 'TEST', name: 'Test' } })).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('autorise une seule licence courante par pressing', async () => {
    const tenant = await createTenant('licence-unique');
    await prisma.license.create({ data: license(tenant.id, 'ACTIVE') });
    await expect(prisma.license.create({ data: license(tenant.id, 'TRIAL') })).rejects.toThrow();
    // Une licence expirée (non courante) reste possible en historique.
    await expect(
      prisma.license.create({ data: license(tenant.id, 'EXPIRED') }),
    ).resolves.toBeTruthy();
  });

  it('refuse un montant négatif', async () => {
    await expect(
      prisma.plan.create({ data: { code: 'NEG', name: 'Négatif', priceMonthlyXaf: -1n } }),
    ).rejects.toThrow();
  });

  it('distingue strictement utilisateurs plateforme et utilisateurs de pressing', async () => {
    const tenant = await createTenant('roles');
    await expect(
      prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: 'mixte@test.local',
          fullName: 'Mixte',
          platformRole: 'SUPER_ADMIN',
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.user.create({
        data: { email: 'orphelin@test.local', fullName: 'Sans rôle plateforme' },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.user.create({ data: { tenantId: tenant.id, fullName: 'Sans identifiant' } }),
    ).rejects.toThrow();
  });

  it('interdit de modifier ou supprimer le journal d’audit', async () => {
    const entry = await prisma.auditLog.create({
      data: { action: 'TEST', entity: 'test', entityId: '1' },
    });
    await expect(
      prisma.auditLog.update({ where: { id: entry.id }, data: { action: 'MODIFIÉ' } }),
    ).rejects.toThrow();
    await expect(prisma.auditLog.delete({ where: { id: entry.id } })).rejects.toThrow();
  });

  it('interdit de modifier ou supprimer un événement de licence', async () => {
    const tenant = await createTenant('evenements');
    const created = await prisma.license.create({ data: license(tenant.id, 'TRIAL') });
    const event = await prisma.licenseEvent.create({
      data: { licenseId: created.id, type: 'CREATED' },
    });
    await expect(prisma.licenseEvent.delete({ where: { id: event.id } })).rejects.toThrow();
  });
});
