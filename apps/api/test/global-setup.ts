import { execSync } from 'node:child_process';

/** Applique les migrations sur la base de test avant la suite end-to-end. */
export default function setup(): void {
  process.env['NODE_ENV'] = 'test';
  process.loadEnvFile('.env.test');
  execSync('pnpm exec prisma migrate deploy', { stdio: 'inherit', env: process.env });
}
