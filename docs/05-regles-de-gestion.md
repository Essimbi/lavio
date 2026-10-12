# 05 — Règles de gestion

Toutes ces règles sont appliquées **côté serveur** (jamais seulement dans l'interface) et couvertes par des tests.

## Permissions par rôle (pressing)

| Module | OWNER | CASHIER | OPERATOR | STOCK_KEEPER | ACCOUNTANT | QUALITY | DRIVER |
|---|---|---|---|---|---|---|---|
| Clients | tout | tout | lecture | — | lecture | lecture | lecture |
| Dépôts, ticket | tout | créer, modifier, annuler | lecture | — | lecture | lecture | lecture |
| Statuts des articles | tout | lecture | RECEIVED → IRONING | — | — | QUALITY_CHECK → READY, incidents | — |
| Restitution, paiements | tout | tout | — | — | lecture | — | encaisser en tournée |
| Caisse | tout | ouvrir, clôturer (validation requise) | — | — | lecture | — | — |
| Stock, achats | tout | lecture | sorties de consommation | tout | lecture | — | — |
| Dépenses, trésorerie, rapports | tout | saisir les dépenses de caisse | — | — | tout | — | — |
| Tournées | tout | tout | — | — | — | — | statut des tournées |
| Paramètres, utilisateurs, audit | tout | — | — | — | — | — | — |

Un utilisateur cumule les permissions de tous ses rôles.

## Dépôts

1. Un dépôt contient au moins un article. Le numéro de ticket est séquentiel par pressing, jamais réutilisé, généré dans la transaction de création.
2. Les prix sont **figés** à la création du dépôt (prix unitaire copié sur chaque ligne). Les prix du catalogue sont des montants TTC ; si la TVA est activée, le montant de TVA est extrait pour les factures : `tva = total - total / (1 + taux)`.
3. Prix d'une ligne : prix spécial du client s'il existe, sinon prix du catalogue valide à la date du dépôt. Majoration express : pourcentage paramétrable appliqué au sous-total.
4. Remise : si `remise / sous-total` dépasse `discountApprovalPercent` (défaut 10 %) et que l'utilisateur n'est pas `OWNER`, le dépôt passe en `PENDING_APPROVAL` et crée une validation `DISCOUNT`. Le ticket n'est imprimable qu'après approbation. Si la validation est refusée, le dépôt est annulé ou corrigé.
5. Acompte : si le total dépasse `advanceRequiredAbove`, un acompte d'au moins `advanceMinPercent` (défaut 50 %) est exigé avant impression du ticket, sauf client à crédit autorisé.
6. Date de retrait par défaut : prochain jour de tournée après `processingDays` (défaut 2) ; modifiable.
7. Statut du dépôt : `OPEN` → `READY` quand tous les articles sont `READY` → `PARTIALLY_RETURNED` ou `COMPLETED`. Un dépôt `COMPLETED` n'a plus d'article non restitué.
8. Annulation : possible seulement si aucun article n'a dépassé `RECEIVED`, avec motif ; les paiements déjà reçus donnent lieu à des remboursements enregistrés (`REFUND`).
9. Retard : `due_date` dépassée et dépôt non terminé. Alerte « non retiré » : article `READY` depuis plus de `lateAfterDays` jours (défaut 30).

## Articles et suivi

1. Transitions autorisées dans l'ordre `RECEIVED → IN_PROGRESS → IRONING → QUALITY_CHECK → READY → RETURNED`. Un retour en arrière (reprise) est possible avec motif et crée un incident `REWORK`.
2. `READY` exige la check-list de contrôle qualité complétée.
3. `RETURNED` exige que l'article soit `READY`. Sinon erreur `ITEM_NOT_READY`.
4. Chaque changement de statut est horodaté avec l'utilisateur (`item_status_history`).
5. Un incident porte une cause (liste configurable) et une résolution (`REWORK_FREE`, `COMMERCIAL_GESTURE`, `COMPENSATION`, `NONE`).

## Paiements

1. Un paiement est **immuable**. Une annulation crée un paiement de sens inverse (`reversal_of`) avec motif ; jamais de suppression.
2. Le montant ne peut pas dépasser le solde restant du dépôt. Les paiements partiels sont autorisés.
3. Mobile Money (`ORANGE_MONEY`, `MTN_MOMO`) : `operator_ref` obligatoire. Si la même référence existe déjà pour ce mode de paiement dans le pressing, l'API répond `DUPLICATE_REFERENCE` ; le client peut renvoyer avec `confirmDuplicate=true`, ce qui est tracé (`duplicate_confirmed`).
4. Un paiement en espèces exige une session de caisse ouverte (`CASH_SESSION_REQUIRED`). Les paiements Mobile Money et bancaires peuvent être saisis sans session ; ils ne comptent pas dans le comptage d'espèces.
5. Vente à crédit : possible seulement si `customers.credit_allowed` et si le total des soldes impayés du client reste sous `credit_limit_xaf`. Sinon une validation est demandée. Le solde impayé devient une créance.
6. Les paiements Mobile Money peuvent être marqués « rapprochés » (rapprochement manuel avec le relevé de l'opérateur).
7. Idempotence : une même `Idempotency-Key` ne crée jamais deux paiements.

## Caisse

1. Une seule session ouverte à la fois par pressing. On ouvre avec un fonds de caisse.
2. Espèces attendues = fonds de caisse + paiements en espèces (hors annulés) − remboursements en espèces − dépenses payées depuis le compte `CASH` pendant la session.
3. À la clôture : comptage saisi, écart = compté − attendu. Si l'écart n'est pas nul, une note est obligatoire.
4. Si celui qui clôture n'est pas `OWNER`, la session passe en `CLOSING_PENDING` et une validation `CASH_CLOSE` est envoyée à la responsable (notification push). Aucune nouvelle session ne peut s'ouvrir tant qu'une clôture est en attente.
5. Une session clôturée est figée.

## Stock

1. Le stock courant est la somme des mouvements. Une sortie qui rendrait le stock négatif est refusée (`INSUFFICIENT_STOCK`) sauf dérogation `OWNER` avec motif.
2. Toute sortie (`OUT`) et tout ajustement exige un `reason_code` : `CONSUMPTION`, `LOSS`, `BREAKAGE`, `EXPIRED`, `OTHER` (liste extensible).
3. Coût moyen pondéré à chaque entrée : `nouveau = (stock × coût_moyen + qté × coût_entrée) / (stock + qté)`. Les sorties sont valorisées au coût moyen courant.
4. Inventaire : saisie des quantités comptées, calcul des écarts, **validation par la responsable** ; à l'approbation, des mouvements `INVENTORY` ajustent le stock. Aucun ajustement n'est appliqué avant approbation.
5. Alerte quand `on_hand <= alert_threshold` (une notification par franchissement de seuil, pas une par mouvement).
6. Réception d'une commande : met à jour `qty_received`, crée les entrées de stock, passe la commande en `PARTIAL` ou `RECEIVED`.

## Comptabilité de gestion

1. **Encaissements** = paiements (hors annulés), nets des remboursements, par date de paiement.
2. **Chiffre d'affaires** = total des dépôts non annulés, par date de dépôt. Le tableau de bord affiche les deux (chiffre d'affaires et encaissements).
3. **Dépenses** : une dépense est rattachée à un compte de trésorerie. Le paiement d'une facture fournisseur crée une dépense de catégorie « Achats matières » (pas de double comptage avec les entrées de stock).
4. **Résultat simplifié** = encaissements − dépenses sur la période.
5. **Créances clients** = soldes impayés des dépôts livrés ou à crédit. **Dettes fournisseurs** = factures non payées.
6. Les dépenses récurrentes génèrent une dépense en brouillon à l'échéance ; l'utilisateur la confirme.
7. Les exports (CSV, XLSX) reprennent exactement les chiffres affichés.

## Tournées

1. Les jours de tournée sont configurables (deux par défaut). Une demande hors jour de tournée affiche un avertissement ; seule la responsable peut passer outre.
2. Statuts : ramassage `TO_COLLECT → COLLECTED` ; livraison `TO_DELIVER → DELIVERED` ; `CANCELLED` possible avec motif.
3. La liste de tournée du jour affiche l'adresse, le téléphone, le contenu et le montant à encaisser, avec une version imprimable.

## Notifications

Types : `STOCK_LOW`, `CASH_CLOSED`, `CASH_VARIANCE`, `DEPOSIT_LATE`, `UNPAID_HIGH`, `APPROVAL_REQUESTED`, `LICENSE_EXPIRING`. Les notifications sont enregistrées en base (centre de notifications dans l'application) et envoyées en push aux utilisateurs concernés (par défaut les `OWNER`).

## Audit

Sont tracés dans `audit_logs` : connexions, remises, annulations, annulations de paiement, ajustements de stock, clôtures de caisse, changements de prix, changements de rôles et d'utilisateurs, exports, actions superadmin.
