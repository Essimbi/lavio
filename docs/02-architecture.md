# 02 — Architecture

## Stack

| Couche | Choix |
|---|---|
| Back-end | **NestJS** (TypeScript strict), API REST versionnée `/v1`, documentation OpenAPI via `@nestjs/swagger` |
| Front-end | **Angular** (dernière version stable), composants standalone, signals, nouveau contrôle de flux, routes lazy, formulaires réactifs typés, `ChangeDetectionStrategy.OnPush` |
| UI | Angular Material (thème Lavio) + Tailwind CSS pour la mise en page. Voir `08-design-system.md` |
| Base de données | **PostgreSQL** (Neon via la Marketplace Vercel), ORM **Prisma** |
| Mobile | **PWA** : `@angular/service-worker`, manifest, notifications push Web Push (VAPID) |
| Fichiers | Vercel Blob (photos, justificatifs) |
| Déploiement | **Vercel** : un projet pour l'API, un projet pour le web (landing, application, superadmin) |
| Gestionnaire de paquets | pnpm (workspaces) |

Utilise les versions stables les plus récentes au démarrage du projet et **vérifie la documentation à jour** de Vercel (NestJS sur Vercel), d'Angular (PWA, prérendu) et de Prisma (adaptateur serverless). Consigne tout écart dans `docs/DECISIONS.md`.

## Monorepo

```
lavio/
  apps/
    api/            # NestJS
    web/            # Angular : landing, application pressing, superadmin
  packages/
    shared/         # enums, types d'API, constantes partagées (TypeScript pur)
  docs/             # cette documentation
  CLAUDE.md
```

`packages/shared` contient les énumérations (statuts, rôles, modes de paiement), les types des réponses d'API et les codes d'erreur, utilisés par les deux applications.

## Flux des requêtes

```
Navigateur / PWA  ->  https://<domaine>/api/*  --(rewrite Vercel)-->  projet API (NestJS)  ->  PostgreSQL
```

Le projet web proxifie `/api/*` vers le projet API avec une règle `rewrites` de `vercel.json`. Les cookies sont ainsi de première partie (même domaine), ce qui simplifie CORS et la sécurité.

## Multi-tenant

- **Base partagée, schéma partagé** : toutes les tables du pressing ont une colonne `tenant_id`.
- Le `tenant_id` vient **uniquement du jeton d'authentification**, jamais du corps de la requête.
- Une extension du client Prisma, alimentée par un contexte de requête (`AsyncLocalStorage`), **ajoute automatiquement** le filtre `tenant_id` à toutes les lectures et écritures des modèles du pressing. Les modèles plateforme (plans, licences, tenants, leads) ne sont accessibles que par les routes `/v1/admin/*`.
- Défense en profondeur : activer la sécurité par ligne PostgreSQL (RLS) sur les tables sensibles si le coût est raisonnable ; sinon documenter la décision.
- **Test obligatoire** : un utilisateur du pressing A ne peut lire, modifier ni deviner aucune donnée du pressing B (tests end-to-end sur chaque module).

## Authentification et autorisation

- Connexion par e-mail ou téléphone + mot de passe (Argon2id via `@node-rs/argon2`).
- Jeton d'accès JWT court (15 minutes), jeton de rafraîchissement rotatif stocké dans un cookie `HttpOnly; Secure; SameSite=Lax` et en base (hachés).
- Rôles du pressing : `OWNER`, `CASHIER`, `OPERATOR`, `STOCK_KEEPER`, `ACCOUNTANT`, `QUALITY`, `DRIVER`. Un utilisateur porte **une liste de rôles**.
- Rôles plateforme : `SUPER_ADMIN`, `PARTNER_VIEWER` (lecture seule).
- Autorisation par décorateur `@Roles(...)` et par permissions (matrice dans `05-regles-de-gestion.md`).
- Un garde `LicenseGuard` bloque les écritures si la licence n'est pas active (voir `06-licences-et-superadmin.md`).

## Conventions d'API

- JSON en `camelCase` partout (TypeScript de bout en bout). Tables et colonnes PostgreSQL en `snake_case` (mappage Prisma `@map`).
- Pagination : `?page=1&pageSize=25`, réponse `{ data: [], meta: { page, pageSize, total } }`.
- Erreurs : `{ error: { code: "STRING_CODE", message: "Message en français", details?: {} } }` avec le bon statut HTTP. Les codes sont dans `packages/shared`.
- Identifiants : UUID. Montants : entiers en FCFA (`BigInt` en base, `number` en JSON). Dates : ISO 8601 UTC.
- **Idempotence** : `POST /deposits` et `POST /payments` acceptent un en-tête `Idempotency-Key` ; une même clé ne crée jamais deux enregistrements.
- Numéros : le numéro de ticket est séquentiel par pressing, généré dans une transaction (table `counters`).

## Structure des modules

**API (`apps/api/src`)** : `auth`, `users`, `tenants`, `plans`, `licenses`, `subscription-payments`, `leads`, `customers`, `catalog`, `deposits`, `tracking`, `incidents`, `returns`, `payments`, `cash`, `expenses`, `treasury`, `stock`, `suppliers`, `purchasing`, `tours`, `reports`, `approvals`, `notifications`, `push`, `settings`, `audit`, `storage`, `health`, `cron`, `common` (gardes, filtres, intercepteurs, utilitaires).

**Web (`apps/web/src/app`)** : `core` (auth, intercepteurs HTTP, bannière de licence, file d'envoi), `shared` (composants UI), `features/landing`, `features/auth`, `features/app/*` (dashboard, customers, deposits, tracking, returns, payments, cash, stock, purchasing, expenses, accounting, tours, settings), `features/admin/*`.

## Qualité du code

- TypeScript `strict`, ESLint, Prettier, commits conventionnels (`feat:`, `fix:`, `docs:`).
- Logique métier dans des services testés ; contrôleurs minces ; DTO validés avec `class-validator`.
- Journal : Pino. Santé : `GET /v1/health`.
- Pas de dépendance inutile. Pas de fonctionnalité hors `01-contexte-et-perimetre.md`.
