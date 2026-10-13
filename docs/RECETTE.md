# Recette de la V1

Bilan de la recette (docs/13), au 13/10/2026, sur l'environnement local (base de test PostgreSQL, build de production du web servi en statique). Chaque ligne renvoie à la preuve automatisée correspondante.

## Résultats globaux

| Suite | Résultat |
|---|---|
| `packages/shared` (unitaires) | 62 tests verts |
| `lavio-api` unitaires | 56 tests verts |
| `lavio-api` end-to-end (PostgreSQL réel) | 150 tests verts |
| `apps/web` unitaires | 33 tests verts |
| Playwright (ordinateur et téléphone, contre l'API réelle) | 19 parcours verts ; 7 non joués par conception (parcours de comptoir sur téléphone, parcours mobile sur ordinateur) |
| Lint, format, build des deux applications | Propres |
| `pnpm audit --prod` (deux dépôts) | Aucune vulnérabilité connue |
| Couverture des services métier (`pnpm test:coverage`) | 85,5 % des lignes, 91 % des fonctions (cible indicative : 80 %) |
| Lighthouse mobile, landing (build compressé) | Performance 95-96, accessibilité 100, bonnes pratiques 100, référencement 100 (cibles : 90 et 95) |

## Tests obligatoires (docs/13)

| # | Exigence | Preuve | État |
|---|---|---|---|
| 1 | Isolation entre pressings, chaque module | `lavio-api/test/isolation.e2e-spec.ts` et un bloc « isolation » dans chaque suite : dépôts, opérations, stock et comptabilité, tournées, tableau de bord, push, droits des personnes | Vert |
| 2 | Licence : grâce, lecture seule, limite d'utilisateurs | `license.e2e-spec.ts` ; `license-readonly.e2e-spec.ts` parcourt **toutes** les routes d'écriture du pressing (plus de 60) : refus `LICENSE_READ_ONLY` ; lectures et exports possibles | Vert |
| 3 | Droits selon la matrice de docs/05 | Tests de rôles dans chaque suite (caisse, opérateur, qualité, magasinier, comptable, livreur) | Vert |
| 4 | Idempotence des dépôts et paiements | `deposits.e2e-spec.ts`, `operations.e2e-spec.ts` ; web : clé conservée et file d'envoi (`payment-dialog.spec.ts`, `offline-queue.interceptor.spec.ts`) | Vert |
| 5 | Numérotation sans trou ni doublon sous concurrence | `deposits.e2e-spec.ts` (« numérote sans trou ni doublon sous requêtes concurrentes ») | Vert |
| 6 | Paiements : plafond, doublon Mobile Money, écriture inverse, jamais supprimé | `operations.e2e-spec.ts` ; déclencheur SQL vérifié en base | Vert |
| 7 | Caisse : session unique, attendu, note sur écart, validation, session figée | `operations.e2e-spec.ts`, `stock-accounting.e2e-spec.ts` (dépenses en espèces dans l'attendu) | Vert |
| 8 | Stock : négatif refusé, coût moyen, inventaire après approbation, alerte unique | `stock-accounting.e2e-spec.ts`, `packages/shared/src/stock.spec.ts` | Vert |
| 9 | Remises au-dessus du seuil | `deposits.e2e-spec.ts` ; Playwright `deposit.spec.ts` | Vert |
| 10 | Prix figés | `deposits.e2e-spec.ts` | Vert |
| 11 | Relevé de partage | `admin.e2e-spec.ts` | Vert |
| 12 | Cron : licences, événements, notifications | `license.e2e-spec.ts`, `operations.e2e-spec.ts`, `stock-accounting.e2e-spec.ts` (récurrences) | Vert |

## Parcours Playwright (docs/13)

| # | Parcours | Fichier | État |
|---|---|---|---|
| 1 | Dépôt de 3 articles et ticket avec numéro et QR | `apps/web/e2e/deposit.spec.ts` (11 actions, quelques secondes) | Vert |
| 2 | Cycle complet : statuts, contrôle qualité, restitution, encaissement Mobile Money avec référence, clôture de caisse | `apps/web/e2e/cycle.spec.ts` | Vert |
| 3 | Superadmin : pressing, licence, paiement, invitation, connexion de la responsable, lecture seule à l'expiration | `apps/web/e2e/superadmin.spec.ts` | Vert |
| 4 | Mobile de la responsable : tableau de bord, demande de validation, approbation | `apps/web/e2e/mobile-owner.spec.ts` | Vert |
| 5 | Landing : lien WhatsApp (numéro et message), formulaire | `apps/web/e2e/landing.spec.ts` | Vert |
| — | Compléments : stock, tournée, démarrage | `stock.spec.ts`, `tours.spec.ts`, `smoke.spec.ts` | Vert |

## Critères de réussite de la V1

| Critère | Démonstration | État |
|---|---|---|
| Dépôt et ticket en moins de 90 s | Parcours 1 : 11 actions, ticket imprimé en quelques secondes (client existant, 3 articles) | Démontré |
| Caisse clôturée dans l'application | Parcours 2 ; rapport « Journal de caisse » complet (sessions, mouvements, écarts), exportable | Démontré |
| Vue en direct sur le téléphone | Parcours 4 ; `tours-dashboard-push.e2e-spec.ts` compare le tableau de bord aux données créées | Démontré ; push réel à vérifier après déploiement |
| Dépôt retrouvé par son numéro | Parcours 1 (numéro sans les zéros initiaux) ; recherche du Suivi | Démontré |
| Paiements Mobile Money avec référence | Contrainte SQL (aucun paiement Orange Money ou MTN MoMo sans référence) ; export de rapprochement testé | Démontré |

## Liste de contrôle avant mise en production (docs/10)

| Point | État | Commentaire |
|---|---|---|
| Tests d'isolation entre pressings verts | Fait | Voir tests obligatoires, ligne 1 |
| Aucune route d'écriture en lecture seule | Fait | Test exhaustif `license-readonly.e2e-spec.ts` |
| Aucun secret dans l'historique git | Fait | Recherche sur tout l'historique des deux dépôts : seules les valeurs `test-only` de `.env.test` ; l'API refuse ces valeurs en production |
| En-têtes de sécurité, HTTPS partout | Configuré | CSP, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` dans `apps/web/vercel.json`, `helmet` côté API ; **à vérifier sur le domaine déployé** |
| `SUPER_ADMIN` au mot de passe fort, mot de passe initial changé | À faire au déploiement | Changement imposé à la première connexion |
| Région d'hébergement validée | **Bloquant, en attente** | Décision et formalités APDP à fournir (docs/14, question 2) |
| Restauration de sauvegarde testée | À faire au déploiement | Procédure dans `EXPLOITATION.md`, section 5 |
| Mentions légales et politique de confidentialité publiées | Structure en ligne, contenu provisoire | Pages `/mentions-legales` et `/confidentialite` ; informations [●] à fournir et validation juridique |

## Anomalies trouvées pendant la recette et corrigées

| Anomalie | Correction |
|---|---|
| Rapports : un libellé de total dans une colonne de dates faisait échouer l'export du journal de caisse | Cellules texte laissées telles quelles ; test ajouté |
| Écran Tournées bloqué sur « Chargement… » sans date dans l'adresse | Paramètre de ressource toujours défini ; vérification ajoutée au parcours |
| Tableau de bord : valeur et libellé collés dans les cartes cliquables | Mise en page corrigée |
| Onglet Paiements : « Créances » affiché par défaut | Vue par défaut calculée |
| Dépendances transitives vulnérables (`mysql2`, `deepmerge-ts`, `uuid`) qui faisaient échouer l'audit de la CI de l'API | Versions corrigées imposées (`pnpm.overrides`), tests et Prisma vérifiés |
| Données de démonstration : dépôts marqués payés sans ligne de paiement | Paiements cohérents, caisse ouverte, licences en grâce et à échéance ajoutés au seed |
| Parcours Playwright instables en parallèle (saisie avant ouverture complète d'un dialogue, remise validée par un autre parcours) | Points de synchronisation explicites ; chaque parcours cible son propre dépôt |
