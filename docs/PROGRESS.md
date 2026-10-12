# Journal d'avancement

Mettre à jour à la fin de chaque phase : ce qui est fait, ce qui reste, anomalies, hypothèses appliquées, prochaines étapes.

## Corrections de la documentation (validées avec le plan de la phase 0, 12/10/2026)

Commit `docs: corrections issues du plan de la phase 0`.

| # | Document(s) | Correction |
|---|---|---|
| 1 | `04-api.md`, `11-deploiement-vercel.md` | Cron : `GET /v1/internal/cron/daily` (Vercel appelle les crons en `GET` avec `Authorization: Bearer <CRON_SECRET>`) ; chemin du `vercel.json` de l'API préfixé par `/v1` ; refus si `CRON_SECRET` absent |
| 2 | `03-modele-de-donnees.md`, `05-regles-de-gestion.md` | Paramètres du pressing complétés dans `tenants.settings` : `advanceMinPercent` (50), `processingDays` (2), `expressSurchargePercent` (0) ; `advanceRequiredAbove` vaut `null` par défaut (règle d'acompte désactivée) |
| 3 | `03-modele-de-donnees.md`, `05-regles-de-gestion.md` | `ApprovalType` + `CREDIT` (vente à crédit au-delà du plafond) ; règle `EXPENSE` : dépense au-delà de `largeExpenseAbove` saisie par un non-`OWNER` → validation |
| 4 | `05-regles-de-gestion.md` | Matrice des droits : l'opérateur fait avancer les articles de `RECEIVED` jusqu'à `QUALITY_CHECK` (au lieu de `IRONING`) |
| 5 | `02-architecture.md` | Accès explicites et limités au pressing du jeton aux modèles plateforme : `/auth/me`, `/license/status`, `/settings` (champs de paramétrage de `tenants`), `/public/config`, `/public/leads` |
| 6 | `03-modele-de-donnees.md`, `05-regles-de-gestion.md` | `DepositStatus` + `DRAFT` : une remise refusée renvoie le dépôt en brouillon modifiable (correction ou annulation) ; pas de ticket imprimable en `DRAFT` |

## Phase 0 — Socle (12/10/2026) : tâches 1 à 11 terminées, tâche 12 (déploiement) en attente

### Fait

- **Monorepo pnpm** (`apps/api`, `apps/web`, `packages/shared`), branche `main`, pnpm 10.34 via corepack, Node `^22.22.3 || >=24.15`, TypeScript strict (`tsconfig.base.json`), ESLint (config flat, typescript-eslint strict + angular-eslint avec règles d'accessibilité des templates), Prettier, husky + lint-staged + commitlint (commits conventionnels).
- **`packages/shared`** : toutes les énumérations de `03` (avec `DRAFT` et `CREDIT`), codes d'erreur avec statut HTTP et message français, types d'API (pagination, erreur, santé, configuration publique), paramètres par défaut du pressing.
- **API NestJS 12 (ESM)** : configuration validée au démarrage, `ValidationPipe` global strict (`whitelist`, `forbidNonWhitelisted`, erreurs détaillées par champ), filtre d'erreurs au format `{ error: { code, message, details? } }` (exceptions Nest, Prisma, corps trop gros, JSON invalide, erreurs inattendues masquées), Pino avec masquage des jetons et cookies, helmet, corps limité à 1 Mo, montants `BigInt` sérialisés en `number`, préfixe `/v1`, Swagger sur `/v1/docs` (désactivé par défaut en production), `GET /v1/health` (test de la base, 503 si injoignable).
- **Prisma 7** : `prisma.config.ts` (CLI sur `DIRECT_URL`), adaptateur `pg` (application sur `DATABASE_URL`), première migration `init_platform` : `tenants`, `users`, `refresh_tokens`, `invitations`, `plans`, `licenses`, `license_events`, `subscription_payments`, `leads`, `platform_settings`, `audit_logs` ; index partiel « une licence courante par pressing », contraintes `CHECK` (montants, périodes, type d'utilisateur), déclencheurs « ajout seul » sur `audit_logs` et `license_events`.
- **Seed idempotent** : paramètres plateforme (numéro WhatsApp lu depuis `WHATSAPP_DEFAULT_NUMBER`, message par défaut, taux de partage 50, essai 14 j, grâce 7 j), plan `STANDARD` (prix lus depuis l'environnement, sinon « Tarif sur demande »), premier `SUPER_ADMIN` (mot de passe Argon2id, à changer à la première connexion), pressing de démonstration fictif avec licence d'essai (jamais en production). Générateur de clé de licence `LAVIO-XXXX-XXXX-XXXX` (Crockford, aléa cryptographique).
- **Web Angular 22** (zoneless, standalone, signaux, OnPush) : routes lazy `/`, `/login`, `/app/*`, `/admin/*` (dont `/admin/login`), page introuvable ; jetons `--lv-*`, thème Material 3 relié aux jetons, Tailwind 4 sans palette propre, polices Poppins et DM Sans auto-hébergées ; `AppShell` (barre latérale ≥ 1024 px, navigation basse sur téléphone, action « Nouveau dépôt », lien d'évitement, `aria-current`) ; écrans d'attente des modules ; intercepteur HTTP (`X-Requested-With`, erreurs converties en `ApiError` avec message français, coupure réseau détectée) ; page d'accueil provisoire **prérendue** avec logo ; PWA de base (manifest, icônes de `docs/assets/pwa`, service worker avec cache `freshness` du tableau de bord uniquement) ; proxy de développement `/api` → `:3000`.
- **Vercel et CI** : `apps/web/vercel.json` (réécriture `/api/*`, repli SPA sur `index.csr.html`, `no-cache` du service worker, en-têtes de sécurité dont CSP stricte), `apps/api/vercel.json` (build, cron quotidien), workflow GitHub Actions (audit, lint, format, tests unitaires, e2e API avec PostgreSQL, build, Playwright). Aucun déploiement lancé.
- **Docker** : `docker-compose.yml` (PostgreSQL 17, port 54329, bases `lavio` et `lavio_test`).

### Tests (tous verts)

| Paquet | Unitaires | End-to-end |
|---|---|---|
| `@lavio/shared` | 4 | — |
| `api` | 28 (configuration, filtre d'erreurs, validation, sérialisation, santé, clé de licence, enums Prisma ↔ shared) | 11 (santé avec base, format d'erreur, préfixe, en-têtes de sécurité, 413, JSON invalide, licence courante unique, montants négatifs, types d'utilisateur, audit et événements en ajout seul) |
| `web` | 9 (intercepteur, coquille, accueil, contrastes des statuts) | 8 Playwright (ordinateur et mobile : accueil prérendu, manifeste, coquille, 404) |

Lint propre, format vérifié, build des trois paquets réussi (coquille initiale : 87 Ko transférés, cible ≤ 250 Ko).

### Critères de fin de la phase 0

| Critère | État |
|---|---|
| Les deux applications se construisent | Fait |
| Les deux applications se déploient | **En attente** (tâche 12 : comptes GitHub, Vercel, Neon) |
| `/v1/health` répond | Fait en local (API compilée et `pnpm dev` via le proxy) |
| Page d'accueil provisoire avec le logo | Fait (prérendue, vérifiée par Playwright) |
| Tests de démarrage | Fait |

### Hypothèses appliquées (configurables)

- Seuil d'acompte `advanceRequiredAbove` = `null` (règle désactivée tant que non configurée).
- Prix du plan `STANDARD` non définis : `null`, affichés « Tarif sur demande ».
- Majoration express `expressSurchargePercent` = 0.
- Unicité globale de l'e-mail et du téléphone des utilisateurs (une personne = un pressing en V1).
- Remise refusée → dépôt en `DRAFT`, corrigé ou annulé par le caissier.
- Tests du front et de l'API avec Vitest (voir `DECISIONS.md`).
- Jours de tournée par défaut : mardi et vendredi ; remise soumise à validation au-delà de 10 % ; alerte « non retiré » à 30 jours.

### Points à confirmer

- Mettre Node à jour sur le poste de développement (22.21 installé globalement ; 22.22.3 présent via nvm).
- Région d'hébergement (Neon, fonctions Vercel, Blob) : bloquant avant toute donnée réelle (docs/10, docs/14).
- Prix du plan, seuil d'acompte, taux de majoration express.
- Domaine de production (remplacer `LAVIO_API_HOST` dans `apps/web/vercel.json` par l'URL du projet `lavio-api`).

### Idées notées (hors périmètre, non codées)

- Aucune pour l'instant.

### Prochaine étape

Tâche 12 (premier déploiement de test) dès que GitHub, Vercel et Neon sont prêts, puis **phase 1** : authentification, multi-tenant (extension d'isolation et tests), licences et superadmin.
