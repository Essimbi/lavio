# Prompt à donner à Claude Code

## Mise en place (à faire une fois)

1. Crée un dépôt vide `lavio` et copie dedans le contenu de ce dossier : `CLAUDE.md` à la racine et le dossier `docs/` (avec `docs/assets/`).
2. Ouvre Claude Code à la racine du dépôt.
3. Colle le **prompt principal** ci-dessous. Active le mode plan pour la première réponse.
4. Ensuite, utilise les **prompts de phase** un par un. Ne passe à la phase suivante qu'une fois la précédente validée.

---

## Prompt principal

```
Tu es un lead développeur full-stack senior (Angular, NestJS, PostgreSQL, Vercel) et tu vas construire le MVP de Lavio, un SaaS de gestion de pressing pour le marché camerounais.

## Contexte
Lavio digitalise un pressing : dépôt des vêtements avec ticket (numéro + QR code), suivi de chaque article, restitution et paiements (espèces, Mobile Money en simple enregistrement), stock de matières premières, comptabilité de gestion, tournées de ramassage et livraison, et une vue à 360° pour la responsable sur son téléphone (PWA). Le produit est vendu par abonnement avec des licences, géré depuis une interface superadmin, et présenté sur une landing page. Les abonnements se paient pour l'instant par contact avec le service client sur WhatsApp (+237694219620) ; le superadmin enregistre le paiement et prolonge la licence.

## Ta source de vérité
Le dépôt contient CLAUDE.md et un dossier docs/ complet. Lis d'abord CLAUDE.md, puis docs/00-README.md et tous les documents 01 à 14, dans l'ordre. Ils décrivent le périmètre, l'architecture, le modèle de données, l'API, les règles de gestion, les licences, la landing, la charte graphique, la PWA et l'impression, la sécurité, le déploiement, le plan de réalisation, les tests et les hypothèses par défaut. Ils font foi.

## Stack imposée
Back-end NestJS, front-end Angular, base PostgreSQL (Prisma), mobile en PWA, déploiement sur Vercel (deux projets : lavio-api et lavio-web), monorepo pnpm. Vérifie la documentation à jour de Vercel, Angular, NestJS et Prisma avant de figer les choix techniques et note-les dans docs/DECISIONS.md.

## Objectif
Livrer toute la V1 décrite dans docs/01-contexte-et-perimetre.md : l'application du pressing (modules 1 à 12), la plateforme SaaS (licences, superadmin) et la landing page. Rien de plus : respecte la liste « Hors périmètre ».

## Méthode de travail
1. Commence par un plan : résume ta compréhension en 15 lignes maximum, liste les risques et les points ambigus, propose l'ordre exact des tâches de la phase 0 selon docs/12-plan-de-realisation.md. Attends ma validation avant de coder.
2. Travaille phase par phase. Dans chaque phase : plan court, implémentation par petits incréments vérifiables, tests écrits en même temps que le code, vérification des critères de fin, mise à jour de docs/PROGRESS.md, commit conventionnel.
3. Quand une information manque, applique l'hypothèse par défaut de docs/14-hypotheses-et-questions-ouvertes.md en la rendant configurable, et signale-la. Ne pose une question que si tu es réellement bloqué, en proposant une option par défaut.
4. Ne code aucune fonctionnalité hors périmètre. Si tu as une bonne idée, note-la dans docs/PROGRESS.md.
5. Ne modifie pas les documents de docs/ pour les arranger : si tu constates une erreur ou une contradiction, signale-la et propose la correction.

## Exigences de qualité
- TypeScript strict, ESLint, tests unitaires, d'intégration et end-to-end comme décrit dans docs/13-tests-et-recette.md.
- Isolation stricte entre pressings : tests d'isolation obligatoires pour chaque module.
- Règles métier appliquées côté serveur. Paiements, caisse, audit et mouvements de stock jamais supprimés.
- Interface 100 % en français, fidèle à la charte de docs/08-design-system.md (jetons de couleurs, polices, contrastes, accessibilité).
- Aucun secret dans le dépôt, aucun numéro, prix ou taux en dur, aucune donnée réelle dans les jeux de test.
- Chaque phase se termine par un résumé : ce qui est fait, hypothèses appliquées, points à confirmer, prochaine phase.

Commence maintenant par l'étape 1 (le plan), sans écrire de code.
```

