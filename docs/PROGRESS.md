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

### Séparation en deux dépôts (12/10/2026, à la demande de l'utilisateur)

- `Essimbi/lavio` : web, `packages/shared` (référence), `docs/` ; `apps/api`, Docker et scripts de base retirés ; CI du web.
- `Essimbi/lavio-api` (dossier local `../lavio-api`) : API à la racine, historique conservé, copie de `packages/shared`, configuration et CI propres, PostgreSQL sous Docker.
- Vérifié après séparation : API (lint, typage, format, 4 + 28 tests unitaires, 11 e2e, build, démarrage et `/v1/health`) ; web (lint, tests, build, Playwright).
- Docs 00, 02 et 11 mises à jour. `12-plan-de-realisation.md` (phase 0, « Monorepo pnpm ») décrit le plan initial et n'a pas été modifié.

### Prochaine étape (phase 0)

Tâche 12 (premier déploiement de test) dès que GitHub, Vercel et Neon sont prêts, puis **phase 1** : authentification, multi-tenant (extension d'isolation et tests), licences et superadmin.

## Phase 1 — Authentification, multi-tenant, licences, superadmin (13/10/2026)

### Fait

**API (`lavio-api`)**
- Connexion par e-mail ou téléphone (normalisé +237), Argon2id, blocage 15 min après 5 échecs, message d'erreur identique pour un compte inconnu ou un mauvais mot de passe, espaces `app` / `admin` séparés.
- Sessions : JWT 15 min, rafraîchissement rotatif haché en base avec détection de réutilisation, cookie HttpOnly/Secure/SameSite=Lax, CSRF par `X-Requested-With`, déconnexion.
- Invitations à usage unique (7 jours) et liens de réinitialisation, avec lien WhatsApp prérempli ; changement de mot de passe imposé au premier accès du superadmin.
- Contexte de requête (`AsyncLocalStorage`) et client Prisma isolé : `tenant_id` toujours issu du jeton.
- Gardes globales : authentification, périmètre et rôles (fermées par défaut), `LicenseGuard` (lecture seule, pressing suspendu, limite d'utilisateurs avec lien WhatsApp « Ajouter des utilisateurs »).
- Utilisateurs du pressing (OWNER) : invitation, rôles cumulables, désactivation, dernière responsable protégée.
- Superadmin : tableau de bord, pressings (création, fiche, suspension, réactivation, invitation de la responsable), plans, licences (création, renouvellement, changement de plan, suspension, réactivation avec statut précédent restauré, révocation, historique), paiements d'abonnement (prolongation automatique de la licence en transaction, remboursement), leads, utilisateurs plateforme, paramètres plateforme, journal d'audit ; Exploitant en lecture seule sans accès aux leads, paramètres, audit ni données des pressings.
- Relevé mensuel 50/50 calculé à la demande, exports CSV, XLSX et PDF identiques à l'écran.
- Cron quotidien `GET /v1/internal/cron/daily` (secret obligatoire, idempotent).
- Public : `GET /public/config`, `POST /public/leads` (consentement, champ piège, limite par IP hachée).
- Limitation de débit en base ; audit des connexions, blocages, changements de rôles et d'utilisateurs, actions superadmin, exports.
- Migration `phase1_auth_platform` (notes des leads, table `rate_limits`).

**Web (`lavio`)**
- Connexion `/login` et `/admin/login`, invitation `/invitation`, changement de mot de passe ; session restaurée depuis le cookie, jeton en mémoire seulement, rafraîchissement unique partagé et nouvel essai automatique.
- Gardes de routes (pressing, plateforme, rôles) ; navigation filtrée par rôle ; déconnexion.
- Pressing : bannières de licence (J-7, J-3, J-0, grâce, lecture seule), page « Ma licence » avec « Renouveler via WhatsApp », utilisateurs, journal d'audit, menus Paramètres et Plus.
- Superadmin : toutes les pages de docs/06 (tableau de bord, pressings, fiche, licences, plans, paiements, relevé et exports, demandes, utilisateurs, audit, paramètres).
- Composants partagés : notifications, confirmation avec motif, lien d'invitation (copie, WhatsApp), puces de statut, pagination, en-tête de page ; formats FCFA, dates et téléphones (docs/08).

### Tests (tous verts)

| Dépôt | Unitaires | End-to-end |
|---|---|---|
| `lavio` | 14 (shared : licences, bannières, WhatsApp, erreurs) + 21 (web : intercepteurs, coquille, bannière, formats, accueil) | Playwright : 10 de démarrage (ordinateur et mobile) + **parcours superadmin complet** contre l'API (création du pressing → licence → paiement → invitation → connexion de la responsable → lecture seule à l'expiration) |
| `lavio-api` | 14 (shared) + 47 (isolation, statut de licence, relevé 50/50, fuseau horaire, configuration…) | 63 : authentification et sessions, **isolation entre pressings**, droits par rôle, licence (GRACE, EXPIRED, SUSPENDED, REVOKED, sans licence, limite d'utilisateurs), cron, parcours superadmin, relevé et exports, Exploitant en lecture seule, routes publiques, limitation de débit |

Lint, typage et format propres ; builds réussis (web : 102 Ko transférés au chargement).

### Critères de fin de la phase 1

| Critère | État |
|---|---|
| Un superadmin crée un pressing, une licence, enregistre un paiement | Fait (e2e API et Playwright) |
| Il invite la responsable par lien WhatsApp ; la responsable se connecte | Fait |
| Une licence expirée passe le pressing en lecture seule | Fait (avant même le passage du cron) |
| Tests d'isolation entre pressings verts | Fait (utilisateurs, audit, licence, routes croisées pressing/plateforme) |

### Hypothèses appliquées (configurables)

- Session de 30 jours (`REFRESH_TOKEN_TTL_DAYS`).
- Limites de débit : connexion 30 / 15 min par IP, formulaire de contact 5 / h par IP, exports 30 / h par utilisateur.
- Mot de passe oublié : nouveau lien envoyé par la responsable ou le superadmin (pas d'e-mail en V1).
- Messages WhatsApp types (invitation, renouvellement, utilisateurs supplémentaires) : textes par défaut modifiables dans les paramètres du superadmin.

### Points à confirmer

- Durée de session de 30 jours et valeurs des limites de débit.
- Procédure « mot de passe oublié » par lien WhatsApp.

### Reporté (prévu dans une phase suivante)

- Notifications « licence qui expire sous 7 jours » (phase 3, centre de notifications).
- `GET/PATCH /settings` du pressing (paramètres, logo) : avec le catalogue et les tournées (phases 2 et 5).

### Prochaine étape

Phase 2 : clients, catalogue, dépôt et ticket.

## Phase 2 — Clients, catalogue, dépôt, ticket (13/10/2026)

### Fait

**API (`lavio-api`)** — migration `phase2_deposits`
- Clients : fiche (particulier ou entreprise, préférences « sans housse » et « reprise des cintres », remarques, crédit autorisé et plafond), recherche par nom, téléphone ou numéro de ticket, historique des dépôts, prix spéciaux des clients à compte.
- Catalogue : articles et services (archivage, jamais de suppression), grille tarifaire datée (un nouveau prix clôt l'ancien, jamais de mise à jour en place, un seul tarif ouvert par couple), grille courante et devis.
- Paramètres du pressing (OWNER) : identité, logo, TVA, préfixe et pied de ticket, jours de tournée, seuils.
- Dépôts : création idempotente, numéro séquentiel sans trou ni doublon, prix figés, majoration express, remise avec validation au-delà du seuil (PENDING_APPROVAL, refus → DRAFT corrigeable), date de retrait par défaut, check-list de réception, symboles ISO 3758, poids facultatif, photos (Vercel Blob), historique des statuts ; recherche et liste filtrable (statut, client, échéance, retards) ; annulation avec motif ; données du ticket et des étiquettes ; règle d'acompte.
- Validations (OWNER) : liste, approbation, refus, avec effet sur le dépôt dans la même transaction.
- Listes par défaut à la création d'un pressing ; données de démonstration fictives.

**Web (`lavio`)**
- **Nouveau dépôt** sur un seul écran, pensé pour le clavier : recherche du client (téléphone, nom ou numéro) avec création rapide, lignes d'articles (service choisi automatiquement s'il a un tarif), détails facultatifs, total en direct, avertissement de validation, `Alt + N`, `Ctrl + Entrée`, impression automatique du ticket.
- Ticket 80 mm (numéro en grand et en toutes lettres, QR code 28 mm, montants, date de retrait, mentions) et étiquettes (50 × 30 mm ou planche A4).
- Dépôts (liste, ouverture directe par numéro), fiche du dépôt (validation, correction de remise, annulation, photos), clients (liste, fiche, historique, prix spéciaux), validations, catalogue et grille tarifaire avec historique, paramètres du pressing.

### Tests (tous verts)

| Dépôt | Unitaires | End-to-end |
|---|---|---|
| `lavio` | 43 (shared : prix, acompte, TVA, date de retrait, numéros, nombre en toutes lettres…) + 21 (web) | Playwright : **parcours 1** (dépôt de 3 articles et ticket : 11 actions, quelques secondes), **remise bloquée puis validée par la responsable**, superadmin, démarrage |
| `lavio-api` | 43 + 50 (dont stockage Blob, isolation) | 89, dont 26 nouveaux : catalogue daté, recherche client, prix spéciaux, prix figés, **numérotation concurrente**, **idempotence**, remise (validation, refus, correction), acompte, ticket et étiquettes, annulation, droits par rôle, **isolation** (lecture, écriture, clés étrangères d'un autre pressing, validations, numéros) |

### Critères de fin de la phase 2

| Critère | État |
|---|---|
| Un caissier enregistre un dépôt et imprime le ticket en moins de 90 s (client existant) | Fait (parcours Playwright : 11 actions) |
| Les prix sont figés | Fait (test : un changement de grille ne modifie pas un dépôt existant) |
| Une remise au-dessus du seuil bloque l'impression jusqu'à validation | Fait (API et Playwright) |

### Hypothèses appliquées (configurables)

- Majoration express arrondie au franc le plus proche ; seuil de remise comparé au sous-total hors majoration, strictement.
- Une étiquette par pièce (quantité) ; planche A4 de 24 en option.
- Nouveaux pressings : articles et services par défaut, sans aucun tarif.
- Règle d'acompte appliquée côté serveur, désactivée par défaut ; saisie de l'acompte en phase 3.

### Points à confirmer

- **Ordre des phases (doc 12)** : l'acompte est listé en phase 2 alors que les paiements et la caisse sont en phase 3 (voir DECISIONS).
- Arrondi de la majoration express et assiette du seuil de remise.
- Listes par défaut des articles et services.

### Idées notées (hors périmètre, non codées)

- Aucune.

### Prochaine étape

Phase 3 : suivi des articles, restitution, paiements, caisse, validations et centre de notifications.

## Phase 3 — Suivi, restitution, paiements, caisse (13/10/2026)

### Fait

**API (`lavio-api`)**
- **Suivi** : transitions d'articles vérifiées par rôle (`checkItemTransition` dans `packages/shared`) : opérateur jusqu'à « Contrôle qualité », contrôle qualité vers « Prêt » et reprises, responsable partout. « Prêt » seulement depuis le contrôle qualité, avec la check-list complète (4 points). Un retour en arrière est une reprise : cause ou motif obligatoire, incident REWORK créé. Changement unitaire ou groupé, emplacement de rangement, historique en ajout seul, statut du dépôt recalculé.
- **Incidents** (dommage, tache persistante, perdu, retrouvé, reprise) et causes de reprise codifiées : liste par défaut à la création du pressing, modifiable par la responsable.
- **Restitution** totale ou partielle, seulement pour des articles prêts. La restitution est directe si le dépôt est soldé, si le client à crédit reste sous son plafond, ou si c'est la responsable qui restitue. Sinon, une validation CREDIT est créée (réponse 202) et la restitution s'exécute à l'approbation. Alerte « impayé important » au-delà du seuil configuré.
- **Paiements** : espèces, Orange Money, MTN MoMo, virement, chèque. Idempotents (`Idempotency-Key`), montant limité au reste à payer (au montant payé pour un remboursement), référence obligatoire pour Mobile Money. Un doublon de référence est refusé (`DUPLICATE_REFERENCE`), puis accepté sur confirmation explicite, tracée dans l'audit. Annulation par écriture inverse, rapprochement Mobile Money, export CSV, créances par client, reçu, facture PDF (TVA incluse si le pressing est assujetti). Une annulation de dépôt déjà payé enregistre un remboursement.
- **Caisse** : une seule session ouverte par pressing (index partiel unique), espèces exigées sur une session ouverte, attendu = fond + espèces reçues − espèces rendues, écart avec note obligatoire. La responsable clôture directement ; un autre utilisateur passe la session en « clôture à valider » (validation CASH_CLOSE ; un refus rouvre la session). Une session clôturée est figée.
- **Validations** DISCOUNT, CREDIT et CASH_CLOSE ; **centre de notifications** (demande de validation, clôture, écart de caisse, impayé important, dépôt en retard, licence qui expire), sans push. Cron quotidien : alertes de retard et de licence, une fois par jour et par pressing.
- **Garde-fous SQL** : un paiement n'est jamais supprimé ni modifié (seul le rapprochement peut changer), montant > 0, référence obligatoire pour Mobile Money, restitutions en ajout seul, session de caisse clôturée figée.

**Web (`lavio`)**
- **Suivi** : recherche par numéro, file des dépôts en traitement (filtre « en retard »), sélection d'un ou de plusieurs articles, boutons de statut activés selon le rôle, emplacement de rangement, dialogue de contrôle qualité, dialogue de reprise avec cause, signalement d'incident.
- **Fiche du dépôt** : encaissement (dialogue avec doublon Mobile Money à confirmer, clé d'idempotence), liste des paiements avec annulation par écriture inverse, restitution avec message de vente à crédit, incidents, liens vers le suivi, le reçu et la facture PDF, choix du mode de remboursement à l'annulation.
- **Caisse** : ouverture, attendu, comptage avec écart en direct et note obligatoire, demande de clôture ou clôture directe, historique, journal (entrées, sorties, autres modes).
- **Paiements** : filtres (mode, Mobile Money, rapprochement, dates), rapprochement en un clic, export CSV, onglet Créances avec encaissement.
- **Reçu 80 mm** (`/print/receipt/:id`, styles partagés avec le ticket), **Notifications** (page, pastilles dans la barre latérale, cloche sur mobile, « Plus » ; rafraîchies chaque minute quand l'onglet est visible), **Validations** (crédit et clôture de caisse), **Causes de reprise** dans les paramètres. Navigation filtrée par rôle.

### Tests (tous verts)

| Dépôt | Unitaires | End-to-end |
|---|---|---|
| `lavio` | 52 (shared, dont transitions et caisse) + 26 (web, dont pastilles de la coquille et dialogue d'encaissement : montant, référence, doublon, idempotence) | Playwright : **cycle complet** (ouverture de caisse → dépôt → statuts par l'opérateur → reprise → contrôle qualité → encaissement → restitution → reçu → clôture demandée puis validée par la responsable), parcours 1, remise, superadmin, démarrage |
| `lavio-api` | 52 + 50 | 111, dont 22 nouveaux : cycle et droits du suivi, check-list, reprise et incident, statut du dépôt, restitution (non prêt, partielle, crédit validé, plafond), paiements (plafond, référence, doublon confirmé, idempotence, écriture inverse, **suppression et modification refusées en base**, rapprochement, export), annulation avec remboursement, reçu, TVA et PDF, caisse (session unique, attendu, note sur écart, clôture validée ou refusée, session figée en base), notifications, alerte de retard unique par jour, **isolation** de tous les nouveaux modules |

### Critères de fin de la phase 3

| Critère | État |
|---|---|
| Cycle complet démontrable : dépôt → statuts → contrôle qualité → restitution → encaissement → clôture de caisse | Fait (parcours Playwright de bout en bout, quatre rôles) |
| Règles de `05-regles-de-gestion.md` couvertes par des tests | Fait pour le périmètre de la phase (suivi, restitution, paiements, caisse, validations, notifications) |

### Hypothèses appliquées (configurables)

- Seuls les paiements en espèces exigent une caisse ouverte ; Mobile Money, virement et chèque apparaissent au journal pour information, sans entrer dans le comptage.
- Un doublon de référence Mobile Money est recherché pour le même opérateur, dans le pressing seulement.
- La responsable peut restituer à crédit sans validation et clôturer la caisse sans validation.
- Alerte « licence qui expire » à 7 jours ou moins ; « impayé important » au-delà de `unpaidAlertAbove` (désactivée par défaut).
- Causes de reprise par défaut : tache persistante, repassage à reprendre, odeur, dommage constaté, réclamation du client, autre.
- Le reçu et la facture affichent la TVA incluse dans le total (prix TTC).
- Le jeu de test Playwright (`pnpm e2e:fixtures`) referme les sessions de caisse restées ouvertes dans le pressing de test.

### Points à confirmer

- Faut-il un fond de caisse proposé automatiquement à partir de la dernière clôture ?
- Les remboursements en espèces à l'annulation exigent une caisse ouverte : confirmer que c'est le fonctionnement voulu.
- Le statut « Retiré » n'est atteint que par la restitution (pas de bouton dans le suivi) : confirmer.

### Idées notées (hors périmètre, non codées)

- Aucune.

### Prochaine étape

Phase 4 : stock, achats, dépenses, rapports.
