# 06 — Licences, paiement manuel et superadmin

## Principe

Lavio est vendu par abonnement. Chaque pressing (tenant) possède **une licence courante** qui définit son plan, sa période de validité et son nombre d'utilisateurs. Les paiements se font hors plateforme, par contact avec le service client sur WhatsApp ; le superadmin enregistre ensuite le paiement, ce qui prolonge la licence.

Numéro du service client : **`+237694219620`**. Il est stocké dans `platform_settings` (clé `whatsappNumber`, chiffres seuls : `237694219620`) et modifiable par le superadmin. **Ne jamais écrire ce numéro en dur dans le code** : la landing et l'application le lisent via `GET /v1/public/config`.

## Statuts de licence

| Statut | Accès du pressing |
|---|---|
| `TRIAL` | Complet, jusqu'à `ends_at` (durée d'essai du plan, défaut 14 jours) |
| `ACTIVE` | Complet |
| `GRACE` | Complet, avec bannière « Votre licence a expiré, contactez le service client » ; dure `grace_days` (défaut 7 jours) après `ends_at` |
| `EXPIRED` | **Lecture seule** : consultation et exports autorisés, aucune création ni modification |
| `SUSPENDED` | Lecture seule (suspension manuelle par le superadmin) |
| `REVOKED` | Lecture seule |

Si `tenants.status` est `SUSPENDED` ou `CLOSED`, la connexion est refusée avec le message « Contactez le service client ».

Transitions automatiques (cron quotidien) : `TRIAL` ou `ACTIVE` → `GRACE` à `ends_at` ; `GRACE` → `EXPIRED` à `ends_at + grace_days`. Chaque transition crée un `license_events`.

## Application des règles

- `LicenseGuard` global : pour les méthodes d'écriture (`POST`, `PUT`, `PATCH`, `DELETE`) sur les routes du pressing, refuse avec `LICENSE_READ_ONLY` si la licence est en lecture seule. Les routes `GET`, les exports, `auth/*` et `license/status` restent accessibles.
- Nombre d'utilisateurs : `max_users` de la licence, sinon `included_users` du plan. Au-delà : `USER_LIMIT_REACHED` avec un bouton « Ajouter des utilisateurs » qui ouvre WhatsApp.
- Fonctionnalités : `plans.features` est un objet de drapeaux (`stock`, `accounting`, `tours`, `push`…). En V1, un seul plan avec tout activé ; le mécanisme de drapeaux doit exister pour la suite.
- `GET /auth/me` et `GET /license/status` renvoient `status`, `endsAt`, `graceEndsAt`, `readOnly`, `daysLeft`.
- Côté application : bannières à J-7, J-3, J-0 et pendant la grâce ; page « Ma licence » (plan, dates, utilisateurs, clé) avec bouton **Renouveler via WhatsApp**.

## Clé de licence

Format `LAVIO-XXXX-XXXX-XXXX` (alphabet Crockford base32, sans I, L, O, U ; généré avec un aléa cryptographique ; unique). Elle identifie la licence dans les échanges avec le service client et s'affiche dans la page « Ma licence ». Elle n'est pas un secret d'authentification.

## Parcours d'activation d'un nouveau pressing

1. Le prospect arrive sur la landing, clique sur WhatsApp ou remplit le formulaire (création d'un `lead`).
2. Le service client échange avec lui et reçoit le paiement (espèces, Mobile Money, virement) en dehors de la plateforme.
3. Le superadmin crée le **pressing** (nom, téléphone, ville, NIU facultatif), choisit le **plan**, la **période** et crée la licence (`TRIAL` ou `ACTIVE`).
4. Il enregistre le **paiement** (montant, mode, référence, période couverte, déductions éventuelles).
5. Il génère l'**invitation du responsable** : lien à usage unique (validité 7 jours) ; l'interface propose un bouton « Envoyer sur WhatsApp » qui ouvre `https://wa.me/<téléphone du responsable>?text=<message>` avec le lien.
6. Le responsable définit son mot de passe, se connecte, crée ses utilisateurs, paramètre tarifs, services, stock.

## Enregistrer un paiement d'abonnement

Champs : pressing, licence, montant, mode (`CASH`, `ORANGE_MONEY`, `MTN_MOMO`, `BANK_TRANSFER`, `CHEQUE`, `OTHER`), référence, date de réception, période couverte (début, fin), déductions et motif (frais de transaction, commission de revendeur agréé).

À l'enregistrement, dans une transaction : création du paiement, prolongation de la licence (`ends_at = période.fin`), passage à `ACTIVE`, événement `RENEWED`, entrée d'audit. Un remboursement (`REFUNDED`) ne raccourcit pas automatiquement la licence : le superadmin ajuste la date manuellement.

## Interface superadmin (`/admin`)

Connexion séparée (`/admin/login`), même mécanisme JWT, rôles plateforme uniquement. Navigation latérale ; mêmes composants que l'application ; sobriété avant tout.

| Page | Contenu |
|---|---|
| Tableau de bord | Pressings actifs, licences expirant sous 15 jours, licences en grâce, nouveaux leads, encaissements du mois, part du Concepteur et part de l'Exploitant du mois |
| Pressings | Liste (recherche, filtre par statut), création, fiche (informations, utilisateurs, licence, paiements, dernière activité), suspension, réactivation, invitation du responsable |
| Licences | Liste, création, renouvellement, changement de plan, suspension, réactivation, révocation, historique (`license_events`) |
| Plans | Création et modification : nom, prix mensuel et annuel, utilisateurs inclus, prix de l'utilisateur supplémentaire, durée d'essai, drapeaux de fonctionnalités |
| Paiements | Liste filtrable ; formulaire d'enregistrement ; remboursement |
| Demandes (leads) | Liste, statut (nouveau, contacté, converti, refusé), notes, bouton WhatsApp vers le prospect |
| Relevé mensuel | Voir ci-dessous |
| Utilisateurs plateforme | `SUPER_ADMIN` et `PARTNER_VIEWER` |
| Journal d'audit | Actions plateforme |
| Paramètres | Numéro WhatsApp, taux de partage, essai et grâce par défaut, messages WhatsApp types |

Le rôle `PARTNER_VIEWER` (l'Exploitant) voit le tableau de bord, les pressings, les licences, les paiements et le relevé, **en lecture seule**, sans accès aux données des pressings (clients, dépôts).

## Relevé mensuel de partage des revenus

Le contrat de partenariat prévoit un partage à 50 % / 50 % des revenus issus des abonnements. La page « Relevé mensuel » affiche pour un mois donné :

| Colonne | Contenu |
|---|---|
| Pressing, plan, période | Identification |
| Montant encaissé | Somme des paiements du mois (hors `REFUNDED`) |
| Déductions | Frais de transaction, commissions de revendeurs agréés |
| Revenu partageable | Encaissé − déductions |

Totaux du mois : revenu partageable, **part du Concepteur** = `floor(revenu × shareRatePercent / 100)`, **part de l'Exploitant** = revenu − part du Concepteur (le taux par défaut est 50 ; il se lit dans `platform_settings`). Export CSV, XLSX et PDF. Le relevé se calcule à la demande à partir des paiements ; il n'est jamais saisi à la main.