---

## Prompts de phase

### Phase 0 — Socle
```
Valide le plan. Exécute la phase 0 de docs/12-plan-de-realisation.md : monorepo, NestJS et Angular de base, Prisma et première migration, thème Lavio, PWA de base, configuration Vercel. Vérifie dans la documentation à jour la méthode de déploiement de NestJS sur Vercel et d'Angular en monorepo, et note tes choix dans docs/DECISIONS.md. À la fin, complète la section « Commandes » de CLAUDE.md et donne-moi le résumé de phase.
```

### Phase 1 — Authentification, licences, superadmin
```
Exécute la phase 1 : authentification et rôles multiples, isolation multi-tenant, licences et leur cycle de vie, paiements d'abonnement manuels avec prolongation, leads, relevé mensuel 50/50, interface /admin complète et page « Ma licence ». Respecte docs/06-licences-et-superadmin.md à la lettre. Écris d'abord les tests d'isolation et de licence. Fin de phase : démonstration par un test end-to-end du parcours « création du pressing → licence → paiement → invitation → connexion → expiration en lecture seule ».
```

### Phase 2 — Clients, catalogue, dépôt, ticket
```
Exécute la phase 2 : clients, catalogue et tarifs datés, dépôt en écran unique de saisie rapide, ticket 80 mm avec numéro et QR code, étiquettes. Suis docs/05-regles-de-gestion.md (dépôts) et docs/09-pwa-et-impression.md (impression). Soigne l'ergonomie clavier : objectif moins de 90 secondes pour un dépôt avec client existant. Fournis le test Playwright du parcours.
```

### Phase 3 — Suivi, restitution, paiements, caisse
```
Exécute la phase 3 : statuts des articles, contrôle qualité, incidents, restitution, paiements (avec doublons Mobile Money et rapprochement), crédit et créances, sessions de caisse avec validation, validations et notifications internes. Applique les règles de docs/05 et couvre-les par des tests. Démontre le cycle complet dépôt → clôture de caisse.
```

### Phase 4 — Stock, achats, dépenses, rapports
```
Exécute la phase 4 : stock par mouvements avec coût moyen pondéré, alertes, inventaire validé, fournisseurs, bons de commande, réceptions, dépenses, trésorerie, relevés d'eau et d'électricité, rapports et exports CSV et XLSX. Vérifie que les exports reprennent exactement les chiffres affichés.
```

### Phase 5 — Tournées, tableau de bord, mobile et push
```
Exécute la phase 5 : tournées, tableau de bord 360° avec toutes les périodes, vues mobiles de la responsable, notifications push Web Push, mise à jour du service worker, invite d'installation, file d'envoi des écritures. Teste sur un vrai téléphone ou un émulateur et dis-moi ce que tu n'as pas pu vérifier.
```

### Phase 6 — Landing, recette, déploiement
```
Exécute la phase 6 : landing prérendue selon docs/07, bouton WhatsApp lu depuis la configuration, formulaire de demande, pages légales provisoires, SEO, accessibilité, performance. Puis recette complète (docs/13), liste de contrôle de sécurité (docs/10), docs/EXPLOITATION.md et préparation du déploiement de production. Dresse la liste des écarts restants.
```

---

## Conseils d'utilisation

- **Une phase par session de travail.** Si le contexte devient long, demande à Claude Code de mettre à jour `docs/PROGRESS.md`, puis ouvre une nouvelle session : il reprend avec `CLAUDE.md` et `docs/PROGRESS.md`.
- **Relis les résumés de fin de phase** : ils contiennent les hypothèses appliquées que tu dois confirmer.
- **Teste toi-même** chaque phase avec le jeu de données de démonstration avant de valider.
- **Avant la production** : fais valider par un conseil juridique la région d'hébergement et les textes légaux (voir `docs/10` et `docs/14`).
- **Commence par un déploiement de test** sur Vercel dès la phase 0 : cela évite les mauvaises surprises en fin de projet.
