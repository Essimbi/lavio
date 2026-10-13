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

## Phase 4 — Stock, achats, dépenses, rapports (13/10/2026)

### Fait

**API (`lavio-api`)**
- **Stock** :
  - produits (quantités à 3 décimales, cache `on_hand` mis à jour dans la même transaction que le mouvement) ;
  - mouvements en ajout seul (déclencheur SQL) ;
  - coût moyen pondéré à chaque entrée, sorties valorisées au coût moyen ;
  - sortie rendant le stock négatif refusée (`INSUFFICIENT_STOCK`), sauf dérogation de la responsable avec motif écrit, tracée dans l'audit ;
  - motif obligatoire pour les sorties et les ajustements ; l'opérateur ne saisit que des sorties de consommation ;
  - ajustement par un autre utilisateur que la responsable → validation `STOCK_ADJUSTMENT`, aucun effet avant l'approbation ;
  - alerte `STOCK_LOW` une seule fois par franchissement du seuil, réarmée quand le stock repasse au-dessus.
- **Inventaire** : stock théorique photographié, saisie des quantités comptées, soumission → validation `INVENTORY` ; les mouvements `INVENTORY` ne sont créés qu'à l'approbation. Un refus renvoie l'inventaire en brouillon.
- **Achats** : fournisseurs, bons de commande numérotés par pressing (brouillon → envoyée → reçue en partie → reçue, ou clôturée), réceptions partielles créant les entrées de stock au coût reçu, sur-réception refusée.
- **Trésorerie** :
  - comptes par défaut (Caisse, Banque, Orange Money, MTN MoMo), chacun relié à ses modes d'encaissement ;
  - solde calculé : solde d'ouverture + encaissements nets + virements reçus − virements émis − dépenses enregistrées ;
  - virements en ajout seul.
- **Dépenses** :
  - catégories par défaut, dont « Achats matières » réservée aux factures fournisseurs ;
  - une dépense payée depuis la caisse exige une caisse ouverte et réduit les espèces attendues (règle 2 de la caisse) ; elle apparaît au journal ;
  - au-delà de `largeExpenseAbove`, validation `EXPENSE` si l'auteur n'est pas la responsable ;
  - annulation tracée (jamais de suppression, déclencheur SQL), impossible si la caisse de la dépense est clôturée ;
  - la caisse ne saisit que des dépenses en espèces.
- **Dépenses récurrentes** : le cron quotidien génère un brouillon par échéance (jamais deux) et rattrape les échéances manquées ; le comptable le confirme.
- **Factures fournisseurs** : échéances et retards ; le paiement crée une dépense « Achats matières » (pas de double comptage avec les entrées de stock) ; un seul paiement possible ; si ce paiement est annulé, la facture redevient à payer.
- **Relevés d'eau et d'électricité** : consommation calculée, index cohérent avec les relevés voisins.
- **Rapports** :
  - chiffre d'affaires et encaissements, journal de caisse, trésorerie, résultat simplifié, créances et dettes, valorisation du stock ;
  - formats JSON, CSV et XLSX, produits à partir d'une même structure (identiques à l'écran) ;
  - exports audités et limités en débit.
- Validations : `STOCK_ADJUSTMENT`, `INVENTORY` et `EXPENSE` traitées dans la même transaction que la décision.
- Seed de démonstration : 8 produits de stock fictifs et un fournisseur fictif.

**Web (`lavio`)**
- **Stock** : liste avec alertes et filtre « sous le seuil » ; fiche produit (quantité, coût moyen, valeur, mouvements, saisie selon le rôle, dérogation pour la responsable) ; inventaires (comptage, écarts en direct, soumission).
- **Achats** : commandes (liste, création, envoi, réception ligne par ligne, clôture), fournisseurs.
- **Dépenses** : saisie (la caisse saisit les dépenses en espèces), brouillons à confirmer, annulation avec motif, récurrences, catégories.
- **Comptabilité** :
  - trésorerie (soldes, virements, nouveau compte) ;
  - rapports génériques (période, tableaux, totaux, exports CSV et Excel) ;
  - factures fournisseurs (saisie, paiement, retards) ;
  - compteurs.
- **Validations** : affichage des ajustements, inventaires et dépenses. Navigation filtrée par rôle (matrice de docs/05).

### Tests (tous verts)

