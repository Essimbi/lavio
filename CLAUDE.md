# CLAUDE.md — Lavio

Lavio est un SaaS à licences de gestion de pressing (dépôts, suivi, paiements, stock, comptabilité de gestion, tournées), avec application mobile en PWA, interface superadmin et landing page. Le produit est en **français** ; le code, les noms de tables, de routes et de variables sont en **anglais**.

## À lire avant de coder

Lis `docs/00-README.md`, puis les documents `01` à `14` dans l'ordre. La documentation fait foi. En cas de conflit entre ce fichier et `docs/`, signale-le et demande.

## Stack (non négociable)

NestJS (API REST `/v1`), Angular (standalone, signals, OnPush), PostgreSQL avec Prisma, PWA, déploiement sur Vercel (projets `lavio-api` et `lavio-web`), **deux dépôts Git** :

- `Essimbi/lavio` (ce dépôt) : `apps/web`, `packages/shared` (version de référence), `docs/` ;
- `Essimbi/lavio-api` (localement `../lavio-api`) : API NestJS, Prisma, copie de `packages/shared`.

Toute modification de `packages/shared` se fait ici, puis est recopiée dans `lavio-api` avec `pnpm shared:sync` (depuis `lavio-api`), dans le même incrément de travail.

## Règles de travail

1. Travaille **phase par phase** selon `docs/12-plan-de-realisation.md`. Avant chaque phase : plan court. Après : tests, critères de fin vérifiés, `docs/PROGRESS.md` mis à jour, commit.
2. **Pas de fonctionnalité hors périmètre** (`docs/01-contexte-et-perimetre.md`, section « Hors périmètre »). Si une idée te semble utile, note-la dans `docs/PROGRESS.md`, ne la code pas.
3. **Valeur inconnue = hypothèse par défaut configurable** (`docs/14-...`), jamais une invention silencieuse. Ne pose une question que si tu es réellement bloqué ; propose alors une option par défaut.
4. Décisions techniques notables dans `docs/DECISIONS.md`.
5. **Vérifie la documentation à jour** des outils (Angular, NestJS, Prisma, Vercel, Web Push) plutôt que de te fier à ta mémoire.

## Règles de code non négociables

- TypeScript `strict`. Contrôleurs minces, logique dans des services testés, DTO validés.
- **Isolation des pressings** : `tenant_id` vient du jeton uniquement ; toute requête sur une table du pressing passe par le filtre automatique ; tests d'isolation obligatoires.
- **Règles métier côté serveur** (`docs/05-...`), jamais seulement dans l'interface.
- Montants en entiers (FCFA), dates en UTC, affichage Africa/Douala, interface en français.
- Paiements, écritures de caisse, journaux d'audit et mouvements de stock : **jamais supprimés ni modifiés** ; annulation par écriture inverse.
- Écritures sensibles (`POST /deposits`, `POST /payments`) : idempotentes via `Idempotency-Key`.
- **Ne jamais écrire en dur** le numéro WhatsApp, les prix, les taux ou les secrets : paramètres de plateforme ou variables d'environnement.
- Aucun secret dans le dépôt. Aucune donnée réelle dans les jeux de test ou de démonstration.
- Accessibilité et contrastes selon `docs/08-design-system.md` ; jamais de texte blanc sur aqua ou ambre.
- Pas de dépendance inutile ; préférer l'existant.

## Commandes

Prérequis : Node `^22.22.3` ou `>=24.15` (`.nvmrc`), pnpm 10 via corepack. L'API, la base locale (Docker) et leurs commandes sont dans le dépôt `lavio-api` (voir son `CLAUDE.md`).

```
pnpm install
pnpm dev                                 # web sur :4200 (proxy /api -> API locale sur :3000)
pnpm test                                # tests unitaires (shared, web)
pnpm --filter web test:e2e               # Playwright (après pnpm build ; PLAYWRIGHT_CHANNEL=chrome en local)
pnpm lint
pnpm build                               # PUBLIC_SITE_URL=https://… génère aussi sitemap.xml
```

Parcours Playwright complets (superadmin, dépôt, cycle, stock, tournée, mobile, landing) : démarrer l'API de `lavio-api` sur la base de test (`NODE_ENV=test`), créer les données de test (`pnpm e2e:admin` et `pnpm e2e:fixtures`), puis `API_ORIGIN=http://localhost:3000 E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… E2E_PASSWORD=… pnpm --filter web test:e2e`. Sans `API_ORIGIN`, ces parcours sont sautés.

Recette et exploitation : `docs/RECETTE.md`, `docs/EXPLOITATION.md`.

## Définition de « terminé » pour une phase

Critères de fin de la phase atteints, tests verts, lint propre, build des deux applications réussi, `docs/PROGRESS.md` à jour, commit propre, et un court résumé : ce qui est fait, hypothèses appliquées, points à confirmer.
