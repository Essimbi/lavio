# 01 — Contexte et périmètre

## Vision

Lavio digitalise un pressing, du dépôt du vêtement à la clôture de caisse, et donne à la responsable une vue à 360° de l'activité depuis son téléphone. Le produit est ensuite commercialisé à d'autres pressings sous forme d'abonnements (SaaS à licences).

Promesse : **« Le pressing, sous contrôle. »** Valeurs : clarté, fiabilité, proximité.

## Acteurs

| Acteur | Rôle |
|---|---|
| Concepteur (propriétaire de la plateforme) | Super administrateur : gère les pressings clients, les licences, les paiements |
| Exploitant (partenaire commercial) | Commercialise Lavio. Accès en lecture au suivi des abonnements et aux relevés mensuels |
| Pressing (tenant) | Un client de Lavio. Les données de chaque pressing sont strictement isolées |
| Responsable (OWNER) | Pilote le pressing, valide les opérations sensibles, utilise surtout le mobile |
| Caissier / réceptionniste | Dépôts, restitutions, encaissements, caisse |
| Opérateur | Fait avancer les statuts des articles |
| Magasinier, comptable, contrôleur qualité, livreur | Rôles supplémentaires ; une même personne peut en cumuler plusieurs |

## Décisions actées

| Sujet | Décision |
|---|---|
| Paiements Mobile Money (Orange Money, MTN MoMo) des clients du pressing | **Enregistrement simple** : opérateur, montant, référence de transaction. Pas d'intégration des API de paiement |
| Paiement des abonnements Lavio | **Manuel** : le client contacte le service client sur WhatsApp au `+237694219620` ; le superadmin enregistre le paiement et prolonge la licence |
| Utilisateurs d'un pressing | 2 inclus au départ ; utilisateur supplémentaire facturable selon le plan |
| Matériel | Un PC avec imprimante de tickets, plus le téléphone de la responsable |
| Identification des dépôts | Ticket avec **QR code** et **numéro de ticket écrit**. Pas de scan en V1 : on retrouve un dépôt par son numéro |
| Tournées | Ramassage et livraison sur **deux jours fixes par semaine** (paramétrables) |
| Connexion internet | Jugée suffisante. Pas de mode hors ligne complet en V1 |
| Application mobile | **PWA** (même code Angular que le web), installable sur le téléphone |
| Application de bureau | Pas d'application de bureau en V1 : la PWA s'installe aussi sur le PC. Impression via le navigateur |
| Stack | NestJS, Angular, PostgreSQL, déploiement sur Vercel |

## Périmètre de la V1

### Application du pressing (tenant)

1. **Clients** : fiche (nom, téléphone, adresse, type particulier ou entreprise), historique, préférences (sans housse, reprise des cintres, remarques), recherche par nom, téléphone ou numéro de ticket, autorisation de crédit.
2. **Dépôt et ticket** : multi-articles ; par article : type, quantité, couleur, service, état à la réception, symbole d'entretien (ISO 3758), photos facultatives, poids facultatif ; check-list de réception simplifiée ; calcul du prix selon le catalogue, majoration express, remise avec seuil de validation ; acompte ; numéro de ticket unique ; QR code ; étiquette par article (numéro de ticket + rang de l'article) ; impression thermique 80 mm.
3. **Suivi** : statuts Reçu, En traitement, Repassage, Contrôle qualité, Prêt, Retiré ; changement manuel après recherche par numéro ; emplacement de rangement ; liste filtrable (statut, client, date de retrait) avec retards en évidence ; contrôle qualité avec check-list avant « Prêt » ; incidents et reprises avec cause codifiée.
4. **Restitution et paiements** : recherche du dépôt, restitution totale ou partielle, encaissement (espèces, Orange Money, MTN MoMo, virement, chèque) ; paiement partiel ; vente à crédit avec création d'une créance ; reçu ou facture avec TVA si assujetti ; alerte sur référence Mobile Money en double ; écran de rapprochement manuel des paiements Mobile Money.
5. **Tournées** : deux jours par semaine, demandes de ramassage ou de livraison, liste de tournée du jour imprimable avec les montants à encaisser ; suivi simple (à collecter, collecté, à livrer, livré). Sans application livreur ni signature.
6. **Catalogue et tarifs** : services, types d'articles, grille tarifaire avec historique, majoration express, remises, tarif délai normal, tarifs spéciaux clients à compte.
7. **Stock** : fiches produits, entrées, sorties avec motif obligatoire, alertes de seuil, inventaire avec validation des écarts, valorisation au coût moyen pondéré, fournisseurs, bons de commande, réceptions.
8. **Comptabilité de gestion** : caisse journalière (ouverture, clôture avec comptage et écart), comptes de trésorerie (caisse, banque, Mobile Money), dépenses par catégorie avec justificatif, dépenses récurrentes, créances clients, dettes fournisseurs, rapports (journal de caisse, chiffre d'affaires, résultat simplifié, trésorerie), export Excel et CSV, relevé mensuel des compteurs d'eau et d'électricité.
9. **Tableau de bord 360° (mobile et web)** : dépôts du jour, en cours, prêts, retirés, en retard ; chiffre d'affaires ; caisse du jour ; dépenses ; créances ; produits sous le seuil ; choix de période.
10. **Validations à distance (mobile)** : remises exceptionnelles, ajustements de stock, clôture de caisse.
11. **Notifications** : stock bas, clôture de caisse, écart de caisse, dépôt en retard, impayé important, demande de validation, licence qui expire.
12. **Administration du pressing** : utilisateurs avec cumul de rôles, droits par rôle, journal d'audit, paramètres (nom, logo, TVA, pied de ticket, jours de tournée, seuils).

### Plateforme SaaS

13. **Licences et abonnements** : plans, licences avec statuts et période, essai, période de grâce, contrôle d'accès côté API.
14. **Interface superadmin** : pressings, licences, plans, paiements manuels, demandes issues de la landing, relevé mensuel de partage des revenus, utilisateurs plateforme, journal d'audit.
15. **Landing page** : présentation du produit, bouton de contact WhatsApp, formulaire de demande.

## Hors périmètre de la V1 (ne pas développer)

Lecture du QR code (scan), lots et machines, taux de remplissage, dosages et consommation théorique contre réelle, FEFO, coût de revient et marges, tarification au kilo avec balance, comptabilité SYSCOHADA complète (journaux, grand livre, balance), comparatif de devis, WhatsApp automatisé, rapport hebdomadaire automatique, application livreur et signature, intégration des API Mobile Money, mode hors ligne complet, application de bureau, impression directe ESC/POS.

**Prévoir dès la V1 la collecte de données utiles à la V2** : poids facultatif, causes de reprise, motifs de sortie de stock, catégories de dépenses, relevés d'eau et d'électricité. Le modèle de données doit permettre d'ajouter la V2 sans refonte (voir `03-modele-de-donnees.md`).

## Critères de réussite de la V1

- Un dépôt est enregistré et son ticket imprimé en moins de 90 secondes (parcours du caissier, client existant).
- La caisse est clôturée chaque soir dans l'application, sans passer par Excel.
- La responsable voit en direct l'activité, la caisse et les alertes sur son téléphone.
- Chaque dépôt est retrouvé à partir de son numéro de ticket.
- Tous les paiements Mobile Money sont enregistrés avec leur référence.
