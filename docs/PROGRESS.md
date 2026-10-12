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

## Phase 0 — Socle
- [ ] En cours
