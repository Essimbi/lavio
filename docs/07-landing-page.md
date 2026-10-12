# 07 — Landing page

Page publique de présentation de Lavio, dans l'application Angular (`features/landing`), **préremplie au build** (prérendu statique) pour le référencement et la rapidité. Elle fonctionne sur téléphone en priorité (connexions mobiles).

## Objectifs

1. Faire comprendre en 10 secondes ce que fait Lavio.
2. Faire cliquer sur **Contacter le service client sur WhatsApp**.
3. Collecter des demandes via un formulaire court (`POST /v1/public/leads`).

## Structure

| Section | Contenu |
|---|---|
| En-tête | Logo (`docs/assets/logo/lavio-logo-horizontal.svg`), liens ancres (Fonctionnalités, Comment ça marche, Tarifs, Questions), bouton « Se connecter » (`/login`), bouton WhatsApp |
| Hero | Titre : **Votre pressing, sous contrôle.** Sous-titre : « Dépôts, suivi des vêtements, caisse, stock et comptabilité de gestion dans un seul outil, avec une vue à 360° sur votre téléphone. » Boutons : « Parler au service client » (WhatsApp) et « Voir les fonctionnalités ». Visuel : illustration du téléphone avec tableau de bord (dessinée en HTML/CSS) |
| Le problème | « Cahiers, tickets perdus, caisse qui ne tombe pas juste, stock qui s'épuise sans prévenir. » Trois constats courts |
| Fonctionnalités | 6 cartes : Dépôts et tickets (numéro et QR code), Suivi de chaque vêtement, Caisse et paiements Mobile Money, Stock et alertes, Comptabilité de gestion, Pilotage sur téléphone |
| Comment ça marche | 3 étapes : 1. Vous nous contactez sur WhatsApp. 2. Nous créons votre espace et formons votre équipe. 3. Vous suivez votre pressing en direct |
| Pour la responsable | Bloc sur le tableau de bord mobile : chiffre d'affaires, caisse du jour, stock bas, validations en un geste |
| Tarifs | Carte(s) de plan avec prix `[PRIX] FCFA / mois` (lus depuis la configuration, jamais en dur) ; mention « Essai gratuit de [14] jours » si activé ; bouton WhatsApp |
| Questions fréquentes | 6 à 8 questions (voir ci-dessous) |
| Formulaire | Nom, nom du pressing, téléphone, ville, message facultatif. Consentement : « J'accepte d'être recontacté(e) ». Message de succès : « Merci ! Nous vous recontactons très vite. » |
| Pied de page | Logo, mention « Lavio, le pressing sous contrôle », liens Mentions légales et Confidentialité, numéro WhatsApp |

## Bouton WhatsApp

Lien : `https://wa.me/<whatsappNumber>?text=<message encodé>` avec le numéro lu depuis `GET /v1/public/config`. Message par défaut (modifiable depuis le superadmin) :

> Bonjour, je souhaite en savoir plus sur Lavio pour mon pressing.

Variantes : sur la carte de tarif, ajouter « Plan [nom du plan] » ; dans l'application (renouvellement), ajouter le nom du pressing et la clé de licence. Le bouton est aussi flottant sur mobile (zone tactile d'au moins 48 px, `aria-label="Contacter le service client sur WhatsApp"`).

## Questions fréquentes (textes proposés)

- **Faut-il installer un logiciel ?** Non. Lavio s'ouvre dans le navigateur et s'installe comme une application sur le PC et le téléphone.
- **Faut-il internet ?** Oui, une connexion est nécessaire. Une coupure brève ne fait pas perdre vos saisies.
- **Comment payer l'abonnement ?** Vous contactez notre service client sur WhatsApp ; vous pouvez régler en espèces, par Orange Money, MTN MoMo ou virement.
- **Combien d'utilisateurs ?** Deux utilisateurs sont inclus ; vous pouvez en ajouter.
- **Mes données sont-elles protégées ?** Oui. Chaque pressing a un espace isolé, les échanges sont chiffrés et les actions sensibles sont tracées.
- **Puis-je imprimer mes tickets ?** Oui, sur une imprimante de tickets 80 mm, avec numéro et QR code.
- **Que se passe-t-il si mon abonnement expire ?** Vous gardez la consultation et l'export de vos données ; contactez-nous pour renouveler.

## Référencement et performance

- Balises `title` et `meta description`, Open Graph et Twitter Card (image 1200×630 à partir du logo), `lang="fr"`, `sitemap.xml`, `robots.txt`, données structurées JSON-LD `SoftwareApplication`.
- Cible Lighthouse mobile : performance ≥ 90, accessibilité ≥ 95. Images en WebP avec dimensions explicites, polices Poppins et DM Sans en `font-display: swap`, JavaScript chargé en lazy loading.
- Pas de traqueurs tiers. Mesure d'audience respectueuse de la vie privée possible via Vercel Analytics.
- Pages `/mentions-legales` et `/confidentialite` : contenu à fournir `[●]` ; prévoir la structure avec un texte provisoire clairement signalé.

## Anti-spam du formulaire

Champ piège invisible, limite de débit par IP (hachée), validation du téléphone, pas de CAPTCHA tiers en V1. Les erreurs sont affichées en français et accessibles (association `label` / message d'erreur).
