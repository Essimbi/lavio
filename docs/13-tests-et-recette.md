# 13 — Tests et recette

## Stratégie

| Niveau | Outils | Portée |
|---|---|---|
| Unitaires | Jest (API), Vitest ou Jest (front) | Calcul des prix et de la TVA, coût moyen pondéré, espérance de caisse, transitions de licence, relevé de partage, génération de la clé de licence, numérotation |
| Intégration | Jest + base PostgreSQL de test | Services avec la vraie base (transactions, index uniques, extension d'isolation) |
| End-to-end API | Supertest | Parcours par module, droits par rôle, licence, idempotence |
| End-to-end web | Playwright | Cinq parcours critiques (ci-dessous), sur ordinateur et sur mobile |
| Accessibilité et performance | axe, Lighthouse | Landing et écrans principaux |

Le front et l'API disposent d'un script `pnpm test` unique ; la CI exécute lint, tests et build avant chaque déploiement.

## Tests obligatoires (la liste minimale)

1. **Isolation** : l'utilisateur du pressing A reçoit `404` ou `403` sur toute ressource du pressing B, pour chaque module (clients, dépôts, paiements, stock, rapports, utilisateurs, fichiers).
2. **Licence** : en `GRACE` tout fonctionne ; en `EXPIRED`, `SUSPENDED`, `REVOKED` les écritures renvoient `LICENSE_READ_ONLY` et les lectures et exports restent possibles ; limite d'utilisateurs respectée.
3. **Droits** : chaque rôle ne fait que ce que la matrice de `05-regles-de-gestion.md` permet.
4. **Idempotence** : deux envois identiques d'un dépôt ou d'un paiement créent un seul enregistrement.
5. **Numérotation** : numéros de ticket séquentiels sans trou ni doublon sous requêtes concurrentes.
6. **Paiements** : montant supérieur au solde refusé ; doublon de référence Mobile Money refusé puis accepté avec confirmation tracée ; annulation par écriture inverse ; paiement jamais supprimé.
7. **Caisse** : une seule session ouverte ; espérance calculée correctement ; écart avec note obligatoire ; clôture par un non-`OWNER` en attente de validation ; session clôturée figée.
8. **Stock** : sortie qui rendrait le stock négatif refusée ; coût moyen pondéré exact ; ajustement d'inventaire appliqué seulement après approbation ; alerte déclenchée une seule fois par franchissement de seuil.
9. **Remises** : au-dessus du seuil, le dépôt passe en `PENDING_APPROVAL` et le ticket n'est pas imprimable avant approbation.
10. **Prix figés** : modifier la grille ne change pas un dépôt existant.
11. **Relevé de partage** : somme des parts égale au revenu partageable, arrondi attribué comme dans `06-licences-et-superadmin.md`.
12. **Cron** : transitions de licence aux bonnes dates, événements créés, notifications envoyées.

## Parcours Playwright

1. **Dépôt et ticket** : connexion caissier, nouveau dépôt avec 3 articles, enregistrement, aperçu d'impression avec numéro et QR ; mesure du nombre d'actions (objectif : moins de 90 secondes pour un opérateur entraîné).
2. **Cycle complet** : dépôt → statuts jusqu'à `READY` avec contrôle qualité → restitution → encaissement Mobile Money avec référence → clôture de caisse.
3. **Superadmin** : création d'un pressing, d'une licence, enregistrement d'un paiement, invitation, connexion du responsable, passage en lecture seule à l'expiration.
4. **Mobile de la responsable** : tableau de bord, réception d'une demande de validation, approbation.
5. **Landing** : clic sur WhatsApp (lien correct avec numéro et message), envoi du formulaire.

## Recette des critères de réussite de la V1

| Critère | Comment le vérifier |
|---|---|
| Dépôt et ticket en moins de 90 secondes | Chronométrer le parcours 1 avec un client existant, trois articles |
| Caisse clôturée dans l'application | Parcours 2 : le rapport de caisse du jour est complet, sans saisie externe |
| Vue en direct sur le téléphone | Parcours 4 : les chiffres correspondent à la base |
| Dépôt retrouvé par son numéro | Recherche par numéro, avec et sans zéros initiaux |
| Paiements Mobile Money avec référence | Aucun paiement `ORANGE_MONEY` ou `MTN_MOMO` sans `operator_ref` ; export de rapprochement |

## Données de démonstration

Le seed crée un pressing fictif crédible : 30 clients, un catalogue de tarifs, 15 produits de stock dont 3 sous le seuil, 40 dépôts à tous les statuts (dont des retards), des paiements Mobile Money et espèces, une session de caisse ouverte, une licence en grâce et une proche de l'expiration. Les données de démonstration ne sont jamais chargées en production.

## Qualité du code

Couverture indicative : 80 % sur les services métier. Aucun test désactivé sans explication. Les anomalies trouvées en recette sont consignées dans `docs/PROGRESS.md` avec leur correction.
