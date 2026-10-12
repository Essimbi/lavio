# 12 — Plan de réalisation

Travailler **phase par phase**. À chaque phase : annoncer un plan court, implémenter, écrire les tests, vérifier les critères de fin, mettre à jour `docs/PROGRESS.md`, committer (`feat:`, `fix:`…), puis passer à la suivante. Ne jamais commencer une phase tant que les critères de la précédente ne sont pas atteints.

## Phase 0 — Socle

- Monorepo pnpm (`apps/api`, `apps/web`, `packages/shared`), TypeScript strict, ESLint, Prettier, hooks de commit.
- NestJS : configuration, validation globale, filtre d'erreurs au format de `04-api.md`, Pino, Swagger, `GET /v1/health`.
- Prisma : connexion PostgreSQL, première migration (tables plateforme), script de seed.
- Angular : coquille, routes lazy (`/`, `/login`, `/app`, `/admin`), jetons `--lv-*`, thème Material, polices auto-hébergées, `AppShell`, intercepteur HTTP, PWA de base (manifest, icônes, service worker).
- Configuration Vercel des deux projets, `vercel.json`, premier déploiement de test.
- **Fin** : les deux applications se construisent et se déploient ; `/v1/health` répond ; la page d'accueil provisoire s'affiche avec le logo ; les tests de démarrage passent.

## Phase 1 — Authentification, multi-tenant, licences, superadmin

- Utilisateurs, rôles multiples, connexion, rafraîchissement rotatif, invitations, verrouillage après échecs.
- Contexte de tenant, extension Prisma d'isolation, `LicenseGuard`, nombre d'utilisateurs.
- Plans, pressings, licences, événements, paiements d'abonnement avec prolongation automatique, leads, paramètres plateforme (numéro WhatsApp), relevé mensuel 50/50 avec exports.
- Cron quotidien des statuts de licence. Interface `/admin` complète (voir `06-licences-et-superadmin.md`), page « Ma licence » et bannières côté pressing.
- **Fin** : un superadmin crée un pressing, une licence, enregistre un paiement, invite le responsable par lien WhatsApp ; le responsable se connecte ; une licence expirée passe le pressing en lecture seule ; les **tests d'isolation entre pressings sont verts**.

## Phase 2 — Clients, catalogue, dépôt, ticket

- Clients (fiche, recherche, préférences, crédit). Types d'articles, services, tarifs datés, prix spéciaux, devis `GET /pricing/quote`.
- Dépôt : écran unique de saisie rapide, lignes d'articles, symbole d'entretien, check-list, photos (Blob), poids facultatif, express, remise avec validation, acompte, idempotence, numéro séquentiel.
- Ticket 80 mm avec numéro et QR code, étiquettes par article, route d'impression.
- **Fin** : un caissier enregistre un dépôt et imprime le ticket en moins de 90 secondes (client existant) ; les prix sont figés ; une remise au-dessus du seuil bloque l'impression jusqu'à validation.

## Phase 3 — Suivi, restitution, paiements, caisse

- Statuts d'articles et historique, liste filtrable avec retards, emplacement de rangement, contrôle qualité, incidents et reprises.
- Restitution totale ou partielle, paiements (espèces, Orange Money, MTN MoMo, virement, chèque), doublons de référence, annulation par écriture inverse, rapprochement Mobile Money, crédit et créances, reçu et facture PDF.
- Sessions de caisse : ouverture, clôture avec comptage et écart, validation par la responsable.
- Validations (`approvals`) et centre de notifications (sans push pour l'instant).
- **Fin** : cycle complet démontrable : dépôt → statuts → contrôle qualité → restitution → encaissement → clôture de caisse ; règles de `05-regles-de-gestion.md` couvertes par des tests.

## Phase 4 — Stock, achats, dépenses, rapports

- Produits, mouvements, coût moyen pondéré, alertes, inventaire avec validation, fournisseurs, bons de commande, réceptions, factures fournisseurs.
- Dépenses, catégories, récurrences, comptes de trésorerie, virements, relevés d'eau et d'électricité.
- Rapports : journal de caisse, chiffre d'affaires, résultat simplifié, trésorerie, créances, valorisation du stock ; exports CSV et XLSX.
- **Fin** : stock cohérent avec les mouvements, alertes déclenchées une fois par franchissement, exports identiques aux chiffres affichés.

## Phase 5 — Tournées, tableau de bord, mobile, push

- Tournées (jours configurables, demandes, liste du jour imprimable, statuts).
- Tableau de bord 360° (web et mobile, toutes les périodes) et vues mobiles de la responsable (activité, caisse, stock, validations).
- Notifications push (VAPID), abonnement, clic profond ; mises à jour du service worker ; invite d'installation ; file d'envoi des écritures.
- **Fin** : la responsable installe la PWA, reçoit une notification de validation, l'approuve depuis son téléphone et voit le tableau de bord à jour.

## Phase 6 — Landing, recette, durcissement, déploiement

- Landing prérendue (voir `07-landing-page.md`) avec bouton WhatsApp et formulaire de demande.
- Pages légales provisoires, SEO, performance (Lighthouse), accessibilité.
- Recette complète (`13-tests-et-recette.md`), correction des anomalies, liste de contrôle de sécurité (`10-securite-et-conformite.md`), documentation d'exploitation (`docs/EXPLOITATION.md` : déploiement, sauvegarde, restauration, création d'un pressing, renouvellement d'une licence).
- Déploiement de production.
- **Fin** : tous les critères de réussite de la V1 sont démontrés ; la liste de contrôle avant production est cochée ou les écarts sont expliqués.
