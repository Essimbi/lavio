import { defineConfig } from 'prisma/config';

// Prisma 7 ne charge plus le fichier .env : on le charge s'il existe (développement local).
try {
  process.loadEnvFile(process.env['NODE_ENV'] === 'test' ? '.env.test' : '.env');
} catch {
  // Pas de fichier .env (CI, Vercel) : les variables viennent de l'environnement.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // CLI (migrations) : connexion directe, non poolée (Neon). L'application utilise DATABASE_URL.
    url: process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'] ?? '',
  },
});