| Dépôt | Unitaires | End-to-end |
|---|---|---|
| `lavio` | 58 (shared, dont coût moyen pondéré, alerte par franchissement, échéances mensuelles) + 26 (web) | Playwright, 15 parcours : nouveau parcours **stock** (produit, entrée, sortie sous le seuil, valorisation exportée par la comptable) ; **cycle complet** désormais avec encaissement Mobile Money et référence (docs/13, parcours 2) ; parcours 1, remise, superadmin, démarrage |
| `lavio-api` | 58 + 50 | 131, dont 20 nouveaux. **Stock** : droits, coût moyen, stock négatif et dérogation, motifs, alerte unique par franchissement, ajustement validé ou refusé, mouvements immuables en base, inventaire appliqué seulement à l'approbation, commande et réceptions. **Comptabilité** : comptes et encaissements, dépense de caisse et espèces attendues, dépense importante validée, annulation, virements immuables, récurrence générée une seule fois, facture fournisseur, compteurs. **Rapports** : exports CSV et XLSX identiques à l'écran, résultat, trésorerie et valorisation cohérentes avec les écrans, droits. **Isolation** de tous les nouveaux modules |

### Critères de fin de la phase 4

| Critère | État |
|---|---|
| Stock cohérent avec les mouvements | Fait (cache mis à jour dans la transaction du mouvement, mouvements immuables, inventaire par mouvements) |
| Alertes déclenchées une fois par franchissement | Fait (test API) |
| Exports identiques aux chiffres affichés | Fait (même structure pour l'écran, le CSV et le XLSX ; tests) |

### Hypothèses appliquées (configurables ou à confirmer)

- Chiffre d'affaires : dépôts validés (hors brouillons, remises en attente et annulés), par date de dépôt.
- Le dernier coût d'entrée devient le « prix d'achat » du produit ; le coût moyen arrondi au franc.
- Un stock négatif (dérogation) n'entre pas dans le calcul du coût moyen de l'entrée suivante.
- Inventaire : écarts calculés à la soumission et appliqués tels quels à l'approbation, même si le stock a bougé entre-temps. Un seul inventaire en cours à la fois.
- Une dépense de caisse est datée de sa saisie et rattachée à la session ouverte.
- Une dépense en attente de validation ne compte ni dans la trésorerie ni dans les espèces attendues.
- Les virements depuis le compte « Caisse » ne modifient pas les espèces attendues de la session : ils se font après la clôture.
- Jour d'échéance des récurrences limité à 1 à 28.
- Relevés de compteurs : index croissant, un relevé par compteur et par date.
- Rapports : période maximale d'un an ; mois en cours par défaut.

### Points à confirmer

- Faut-il un justificatif (photo) obligatoire pour certaines dépenses ? Le champ `receiptUrl` existe mais l'envoi de fichier n'est pas encore branché à l'écran.
- Les virements depuis la caisse pendant une session ouverte doivent-ils réduire les espèces attendues ?
- Faut-il proposer automatiquement une commande pour les produits sous le seuil ? Hors périmètre V1 : noté, non codé.

### Écarts avec docs/03 (champs ajoutés, à reporter dans la documentation si vous validez)

- `expenses.status`, `approval_id`, `cancel_reason`, `supplier_invoice_id` ;
- `inventories.status` avec `PENDING_APPROVAL` ;
- `stock_items.on_hand` et `low_alert_sent` ;
- `treasury_accounts.payment_methods` et `is_active` ;
- `purchase_orders.number` ;
- `recurring_expenses.label` et `created_by` ;
- `suppliers.is_active`.

### Idées notées (hors périmètre, non codées)

- Proposition de commande à partir des produits sous le seuil.

### Prochaine étape

Phase 5 : tournées, tableau de bord 360°, mobile de la responsable, notifications push.

## Phase 5 — Tournées, tableau de bord, mobile, push (13/10/2026)

### Fait

**API (`lavio-api`)**
- **Tournées** :
  - demandes de ramassage ou de livraison, adresse du client par défaut ;
  - une date hors jour de tournée est refusée (`TOUR_DAY_REQUIRED`, avec les prochains jours proposés) ; seule la responsable peut passer outre, et c'est tracé dans l'audit ;
  - le montant à encaisser suit le reste à payer du dépôt lié ;
  - liste du jour avec le total à encaisser ;
  - statuts `TO_COLLECT → COLLECTED` et `TO_DELIVER → DELIVERED`, annulation motivée (contraintes SQL) ;
  - la caisse gère tout ; le livreur lit et change les statuts.
- **Tableau de bord 360°** (`GET /reports/dashboard`, responsable et comptable), période aujourd'hui, semaine (depuis le lundi), mois, année ou personnalisée :
  - activité de la période : dépôts reçus et retirés, chiffre d'affaires, encaissements, dépenses ;
  - situation actuelle : dépôts en cours, prêts, en retard ; caisse du jour ; créances ; produits sous le seuil ; validations en attente ; tournée du jour.
- **Notifications push** :
  - abonnement par appareil (`push_subscriptions`), envoi Web Push signé VAPID (`web-push`) aux appareils des destinataires de chaque notification ;
  - l'envoi part **après la validation de la transaction**, jamais pour une écriture annulée ;
  - charge utile au format du service worker Angular, avec ouverture de l'URL ciblée au clic ;
  - abonnements expirés (404, 410) supprimés ;
  - sans clés VAPID, le push est désactivé sans erreur (`GET /push/config`) ; script `pnpm vapid:keys`.
- Changements de statut d'article et restitutions **rejouables sans effet double**, comme l'exige la file d'envoi.

**Web (`lavio`)**
- **Tableau de bord** (`/app`) pour la responsable et le comptable, sur ordinateur et sur téléphone ; les autres rôles voient leurs raccourcis de travail.
- **Tournées** : liste du jour, prochains jours de tournée, nouvelle demande (recherche du client, dépôt à livrer, avertissement et dérogation hors jour), statuts, annulation, liste imprimable A4 (`/print/tours/:date`).
- **PWA** :
  - bandeau « Une nouvelle version est disponible » avec **Actualiser** ;
  - invite d'installation après la deuxième visite connectée, fermable 30 jours, avec aide iOS ;
  - « Activer les alertes » proposé sur téléphone après connexion, avec explication propre à iPhone ;
  - ouverture de l'URL ciblée au clic sur une notification.
- **File d'envoi** (IndexedDB) :
  - dépôts, paiements, statuts d'article et restitutions interrompus par une coupure sont conservés avec leur clé d'idempotence ;
  - rejeu dans l'ordre au retour du réseau, au démarrage et toutes les 30 s ;
  - indicateur « En attente d'envoi (n) » ; les envois refusés restent visibles avec « Abandonner » ;
  - un dépôt envoyé après une coupure est annoncé avec son numéro, pour imprimer le ticket.
- Écrans d'attente supprimés : tous les modules de la V1 sont livrés.

### Tests (tous verts)

| Dépôt | Unitaires | End-to-end |
|---|---|---|
| `lavio` | 62 (shared, dont jours de tournée, transitions, périodes) + 30 (web, dont la file d'envoi : mise en file, clé conservée, erreurs métier non mises en file) | Playwright, 17 parcours : **parcours 4, mobile de la responsable** (remise saisie au comptoir, visible sur le tableau de bord du téléphone, approuvée depuis le téléphone, tableau de bord à jour) et **tournée** (planifiée au comptoir, collectée par le livreur, liste imprimable) ; les autres parcours ont été rendus robustes à l'exécution en parallèle |
| `lavio-api` | 62 + 53 (dont l'envoi différé : après réussite seulement) | 140, dont 9 nouveaux : tournées (jour de tournée, dérogation, montant à encaisser, statuts, droits), tableau de bord, push (abonnement, envoi après une demande de validation, rien quand l'écriture échoue, abonnements expirés), rejeu sans effet double, **isolation** |

### Critères de fin de la phase 5

| Critère | État |
|---|---|
| La responsable installe la PWA | Fait (manifest, service worker, invite d'installation, aide iOS) ; à vérifier sur un vrai téléphone |
| Elle reçoit une notification de validation | Fait côté API (push envoyé aux appareils de la responsable, testé avec un envoi simulé) ; réception réelle à vérifier après déploiement avec les clés VAPID |
| Elle l'approuve depuis son téléphone et voit le tableau de bord à jour | Fait (parcours Playwright sur téléphone) |

### Hypothèses appliquées (configurables ou à confirmer)

- Semaine du tableau de bord : du lundi à aujourd'hui.
- « Retirés » : dépôts ayant eu au moins une restitution sur la période. « Prêts » : dépôts prêts ou en retrait partiel.
- Une tournée ne se planifie pas à une date passée.
- Le push est proposé sur téléphone seulement (écran étroit ou tactile). Un appareil appartient au dernier utilisateur qui s'y est abonné.
- La file d'envoi est propre à chaque utilisateur sur l'appareil, et rejoue toutes les 30 s tant qu'il reste des envois.

### Points à confirmer

- Recevoir une vraie notification push nécessite un domaine en HTTPS et des clés VAPID : à vérifier lors du déploiement (phase 6).
- Faut-il notifier aussi le magasinier et le livreur (stock bas, tournée du jour) en push ? Par défaut, seuls les destinataires prévus par chaque notification la reçoivent (la responsable, plus le magasinier pour le stock bas).

### Idées notées (hors périmètre, non codées)

- Aucune.

### Prochaine étape

Phase 6 : landing, recette, durcissement, déploiement.

## Phase 6 — Landing, recette, durcissement (13/10/2026) : tout sauf le déploiement de production

### Fait

- **Landing complète** (docs/07), prérendue :
  - toutes les sections de docs/07 : en-tête à ancres, promesse, téléphone dessiné en HTML/CSS, problème, 6 fonctionnalités, parcours d'un vêtement avec le ticket, déroulé, bloc responsable, tarifs, questions, formulaire, pied de page ;
  - **numéro WhatsApp, message et tarifs lus depuis l'API** (`GET /public/config`, plans actifs ; « Tarif sur demande » sans prix) ;
  - bouton WhatsApp flottant sur mobile ;
  - formulaire avec consentement, champ piège et erreurs accessibles.
- **Pages légales provisoires** `/mentions-legales` et `/confidentialite`, prérendues, contenu provisoire clairement signalé.
- **Référencement** :
  - meta, Open Graph, Twitter Card, JSON-LD `SoftwareApplication` ;
  - image de partage 1200 × 630 ;
  - `sitemap.xml`, ligne `Sitemap` du `robots.txt` et adresses canoniques générés au build si `PUBLIC_SITE_URL` est défini.
- **Lighthouse mobile** (landing, build compressé) : performance 95-96, accessibilité 100, bonnes pratiques 100, référencement 100.
- **Droits des personnes** (docs/10) :
  - export JSON des données d'un client et anonymisation (responsable seulement), avec les écritures comptables conservées ;
  - refus tant qu'un dépôt est en cours ou qu'un reste à payer existe ;
  - le garde-fou SQL des paiements n'autorise que l'effacement du téléphone du payeur.
- **Durcissement** :
  - test exhaustif : les plus de 60 routes d'écriture du pressing sont refusées en lecture seule ;
  - configuration de production refusée avec des secrets d'exemple, identiques ou trop courts ;
  - `pnpm audit` sans alerte (dépendances transitives corrigées) ;
  - historique git sans secret.
- **Recette** : `docs/RECETTE.md` (tests obligatoires, parcours 1 à 5, critères de la V1, liste de contrôle). **Exploitation** : `docs/EXPLOITATION.md`.
- **Données de démonstration** complétées : 15 produits dont 3 sous le seuil, paiements cohérents, caisse ouverte, licences en grâce et à échéance.
- **Couverture** des services métier : 85,5 % des lignes (`pnpm test:coverage`).

### Tests (tous verts)

| Dépôt | Unitaires | End-to-end |
|---|---|---|
| `lavio` | 62 (shared) + 33 (web, dont landing : WhatsApp depuis la configuration, tarifs, formulaire) | Playwright, 19 parcours : nouveau **parcours 5, landing** (lien WhatsApp, formulaire, pages légales) |
| `lavio-api` | 62 + 56 | 150, dont 10 nouveaux : lecture seule exhaustive, droits des personnes, plans et demandes de contact |

### Critères de fin de la phase 6

| Critère | État |
|---|---|
| Tous les critères de réussite de la V1 démontrés | Fait en local (`docs/RECETTE.md`) ; push réel et en-têtes à revérifier sur le domaine déployé |
| Liste de contrôle avant production cochée ou écarts expliqués | Écarts expliqués : région d'hébergement (bloquant), test de restauration, mot de passe initial du superadmin, contenu des pages légales |
| Déploiement de production | **Non lancé** : en attente de votre accord, de la région d'hébergement validée et des comptes Vercel et Neon |

### Hypothèses appliquées

- Pages légales : structure définitive, contenu provisoire marqué [●].
- Sans `PUBLIC_SITE_URL`, le build reste valable avec des adresses relatives et sans sitemap.
- Anonymisation refusée tant qu'un dépôt est en cours ou qu'un reste à payer existe ; le client anonymisé garde son historique chiffré.
- Le code d'un plan est normalisé en majuscules.

### Points à confirmer

- **Région d'hébergement** et formalités APDP : bloquant avant toute donnée réelle (docs/10).
- Contenu des mentions légales et de la politique de confidentialité ; nom de domaine et adresse de support (docs/14, questions 1 à 3).
- Les photos des articles d'un client anonymisé sont détachées de ses dépôts mais pas supprimées du stockage Blob : faut-il les supprimer, et après quel délai (docs/14, question 10) ?
- Le nom d'un client anonymisé peut subsister dans l'historique des validations (remise, vente à crédit) et dans le texte des notifications déjà envoyées : faut-il aussi les effacer, ou les purger après un délai ? À valider avec le conseil.

### Écarts avec docs/03

- `customers.anonymized_at` ; `tour_requests.off_day_override` et `cancel_reason` ; `push_subscriptions.tenant_id`.

### Prochaine étape

Déploiement de production (docs/11, `docs/EXPLOITATION.md`), après votre accord.
