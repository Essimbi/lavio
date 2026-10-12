/**
 * Seed idempotent (docs/03, docs/11) : paramètres plateforme, plan STANDARD, premier SUPER_ADMIN,
 * et pressing de démonstration (jamais en production). Ne remplace jamais une valeur existante.
 * Toutes les valeurs viennent de l'environnement : aucun numéro, prix ni secret en dur.
 */
import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { DEFAULT_TENANT_SETTINGS, DEFAULT_TOUR_DAYS } from '@lavio/shared';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import { generateLicenseKey } from '../src/licenses/license-key.js';

try {
  process.loadEnvFile(process.env['NODE_ENV'] === 'test' ? '.env.test' : '.env');
} catch {
  // Variables fournies par l'environnement.
}

const env = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

const optionalAmount = (name: string): bigint | null => {
  const value = env(name);
  if (value === undefined) return null;
  if (!/^\d+$/.test(value)) throw new Error(`${name} doit être un entier positif en FCFA`);
  return BigInt(value);
};

const DAY_MS = 24 * 60 * 60 * 1000;
const isProduction = env('NODE_ENV') === 'production';
const databaseUrl = env('DATABASE_URL');
if (!databaseUrl) throw new Error('DATABASE_URL est obligatoire pour le seed');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const log = (message: string) => console.log(`[seed] ${message}`);

/** Crée un paramètre plateforme s'il n'existe pas (ne remplace jamais une valeur modifiée). */
async function ensureSetting(key: string, value: Prisma.InputJsonValue): Promise<void> {
  const existing = await prisma.platformSetting.findUnique({ where: { key } });
  if (existing) {
    log(`paramètre ${key} déjà présent`);
    return;
  }
  await prisma.platformSetting.create({ data: { key, value } });
  log(`paramètre ${key} créé`);
}

async function seedPlatformSettings(): Promise<number> {
  const whatsapp = env('WHATSAPP_DEFAULT_NUMBER');
  if (whatsapp) {
    if (!/^\d{8,15}$/.test(whatsapp)) {
      throw new Error('WHATSAPP_DEFAULT_NUMBER doit contenir uniquement des chiffres (ex. 237…)');
    }
    await ensureSetting('whatsappNumber', whatsapp);
  } else {
    log('⚠ WHATSAPP_DEFAULT_NUMBER absent : numéro WhatsApp non initialisé');
  }
  // Texte proposé par docs/07, modifiable ensuite depuis le superadmin.
  await ensureSetting(
    'whatsappDefaultMessage',
    'Bonjour, je souhaite en savoir plus sur Lavio pour mon pressing.',
  );
  await ensureSetting('shareRatePercent', 50);
  await ensureSetting('defaultTrialDays', 14);
  await ensureSetting('defaultGraceDays', 7);

  const trial = await prisma.platformSetting.findUniqueOrThrow({
    where: { key: 'defaultTrialDays' },
  });
  return Number(trial.value);
}

async function seedPlan(trialDays: number) {
  const existing = await prisma.plan.findUnique({ where: { code: 'STANDARD' } });
  if (existing) {
    log('plan STANDARD déjà présent');
    return existing;
  }
  const plan = await prisma.plan.create({
    data: {
      code: 'STANDARD',
      name: 'Standard',
      priceMonthlyXaf: optionalAmount('SEED_PLAN_PRICE_MONTHLY_XAF'),
      priceYearlyXaf: optionalAmount('SEED_PLAN_PRICE_YEARLY_XAF'),
      includedUsers: 2,
      trialDays,
      features: { stock: true, accounting: true, tours: true, push: true },
    },
  });
  log(
    plan.priceMonthlyXaf === null
      ? '⚠ plan STANDARD créé sans prix (« Tarif sur demande ») : prix à confirmer'
      : 'plan STANDARD créé',
  );
  return plan;
}

async function seedSuperAdmin(): Promise<void> {
  const email = env('SUPERADMIN_EMAIL')?.toLowerCase();
  if (!email) {
    log('⚠ SUPERADMIN_EMAIL absent : aucun SUPER_ADMIN créé');
    return;
  }
  if (await prisma.user.findUnique({ where: { email } })) {
    log('SUPER_ADMIN déjà présent');
    return;
  }
  const password = env('SUPERADMIN_INITIAL_PASSWORD');
  if (!password || password.length < 10) {
    throw new Error('SUPERADMIN_INITIAL_PASSWORD est obligatoire (10 caractères minimum)');
  }
  await prisma.user.create({
    data: {
      email,
      fullName: 'Super administrateur',
      platformRole: 'SUPER_ADMIN',
      passwordHash: await hash(password),
      mustChangePassword: true,
    },
  });
  log(`SUPER_ADMIN ${email} créé (mot de passe à changer à la première connexion)`);
}

async function seedDemoTenant(planId: string, trialDays: number): Promise<void> {
  if (isProduction || env('SEED_DEMO') !== 'true') {
    log('pressing de démonstration ignoré');
    return;
  }
  const slug = 'pressing-demo';
  if (await prisma.tenant.findUnique({ where: { slug } })) {
    log('pressing de démonstration déjà présent');
    return;
  }
  const now = new Date();
  await prisma.tenant.create({
    data: {
      name: 'Pressing Démo (données fictives)',
      slug,
      city: 'Douala',
      tourDays: [...DEFAULT_TOUR_DAYS],
      settings: { ...DEFAULT_TENANT_SETTINGS },
      ticketFooter: 'Merci de votre confiance.',
      licenses: {
        create: {
          planId,
          key: generateLicenseKey(),
          status: 'TRIAL',
          startsAt: now,
          endsAt: new Date(now.getTime() + trialDays * DAY_MS),
          events: { create: { type: 'CREATED', payload: { source: 'seed' } } },
        },
      },
    },
  });
  log('pressing de démonstration créé avec une licence d’essai');
}

async function main(): Promise<void> {
  const trialDays = await seedPlatformSettings();
  const plan = await seedPlan(trialDays);
  await seedSuperAdmin();
  await seedDemoTenant(plan.id, trialDays);
}

main()
  .catch((error: unknown) => {
    console.error('[seed] échec :', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
