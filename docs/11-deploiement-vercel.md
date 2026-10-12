# 11 — Déploiement sur Vercel

## Projets

| Projet Vercel | Dossier racine | Contenu |
|---|---|---|
| `lavio-api` | `apps/api` | API NestJS (fonction serverless) |
| `lavio-web` | `apps/web` | Angular : landing (`/`), connexion (`/login`), application (`/app/*`), superadmin (`/admin/*`) |

Les deux projets lisent le même dépôt (monorepo pnpm). Activer « Include source files outside of the Root Directory » pour accéder à `packages/shared`. Domaine unique `https://<domaine>` : le projet web sert tout et proxifie `/api/*` vers `lavio-api`.

**Avant de coder le déploiement, lire la documentation Vercel à jour** sur NestJS (déploiement sans configuration ou point d'entrée serverless), sur les monorepos pnpm et sur les fonctions (durée maximale, région, taille de corps). Si la méthode recommandée diffère de ce document, suivre la documentation et le noter dans `docs/DECISIONS.md`.

## API NestJS sur Vercel

- Le point d'entrée crée l'application Nest **une seule fois** (variable de module) et la réutilise entre les invocations (réduction des démarrages à froid). Pas de `listen()` en production serverless.
- Aucune donnée en mémoire partagée entre requêtes (sessions, files, verrous) : tout passe par la base.
- Connexion Prisma via la chaîne **poolée** (`DATABASE_URL`) ; migrations via la chaîne **directe** (`DIRECT_URL`). Utiliser l'adaptateur serverless de Prisma adapté à Neon si la documentation Prisma le recommande.
- Région des fonctions : la plus proche de la base de données et des utilisateurs (voir `10-securite-et-conformite.md` pour la contrainte de localisation des données).
- Durée maximale configurée à 60 s pour les exports ; corps de requête limité (4,5 Mo) : photos via téléversement direct vers Blob.
- `GET /v1/health` pour la supervision.

## Commandes de build

```
# lavio-api
installCommand: pnpm install --frozen-lockfile
buildCommand:   pnpm --filter @lavio/shared build && pnpm --filter api exec prisma generate && pnpm --filter api build

# lavio-web
installCommand: pnpm install --frozen-lockfile
buildCommand:   pnpm --filter @lavio/shared build && pnpm --filter web build
outputDirectory: apps/web/dist/web/browser   # à vérifier selon la version d'Angular
```

Migrations : en production, exécuter `prisma migrate deploy` dans une étape de déploiement contrôlée (script `pnpm --filter api db:deploy`), jamais `db push`. Les migrations sont versionnées dans le dépôt.

## Variables d'environnement

| Variable | Projet | Rôle |
|---|---|---|
| `DATABASE_URL` | api | Chaîne PostgreSQL poolée |
| `DIRECT_URL` | api | Chaîne directe, pour les migrations |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | api | Signature et hachage des jetons (aléa de 64 octets) |
| `APP_URL` | api | URL publique (liens d'invitation) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | api | Notifications push (`VAPID_SUBJECT` = `mailto:…`) |
| `BLOB_READ_WRITE_TOKEN` | api | Vercel Blob |
| `CRON_SECRET` | api | Authentifie les appels de cron |
| `SUPERADMIN_EMAIL`, `SUPERADMIN_INITIAL_PASSWORD` | api | Création du premier `SUPER_ADMIN` au seed ; mot de passe à changer dès la première connexion |
| `WHATSAPP_DEFAULT_NUMBER` | api | Valeur initiale du numéro (`237694219620`), copiée dans `platform_settings` au seed |
| `LOG_LEVEL`, `SENTRY_DSN` | api | Journaux ; suivi d'erreurs facultatif |
| `API_ORIGIN` | web | Destination de la règle de réécriture `/api/*` (URL du projet `lavio-api`) |

Aucun secret côté web. La clé VAPID publique est injectée dans la configuration du front au build.

## `vercel.json` du projet web (exemple à valider)

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://<lavio-api>.vercel.app/:path*" },
    { "source": "/((?!api/|.*\\..*).*)", "destination": "/index.html" }
  ],
  "headers": [
    { "source": "/(ngsw.json|ngsw-worker.js|safety-worker.js|worker-basic.min.js)", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
    { "source": "/(.*)", "headers": [
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
      { "key": "Permissions-Policy", "value": "camera=(self), geolocation=()" }
    ] }
  ]
}
```

Les pages prérendues (landing) existent en HTML statique ; les routes de l'application retombent sur `index.html`. Ajouter une politique `Content-Security-Policy` adaptée (polices auto-hébergées, `connect-src 'self'`, `img-src 'self' data: blob: https://*.public.blob.vercel-storage.com`).

## Cron (`vercel.json` du projet API)

```json
{ "crons": [{ "path": "/internal/cron/daily", "schedule": "0 5 * * *" }] }
```

Vercel appelle la route avec `Authorization: Bearer $CRON_SECRET` ; l'API vérifie ce jeton. Une exécution quotidienne suffit en V1 (compatible avec les offres de base).

## Base de données

PostgreSQL de la Marketplace Vercel (Neon). Une branche de base par aperçu (preview) si l'intégration le permet ; sinon une base de développement partagée. Script de seed idempotent (`pnpm --filter api db:seed`) : plan, superadmin, listes par défaut, pressing de démonstration (jamais en production).

## Environnements

`production` (domaine principal), `preview` (chaque pull request, données fictives), `development` (local avec `vercel env pull`). Tests automatiques exécutés avant chaque déploiement de production.

## Mise en production

1. Tests verts (unitaires, end-to-end, isolation).
2. Variables d'environnement vérifiées.
3. Migrations appliquées (`db:deploy`).
4. Déploiement des deux projets.
5. Vérifications : `/v1/health`, connexion superadmin, création d'un pressing de test, un dépôt avec ticket, une clôture de caisse, réception d'une notification push.
6. Retour arrière : promouvoir le déploiement précédent dans Vercel ; les migrations doivent rester rétrocompatibles d'une version.
