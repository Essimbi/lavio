# Lavio — Documentation du projet

Lavio est un SaaS de gestion de pressing (dépôts de vêtements, suivi, paiements, stock, comptabilité de gestion, tournées) avec une application mobile en PWA pour la responsable, une interface superadmin de gestion des licences et une landing page commerciale.

Ce dossier contient **tout ce qu'il faut pour développer le MVP (V1)**. Lis les documents dans cet ordre :

| # | Document | Contenu |
|---|---|---|
| 01 | `01-contexte-et-perimetre.md` | Vision, décisions actées, périmètre V1 module par module, hors périmètre (V2) |
| 02 | `02-architecture.md` | Stack, dépôts, multi-tenant, authentification, conventions |
| 03 | `03-modele-de-donnees.md` | Tables, énumérations, contraintes, index |
| 04 | `04-api.md` | Endpoints REST par module, format des erreurs |
| 05 | `05-regles-de-gestion.md` | Règles métier à appliquer côté serveur |
| 06 | `06-licences-et-superadmin.md` | Cycle de vie des licences, paiement manuel via WhatsApp, interface superadmin, relevé 50/50 |
| 07 | `07-landing-page.md` | Structure, textes en français, SEO, bouton WhatsApp |
| 08 | `08-design-system.md` | Charte graphique Lavio, tokens, composants, ton de voix |
| 09 | `09-pwa-et-impression.md` | PWA, notifications push, file d'envoi, impression ticket et étiquettes |
| 10 | `10-securite-et-conformite.md` | Sécurité, protection des données (loi camerounaise 2024/017), audit |
| 11 | `11-deploiement-vercel.md` | Projets Vercel, variables d'environnement, cron, base de données |
| 12 | `12-plan-de-realisation.md` | Phases de développement avec critères de fin |
| 13 | `13-tests-et-recette.md` | Stratégie de tests et critères de réussite de la V1 |
| 14 | `14-hypotheses-et-questions-ouvertes.md` | Hypothèses prises par défaut et points à confirmer |

Les ressources graphiques sont dans `docs/assets/` : `logo/` (logo en SVG et PNG) et `pwa/` (icônes de l'application, favicon).

## Conventions des documents

- Les valeurs entre crochets, par exemple `[●]` ou `[PRIX]`, sont **à confirmer** : ne les invente pas. Utilise une valeur par défaut configurable et consigne-la dans `docs/14-hypotheses-et-questions-ouvertes.md`.
- Langue du produit : **français** (interface, messages, documents imprimés). Le code, les noms de variables, de tables et de routes sont en **anglais**.
- Monnaie : le franc CFA (XAF), toujours stocké en entier, sans décimales.
- Fuseau horaire d'affichage : Africa/Douala. Stockage en UTC.

## Fichiers de suivi

- `docs/DECISIONS.md` : journal des décisions techniques.
- `docs/PROGRESS.md` : journal d'avancement par phase.
- `docs/EXPLOITATION.md` : à créer en phase 6 (déploiement, sauvegarde, restauration, exploitation des licences).
