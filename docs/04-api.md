# 04 — API REST

Préfixe `/v1`. Authentification `Authorization: Bearer <accessToken>` (sauf routes publiques). Pagination, erreurs et idempotence : voir `02-architecture.md`. Les rôles autorisés sont indiqués entre crochets ; `OWNER` a accès à tout dans son pressing.

## Public

| Méthode | Route | Description |
|---|---|---|
| POST | `/public/leads` | Demande de contact depuis la landing. Anti-spam : champ piège, limite de débit par IP |
| GET | `/public/config` | Numéro WhatsApp et message par défaut pour la landing |
| GET | `/health` | Santé du service |

## Authentification

`POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/change-password`, `POST /auth/accept-invitation` (définir le mot de passe avec le jeton reçu).

`GET /auth/me` renvoie l'utilisateur, ses rôles, le pressing et l'état de la licence (`status`, `endsAt`, `graceEndsAt`, `readOnly`).

## Application du pressing

### Clients et catalogue
- `GET/POST /customers`, `GET/PATCH /customers/:id`, `GET /customers/:id/history` [CASHIER]
- `GET/POST/PATCH /item-types`, `/services` [OWNER]
- `GET /prices?itemTypeId&serviceId`, `POST /prices` (crée une nouvelle ligne datée), `GET/PUT /customers/:id/special-prices` [OWNER]
- `GET /pricing/quote` (calcul de prix d'un panier, avec express et remise)

### Dépôts et suivi
- `POST /deposits` (idempotent) [CASHIER] ; `GET /deposits?status&customerId&dueFrom&dueTo&late=true&q` ; `GET /deposits/by-number/:number` ; `GET /deposits/:id` ; `PATCH /deposits/:id` ; `POST /deposits/:id/cancel`
- `GET /deposits/:id/ticket` (données du ticket et QR) ; `GET /deposits/:id/labels`
- `POST /deposits/:id/items/:itemId/status` {status, storageLocation?, checklist?} [OPERATOR, QUALITY] ; `POST /deposits/:id/items/status` (changement groupé)
- `POST /deposits/:id/photos` (téléversement vers Vercel Blob)
- `GET/POST /incidents`, `PATCH /incidents/:id` ; `GET/POST/PATCH /rework-causes`

### Restitution et paiements
- `POST /deposits/:id/returns` {itemIds[]} [CASHIER]
- `POST /payments` (idempotent) {depositId?, customerId, amount, method, kind, operatorRef?, payerPhone?, confirmDuplicate?}
- `POST /payments/:id/reverse` {reason} (écriture inverse)
- `GET /payments?method&from&to&reconciled` ; `POST /payments/:id/reconcile` {reconciled, note} (rapprochement Mobile Money) ; `GET /payments/mobile-money/export`
- `GET /receivables` (créances clients) ; `GET /deposits/:id/receipt` ; `GET /deposits/:id/invoice.pdf`

### Tournées
- `GET/POST/PATCH /tours` ; `GET /tours/day?date` (liste de tournée du jour, imprimable) ; `POST /tours/:id/status`

### Caisse et trésorerie
- `GET /cash-sessions/current`, `POST /cash-sessions/open`, `POST /cash-sessions/:id/close` {countedCash, note} ; `GET /cash-sessions/:id/journal`
- `GET/POST /treasury/accounts`, `POST /treasury/transfers`, `GET /treasury/summary`
- `GET/POST /expenses`, `GET/POST/PATCH /expense-categories`, `GET/POST/PATCH /recurring-expenses`
- `GET/POST /supplier-invoices`, `POST /supplier-invoices/:id/pay`
- `GET/POST /utility-readings`

### Stock et achats
- `GET/POST/PATCH /stock/items`, `GET /stock/items/:id/movements`, `POST /stock/movements` [STOCK_KEEPER], `GET /stock/alerts`, `GET /stock/valuation`
- `GET/POST /inventories`, `PATCH /inventories/:id/lines`, `POST /inventories/:id/submit` (déclenche une validation)
- `GET/POST/PATCH /suppliers`, `GET/POST/PATCH /purchase-orders`, `POST /purchase-orders/:id/receive`

### Validations, notifications, rapports
- `GET /approvals?status`, `POST /approvals/:id/approve|reject` [OWNER]
- `GET /notifications`, `POST /notifications/:id/read`, `POST /push/subscribe`, `DELETE /push/subscribe`
- `GET /reports/dashboard?period=today|week|month|year|custom&from&to`
- `GET /reports/revenue`, `/reports/cash-journal`, `/reports/treasury`, `/reports/profit-simple`, `/reports/receivables`, `/reports/stock-valuation` — chacun avec `?format=json|csv|xlsx`

### Administration du pressing
- `GET/PATCH /settings`, `POST /settings/logo`
- `GET/POST/PATCH /users` (création par invitation, rôles multiples, désactivation) ; `POST /users/:id/reset-password` ; limité par le nombre d'utilisateurs de la licence
- `GET /audit-logs?entity&userId&from&to` [OWNER]
- `GET /license/status`

## Superadmin (`/admin/*`, rôles plateforme)

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/admin/dashboard` | SUPER_ADMIN, PARTNER_VIEWER |
| GET/POST/PATCH | `/admin/tenants`, `/admin/tenants/:id` | SUPER_ADMIN (lecture : PARTNER_VIEWER) |
| POST | `/admin/tenants/:id/suspend`, `/reactivate` | SUPER_ADMIN |
| POST | `/admin/tenants/:id/owner-invitation` (renvoie le lien d'invitation et un lien WhatsApp prérempli) | SUPER_ADMIN |
| GET/POST/PATCH | `/admin/plans` | SUPER_ADMIN |
| GET/POST | `/admin/licenses`, `/admin/licenses/:id/renew`, `/change-plan`, `/suspend`, `/reactivate`, `/revoke` | SUPER_ADMIN |
| GET/POST | `/admin/subscription-payments` (l'enregistrement prolonge la licence) ; `POST /:id/refund` | SUPER_ADMIN (lecture : PARTNER_VIEWER) |
| GET | `/admin/statements?month=YYYY-MM` et `/admin/statements/export?format=csv|xlsx|pdf` | SUPER_ADMIN, PARTNER_VIEWER |
| GET/PATCH | `/admin/leads`, `/admin/leads/:id` | SUPER_ADMIN |
| GET/POST/PATCH | `/admin/platform-users` | SUPER_ADMIN |
| GET/PATCH | `/admin/settings` | SUPER_ADMIN |
| GET | `/admin/audit-logs` | SUPER_ADMIN |

## Cron (protégé par `CRON_SECRET`)

`GET /v1/internal/cron/daily` (Vercel appelle les crons en `GET` avec l'en-tête `Authorization: Bearer <CRON_SECRET>` ; la route refuse tout appel si `CRON_SECRET` n'est pas défini ou ne correspond pas ; elle est exclue de `LicenseGuard`) : passage des licences en `GRACE`, `EXPIRED` ou `SUSPENDED` selon les dates ; alerte de licence qui expire sous 7 jours ; notifications de dépôts en retard et de stock bas ; génération des dépenses récurrentes dues.

## Codes d'erreur principaux

`UNAUTHENTICATED`, `FORBIDDEN`, `LICENSE_INACTIVE` (402), `LICENSE_READ_ONLY` (403), `USER_LIMIT_REACHED`, `VALIDATION_FAILED`, `NOT_FOUND`, `CONFLICT`, `DUPLICATE_REFERENCE` (409, référence Mobile Money déjà utilisée), `INSUFFICIENT_STOCK`, `CASH_SESSION_REQUIRED`, `CASH_SESSION_ALREADY_OPEN`, `APPROVAL_REQUIRED`, `ITEM_NOT_READY`, `RATE_LIMITED`.
